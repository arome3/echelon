/**
 * Specialist Agent Auto-Execution Watcher
 *
 * Monitors for new redelegations and automatically simulates trade executions
 * for specialist agents. Each agent executes trades based on their strategy profile.
 *
 * For hackathon demo - production would use real DEX integrations.
 *
 * Run with: npx tsx src/specialist-execution-watcher.ts
 */

import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseAbi, decodeEventLog } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ===========================================
// Configuration
// ===========================================

// Contract addresses
const EXECUTION_ADDRESS = process.env.EXECUTION_ADDRESS || '0x0D2871A9BbF7e76De188A480Dc823d7681397dD8';

// Token addresses (Sepolia)
const USDC = '0x2BfBc55F4A360352Dc89e599D04898F150472cA6';
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

// Specialist agent configurations with demo private keys
// In production, these would come from secure environment variables
const SPECIALIST_AGENTS = [
  {
    id: 2,
    name: 'AlphaYield',
    strategy: 'Yield',
    winRate: 0.75,
    minProfit: -0.30,
    maxProfit: 0.40,
    privateKey: process.env.AGENT_1_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
  {
    id: 3,
    name: 'ArbitrageKing',
    strategy: 'Arbitrage',
    winRate: 0.90,
    minProfit: -0.05,
    maxProfit: 0.08,
    privateKey: process.env.AGENT_2_PRIVATE_KEY || '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  },
  {
    id: 4,
    name: 'DCAWizard',
    strategy: 'DCA',
    winRate: 0.85,
    minProfit: -0.10,
    maxProfit: 0.15,
    privateKey: process.env.AGENT_3_PRIVATE_KEY || '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  },
  {
    id: 5,
    name: 'MomentumMaster',
    strategy: 'Momentum',
    winRate: 0.70,
    minProfit: -0.25,
    maxProfit: 0.35,
    privateKey: process.env.AGENT_4_PRIVATE_KEY || '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  },
];

// Envio GraphQL endpoint
const ENVIO_URL = process.env.ENVIO_URL || 'http://localhost:8080/v1/graphql';

// RPC URL - use environment variable, fallback to Sepolia public RPC
const RPC_URL = process.env.RPC_URL || 'https://rpc.sepolia.org';

// Request timeout (60 seconds for slow RPCs)
const RPC_TIMEOUT = 60000;

// Poll interval (30 seconds - slower than redelegation watcher)
const POLL_INTERVAL = 30000;

// Delay between executions to avoid rate limiting (5 seconds)
const EXECUTION_DELAY = 5000;

// ===========================================
// ABI
// ===========================================

const executionAbi = parseAbi([
  'function logExecutionStart(address userAddress, uint256 amountIn, address tokenIn, address tokenOut) external returns (uint256 executionId)',
  'function logExecutionComplete(uint256 executionId, address userAddress, uint256 amountIn, uint256 amountOut, uint8 result) external',
  'event ExecutionStarted(uint256 indexed executionId, uint256 indexed agentId, address indexed userAddress, uint256 amountIn, address tokenIn, address tokenOut)',
]);

// ExecutionResult enum values
const ExecutionResult = {
  PENDING: 0,
  SUCCESS: 1,
  FAILURE: 2,
} as const;

// ===========================================
// State Tracking
// ===========================================

// Track which redelegations have been executed
const executedRedelegations = new Set<string>();

// ===========================================
// GraphQL Queries
// ===========================================

async function getNewRedelegations(): Promise<Array<{
  id: string;
  parentAgent: { id: string };
  childAgent: { id: string; name: string };
  user: { id: string };
  amount: string;
  createdAt: string;
}>> {
  const query = `
    query GetActiveRedelegations {
      Redelegation(
        where: { isActive: { _eq: true } }
        order_by: { createdAt: desc }
        limit: 50
      ) {
        id
        parentAgent { id }
        childAgent { id name }
        user { id }
        amount
        createdAt
      }
    }
  `;

  try {
    const response = await fetch(ENVIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    return data.data?.Redelegation || [];
  } catch (error) {
    console.error('Failed to fetch redelegations:', error);
    return [];
  }
}

async function getAgentExecutionCount(agentId: string): Promise<number> {
  const query = `
    query GetAgentExecutions($agentId: String!) {
      Execution_aggregate(where: { agent_id: { _eq: $agentId } }) {
        aggregate { count }
      }
    }
  `;

  try {
    const response = await fetch(ENVIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { agentId } }),
    });

    const data = await response.json();
    return data.data?.Execution_aggregate?.aggregate?.count || 0;
  } catch (error) {
    console.error('Failed to fetch execution count:', error);
    return 0;
  }
}

// ===========================================
// Execution Simulation
// ===========================================

function simulateTradeResult(agent: typeof SPECIALIST_AGENTS[0], amountIn: bigint): {
  amountOut: bigint;
  isSuccess: boolean;
} {
  // Determine if trade is successful based on win rate
  const isSuccess = Math.random() < agent.winRate;

  let profitPercent: number;
  if (isSuccess) {
    // Successful trade: profit between 0 and maxProfit
    profitPercent = Math.random() * agent.maxProfit;
  } else {
    // Failed trade: loss between minProfit and 0
    profitPercent = agent.minProfit + Math.random() * Math.abs(agent.minProfit);
  }

  // Calculate output amount
  const multiplier = 1 + profitPercent;
  const amountOut = BigInt(Math.floor(Number(amountIn) * multiplier));

  return { amountOut, isSuccess };
}

async function executeTradeForAgent(
  agent: typeof SPECIALIST_AGENTS[0],
  userAddress: string,
  amount: bigint
): Promise<boolean> {
  console.log(`\n   🎯 ${agent.name} executing trade...`);
  console.log(`      User: ${userAddress}`);
  console.log(`      Amount: ${Number(amount) / 1e6} USDC`);

  try {
    const account = privateKeyToAccount(agent.privateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(RPC_URL, { timeout: RPC_TIMEOUT }),
    });

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL, { timeout: RPC_TIMEOUT }),
    });

    // Simulate trade result
    const { amountOut, isSuccess } = simulateTradeResult(agent, amount);
    const profitLoss = Number(amountOut) - Number(amount);
    const profitPercent = ((profitLoss / Number(amount)) * 100).toFixed(2);

    console.log(`      Strategy: ${agent.strategy}`);
    console.log(`      Result: ${isSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
    console.log(`      Profit/Loss: ${profitLoss >= 0 ? '+' : ''}${profitPercent}%`);

    // Step 1: Log execution start
    console.log(`      📝 Logging execution start...`);
    const startHash = await walletClient.writeContract({
      address: EXECUTION_ADDRESS as `0x${string}`,
      abi: executionAbi,
      functionName: 'logExecutionStart',
      args: [
        userAddress as `0x${string}`,
        amount,
        USDC as `0x${string}`,
        WETH as `0x${string}`,
      ],
    });

    console.log(`      TX (start): ${startHash}`);

    // Wait for confirmation and get execution ID from logs
    const startReceipt = await publicClient.waitForTransactionReceipt({
      hash: startHash,
      timeout: 60_000,
    });

    if (startReceipt.status !== 'success') {
      throw new Error('Start transaction failed');
    }

    // Parse execution ID from the ExecutionStarted event in the logs
    let executionId = 0n;
    for (const log of startReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: executionAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'ExecutionStarted') {
          executionId = (decoded.args as { executionId: bigint }).executionId;
          console.log(`      Execution ID: ${executionId}`);
          break;
        }
      } catch {
        // Not our event, continue
      }
    }

    if (executionId === 0n) {
      throw new Error('Could not parse execution ID from logs');
    }

    // Wait a bit before completing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Log execution complete
    console.log(`      📝 Logging execution complete...`);
    const completeHash = await walletClient.writeContract({
      address: EXECUTION_ADDRESS as `0x${string}`,
      abi: executionAbi,
      functionName: 'logExecutionComplete',
      args: [
        executionId,
        userAddress as `0x${string}`,
        amount,
        amountOut,
        isSuccess ? ExecutionResult.SUCCESS : ExecutionResult.FAILURE,
      ],
    });

    console.log(`      TX (complete): ${completeHash}`);

    const completeReceipt = await publicClient.waitForTransactionReceipt({
      hash: completeHash,
      timeout: 60_000,
    });

    if (completeReceipt.status === 'success') {
      console.log(`      ✅ Execution logged successfully!`);
      return true;
    } else {
      console.log(`      ❌ Complete transaction failed`);
      return false;
    }
  } catch (error: any) {
    console.error(`      ❌ Execution failed:`, error.message || error);

    // If rate limited, suggest waiting
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      console.log(`      ⏳ Rate limited - will retry on next poll`);
    }

    return false;
  }
}

// ===========================================
// Main Watcher Loop
// ===========================================

async function watchForRedelegations(): Promise<void> {
  console.log('🤖 Specialist Agent Auto-Execution Watcher');
  console.log('==========================================');
  console.log(`Execution Contract: ${EXECUTION_ADDRESS}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`RPC Timeout: ${RPC_TIMEOUT / 1000}s`);
  console.log(`Poll Interval: ${POLL_INTERVAL / 1000}s`);
  console.log(`Execution Delay: ${EXECUTION_DELAY / 1000}s between trades`);
  console.log('\nSpecialist Agents:');
  SPECIALIST_AGENTS.forEach(agent => {
    console.log(`  - ${agent.name} (ID ${agent.id}): ${agent.strategy}, ${(agent.winRate * 100).toFixed(0)}% win rate`);
  });
  console.log('\nWatching for new redelegations...\n');

  while (true) {
    try {
      const redelegations = await getNewRedelegations();

      // Filter for new redelegations we haven't processed
      const newRedelegations = redelegations.filter(r => !executedRedelegations.has(r.id));

      if (newRedelegations.length > 0) {
        console.log(`\n📥 Found ${newRedelegations.length} new redelegation(s) to process`);

        for (const redelegation of newRedelegations) {
          const childAgentId = parseInt(redelegation.childAgent.id);
          const agent = SPECIALIST_AGENTS.find(a => a.id === childAgentId);

          if (!agent) {
            console.log(`   ⏭️ Skipping redelegation ${redelegation.id} - Agent ${childAgentId} not a specialist`);
            executedRedelegations.add(redelegation.id);
            continue;
          }

          console.log(`\n📋 Processing redelegation: ${redelegation.id}`);
          console.log(`   Parent: Fund Manager → Child: ${agent.name}`);
          console.log(`   User: ${redelegation.user.id}`);
          console.log(`   Amount: ${Number(redelegation.amount) / 1e6} USDC`);

          // Execute trade for this specialist
          const success = await executeTradeForAgent(
            agent,
            redelegation.user.id,
            BigInt(redelegation.amount)
          );

          if (success) {
            executedRedelegations.add(redelegation.id);
            console.log(`   ✅ Marked redelegation ${redelegation.id} as executed`);
          } else {
            console.log(`   ⚠️ Will retry redelegation ${redelegation.id} on next poll`);
          }

          // Delay between executions to avoid rate limiting
          if (newRedelegations.indexOf(redelegation) < newRedelegations.length - 1) {
            console.log(`   ⏳ Waiting ${EXECUTION_DELAY / 1000}s before next execution...`);
            await new Promise(resolve => setTimeout(resolve, EXECUTION_DELAY));
          }
        }

        console.log('\n✅ Batch processing complete!');
      }
    } catch (error) {
      console.error('Error in watch loop:', error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

// ===========================================
// Entry Point
// ===========================================

watchForRedelegations().catch(console.error);
