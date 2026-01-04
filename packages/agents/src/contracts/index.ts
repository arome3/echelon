/**
 * Echelon Agents - Contract Utilities
 *
 * Contract interaction utilities and type-safe wrappers using viem.
 */

import {
  type Address,
  type PublicClient,
  type WalletClient,
  type Hash,
  getContract,
} from 'viem';

import { AgentExecutionAbi } from './abis/AgentExecution.js';
import { AgentRegistryAbi } from './abis/AgentRegistry.js';
import { UniswapV3RouterAbi } from './abis/UniswapV3Router.js';
import { UniswapV3QuoterAbi } from './abis/UniswapV3Quoter.js';
import { ERC20Abi } from './abis/ERC20.js';

import type { AgentMetadata, ExecutionResult } from '../types/index.js';

// Re-export ABIs
export { AgentExecutionAbi } from './abis/AgentExecution.js';
export { AgentRegistryAbi } from './abis/AgentRegistry.js';
export { UniswapV3RouterAbi } from './abis/UniswapV3Router.js';
export { UniswapV3QuoterAbi } from './abis/UniswapV3Quoter.js';
export { ERC20Abi } from './abis/ERC20.js';

// ============================================
// CONTRACT INSTANCE CREATORS
// ============================================

/**
 * Get AgentExecution contract instance for writing
 */
export function getExecutionContract(
  walletClient: WalletClient,
  address: Address
) {
  return getContract({
    address,
    abi: AgentExecutionAbi,
    client: walletClient,
  });
}

/**
 * Get AgentExecution contract instance for reading
 */
export function getExecutionContractRead(
  publicClient: PublicClient,
  address: Address
) {
  return getContract({
    address,
    abi: AgentExecutionAbi,
    client: publicClient,
  });
}

/**
 * Get AgentRegistry contract instance for reading
 */
export function getRegistryContract(
  publicClient: PublicClient,
  address: Address
) {
  return getContract({
    address,
    abi: AgentRegistryAbi,
    client: publicClient,
  });
}

/**
 * Get Uniswap V3 SwapRouter contract instance
 */
export function getSwapRouterContract(
  walletClient: WalletClient,
  address: Address
) {
  return getContract({
    address,
    abi: UniswapV3RouterAbi,
    client: walletClient,
  });
}

/**
 * Get Uniswap V3 Quoter contract instance for reading
 */
export function getQuoterContract(
  publicClient: PublicClient,
  address: Address
) {
  return getContract({
    address,
    abi: UniswapV3QuoterAbi,
    client: publicClient,
  });
}

/**
 * Get ERC20 token contract instance
 */
export function getERC20Contract(
  publicClient: PublicClient,
  address: Address
) {
  return getContract({
    address,
    abi: ERC20Abi,
    client: publicClient,
  });
}

/**
 * Get ERC20 token contract instance for writing
 */
export function getERC20ContractWrite(
  walletClient: WalletClient,
  address: Address
) {
  return getContract({
    address,
    abi: ERC20Abi,
    client: walletClient,
  });
}

// ============================================
// AGENT REGISTRY HELPERS
// ============================================

/**
 * Verify an agent is registered on-chain
 */
export async function verifyAgentRegistration(
  publicClient: PublicClient,
  registryAddress: Address,
  walletAddress: Address
): Promise<{ isRegistered: boolean; agentId?: bigint; metadata?: AgentMetadata }> {
  try {
    const isRegistered = await publicClient.readContract({
      address: registryAddress,
      abi: AgentRegistryAbi,
      functionName: 'isRegisteredAgent',
      args: [walletAddress],
    });

    if (!isRegistered) {
      return { isRegistered: false };
    }

    const [agentId, metadata] = await publicClient.readContract({
      address: registryAddress,
      abi: AgentRegistryAbi,
      functionName: 'getAgentByWallet',
      args: [walletAddress],
    });

    return {
      isRegistered: true,
      agentId,
      metadata: {
        walletAddress: metadata.walletAddress,
        name: metadata.name,
        strategyType: metadata.strategyType,
        riskLevel: metadata.riskLevel,
        registeredAt: metadata.registeredAt,
        isActive: metadata.isActive,
      },
    };
  } catch (error) {
    // Contract call failed - assume not registered
    return { isRegistered: false };
  }
}

/**
 * Get agent ID from wallet address
 */
export async function getAgentIdByWallet(
  publicClient: PublicClient,
  registryAddress: Address,
  walletAddress: Address
): Promise<bigint | null> {
  try {
    const agentId = await publicClient.readContract({
      address: registryAddress,
      abi: AgentRegistryAbi,
      functionName: 'walletToAgentId',
      args: [walletAddress],
    });

    return agentId > 0n ? agentId : null;
  } catch {
    return null;
  }
}

// ============================================
// AGENT EXECUTION HELPERS
// ============================================

/**
 * Log execution start and return execution ID
 */
