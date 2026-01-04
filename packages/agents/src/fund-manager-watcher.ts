/**
 * Fund Manager Event-Driven Watcher
 *
 * Watches for PermissionGranted events on-chain and automatically:
 * 1. Executes REAL token transfers using ERC-7715 delegations
 * 2. Creates redelegations to specialist agents
 * 3. Triggers specialist agents to execute trades
 * 4. Settles profit/loss with treasury
 *
 * This is fully event-driven - no polling required!
 * Flow: PermissionGranted → Real Execution → Redelegation → Settlement
 *
 * Run with: npx tsx src/fund-manager-watcher.ts
 */

import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  executeTradesForRedelegations,
  type RedelegationInfo,
} from './services/specialist-execution.js';
import { executeRealTransfer, isRealExecutionAvailable } from './services/real-execution.js';

// ===========================================
// Configuration
// ===========================================

const FUND_MANAGER_ID = 1;
const FUND_MANAGER_PRIVATE_KEY = process.env.PRIVATE_KEY || '';

// Contract addresses (from indexer config)
const PERMISSION_REGISTRY_ADDRESS = '0x113B560d7DCCa2d325DD3305195a02e096e35CC3';
const EXECUTION_ADDRESS = process.env.EXECUTION_ADDRESS || '0x0D2871A9BbF7e76De188A480Dc823d7681397dD8';

// Fund Manager wallet address (derived from private key)
const FUND_MANAGER_WALLET = process.env.FUND_MANAGER_WALLET || (() => {
  if (FUND_MANAGER_PRIVATE_KEY) {
    const account = privateKeyToAccount(FUND_MANAGER_PRIVATE_KEY as `0x${string}`);
    return account.address;
  }
  return '';
})();

// Specialist agent allocations
const SPECIALIST_ALLOCATIONS = [
  { id: 2, name: 'AlphaYield', percentage: 35 },
  { id: 3, name: 'ArbitrageKing', percentage: 25 },
  { id: 4, name: 'DCAWizard', percentage: 25 },
  { id: 5, name: 'MomentumMaster', percentage: 15 },
];

// Delegation duration (7 days in seconds)
const DELEGATION_DURATION = 7 * 24 * 60 * 60;

// RPC URL
const RPC_URL = process.env.RPC_URL || 'https://rpc.sepolia.org';

// Envio GraphQL endpoint (for checking existing redelegations)
const ENVIO_URL = process.env.ENVIO_URL || 'http://localhost:8080/v1/graphql';

// ===========================================
// ABIs
// ===========================================

const permissionRegistryAbi = parseAbi([
  'event PermissionGranted(bytes32 indexed permissionId, address indexed user, address indexed agent, address token, uint256 amountPerPeriod, uint256 periodDuration, uint256 expiresAt, bytes32 permissionHash)',
]);

const executionAbi = parseAbi([
  'function logRedelegation(uint256 childAgentId, address userAddress, uint256 amount, uint256 duration) external',
]);

// ===========================================
// State Tracking
// ===========================================

// Track processed permissions to avoid duplicates
const processedPermissions = new Set<string>();

// ===========================================
// Helper Functions
// ===========================================

async function getExistingRedelegationsForUser(userAddress: string): Promise<number> {
  const query = `
    query GetFundManagerRedelegationsForUser($userId: String!) {
      Redelegation(where: {
        parentAgent_id: { _eq: "1" },
        user_id: { _eq: $userId },
        isActive: { _eq: true }
      }) {
        id
      }
    }
  `;

  try {
    const response = await fetch(ENVIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { userId: userAddress.toLowerCase() }
      }),
    });

    const data = await response.json();
    return data.data?.Redelegation?.length || 0;
  } catch (error) {
    console.error('Failed to fetch redelegations:', error);
    return 0;
  }
}

// ===========================================
// Redelegation + Execution Logic
// ===========================================

