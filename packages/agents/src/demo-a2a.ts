#!/usr/bin/env npx tsx
/**
 * Echelon A2A (Agent-to-Agent) Delegation Demo
 *
 * Demonstrates the full ERC-7710 Agent-to-Agent redelegation flow:
 *
 * Flow:
 * 1. User grants ERC-7715 permission to FundManager → stored in Supabase
 * 2. FundManager receives delegation, analyzes market
 * 3. FundManager creates ERC-7710 delegation to DexSwapAgent → stored in Supabase
 * 4. DexSwapAgent receives A2A delegation, executes swap
 * 5. User receives swap output
 *
 * This demo simulates steps 2-4 to show the A2A flow without requiring
 * actual ERC-7715 permission granting via MetaMask Flask.
 *
 * Usage:
 *   npx tsx src/demo-a2a.ts
 *
 * Required environment variables:
 *   - SUPABASE_URL: Supabase project URL
 *   - SUPABASE_ANON_KEY: Supabase anon key
 *   - RPC_URL: Ethereum RPC endpoint
 *   - AGENT_PRIVATE_KEY: Private key for test agent wallet
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts';
import type { Address } from 'viem';

dotenv.config();

// ===========================================
// Configuration
// ===========================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Demo addresses (for simulation)
const DEMO_USER_ADDRESS = '0x1234567890123456789012345678901234567890' as Address;
const DEMO_FUND_MANAGER_ID = 1;
const DEMO_DEX_SWAP_ID = 2;
const DEMO_TOKEN_ADDRESS = '0x2BfBc55F4A360352Dc89e599D04898F150472cA6'; // USDC Sepolia

// Generate demo agent addresses
const fundManagerKey = generatePrivateKey();
const dexSwapKey = generatePrivateKey();
const DEMO_FUND_MANAGER_ADDRESS = privateKeyToAddress(fundManagerKey);
const DEMO_DEX_SWAP_ADDRESS = privateKeyToAddress(dexSwapKey);

// ===========================================
// Demo Types
// ===========================================

interface DemoPendingDelegation {
  permission_id: string;
  user_address: string;
  agent_address: string;
  token_address: string;
  amount_per_period: string;
  period_duration: number;
  expires_at: number;
  granted_at: number;
  delegation_data: string;
  permission_hash: string;
  status: string;
}

interface DemoA2ADelegation {
  delegation_hash: string;
  parent_permission_id: string;
  from_agent_id: number;
  from_agent_address: string;
  to_agent_id: number;
  to_agent_address: string;
  user_address: string;
  token_address: string;
  amount: string;
  expires_at: number;
  signed_delegation: object;
  caveats: object[];
  status: string;
  strategy_type: string;
}

// ===========================================
// Demo Helpers
// ===========================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatAmount(weiAmount: string): string {
  const amount = BigInt(weiAmount);
  const whole = amount / 1000000n;
  const decimal = amount % 1000000n;
  return `${whole}.${decimal.toString().padStart(6, '0').slice(0, 2)} USDC`;
}

function generatePermissionId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateDelegationHash(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
}

// ===========================================
// Main Demo
// ===========================================

async function main() {
  console.log('\n========================================');
  console.log('   ECHELON A2A DELEGATION DEMO');
  console.log('   Agent-to-Agent Redelegation Flow');
  console.log('========================================\n');

  // Validate configuration
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: Supabase credentials not configured');
    console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('Configuration:');
  console.log(`  Supabase: ${SUPABASE_URL.slice(0, 30)}...`);
  console.log(`  Demo User: ${DEMO_USER_ADDRESS.slice(0, 10)}...`);
  console.log(`  FundManager: ${DEMO_FUND_MANAGER_ADDRESS.slice(0, 10)}... (ID: ${DEMO_FUND_MANAGER_ID})`);
  console.log(`  DexSwapAgent: ${DEMO_DEX_SWAP_ADDRESS.slice(0, 10)}... (ID: ${DEMO_DEX_SWAP_ID})`);
  console.log('');

  // ===========================================
  // Step 1: Simulate User → FundManager Permission (ERC-7715)
  // ===========================================

  console.log('========================================');
  console.log('  STEP 1: User Grants Permission');
  console.log('  (Simulates ERC-7715 via MetaMask Flask)');
  console.log('========================================\n');

  const permissionId = generatePermissionId();
  const delegationAmount = '10000000'; // 10 USDC
  const now = Math.floor(Date.now() / 1000);

  const userDelegation: DemoPendingDelegation = {
    permission_id: permissionId,
    user_address: DEMO_USER_ADDRESS.toLowerCase(),
    agent_address: DEMO_FUND_MANAGER_ADDRESS.toLowerCase(),
    token_address: DEMO_TOKEN_ADDRESS.toLowerCase(),
    amount_per_period: delegationAmount,
    period_duration: 3600, // 1 hour
    expires_at: now + 86400, // 24 hours
    granted_at: now,
    delegation_data: JSON.stringify({
      permissionType: 'native-token-recurring-allowance',
      grantedAt: now,
    }),
    permission_hash: generateDelegationHash(),
    status: 'pending',
  };

  console.log('User delegation details:');
  console.log(`  Permission ID: ${permissionId}`);
  console.log(`  Amount: ${formatAmount(delegationAmount)}`);
  console.log(`  To Agent: FundManager (${DEMO_FUND_MANAGER_ADDRESS.slice(0, 10)}...)`);
  console.log('');

  console.log('Storing user delegation in Supabase...');
  await sleep(500);

  try {
    const { data, error } = await supabase
      .from('pending_delegations')
      .insert([userDelegation])
      .select('id')
      .single();

    if (error) {
      console.error('Error storing delegation:', error.message);
      console.log('\nNote: Make sure you have run the Supabase schema SQL first.');
      console.log('See: packages/frontend/lib/supabase-schema.sql');
      process.exit(1);
    }

    console.log(`  ✓ Stored with ID: ${data.id}`);
  } catch (err) {
    console.error('Failed to store delegation:', err);
    process.exit(1);
  }

  console.log('');
  await sleep(1000);

  // ===========================================
  // Step 2: FundManager Processes and Redelegates
  // ===========================================

  console.log('========================================');
  console.log('  STEP 2: FundManager Processes');
  console.log('  (Analyzes market, selects specialist)');
  console.log('========================================\n');

  console.log('FundManager received delegation:');
  console.log('  1. Analyzing market conditions... OK');
  await sleep(500);
  console.log('     - ETH Volatility: 0.05 (moderate)');
  console.log('     - Trend: neutral');
  console.log('     - Best APY: 6.2%');
  await sleep(500);

  console.log('  2. Selecting specialist agent...');
  await sleep(500);
  console.log('     - Target Strategy: DCA');
  console.log('     - Selected: DexSwapAgent (ID: 2)');
  console.log('     - Reputation Score: 85');
  await sleep(500);

  console.log('  3. Calculating allocation...');
  await sleep(500);
  const allocationAmount = (BigInt(delegationAmount) * 90n) / 100n; // 90% allocation
  console.log(`     - Risk Factor: 0.95`);
  console.log(`     - Allocation: ${formatAmount(allocationAmount.toString())} (90%)`);
  await sleep(500);

  console.log('  4. Creating ERC-7710 delegation...');
  await sleep(500);

  // Create A2A delegation
  const a2aDelegation: DemoA2ADelegation = {
    delegation_hash: generateDelegationHash(),
    parent_permission_id: permissionId,
    from_agent_id: DEMO_FUND_MANAGER_ID,
    from_agent_address: DEMO_FUND_MANAGER_ADDRESS.toLowerCase(),
    to_agent_id: DEMO_DEX_SWAP_ID,
    to_agent_address: DEMO_DEX_SWAP_ADDRESS.toLowerCase(),
    user_address: DEMO_USER_ADDRESS.toLowerCase(),
    token_address: DEMO_TOKEN_ADDRESS.toLowerCase(),
    amount: allocationAmount.toString(),
    expires_at: now + 3600, // 1 hour
    signed_delegation: {
      delegate: DEMO_DEX_SWAP_ADDRESS,
      delegator: DEMO_FUND_MANAGER_ADDRESS,
      authority: '0x0000000000000000000000000000000000000000000000000000000000000000',
      caveats: [],
      salt: BigInt(Date.now()).toString(),
      signature: '0x' + 'ab'.repeat(65), // Mock signature
    },
    caveats: [
      { type: 'timestamp', notAfter: now + 3600 },
      { type: 'limitedCalls', maxCalls: 1 },
      { type: 'erc20Amount', maxAmount: allocationAmount.toString() },
    ],
    status: 'pending',
    strategy_type: 'DCA',
  };

  console.log('  5. Storing A2A delegation in Supabase...');

  try {
    const { data, error } = await supabase
      .from('a2a_delegations')
      .insert([a2aDelegation])
      .select('id')
      .single();

    if (error) {
      console.error('Error storing A2A delegation:', error.message);
      console.log('\nNote: Make sure you have run the A2A schema SQL first.');
      console.log('See: packages/frontend/lib/supabase-schema-a2a.sql');
      process.exit(1);
    }

    console.log(`     ✓ Stored with ID: ${data.id}`);
  } catch (err) {
    console.error('Failed to store A2A delegation:', err);
    process.exit(1);
  }

  console.log('');
  console.log('FundManager -> DexSwapAgent delegation created:');
  console.log(`  Delegation Hash: ${a2aDelegation.delegation_hash.slice(0, 20)}...`);
  console.log(`  Amount: ${formatAmount(allocationAmount.toString())}`);
  console.log(`  Strategy: ${a2aDelegation.strategy_type}`);
  console.log(`  Expires: ${new Date(a2aDelegation.expires_at * 1000).toLocaleString()}`);
  console.log('');

  // Mark user delegation as claimed
  await supabase
    .from('pending_delegations')
    .update({ status: 'claimed', claimed_at: now })
    .eq('permission_id', permissionId);

  await sleep(1000);

  // ===========================================
  // Step 3: DexSwapAgent Receives and Executes
  // ===========================================

  console.log('========================================');
  console.log('  STEP 3: DexSwapAgent Executes');
  console.log('  (Receives A2A delegation, executes swap)');
  console.log('========================================\n');

  console.log('DexSwapAgent received A2A delegation:');
  console.log('  1. Validating delegation... OK');
  await sleep(500);
  console.log('     - From: FundManager (verified)');
  console.log('     - Caveats: timestamp, limitedCalls, erc20Amount');
  await sleep(500);

  console.log('  2. Getting Uniswap quote... OK');
  await sleep(500);
  const expectedOutput = (allocationAmount * 5n) / 10000n; // ~0.05% of input as ETH
  console.log(`     - Input: ${formatAmount(allocationAmount.toString())}`);
  console.log(`     - Output: ~${Number(expectedOutput) / 1e18} WETH (estimated)`);
  console.log('     - Pool Fee: 0.3%');
  await sleep(500);

  console.log('  3. Building swap transaction... OK');
  await sleep(500);

  console.log('  4. Redeeming delegation via bundler... SIMULATED');
  await sleep(500);
  const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

  // Mark A2A delegation as redeemed
  await supabase
    .from('a2a_delegations')
    .update({
      status: 'redeemed',
      redeemed_at: Math.floor(Date.now() / 1000),
      redeemed_tx_hash: mockTxHash,
    })
    .eq('delegation_hash', a2aDelegation.delegation_hash);

  console.log('  5. Updating status in Supabase... OK');
  await sleep(500);

  console.log('');
  console.log('Swap execution result:');
  console.log(`  ✓ Status: SIMULATED (Demo mode)`);
  console.log(`  ✓ Tx Hash: ${mockTxHash.slice(0, 20)}...`);
  console.log(`  ✓ Amount In: ${formatAmount(allocationAmount.toString())}`);
  console.log(`  ✓ Recipient: ${DEMO_USER_ADDRESS.slice(0, 10)}... (original user)`);
  console.log('');

  await sleep(1000);

  // ===========================================
  // Summary
  // ===========================================

  console.log('========================================');
  console.log('  A2A FLOW COMPLETE');
  console.log('========================================\n');

  console.log('Delegation Chain:');
  console.log(`  User (${DEMO_USER_ADDRESS.slice(0, 10)}...)`);
  console.log('    │ ERC-7715 (10 USDC)');
  console.log('    ▼');
  console.log(`  FundManager (ID: ${DEMO_FUND_MANAGER_ID})`);
  console.log('    │ ERC-7710 (9 USDC)');
  console.log('    ▼');
  console.log(`  DexSwapAgent (ID: ${DEMO_DEX_SWAP_ID})`);
  console.log('    │ Uniswap V3 Swap');
  console.log('    ▼');
  console.log(`  User receives WETH ✓`);
  console.log('');

  console.log('Database Records Created:');
  console.log('  ✓ pending_delegations: User → FundManager (claimed)');
  console.log('  ✓ a2a_delegations: FundManager → DexSwapAgent (redeemed)');
  console.log('');

  console.log('========================================');
  console.log('  Demo complete!');
  console.log('  In production, this flow runs automatically');
  console.log('  when users grant permissions via MetaMask Flask.');
  console.log('========================================\n');

  // Cleanup: Remove demo records
  console.log('Cleaning up demo records...');
  await supabase
    .from('a2a_delegations')
    .delete()
    .eq('delegation_hash', a2aDelegation.delegation_hash);
  await supabase
    .from('pending_delegations')
    .delete()
    .eq('permission_id', permissionId);
  console.log('  ✓ Demo records removed\n');
}

// ===========================================
// Run
// ===========================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