export async function logExecutionStart(
  walletClient: WalletClient,
  publicClient: PublicClient,
  executionAddress: Address,
  userAddress: Address,
  amountIn: bigint,
  tokenIn: Address,
  tokenOut: Address
): Promise<{ hash: Hash; executionId: bigint }> {
  // @ts-expect-error - viem 2.x requires chain but walletClient has it configured
  const hash = await walletClient.writeContract({
    address: executionAddress,
    abi: AgentExecutionAbi,
    functionName: 'logExecutionStart',
    args: [userAddress, amountIn, tokenIn, tokenOut],
  });

  // Wait for transaction and get execution ID from logs
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse ExecutionStarted event to get executionId
  const executionStartedLog = receipt.logs.find((log) => {
    // ExecutionStarted event topic
    return log.topics[0] === '0x' + Buffer.from('ExecutionStarted(uint256,uint256,address,uint256,address,address)').toString('hex').slice(0, 64);
  });

  // executionId is the first indexed parameter (topics[1])
  const executionId = executionStartedLog?.topics[1]
    ? BigInt(executionStartedLog.topics[1])
    : await getLatestExecutionId(publicClient, executionAddress);

  return { hash, executionId };
}

/**
 * Log execution complete
 */
export async function logExecutionComplete(
  walletClient: WalletClient,
  publicClient: PublicClient,
  executionAddress: Address,
  executionId: bigint,
  userAddress: Address,
  amountIn: bigint,
  amountOut: bigint,
  result: ExecutionResult
): Promise<Hash> {
  // @ts-expect-error - viem 2.x requires chain but walletClient has it configured
  const hash = await walletClient.writeContract({
    address: executionAddress,
    abi: AgentExecutionAbi,
    functionName: 'logExecutionComplete',
    args: [executionId, userAddress, amountIn, amountOut, result],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Log redelegation to child agent
 */
export async function logRedelegation(
  walletClient: WalletClient,
  publicClient: PublicClient,
  executionAddress: Address,
  childAgentId: bigint,
  userAddress: Address,
  amount: bigint,
  duration: bigint
): Promise<Hash> {
  // @ts-expect-error - viem 2.x requires chain but walletClient has it configured
  const hash = await walletClient.writeContract({
    address: executionAddress,
    abi: AgentExecutionAbi,
    functionName: 'logRedelegation',
    args: [childAgentId, userAddress, amount, duration],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Get latest execution ID from contract
 */
export async function getLatestExecutionId(
  publicClient: PublicClient,
  executionAddress: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: executionAddress,
    abi: AgentExecutionAbi,
    functionName: 'totalExecutions',
  });
}

/**
 * Check if an execution is pending
 */
export async function isExecutionPending(
  publicClient: PublicClient,
  executionAddress: Address,
  executionId: bigint
): Promise<boolean> {
  return publicClient.readContract({
    address: executionAddress,
    abi: AgentExecutionAbi,
    functionName: 'isExecutionPending',
    args: [executionId],
  });
}

// ============================================
// ERC20 HELPERS
// ============================================

/**
 * Get token balance
 */
export async function getTokenBalance(
  publicClient: PublicClient,
  tokenAddress: Address,
  accountAddress: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20Abi,
    functionName: 'balanceOf',
    args: [accountAddress],
  });
}

/**
 * Get token allowance
 */
export async function getTokenAllowance(
  publicClient: PublicClient,
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20Abi,
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress],
  });
}

/**
 * Approve token spending
 */
export async function approveToken(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tokenAddress: Address,
  spenderAddress: Address,
  amount: bigint
): Promise<Hash> {
  // @ts-expect-error - viem 2.x requires chain but walletClient has it configured
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20Abi,
    functionName: 'approve',
    args: [spenderAddress, amount],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  publicClient: PublicClient,
  tokenAddress: Address
): Promise<number> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20Abi,
    functionName: 'decimals',
  });
}

// ============================================
// UNISWAP V3 HELPERS
// ============================================

/**
 * Get swap quote from Uniswap V3 Quoter
 */
export async function getSwapQuote(
  publicClient: PublicClient,
  quoterAddress: Address,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  fee: number = 3000 // 0.3% default
): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  try {
    // QuoterV2 requires simulation via eth_call
    const result = await publicClient.simulateContract({
      address: quoterAddress,
      abi: UniswapV3QuoterAbi,
      functionName: 'quoteExactInputSingle',
      args: [
        {
          tokenIn,
          tokenOut,
          amountIn,
          fee,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    const [amountOut, , , gasEstimate] = result.result as [bigint, bigint, number, bigint];
    return { amountOut, gasEstimate };
  } catch (error) {
    throw new Error(`Failed to get swap quote: ${error}`);
  }
}

/**
 * Execute swap on Uniswap V3
 */
export async function executeSwap(
  walletClient: WalletClient,
  publicClient: PublicClient,
  routerAddress: Address,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  amountOutMinimum: bigint,
  recipient: Address,
  fee: number = 3000
): Promise<{ hash: Hash; amountOut: bigint }> {
  // @ts-expect-error - viem 2.x requires chain but walletClient has it configured
  const hash = await walletClient.writeContract({
    address: routerAddress,
    abi: UniswapV3RouterAbi,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn,
        tokenOut,
        fee,
        recipient,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse Transfer event to get actual amountOut
  // This is a simplified version - in production, parse the Swap event
  const amountOut = amountOutMinimum; // Fallback to minimum

  return { hash, amountOut };
}
