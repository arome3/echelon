import { gql } from "@apollo/client";

// ===========================================
// GraphQL Fragments
// Reusable field selections for Echelon entities
// ===========================================

/**
 * Core agent fields used in lists and cards
 */
export const AGENT_CORE_FIELDS = gql`
  fragment AgentCoreFields on Agent {
    id
    walletAddress
    ownerAddress
    name
    strategyType
    riskLevel
    registeredAt
    isActive
    isVerified
    isOrchestrator
    reputationScore
    updatedAt
  }
`;

/**
 * Agent performance metrics
 */
export const AGENT_PERFORMANCE_FIELDS = gql`
  fragment AgentPerformanceFields on Agent {
    totalExecutions
    successfulExecutions
    failedExecutions
    pendingExecutions
    winRate
    totalProfitLoss
    avgProfitPerTrade
    maxDrawdown
    sharpeRatio
    lastExecutionAt
  }
`;

/**
 * Agent volume metrics
 */
export const AGENT_VOLUME_FIELDS = gql`
  fragment AgentVolumeFields on Agent {
    totalVolumeIn
    totalVolumeOut
  }
`;

/**
 * Full agent fields for detail pages
 */
export const AGENT_FULL_FIELDS = gql`
  fragment AgentFullFields on Agent {
    ...AgentCoreFields
    ...AgentPerformanceFields
    ...AgentVolumeFields
    metadataUri
  }
  ${AGENT_CORE_FIELDS}
  ${AGENT_PERFORMANCE_FIELDS}
  ${AGENT_VOLUME_FIELDS}
`;

/**
 * Minimal agent reference (for nested queries)
 */
export const AGENT_REF_FIELDS = gql`
  fragment AgentRefFields on Agent {
    id
    name
    walletAddress
    reputationScore
    strategyType
    isVerified
    isOrchestrator
  }
`;

/**
 * Core execution fields
 */
export const EXECUTION_FIELDS = gql`
  fragment ExecutionFields on Execution {
    id
    amountIn
    amountOut
    tokenIn
    tokenOut
    tokenInSymbol
    tokenOutSymbol
    profitLoss
    profitLossPercent
    result
    startedAt
    completedAt
    duration
    startTxHash
    completeTxHash
    blockNumber
  }
`;

/**
 * Execution with agent reference
 */
export const EXECUTION_WITH_AGENT_FIELDS = gql`
  fragment ExecutionWithAgentFields on Execution {
    ...ExecutionFields
    agent {
      ...AgentRefFields
    }
  }
  ${EXECUTION_FIELDS}
  ${AGENT_REF_FIELDS}
`;

/**
 * Core user fields
 */
export const USER_CORE_FIELDS = gql`
  fragment UserCoreFields on User {
    id
    totalDelegated
    currentDelegated
    activePermissions
    totalPermissionsGranted
    totalProfitFromAgents
    firstDelegationAt
    lastActivityAt
  }
`;

/**
 * Permission fields
 */
export const PERMISSION_FIELDS = gql`
  fragment PermissionFields on Permission {
    id
    permissionType
    tokenAddress
    tokenSymbol
    amountPerPeriod
    periodDuration
    totalAmount
    grantedAt
    expiresAt
    revokedAt
    isActive
    amountUsed
    amountRemaining
    periodsElapsed
    grantTxHash
    revokeTxHash
  }
`;

/**
 * Permission with agent reference
 */
export const PERMISSION_WITH_AGENT_FIELDS = gql`
  fragment PermissionWithAgentFields on Permission {
    ...PermissionFields
    agent {
      ...AgentRefFields
    }
  }
  ${PERMISSION_FIELDS}
  ${AGENT_REF_FIELDS}
`;

/**
 * Redelegation fields
 */
export const REDELEGATION_FIELDS = gql`
  fragment RedelegationFields on Redelegation {
    id
    amount
    duration
    createdAt
    expiresAt
    isActive
    txHash
  }
`;

/**
 * Agent daily stats fields
 */
export const AGENT_DAILY_STAT_FIELDS = gql`
  fragment AgentDailyStatFields on AgentDailyStat {
    id
    date
    timestamp
    executionCount
    successCount
    failureCount
    volumeIn
    volumeOut
    profitLoss
    winRate
    dailyRank
  }
`;

/**
 * Global stats fields
 */
export const GLOBAL_STATS_FIELDS = gql`
  fragment GlobalStatsFields on GlobalStats {
    id
    totalAgents
    activeAgents
    totalUsers
    totalExecutions
    totalPermissions
    activePermissions
    totalRedelegations
    totalVolumeProcessed
    totalProfitGenerated
    lastUpdated
  }
`;

/**
 * Feedback fields
 */
export const FEEDBACK_FIELDS = gql`
  fragment FeedbackFields on Feedback {
    id
    clientAddress
    score
    tag1
    tag2
    fileUri
    fileHash
    isRevoked
    createdAt
    revokedAt
    txHash
    blockNumber
  }
`;

/**
 * Feedback response fields
 */
export const FEEDBACK_RESPONSE_FIELDS = gql`
  fragment FeedbackResponseFields on FeedbackResponse {
    id
    responder
    responseUri
    responseHash
    createdAt
    txHash
    blockNumber
  }
`;

/**
 * Validation request fields
 */
export const VALIDATION_REQUEST_FIELDS = gql`
  fragment ValidationRequestFields on ValidationRequest {
    id
    validator
    requester
    requestUri
    hasResponse
    response
    responseUri
    responseHash
    tag
    requestedAt
    respondedAt
    requestTxHash
    responseTxHash
    blockNumber
  }
`;

/**
 * Agent reputation summary fields
 */
export const AGENT_REPUTATION_SUMMARY_FIELDS = gql`
  fragment AgentReputationSummaryFields on AgentReputationSummary {
    id
    totalFeedbackCount
    activeFeedbackCount
    avgFeedbackScore
    totalValidationRequests
    completedValidations
    avgValidationScore
    combinedReputationScore
    lastUpdated
  }
`;

/**
 * Leaderboard entry fields
 */
export const LEADERBOARD_ENTRY_FIELDS = gql`
  fragment LeaderboardEntryFields on LeaderboardEntry {
    id
    rank
    reputationScore
    winRate
    totalVolume
    profitLoss
    agent {
      ...AgentCoreFields
    }
  }
  ${AGENT_CORE_FIELDS}
`;
