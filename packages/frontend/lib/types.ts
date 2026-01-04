// ===========================================
// Echelon Type Definitions
// Matches GraphQL schema from indexer
// ===========================================

import type { EIP1193Provider } from "viem";

// ===========================================
// Global Type Extensions
// ===========================================

// Extended ethereum provider type for MetaMask
export type MetaMaskProvider = EIP1193Provider & {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

// Extend Window interface for MetaMask ethereum provider
declare global {
  interface Window {
    ethereum?: MetaMaskProvider;
  }
}

// Strategy types supported by agents
export type StrategyType =
  | "DCA"
  | "Arbitrage"
  | "Yield"
  | "Momentum"
  | "MeanReversion"
  | "GridTrading";

// Execution result states
export type ExecutionResult = "PENDING" | "SUCCESS" | "FAILURE";

// ===========================================
// Core Entities
// ===========================================

export interface Agent {
  id: string;
  walletAddress: string;
  ownerAddress: string;
  name: string;
  strategyType: StrategyType;
  riskLevel: number;
  registeredAt: string;
  isActive: boolean;
  isVerified: boolean; // Verified by Echelon (set by contract owner)
  isOrchestrator: boolean; // Orchestrator badge (manages other agents, no direct trades)
  metadataUri: string;

  // Performance Metrics
  totalExecutions: string;
  successfulExecutions: string;
  failedExecutions: string;
  pendingExecutions: string;

  // Volume Metrics
  totalVolumeIn: string;
  totalVolumeOut: string;
  totalProfitLoss: string;

  // Reputation Metrics
  winRate: string;
  avgProfitPerTrade: string;
  maxDrawdown: string;
  sharpeRatio: string;
  reputationScore: number;

  // Timestamps
  lastExecutionAt?: string;
  updatedAt: string;

  // Relationships (optional, loaded when needed)
  executions?: Execution[];
  permissionsReceived?: Permission[];
  redelegationsAsParent?: Redelegation[];
  redelegationsAsChild?: Redelegation[];
  dailyStats?: AgentDailyStat[];
  feedbacks?: Feedback[];
  reputationSummary?: AgentReputationSummary;

  // Computed (added by frontend)
  rank?: number;
}

export interface Execution {
  id: string;
  agent: Agent;
  user: User;

  // Trade Details
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  tokenOut: string;
  tokenInSymbol?: string;
  tokenOutSymbol?: string;

  // Results
  profitLoss: string;
  profitLossPercent: string;
  result: ExecutionResult;

  // Timing
  startedAt: string;
  completedAt?: string;
  duration?: string;

  // Transaction Info
  startTxHash: string;
  completeTxHash?: string;
  blockNumber: string;

  // Gas Info
  gasUsed?: string;
  gasPrice?: string;
}

export interface User {
  id: string;

  // Stats
  totalDelegated: string;
  currentDelegated: string;
  activePermissions: string;
  totalPermissionsGranted: string;

  // Performance
  totalProfitFromAgents: string;
  bestAgentUsed?: Agent;

  // Timestamps
  firstDelegationAt?: string;
  lastActivityAt?: string;

  // Relationships
  permissions?: Permission[];
  executions?: Execution[];
}

export interface Permission {
  id: string;
  user: User;
  agent: Agent;

  // Permission Parameters
  permissionType: string;
  tokenAddress: string;
  tokenSymbol?: string;
  amountPerPeriod: string;
  periodDuration: string;
  totalAmount: string;

  // Timing
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;

  // Status
  isActive: boolean;
  amountUsed: string;
  amountRemaining: string;
  periodsElapsed: string;

  // Transaction Info
  grantTxHash: string;
  revokeTxHash?: string;
}

export interface Redelegation {
  id: string;
  parentAgent: Agent;
  childAgent: Agent;
  user: User;

  // Delegation Parameters
  amount: string;
  duration: string;

  // Timing
  createdAt: string;
  expiresAt: string;

  // Status
  isActive: boolean;

  // Transaction Info
  txHash: string;
}

// ===========================================
// Analytics Entities
// ===========================================

export interface AgentDailyStat {
  id: string;
  agent: Agent;
  date: string;
  timestamp: string;

  // Daily Metrics
  executionCount: string;
  successCount: string;
  failureCount: string;
  volumeIn: string;
  volumeOut: string;
  profitLoss: string;
  winRate: string;

  // Rankings
  dailyRank?: number;
}

export interface GlobalStats {
  id: string;

  // Counts
  totalAgents: string;
  activeAgents: string;
  totalUsers: string;
  totalExecutions: string;
  totalPermissions: string;
  activePermissions: string;
  totalRedelegations: string;

  // Volume
  totalVolumeProcessed: string;
  totalProfitGenerated: string;

  // Timestamps
  lastUpdated: string;
}

export interface LeaderboardSnapshot {
  id: string;
  timestamp: string;
  rankings: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  id: string;
  snapshot: LeaderboardSnapshot;
  agent: Agent;
  rank: number;
  reputationScore: number;
  winRate: string;
  totalVolume: string;
  profitLoss: string;
}

// ===========================================
// ERC-8004 Reputation Entities
// ===========================================

export interface Feedback {
  id: string;
  agent: Agent;
  clientAddress: string;

  // Feedback Details
  score: number;
  tag1: string;
  tag2: string;
  fileUri?: string;
  fileHash?: string;

  // Status
  isRevoked: boolean;

  // Timestamps
  createdAt: string;
  revokedAt?: string;

  // Transaction Info
  txHash: string;
  blockNumber: string;

  // Relationships
  responses?: FeedbackResponse[];
}

export interface FeedbackResponse {
  id: string;
  feedback: Feedback;
  responder: string;

  // Response Details
  responseUri: string;
  responseHash: string;

  // Timestamps
  createdAt: string;

  // Transaction Info
  txHash: string;
  blockNumber: string;
}

// ===========================================
// ERC-8004 Validation Entities
// ===========================================

export interface ValidationRequest {
  id: string;
  agent: Agent;
  validator: string;
  requester: string;

  // Request Details
  requestUri: string;

  // Response Details
  hasResponse: boolean;
  response?: number;
  responseUri?: string;
  responseHash?: string;
  tag?: string;

  // Timestamps
  requestedAt: string;
  respondedAt?: string;

  // Transaction Info
  requestTxHash: string;
  responseTxHash?: string;
  blockNumber: string;
}

export interface Validator {
  id: string;
  totalRequests: string;
  completedRequests: string;
  avgResponseScore: string;

  // Timestamps
  firstRequestAt?: string;
  lastActivityAt?: string;
}

export interface AgentReputationSummary {
  id: string;
  agent: Agent;

  // Feedback Metrics
  totalFeedbackCount: string;
  activeFeedbackCount: string;
  avgFeedbackScore: string;

  // Validation Metrics
  totalValidationRequests: string;
  completedValidations: string;
  avgValidationScore: string;

  // Combined Score
  combinedReputationScore: number;

  // Timestamps
  lastUpdated: string;
}

// ===========================================
// UI Helper Types
// ===========================================

export interface RankedAgent extends Agent {
  rank: number;
}

export interface AgentWithStats extends Agent {
  dailyStats: AgentDailyStat[];
  executions: Execution[];
}

export interface UserDashboard extends User {
  permissions: Permission[];
  executions: Execution[];
}

// Query variables
export interface LeaderboardQueryVars {
  first: number;
  skip?: number;
  strategyType?: string;
}

export interface AgentDetailsQueryVars {
  agentId: string;
}

export interface UserDashboardQueryVars {
  userId: string;
}

// Component props types
export interface AgentCardProps {
  agent: RankedAgent;
  rank: number;
}

export interface ExecutionRowProps {
  execution: Execution;
  showAgent?: boolean;
}

export interface PermissionCardProps {
  permission: Permission;
  onRevoke?: (id: string) => void;
}
