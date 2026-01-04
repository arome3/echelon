/**
 * Specialist Execution Service
 *
 * Executes simulated trades for specialist agents when they receive redelegations.
 * Called directly by the fund manager watcher after creating redelegations.
 */

import { createPublicClient, createWalletClient, http, parseAbi, decodeEventLog } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ===========================================
// Configuration
// ===========================================

const EXECUTION_ADDRESS = process.env.EXECUTION_ADDRESS || '0x0D2871A9BbF7e76De188A480Dc823d7681397dD8';
const RPC_URL = process.env.RPC_URL || 'https://rpc.sepolia.org';
const RPC_TIMEOUT = 60000;

// Token addresses (Sepolia)
const USDC = '0x2BfBc55F4A360352Dc89e599D04898F150472cA6';
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

// Specialist agent configurations
const SPECIALIST_AGENTS: Record<number, {
  name: string;
  strategy: string;
  winRate: number;
  minProfit: number;
  maxProfit: number;
  privateKey: string;
}> = {
  2: {
    name: 'AlphaYield',
    strategy: 'Yield',
    winRate: 0.75,
    minProfit: -0.30,
    maxProfit: 0.40,
    privateKey: process.env.AGENT_1_PRIVATE_KEY || '',
  },
  3: {
    name: 'ArbitrageKing',
    strategy: 'Arbitrage',
    winRate: 0.90,
    minProfit: -0.05,
    maxProfit: 0.08,
    privateKey: process.env.AGENT_2_PRIVATE_KEY || '',
  },
  4: {
    name: 'DCAWizard',
    strategy: 'DCA',
    winRate: 0.85,
    minProfit: -0.10,
    maxProfit: 0.15,
    privateKey: process.env.AGENT_3_PRIVATE_KEY || '',
  },
  5: {
    name: 'MomentumMaster',
    strategy: 'Momentum',
    winRate: 0.70,
    minProfit: -0.25,
    maxProfit: 0.35,
    privateKey: process.env.AGENT_4_PRIVATE_KEY || '',
  },
};

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
// Trade Simulation
// ===========================================

function simulateTradeResult(agentId: number, amountIn: bigint): {
  amountOut: bigint;
  isSuccess: boolean;
} {
  const agent = SPECIALIST_AGENTS[agentId];
  if (!agent) {
    throw new Error(`Unknown agent ID: ${agentId}`);
  }

  // Determine if trade is successful based on win rate
  const isSuccess = Math.random() < agent.winRate;

  let profitPercent: number;
  if (isSuccess) {
    profitPercent = Math.random() * agent.maxProfit;
  } else {
    profitPercent = agent.minProfit + Math.random() * Math.abs(agent.minProfit);
  }

  const multiplier = 1 + profitPercent;
  const amountOut = BigInt(Math.floor(Number(amountIn) * multiplier));

  return { amountOut, isSuccess };
}

// ===========================================
// Execution Interface
// ===========================================

export interface RedelegationInfo {
  childAgentId: number;
  userAddress: string;
  amount: bigint;
}

export interface ExecutionResult {
  success: boolean;
  executionId?: bigint;
  txHash?: string;
  error?: string;
  profitLoss?: number;
}

// ===========================================
// Main Execution Function
// ===========================================

/**
 * Execute a trade for a specialist agent
 * Called by the fund manager watcher after creating a redelegation
 */
export async function executeTradeForSpecialist(
  redelegation: RedelegationInfo
): Promise<ExecutionResult> {
  const { childAgentId, userAddress, amount } = redelegation;

  const agent = SPECIALIST_AGENTS[childAgentId];
  if (!agent) {
    return {
      success: false,
      error: `Agent ${childAgentId} is not a configured specialist`,
    };
  }

  if (!agent.privateKey) {
    return {
      success: false,
      error: `No private key configured for ${agent.name}`,
    };
  }

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
    const { amountOut, isSuccess } = simulateTradeResult(childAgentId, amount);
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

    // Wait for confirmation
    const startReceipt = await publicClient.waitForTransactionReceipt({
      hash: startHash,
      timeout: 60_000,
    });

    if (startReceipt.status !== 'success') {
      throw new Error('Start transaction failed');
    }

    // Parse execution ID from the ExecutionStarted event
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

    // Brief delay before completing
    await new Promise(resolve => setTimeout(resolve, 1000));

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
      return {
        success: true,
        executionId,
        txHash: completeHash,
        profitLoss: Number(profitPercent),
      };
    } else {
      throw new Error('Complete transaction failed');
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`      ❌ Execution failed:`, errorMessage);

    // Check for rate limiting
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      console.log(`      ⏳ Rate limited - consider using a different RPC`);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Execute trades for multiple redelegations
 * Processes them sequentially with delays to avoid rate limiting
 */
export async function executeTradesForRedelegations(
  redelegations: RedelegationInfo[],
  delayMs: number = 3000
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (let i = 0; i < redelegations.length; i++) {
    const redelegation = redelegations[i];
    const result = await executeTradeForSpecialist(redelegation);
    results.push(result);

    // Delay between executions to avoid rate limiting
    if (i < redelegations.length - 1) {
      console.log(`      ⏳ Waiting ${delayMs / 1000}s before next execution...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Check if an agent ID is a configured specialist
 */
export function isSpecialistAgent(agentId: number): boolean {
  return agentId in SPECIALIST_AGENTS;
}

/**
 * Get specialist agent info
 */
export function getSpecialistInfo(agentId: number) {
  return SPECIALIST_AGENTS[agentId];
}