async function handleNewPermission(
  permissionId: string,
  userAddress: string,
  amount: bigint
): Promise<void> {
  // Check if already processed
  if (processedPermissions.has(permissionId)) {
    return;
  }
  processedPermissions.add(permissionId);

  console.log(`\n📥 New permission detected!`);
  console.log(`   Permission ID: ${permissionId.slice(0, 18)}...`);
  console.log(`   User: ${userAddress}`);
  console.log(`   Amount: ${Number(amount) / 1e6} USDC`);

  // Check if user already has redelegations
  const existingCount = await getExistingRedelegationsForUser(userAddress);
  if (existingCount > 0) {
    console.log(`   ⏭️ Skipping - user already has ${existingCount} active redelegations`);
    return;
  }

  // =========================================
  // PHASE 1: Create Redelegations
  // =========================================
  console.log('\n🚀 Phase 1: Creating redelegations to specialist agents...');

  const account = privateKeyToAccount(FUND_MANAGER_PRIVATE_KEY as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL, { timeout: 60000 }),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL, { timeout: 60000 }),
  });

  // Collect successful redelegations for specialist execution
  const successfulRedelegations: RedelegationInfo[] = [];

  for (let i = 0; i < SPECIALIST_ALLOCATIONS.length; i++) {
    const specialist = SPECIALIST_ALLOCATIONS[i];
    const allocationAmount = (amount * BigInt(specialist.percentage)) / 100n;

    console.log(`\n   → Delegating to ${specialist.name} (ID ${specialist.id}): ${Number(allocationAmount) / 1e6} USDC (${specialist.percentage}%)`);

    try {
      const hash = await walletClient.writeContract({
        address: EXECUTION_ADDRESS as `0x${string}`,
        abi: executionAbi,
        functionName: 'logRedelegation',
        args: [
          BigInt(specialist.id),
          userAddress as `0x${string}`,
          allocationAmount,
          BigInt(DELEGATION_DURATION),
        ],
      });

      console.log(`      TX: ${hash}`);

      await publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
      console.log(`      ✅ Confirmed`);

      successfulRedelegations.push({
        childAgentId: specialist.id,
        userAddress,
        amount: allocationAmount,
      });

      // Delay between transactions to avoid rate limiting
      if (i < SPECIALIST_ALLOCATIONS.length - 1) {
        console.log(`      ⏳ Waiting 3s...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error: any) {
      console.error(`      ❌ Failed:`, error.message || error);

      // Retry on rate limit
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        console.log(`      🔄 Rate limited, waiting 10s and retrying...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
          const hash = await walletClient.writeContract({
            address: EXECUTION_ADDRESS as `0x${string}`,
            abi: executionAbi,
            functionName: 'logRedelegation',
            args: [
              BigInt(specialist.id),
              userAddress as `0x${string}`,
              allocationAmount,
              BigInt(DELEGATION_DURATION),
            ],
          });
          await publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
          console.log(`      ✅ Confirmed on retry`);

          successfulRedelegations.push({
            childAgentId: specialist.id,
            userAddress,
            amount: allocationAmount,
          });
        } catch (retryError: any) {
          console.error(`      ❌ Retry failed:`, retryError.message);
        }
      }
    }
  }

  console.log('\n✅ Redelegation complete!');

  // =========================================
  // PHASE 2: Trigger Specialist Executions
  // =========================================
  if (successfulRedelegations.length > 0) {
    console.log('\n🎯 Phase 2: Triggering specialist agent executions...');
    console.log(`   ${successfulRedelegations.length} specialists to execute trades`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = await executeTradesForRedelegations(successfulRedelegations, 5000);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`\n📊 Execution Summary:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
  }

  // =========================================
  // PHASE 3: Execute REAL Token Transfer & Settlement
  // =========================================
  if (isRealExecutionAvailable()) {
    console.log('\n💰 Phase 3: Executing REAL token transfer via ERC-7715 delegation...');

    // Simulate a random profit/loss (-10% to +15%)
    const profitPercent = Math.random() * 25 - 10; // Random between -10% and +15%
    const roundedProfit = Math.round(profitPercent * 100) / 100;

    console.log(`   📊 Simulated trade result: ${roundedProfit >= 0 ? '+' : ''}${roundedProfit.toFixed(2)}%`);

    const realResult = await executeRealTransfer(
      FUND_MANAGER_PRIVATE_KEY,
      userAddress,
      amount,
      roundedProfit
    );

    if (realResult.success) {
      console.log(`   ✅ Real execution & settlement complete!`);
      console.log(`      Transferred: ${Number(realResult.amountTransferred) / 1e6} USDC`);
      console.log(`      Returned: ${Number(realResult.amountReturned) / 1e6} USDC`);
      console.log(`      P/L: ${realResult.profitPercent}%`);
      console.log(`      TX: ${realResult.transferTxHash}`);
    } else {
      console.log(`   ⚠️ Real execution failed: ${realResult.error}`);
    }
  } else {
    console.log('\n⚠️ Real execution not available (missing Supabase config)');
  }

  console.log('\n🎉 Full flow complete: Permission → Redelegation → Execution → Settlement');
  console.log('\n👀 Watching for new permissions...\n');
}

// ===========================================
// Event Watcher
// ===========================================

async function startEventWatcher(): Promise<void> {
  console.log('🔔 Fund Manager Event-Driven Watcher');
  console.log('=====================================');
  console.log(`Fund Manager Wallet: ${FUND_MANAGER_WALLET}`);
  console.log(`Permission Registry: ${PERMISSION_REGISTRY_ADDRESS}`);
  console.log(`Execution Contract: ${EXECUTION_ADDRESS}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log('\n✨ Event-driven mode - no polling!');
  console.log('   Listening for PermissionGranted events...\n');

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL, { timeout: 60000 }),
  });

  // Watch for PermissionGranted events where agent is the Fund Manager
  const unwatch = publicClient.watchContractEvent({
    address: PERMISSION_REGISTRY_ADDRESS as `0x${string}`,
    abi: permissionRegistryAbi,
    eventName: 'PermissionGranted',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { permissionId, user, agent, amountPerPeriod } = log.args;

        // Only process permissions granted to the Fund Manager
        if (agent?.toLowerCase() === FUND_MANAGER_WALLET.toLowerCase()) {
          console.log(`\n🔔 PermissionGranted event received!`);
          await handleNewPermission(
            permissionId as string,
            user as string,
            amountPerPeriod as bigint
          );
        }
      }
    },
    onError: (error) => {
      console.error('Event watcher error:', error);
      console.log('Attempting to reconnect...');
    },
  });

  // Keep the process running
  console.log('👀 Watching for new permissions...\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    unwatch();
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

// ===========================================
// Entry Point
// ===========================================

startEventWatcher().catch(console.error);
