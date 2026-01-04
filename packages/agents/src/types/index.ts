/**
 * Echelon Agents - Type Definitions
 *
 * Core TypeScript types aligned with smart contracts and Envio indexer schema.
 */

import type { Address, Hash } from 'viem';

// ============================================
// CONFIGURATION TYPES
// ============================================

/**
 * Agent configuration loaded from environment variables
 */
export interface AgentConfig {
  /** On-chain agent ID */
  agentId: string;
  /** Agent wallet private key (hex with 0x prefix) */
  privateKey: `0x${string}`;
  /** AgentRegistry contract address */
  registryAddress: Address;
  /** AgentExecution contract address */
  executionAddress: Address;
  /** Ethereum RPC endpoint */
  rpcUrl: string;
  /** Envio GraphQL endpoint */
  envioUrl: string;
  /** Polling interval in milliseconds (default: 60000) */
  pollingIntervalMs: number;
  /** Chain ID (default: 11155111 for Sepolia) */
  chainId: number;
}

/**
 * Extended config for DexSwapAgent with Uniswap addresses
 */
export interface DexSwapAgentConfig extends AgentConfig {
  /** Uniswap V3 SwapRouter02 address */
  uniswapRouterAddress: Address;
  /** Uniswap V3 QuoterV2 address */
  uniswapQuoterAddress: Address;
  /** WETH token address */
  wethAddress: Address;
  /** USDC token address */
  usdcAddress: Address;
  /** Slippage tolerance as decimal (default: 0.005 = 0.5%) */
  slippageTolerance: number;
}

// ============================================
// CONTRACT TYPES (matching Solidity)
// ============================================

/**
 * Execution result enum - must match IAgentExecution.ExecutionResult
 */
export enum ExecutionResult {
  PENDING = 0,
  SUCCESS = 1,
  FAILURE = 2,
}

/**
 * Agent metadata from AgentRegistry contract
 */
export interface AgentMetadata {
  walletAddress: Address;
  name: string;
  strategyType: string;
  riskLevel: number;
  registeredAt: bigint;
  isActive: boolean;
}

// ============================================
// INDEXER TYPES (matching Envio schema)
// ============================================

/**
 * Agent entity from Envio indexer
 */
export interface IndexedAgent {
  id: string;
  walletAddress: string;
  ownerAddress: string;
  name: string;
  strategyType: string;
  riskLevel: number;
  registeredAt: string;
  isActive: boolean;
  metadataUri: string;
  totalExecutions: string;
  successfulExecutions: string;
  failedExecutions: string;
  totalVolumeIn: string;
  totalVolumeOut: string;
  totalProfitLoss: string;
  winRate: string;
  reputationScore: number;
  lastExecutionAt?: string;
}

/**
 * Specialist agent - simplified agent data for selection
 */
export interface SpecialistAgent {
  id: string;
  walletAddress: string;
  name: string;
  reputationScore: number;
  strategyType: string;
  winRate: number;
}

/**
 * Permission entity from Envio indexer
 */
export interface Permission {
  id: string;
  user: {
    id: string;
  };
  agent: {
    id: string;
  };
  permissionType: string;
  tokenAddress: string;
  tokenSymbol?: string;
  amountPerPeriod: string;
  periodDuration: string;
  totalAmount: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
  isActive: boolean;
  amountUsed: string;
  amountRemaining: string;
}

/**
 * Execution entity from Envio indexer
 */
export interface IndexedExecution {
  id: string;
  agent: {
    id: string;
    name: string;
  };
  user: {
    id: string;
  };
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  tokenOut: string;
  profitLoss: string;
  profitLossPercent: string;
  result: 'PENDING' | 'SUCCESS' | 'FAILURE';
  startedAt: string;
  completedAt?: string;
  startTxHash: string;
  completeTxHash?: string;
}

/**
 * Agent performance metrics from Envio
 */
export interface AgentPerformance {
  totalExecutions: string;
  successfulExecutions: string;
  failedExecutions: string;
  winRate: string;
  totalProfitLoss: string;
  reputationScore: number;
  avgProfitPerTrade: string;
}

// ============================================
// AGENT STRATEGY TYPES
// ============================================

/**
 * Market conditions for FundManagerAgent decision-making
 */
export interface MarketConditions {
  /** ETH price volatility (0-1 scale, higher = more volatile) */
  ethVolatility: number;
  /** Best available yield APY percentage */
  bestYieldApy: number;
  /** Current market trend direction */
  trendDirection: 'up' | 'down' | 'neutral';
  /** Recent average profit/loss */
  avgRecentProfitLoss: number;
  /** Number of recent executions analyzed */
  sampleSize: number;
}

/**
 * Allocation decision from FundManagerAgent
 */
export interface AllocationDecision {
  /** Amount to allocate (in wei) */
  amount: bigint;
  /** Duration for the allocation (in seconds) */
  duration: bigint;
  /** Target strategy type */
  targetStrategy: string;
  /** Risk factor applied (0-1) */
  riskFactor: number;
}

/**
 * Swap opportunity for DexSwapAgent
 */
export interface SwapOpportunity {
  /** Input token address */
  tokenIn: Address;
  /** Output token address */
  tokenOut: Address;
  /** Input amount (in token's smallest unit) */
  amountIn: bigint;
  /** Expected output amount */
  expectedOut: bigint;
  /** Minimum output with slippage */
  minAmountOut: bigint;
  /** Expected profit percentage */
  profitPercent: number;
  /** User address who granted permission */
  userAddress: Address;
  /** Pool fee tier (e.g., 3000 = 0.3%) */
  poolFee: number;
}

/**
 * Swap execution result
 */
export interface SwapResult {
  /** Whether the swap was successful */
  success: boolean;
  /** Actual output amount received */
  amountOut: bigint;
  /** Transaction hash */
  txHash: Hash;
  /** Gas used */
  gasUsed?: bigint;
  /** Error message if failed */
  error?: string;
}

// ============================================
// GRAPHQL RESPONSE TYPES
// ============================================

/**
 * Generic GraphQL response wrapper
 */
export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

/**
 * Agent leaderboard query response
 */
export interface LeaderboardResponse {
  agents: SpecialistAgent[];
}

/**
 * Agent permissions query response
 */
export interface AgentPermissionsResponse {
  agent: {
    permissionsReceived: Permission[];
  } | null;
}

/**
 * Recent executions query response
 */
export interface RecentExecutionsResponse {
  executions: IndexedExecution[];
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Log level for AgentLogger
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Strategy types supported by the system
 */
export type StrategyType =
  | 'DCA'
  | 'Arbitrage'
  | 'Yield'
  | 'Momentum'
  | 'MeanReversion'
  | 'GridTrading'
  | 'Manager';

/**
 * Mapping of strategy types to risk levels
 */
export const STRATEGY_RISK_LEVELS: Record<StrategyType, { min: number; max: number }> = {
  DCA: { min: 1, max: 3 },
  Arbitrage: { min: 4, max: 6 },
  Yield: { min: 4, max: 6 },
  Momentum: { min: 7, max: 9 },
  MeanReversion: { min: 5, max: 7 },
  GridTrading: { min: 4, max: 7 },
  Manager: { min: 3, max: 5 },
};
