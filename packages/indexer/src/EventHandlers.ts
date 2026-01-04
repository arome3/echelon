// @ts-nocheck
/**
 * Echelon Event Handlers
 * Processes blockchain events and updates indexed entities
 * Includes handlers for:
 * - AgentRegistry (ERC-8004 Identity)
 * - AgentExecution (Execution logging)
 * - ReputationRegistry (ERC-8004 Reputation)
 * - ValidationRegistry (ERC-8004 Validation)
 *
 * Note: @ts-nocheck is used because Envio's runtime handles type inference
 * for event handlers. The generated types are available at runtime.
 */

import {
  AgentRegistry,
  AgentExecution,
  ReputationRegistry,
  ValidationRegistry,
  DelegationManager,
  PermissionRegistry,
} from "../generated";
import type {
  Agent,
  Execution,
  User,
  Permission,
  Redelegation,
  AgentDailyStat,
  GlobalStats,
  Feedback,
  FeedbackResponse,
  ValidationRequest,
  Validator,
  AgentReputationSummary,
  ERC7710Delegation,
  DelegationRedemptionEvent,
  handlerContext,
} from "../generated";
import {
  calculateReputationScore,
  calculateWinRate,
  getDayId,
  getDateString,
  calculateRunningMaxDrawdown,
  calculateSimplifiedSharpe,
} from "./utils/reputation";

// ============================================
// CONSTANTS
// ============================================

const ZERO_BD = "0";
const ZERO_BI = BigInt(0);
const INITIAL_REPUTATION = 50;

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getOrCreateUser(context: handlerContext, userAddress: string): Promise<User> {
  let user = await context.User.get(userAddress);

  if (!user) {
    user = {
      id: userAddress,
      totalDelegated: ZERO_BD,
      currentDelegated: ZERO_BD,
      activePermissions: ZERO_BI,
      totalPermissionsGranted: ZERO_BI,
      totalProfitFromAgents: ZERO_BD,
      bestAgentUsed: undefined,
      firstDelegationAt: undefined,
      lastActivityAt: undefined,
    };
    context.User.set(user);

    // Update global user count
    const globalStats = await getOrCreateGlobalStats(context);
    context.GlobalStats.set({
      ...globalStats,
      totalUsers: globalStats.totalUsers + BigInt(1),
    });
  }

  return user;
}

async function getOrCreateGlobalStats(context: handlerContext): Promise<GlobalStats> {
  let stats = await context.GlobalStats.get("global");

  if (!stats) {
    stats = {
      id: "global",
      totalAgents: ZERO_BI,
      activeAgents: ZERO_BI,
      totalUsers: ZERO_BI,
      totalExecutions: ZERO_BI,
      totalPermissions: ZERO_BI,
      activePermissions: ZERO_BI,
      totalRedelegations: ZERO_BI,
      totalVolumeProcessed: ZERO_BD,
      totalProfitGenerated: ZERO_BD,
      lastUpdated: ZERO_BI,
    };
    context.GlobalStats.set(stats);
  }

  return stats;
}

async function getOrCreateDailyStat(
  context: handlerContext,
  agentId: string,
  timestamp: bigint
): Promise<AgentDailyStat> {
  const dayId = getDayId(timestamp);
  const id = `${agentId}-${dayId}`;

  let stat = await context.AgentDailyStat.get(id);

  if (!stat) {
    stat = {
      id,
      agent_id: agentId,
      date: getDateString(timestamp),
      timestamp: BigInt(dayId) * BigInt(86400),
      executionCount: ZERO_BI,
      successCount: ZERO_BI,
      failureCount: ZERO_BI,
      volumeIn: ZERO_BD,
      volumeOut: ZERO_BD,
      profitLoss: ZERO_BD,
      winRate: ZERO_BD,
      dailyRank: undefined,
    };
    context.AgentDailyStat.set(stat);
  }

  return stat;
}

// ============================================
// AGENT REGISTRY HANDLERS
// ============================================

AgentRegistry.AgentRegistered.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const blockTimestamp = BigInt(event.block.timestamp);

  // Create new agent entity
  const agent: Agent = {
    id: agentId,
    walletAddress: event.params.walletAddress.toLowerCase(),
    ownerAddress: event.transaction?.from?.toLowerCase() || event.params.walletAddress.toLowerCase(),
    name: event.params.name,
    strategyType: event.params.strategyType,
    riskLevel: Number(event.params.riskLevel),
    registeredAt: blockTimestamp,
    isActive: true,
    isVerified: false, // New agents start unverified (owner can verify later)
    isOrchestrator: false, // New agents start as non-orchestrators (owner can set later)
    metadataUri: "",

    // Initialize performance metrics
    totalExecutions: ZERO_BI,
    successfulExecutions: ZERO_BI,
    failedExecutions: ZERO_BI,
    pendingExecutions: ZERO_BI,

    // Initialize volume metrics
    totalVolumeIn: ZERO_BD,
    totalVolumeOut: ZERO_BD,
    totalProfitLoss: ZERO_BD,

    // Initialize reputation metrics
    winRate: ZERO_BD,
    avgProfitPerTrade: ZERO_BD,
    maxDrawdown: ZERO_BD,
    sharpeRatio: ZERO_BD,
    reputationScore: INITIAL_REPUTATION,

    // Initialize timestamps
    lastExecutionAt: undefined,
    updatedAt: blockTimestamp,
  };

  context.Agent.set(agent);

  // Update global stats
  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalAgents: globalStats.totalAgents + BigInt(1),
    activeAgents: globalStats.activeAgents + BigInt(1),
    lastUpdated: blockTimestamp,
  });

  context.log.info(`Agent registered: ${agentId} - ${event.params.name}`);
});

AgentRegistry.AgentUpdated.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const agent = await context.Agent.get(agentId);

  if (agent) {
    context.Agent.set({
      ...agent,
      metadataUri: event.params.metadataUri,
      updatedAt: BigInt(event.block.timestamp),
    });
  }
});

AgentRegistry.AgentDeactivated.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const agent = await context.Agent.get(agentId);

  if (agent) {
    context.Agent.set({
      ...agent,
      isActive: false,
      updatedAt: BigInt(event.block.timestamp),
    });

    // Update global stats
    const globalStats = await getOrCreateGlobalStats(context);
    context.GlobalStats.set({
      ...globalStats,
      activeAgents: globalStats.activeAgents - BigInt(1),
      lastUpdated: BigInt(event.block.timestamp),
    });

    context.log.info(`Agent deactivated: ${agentId}`);
  }
});

AgentRegistry.AgentReactivated.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const agent = await context.Agent.get(agentId);

  if (agent) {
    context.Agent.set({
      ...agent,
      isActive: true,
      updatedAt: BigInt(event.block.timestamp),
    });

    // Update global stats
    const globalStats = await getOrCreateGlobalStats(context);
    context.GlobalStats.set({
      ...globalStats,
      activeAgents: globalStats.activeAgents + BigInt(1),
      lastUpdated: BigInt(event.block.timestamp),
    });

    context.log.info(`Agent reactivated: ${agentId}`);
  }
});

/**
 * Handle agent verification status changes.
 * Only the contract owner (Echelon) can verify/unverify agents.
 * Verified agents display a trust badge in the UI.
 */
AgentRegistry.AgentVerified.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const verified = event.params.verified;
  const blockTimestamp = BigInt(event.block.timestamp);

  const agent = await context.Agent.get(agentId);

  if (agent) {
    context.Agent.set({
      ...agent,
      isVerified: verified,
      updatedAt: blockTimestamp,
    });

    context.log.info(`Agent ${verified ? "verified" : "unverified"}: ${agentId}`);
  } else {
    context.log.warn(`Agent not found for verification update: ${agentId}`);
  }
});

/**
 * Handler: AgentOrchestratorSet
 * Triggered when an agent's orchestrator status is changed.
 * Orchestrator agents manage other agents and don't trade directly.
 */
AgentRegistry.AgentOrchestratorSet.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const isOrchestrator = event.params.isOrchestrator;
  const blockTimestamp = BigInt(event.block.timestamp);

  const agent = await context.Agent.get(agentId);

  if (agent) {
    // Orchestrators get max reputation since they don't execute trades directly
    // Their value comes from managing other agents, not individual performance
    const orchestratorReputation = isOrchestrator ? 100 : agent.reputationScore;

    context.Agent.set({
      ...agent,
      isOrchestrator: isOrchestrator,
      reputationScore: orchestratorReputation,
      updatedAt: blockTimestamp,
    });

    context.log.info(`Agent orchestrator status ${isOrchestrator ? "set" : "removed"}: ${agentId} (reputation: ${orchestratorReputation})`);
  } else {
    context.log.warn(`Agent not found for orchestrator update: ${agentId}`);
  }
});

// ============================================
// AGENT EXECUTION HANDLERS
// ============================================

AgentExecution.ExecutionStarted.handler(async ({ event, context }) => {
  const executionId = event.params.executionId.toString();
  const agentId = event.params.agentId.toString();
  const userAddress = event.params.userAddress.toLowerCase();
  const blockTimestamp = BigInt(event.block.timestamp);

  // Ensure user exists
  await getOrCreateUser(context, userAddress);

  // Create execution entity
  const execution: Execution = {
    id: executionId,
    agent_id: agentId,
    user_id: userAddress,
    amountIn: event.params.amountIn.toString(),
    amountOut: ZERO_BD,
    tokenIn: event.params.tokenIn.toLowerCase(),
    tokenOut: event.params.tokenOut.toLowerCase(),
    tokenInSymbol: undefined,
    tokenOutSymbol: undefined,
    profitLoss: ZERO_BD,
    profitLossPercent: ZERO_BD,
    result: "PENDING",
    startedAt: blockTimestamp,
    completedAt: undefined,
    duration: undefined,
    startTxHash: event.transaction?.hash || "",
    completeTxHash: undefined,
    blockNumber: BigInt(event.block.number),
    gasUsed: undefined,
    gasPrice: undefined,
  };

  context.Execution.set(execution);

  // Update agent pending count
  const agent = await context.Agent.get(agentId);
  if (agent) {
    context.Agent.set({
      ...agent,
      pendingExecutions: agent.pendingExecutions + BigInt(1),
      lastExecutionAt: blockTimestamp,
      updatedAt: blockTimestamp,
    });
  }

  // Update global stats
  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalExecutions: globalStats.totalExecutions + BigInt(1),
    lastUpdated: blockTimestamp,
  });
});

AgentExecution.ExecutionCompleted.handler(async ({ event, context }) => {
  const executionId = event.params.executionId.toString();
  const agentId = event.params.agentId.toString();
  const blockTimestamp = BigInt(event.block.timestamp);

  // Update execution
  const execution = await context.Execution.get(executionId);
  if (!execution) {
    context.log.warn(`Execution not found: ${executionId}`);
    return;
  }

  const amountIn = parseFloat(execution.amountIn);
  const amountOut = parseFloat(event.params.amountOut.toString());
  const profitLoss = parseFloat(event.params.profitLoss.toString());
  const profitLossPercent = amountIn > 0 ? (profitLoss / amountIn) * 100 : 0;
  const duration = blockTimestamp - execution.startedAt;

  // Map result enum (0 = PENDING, 1 = SUCCESS, 2 = FAILURE)
  const resultValue = Number(event.params.result);
  const result = resultValue === 1 ? "SUCCESS" : "FAILURE";

  context.Execution.set({
    ...execution,
    amountOut: amountOut.toString(),
    profitLoss: profitLoss.toString(),
    profitLossPercent: profitLossPercent.toString(),
    result,
    completedAt: blockTimestamp,
    duration,
    completeTxHash: event.transaction?.hash || "",
  });

  // Update agent metrics
  const agent = await context.Agent.get(agentId);
  if (agent) {
    const isSuccess = result === "SUCCESS";

    const newTotalExecutions = agent.totalExecutions + BigInt(1);
    const newSuccessful = isSuccess
      ? agent.successfulExecutions + BigInt(1)
      : agent.successfulExecutions;
    const newFailed = !isSuccess
      ? agent.failedExecutions + BigInt(1)
      : agent.failedExecutions;
    const newPending = agent.pendingExecutions - BigInt(1);

    const newVolumeIn = parseFloat(agent.totalVolumeIn) + amountIn;
    const newVolumeOut = parseFloat(agent.totalVolumeOut) + amountOut;
    const newProfitLoss = parseFloat(agent.totalProfitLoss) + profitLoss;

    // Calculate new metrics
    const winRate = calculateWinRate(Number(newSuccessful), Number(newTotalExecutions));

    const avgProfitPerTrade =
      Number(newTotalExecutions) > 0 ? newProfitLoss / Number(newTotalExecutions) : 0;

    // Calculate max drawdown (running calculation)
    const currentMaxDrawdown = parseFloat(agent.maxDrawdown) || 0;
    const previousProfitLoss = parseFloat(agent.totalProfitLoss);
    const previousVolumeIn = parseFloat(agent.totalVolumeIn);
    const newMaxDrawdown = calculateRunningMaxDrawdown(
      currentMaxDrawdown,
      previousProfitLoss,
      profitLoss,
      previousVolumeIn
    );

    // Calculate Sharpe ratio
    const newSharpeRatio = calculateSimplifiedSharpe(
      avgProfitPerTrade,
      newVolumeIn,
      Number(newTotalExecutions),
      winRate
    );

    // Calculate reputation score
    const reputationScore = calculateReputationScore({
      winRate,
      totalVolume: newVolumeIn,
      profitLoss: newProfitLoss,
      executionCount: Number(newTotalExecutions),
      avgProfitPerTrade,
    });

    context.Agent.set({
      ...agent,
      totalExecutions: newTotalExecutions,
      successfulExecutions: newSuccessful,
      failedExecutions: newFailed,
      pendingExecutions: newPending,
      totalVolumeIn: newVolumeIn.toString(),
      totalVolumeOut: newVolumeOut.toString(),
      totalProfitLoss: newProfitLoss.toString(),
      winRate: winRate.toString(),
      avgProfitPerTrade: avgProfitPerTrade.toString(),
      maxDrawdown: newMaxDrawdown.toString(),
      sharpeRatio: newSharpeRatio.toString(),
      reputationScore,
      updatedAt: blockTimestamp,
    });

    // Update daily stats
    const dailyStat = await getOrCreateDailyStat(context, agentId, blockTimestamp);
    context.AgentDailyStat.set({
      ...dailyStat,
      executionCount: dailyStat.executionCount + BigInt(1),
      successCount: isSuccess ? dailyStat.successCount + BigInt(1) : dailyStat.successCount,
      failureCount: !isSuccess ? dailyStat.failureCount + BigInt(1) : dailyStat.failureCount,
      volumeIn: (parseFloat(dailyStat.volumeIn) + amountIn).toString(),
      volumeOut: (parseFloat(dailyStat.volumeOut) + amountOut).toString(),
      profitLoss: (parseFloat(dailyStat.profitLoss) + profitLoss).toString(),
      winRate: calculateWinRate(
        Number(dailyStat.successCount) + (isSuccess ? 1 : 0),
        Number(dailyStat.executionCount) + 1
      ).toString(),
    });
  }

  // Update user stats
  const user = await context.User.get(execution.user_id);
  if (user) {
    const newProfit = parseFloat(user.totalProfitFromAgents) + profitLoss;
    context.User.set({
      ...user,
      totalProfitFromAgents: newProfit.toString(),
      lastActivityAt: blockTimestamp,
    });
  }

  // Update global stats
  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalVolumeProcessed: (parseFloat(globalStats.totalVolumeProcessed) + amountIn).toString(),
    totalProfitGenerated: (parseFloat(globalStats.totalProfitGenerated) + profitLoss).toString(),
    lastUpdated: blockTimestamp,
  });
});

AgentExecution.RedelegationCreated.handler(async ({ event, context }) => {
  const blockTimestamp = BigInt(event.block.timestamp);
  const parentAgentId = event.params.parentAgentId.toString();
  const childAgentId = event.params.childAgentId.toString();
  const userAddress = event.params.userAddress.toLowerCase();

  const redelegationId = `${parentAgentId}-${childAgentId}-${blockTimestamp}`;

  // Ensure user exists
  await getOrCreateUser(context, userAddress);

  // Create redelegation entity
  const redelegation: Redelegation = {
    id: redelegationId,
    parentAgent_id: parentAgentId,
    childAgent_id: childAgentId,
    user_id: userAddress,
    amount: event.params.amount.toString(),
    duration: BigInt(event.params.duration),
    createdAt: blockTimestamp,
    expiresAt: blockTimestamp + BigInt(event.params.duration),
    isActive: true,
    txHash: event.transaction?.hash || "",
  };

  context.Redelegation.set(redelegation);

  // Update global stats
  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalRedelegations: globalStats.totalRedelegations + BigInt(1),
    lastUpdated: blockTimestamp,
  });

  context.log.info(
    `Redelegation created: ${parentAgentId} -> ${childAgentId} (${event.params.amount})`
  );
});

// ============================================
// AUTO-FEEDBACK EVENTS
// ============================================

/**
 * Handle automatic feedback submission from AgentExecution
 * Creates a Feedback entity and updates reputation summary
 */
AgentExecution.AutoFeedbackSubmitted.handler(async ({ event, context }) => {
  const blockTimestamp = BigInt(event.block.timestamp);
  const executionId = event.params.executionId.toString();
  const agentId = event.params.agentId.toString();
  const userAddress = event.params.userAddress.toLowerCase();
  const score = event.params.score;

  // Create unique feedback ID
  const feedbackId = `auto-${executionId}-${agentId}-${userAddress}`;

  // Ensure user exists
  await getOrCreateUser(context, userAddress);

  // Create feedback entity
  const feedback: Feedback = {
    id: feedbackId,
    agent_id: agentId,
    clientAddress: userAddress,
    score: score,
    tag1: "0x" + Buffer.from("EXECUTION").toString("hex").padEnd(64, "0"),
    tag2: score >= 50
      ? "0x" + Buffer.from("SUCCESS").toString("hex").padEnd(64, "0")
      : "0x" + Buffer.from("FAILURE").toString("hex").padEnd(64, "0"),
    fileUri: "",
    fileHash: "",
    isRevoked: false,
    createdAt: blockTimestamp,
    revokedAt: undefined,
    txHash: event.transaction?.hash || "",
  };

  context.Feedback.set(feedback);

  // Update reputation summary
  const summary = await getOrCreateReputationSummary(context, agentId);
  const newTotalCount = summary.totalFeedbackCount + BigInt(1);
  const newActiveCount = summary.activeFeedbackCount + BigInt(1);

  // Calculate new average (running average)
  const oldTotal = parseFloat(summary.avgFeedbackScore) * Number(summary.activeFeedbackCount);
  const newAvg = newActiveCount > 0 ? ((oldTotal + score) / Number(newActiveCount)).toFixed(2) : "0";

  context.AgentReputationSummary.set({
    ...summary,
    totalFeedbackCount: newTotalCount,
    activeFeedbackCount: newActiveCount,
    avgFeedbackScore: newAvg,
    lastUpdated: blockTimestamp,
  });

  context.log.info(
    `Auto feedback submitted for agent ${agentId} from execution ${executionId} with score ${score}`
  );
});

/**
 * Handle automatic feedback failure from AgentExecution
 * Logs the failure for debugging and analytics
 */
AgentExecution.AutoFeedbackFailed.handler(async ({ event, context }) => {
  const executionId = event.params.executionId.toString();
  const agentId = event.params.agentId.toString();
  const reason = event.params.reason;

  context.log.warn(
    `Auto feedback failed for agent ${agentId} execution ${executionId}: ${reason}`
  );

  // Could create a FeedbackError entity here for tracking if needed
});

// ============================================
// REPUTATION REGISTRY HELPERS
// ============================================

/**
 * Get or create an AgentReputationSummary entity
 */
async function getOrCreateReputationSummary(
  context: handlerContext,
  agentId: string
): Promise<AgentReputationSummary> {
  let summary = await context.AgentReputationSummary.get(agentId);

  if (!summary) {
    summary = {
      id: agentId,
      agent_id: agentId,
      totalFeedbackCount: ZERO_BI,
      activeFeedbackCount: ZERO_BI,
      avgFeedbackScore: ZERO_BD,
      totalValidationRequests: ZERO_BI,
      completedValidations: ZERO_BI,
      avgValidationScore: ZERO_BD,
      combinedReputationScore: INITIAL_REPUTATION,
      lastUpdated: ZERO_BI,
    };
    context.AgentReputationSummary.set(summary);
  }

  return summary;
}

/**
 * Get or create a Validator entity
 */
async function getOrCreateValidator(
  context: handlerContext,
  validatorAddress: string
): Promise<Validator> {
  let validator = await context.Validator.get(validatorAddress);

  if (!validator) {
    validator = {
      id: validatorAddress,
      totalRequests: ZERO_BI,
      completedRequests: ZERO_BI,
      avgResponseScore: ZERO_BD,
      firstRequestAt: undefined,
      lastActivityAt: undefined,
    };
    context.Validator.set(validator);
  }

  return validator;
}

/**
 * Convert bytes32 to hex string
 */
function bytes32ToHex(value: string | Uint8Array): string {
  if (typeof value === "string") {
    return value.startsWith("0x") ? value : `0x${value}`;
  }
  return `0x${Array.from(value)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Calculate combined reputation score from feedback and validation
 */
function calculateCombinedReputationScore(
  avgFeedbackScore: number,
  feedbackCount: number,
  avgValidationScore: number,
  validationCount: number
): number {
  // Weight factors
  const FEEDBACK_WEIGHT = 0.6;
  const VALIDATION_WEIGHT = 0.4;

  // Minimum counts for full weight
  const MIN_FEEDBACK_FOR_WEIGHT = 5;
  const MIN_VALIDATION_FOR_WEIGHT = 3;

  // Calculate effective weights based on data availability
  const feedbackWeight =
    feedbackCount >= MIN_FEEDBACK_FOR_WEIGHT
      ? FEEDBACK_WEIGHT
      : (feedbackCount / MIN_FEEDBACK_FOR_WEIGHT) * FEEDBACK_WEIGHT;

  const validationWeight =
    validationCount >= MIN_VALIDATION_FOR_WEIGHT
      ? VALIDATION_WEIGHT
      : (validationCount / MIN_VALIDATION_FOR_WEIGHT) * VALIDATION_WEIGHT;

  // If no data, return neutral score
  if (feedbackWeight === 0 && validationWeight === 0) {
    return INITIAL_REPUTATION;
  }

  // Normalize weights
  const totalWeight = feedbackWeight + validationWeight;
  const normalizedFeedbackWeight = feedbackWeight / totalWeight;
  const normalizedValidationWeight = validationWeight / totalWeight;

  // Calculate weighted score
  const score =
    avgFeedbackScore * normalizedFeedbackWeight +
    avgValidationScore * normalizedValidationWeight;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ============================================
// REPUTATION REGISTRY HANDLERS
// ============================================

ReputationRegistry.NewFeedback.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const clientAddress = event.params.clientAddress.toLowerCase();
  const blockTimestamp = BigInt(event.block.timestamp);

  // Get current feedback count for this client-agent pair to determine index
  const summary = await getOrCreateReputationSummary(context, agentId);
  const feedbackIndex = Number(summary.totalFeedbackCount);

  // Create feedback ID: agentId-clientAddress-index
  const feedbackId = `${agentId}-${clientAddress}-${feedbackIndex}`;

  // Create feedback entity
  const feedback: Feedback = {
    id: feedbackId,
    agent_id: agentId,
    clientAddress: clientAddress,
    score: Number(event.params.score),
    tag1: bytes32ToHex(event.params.tag1),
    tag2: bytes32ToHex(event.params.tag2),
    fileUri: event.params.fileuri || undefined,
    fileHash: event.params.filehash ? bytes32ToHex(event.params.filehash) : undefined,
    isRevoked: false,
    createdAt: blockTimestamp,
    revokedAt: undefined,
    txHash: event.transaction?.hash || "",
    blockNumber: BigInt(event.block.number),
  };

  context.Feedback.set(feedback);

  // Update reputation summary
  const newTotalCount = summary.totalFeedbackCount + BigInt(1);
  const newActiveCount = summary.activeFeedbackCount + BigInt(1);

  // Calculate new average score
  const oldTotal = parseFloat(summary.avgFeedbackScore) * Number(summary.activeFeedbackCount);
  const newAvg = (oldTotal + event.params.score) / Number(newActiveCount);

  // Calculate combined score
  const combinedScore = calculateCombinedReputationScore(
    newAvg,
    Number(newActiveCount),
    parseFloat(summary.avgValidationScore),
    Number(summary.completedValidations)
  );

  context.AgentReputationSummary.set({
    ...summary,
    totalFeedbackCount: newTotalCount,
    activeFeedbackCount: newActiveCount,
    avgFeedbackScore: newAvg.toString(),
    combinedReputationScore: combinedScore,
    lastUpdated: blockTimestamp,
  });

  context.log.info(`New feedback for agent ${agentId}: score=${event.params.score}`);
});

ReputationRegistry.FeedbackRevoked.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const clientAddress = event.params.clientAddress.toLowerCase();
  const feedbackIndex = Number(event.params.feedbackIndex);
  const blockTimestamp = BigInt(event.block.timestamp);

  // Find and update the feedback
  const feedbackId = `${agentId}-${clientAddress}-${feedbackIndex}`;
  const feedback = await context.Feedback.get(feedbackId);

  if (feedback && !feedback.isRevoked) {
    context.Feedback.set({
      ...feedback,
      isRevoked: true,
      revokedAt: blockTimestamp,
    });

    // Update reputation summary
    const summary = await getOrCreateReputationSummary(context, agentId);
    const newActiveCount = summary.activeFeedbackCount - BigInt(1);

    // Recalculate average without the revoked score
    let newAvg = 0;
    if (Number(newActiveCount) > 0) {
      const oldTotal = parseFloat(summary.avgFeedbackScore) * Number(summary.activeFeedbackCount);
      newAvg = (oldTotal - feedback.score) / Number(newActiveCount);
    }

    // Calculate combined score
    const combinedScore = calculateCombinedReputationScore(
      newAvg,
      Number(newActiveCount),
      parseFloat(summary.avgValidationScore),
      Number(summary.completedValidations)
    );

    context.AgentReputationSummary.set({
      ...summary,
      activeFeedbackCount: newActiveCount,
      avgFeedbackScore: newAvg.toString(),
      combinedReputationScore: combinedScore,
      lastUpdated: blockTimestamp,
    });

    context.log.info(`Feedback revoked for agent ${agentId}: index=${feedbackIndex}`);
  }
});

ReputationRegistry.ResponseAppended.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const clientAddress = event.params.clientAddress.toLowerCase();
  const feedbackIndex = Number(event.params.feedbackIndex);
  const responderAddress = event.params.responder.toLowerCase();
  const blockTimestamp = BigInt(event.block.timestamp);

  // Find the parent feedback
  const feedbackId = `${agentId}-${clientAddress}-${feedbackIndex}`;
  const feedback = await context.Feedback.get(feedbackId);

  if (feedback) {
    // Create response ID: feedbackId-responseCount
    // For simplicity, use timestamp as unique identifier
    const responseId = `${feedbackId}-${blockTimestamp}`;

    const response: FeedbackResponse = {
      id: responseId,
      feedback_id: feedbackId,
      responder: responderAddress,
      responseUri: event.params.responseUri,
      responseHash: "", // Event doesn't include hash, could be derived
      createdAt: blockTimestamp,
      txHash: event.transaction?.hash || "",
      blockNumber: BigInt(event.block.number),
    };

    context.FeedbackResponse.set(response);

    context.log.info(`Response appended to feedback ${feedbackId} by ${responderAddress}`);
  }
});

// ============================================
// VALIDATION REGISTRY HANDLERS
// ============================================

ValidationRegistry.ValidationRequest.handler(async ({ event, context }) => {
  const validatorAddress = event.params.validatorAddress.toLowerCase();
  const agentId = event.params.agentId.toString();
  const requestHash = bytes32ToHex(event.params.requestHash);
  const blockTimestamp = BigInt(event.block.timestamp);

  // Get the requester from transaction sender
  const requesterAddress = event.transaction?.from?.toLowerCase() || "";

  // Create validation request entity
  const validationRequest: ValidationRequest = {
    id: requestHash,
    agent_id: agentId,
    validator: validatorAddress,
    requester: requesterAddress,
    requestUri: event.params.requestUri,
    hasResponse: false,
    response: undefined,
    responseUri: undefined,
    responseHash: undefined,
    tag: undefined,
    requestedAt: blockTimestamp,
    respondedAt: undefined,
    requestTxHash: event.transaction?.hash || "",
    responseTxHash: undefined,
    blockNumber: BigInt(event.block.number),
  };

  context.ValidationRequest.set(validationRequest);

  // Update or create validator entity
  const validator = await getOrCreateValidator(context, validatorAddress);
  context.Validator.set({
    ...validator,
    totalRequests: validator.totalRequests + BigInt(1),
    firstRequestAt: validator.firstRequestAt || blockTimestamp,
    lastActivityAt: blockTimestamp,
  });

  // Update agent reputation summary
  const summary = await getOrCreateReputationSummary(context, agentId);
  context.AgentReputationSummary.set({
    ...summary,
    totalValidationRequests: summary.totalValidationRequests + BigInt(1),
    lastUpdated: blockTimestamp,
  });

  context.log.info(
    `Validation request created: agent=${agentId}, validator=${validatorAddress}`
  );
});

ValidationRegistry.ValidationResponse.handler(async ({ event, context }) => {
  const validatorAddress = event.params.validatorAddress.toLowerCase();
  const agentId = event.params.agentId.toString();
  const requestHash = bytes32ToHex(event.params.requestHash);
  const blockTimestamp = BigInt(event.block.timestamp);

  // Update the validation request
  const validationRequest = await context.ValidationRequest.get(requestHash);

  if (validationRequest) {
    context.ValidationRequest.set({
      ...validationRequest,
      hasResponse: true,
      response: Number(event.params.response),
      responseUri: event.params.responseUri,
      tag: bytes32ToHex(event.params.tag),
      respondedAt: blockTimestamp,
      responseTxHash: event.transaction?.hash || "",
    });

    // Update validator stats
    const validator = await getOrCreateValidator(context, validatorAddress);
    const newCompletedCount = validator.completedRequests + BigInt(1);

    // Calculate new average response score
    const oldTotal = parseFloat(validator.avgResponseScore) * Number(validator.completedRequests);
    const newAvg = (oldTotal + event.params.response) / Number(newCompletedCount);

    context.Validator.set({
      ...validator,
      completedRequests: newCompletedCount,
      avgResponseScore: newAvg.toString(),
      lastActivityAt: blockTimestamp,
    });

    // Update agent reputation summary
    const summary = await getOrCreateReputationSummary(context, agentId);
    const newValidationCount = summary.completedValidations + BigInt(1);

    // Calculate new average validation score
    const oldValidationTotal =
      parseFloat(summary.avgValidationScore) * Number(summary.completedValidations);
    const newValidationAvg = (oldValidationTotal + event.params.response) / Number(newValidationCount);

    // Calculate combined score
    const combinedScore = calculateCombinedReputationScore(
      parseFloat(summary.avgFeedbackScore),
      Number(summary.activeFeedbackCount),
      newValidationAvg,
      Number(newValidationCount)
    );

    context.AgentReputationSummary.set({
      ...summary,
      completedValidations: newValidationCount,
      avgValidationScore: newValidationAvg.toString(),
      combinedReputationScore: combinedScore,
      lastUpdated: blockTimestamp,
    });

    context.log.info(
      `Validation response: agent=${agentId}, score=${event.params.response}`
    );
  } else {
    context.log.warn(`Validation request not found: ${requestHash}`);
  }
});

// ============================================
// DELEGATION MANAGER HANDLERS (ERC-7710)
// ============================================

/**
 * Handle delegation redemption events from MetaMask DelegationManager.
 * This tracks when ERC-7710 delegations are used on-chain.
 */
DelegationManager.RedeemedDelegation.handler(async ({ event, context }) => {
  const delegationHash = bytes32ToHex(event.params.delegationHash);
  const redeemerAddress = event.params.redeemer.toLowerCase();
  const blockTimestamp = BigInt(event.block.timestamp);

  // Try to find existing delegation entity (may have been created via API)
  let delegation = await context.ERC7710Delegation.get(delegationHash);

  if (delegation) {
    // Update existing delegation as redeemed
    context.ERC7710Delegation.set({
      ...delegation,
      isRedeemed: true,
      redemptionTxHash: event.transaction?.hash || "",
      redemptionBlockNumber: BigInt(event.block.number),
      redeemedAt: blockTimestamp,
    });

    context.log.info(`Delegation redeemed: ${delegationHash} by ${redeemerAddress}`);
  } else {
    // Create minimal delegation entity for tracking
    // Full details would come from off-chain API
    delegation = {
      id: delegationHash,
      delegator: "", // Unknown - would need to decode from calldata
      delegate: redeemerAddress,
      delegatorAgent_id: undefined,
      delegateAgent_id: undefined,
      originalUser_id: undefined,
      authority: "unknown",
      isRootAuthority: false,
      signature: "",
      caveatsCount: 0,
      isRedeemed: true,
      redemptionTxHash: event.transaction?.hash || "",
      redemptionBlockNumber: BigInt(event.block.number),
      createdAt: blockTimestamp, // Approximate
      expiresAt: undefined,
      redeemedAt: blockTimestamp,
      amount: undefined,
      amountUsed: undefined,
      salt: delegationHash, // Use hash as fallback
    };

    context.ERC7710Delegation.set(delegation);

    context.log.info(`New delegation redeemed (created): ${delegationHash}`);
  }

  // Create redemption event entity for detailed tracking
  const redemptionEventId = `${event.transaction?.hash || ""}-${event.log.logIndex}`;

  const redemptionEvent: DelegationRedemptionEvent = {
    id: redemptionEventId,
    delegation_id: delegationHash,
    redeemer: redeemerAddress,
    target: "", // Would need to decode from calldata
    value: ZERO_BD,
    callData: "", // Would need to decode from calldata
    success: true, // Event only fires on success
    returnData: undefined,
    txHash: event.transaction?.hash || "",
    blockNumber: BigInt(event.block.number),
    timestamp: blockTimestamp,
    gasUsed: undefined,
  };

  context.DelegationRedemptionEvent.set(redemptionEvent);
});

/**
 * Handle delegation enable/disable events.
 * This tracks when delegations are explicitly enabled or disabled.
 */
DelegationManager.SetDelegation.handler(async ({ event, context }) => {
  const delegationHash = bytes32ToHex(event.params.delegationHash);
  const enabled = event.params.enabled;
  const blockTimestamp = BigInt(event.block.timestamp);

  let delegation = await context.ERC7710Delegation.get(delegationHash);

  if (delegation) {
    // Note: enabled=false typically means delegation was disabled/revoked
    // We track this but don't mark as redeemed
    context.log.info(
      `Delegation ${enabled ? "enabled" : "disabled"}: ${delegationHash}`
    );
  } else {
    // Create placeholder for tracking
    delegation = {
      id: delegationHash,
      delegator: event.transaction?.from?.toLowerCase() || "",
      delegate: "",
      delegatorAgent_id: undefined,
      delegateAgent_id: undefined,
      originalUser_id: undefined,
      authority: "unknown",
      isRootAuthority: false,
      signature: "",
      caveatsCount: 0,
      isRedeemed: false,
      redemptionTxHash: undefined,
      redemptionBlockNumber: undefined,
      createdAt: blockTimestamp,
      expiresAt: undefined,
      redeemedAt: undefined,
      amount: undefined,
      amountUsed: undefined,
      salt: delegationHash,
    };

    context.ERC7710Delegation.set(delegation);

    context.log.info(
      `New delegation tracked (${enabled ? "enabled" : "disabled"}): ${delegationHash}`
    );
  }
});

// ============================================
// PERMISSION REGISTRY HANDLERS (ERC-7715 Bridge)
// ============================================

/**
 * Get or create an Agent entity by wallet address
 * Used to link permissions to agents when agent isn't registered yet
 */
async function getOrCreateAgentByWallet(
  context: handlerContext,
  walletAddress: string,
  blockTimestamp: bigint
): Promise<Agent | undefined> {
  // First, try to find an agent by wallet address
  // Note: This is a simplified approach - ideally we'd have a reverse lookup
  // For now, we return undefined if not found (permission will still be tracked)
  return undefined;
}

/**
 * Handle permission granted events from PermissionRegistry.
 * This tracks when users grant ERC-7715 permissions to agents on-chain.
 */
PermissionRegistry.PermissionGranted.handler(async ({ event, context }) => {
  const permissionId = bytes32ToHex(event.params.permissionId);
  const userAddress = event.params.user.toLowerCase();
  const agentAddress = event.params.agent.toLowerCase();
  const tokenAddress = event.params.token.toLowerCase();
  const blockTimestamp = BigInt(event.block.timestamp);

  // Ensure user exists
  const user = await getOrCreateUser(context, userAddress);

  // Try to find agent by wallet address
  // Query all agents and find the one matching the wallet address
  let agentId: string | undefined = undefined;
  const agents = await context.Agent.getWhere.walletAddress.eq(agentAddress);
  if (agents && agents.length > 0) {
    agentId = agents[0].id;
    context.log.info(`Found agent ${agentId} for wallet address ${agentAddress}`);
  } else {
    context.log.info(`No agent found for wallet address ${agentAddress}, permission will have no agent link`);
  }

  // Get token symbol (simple mapping for now)
  const tokenSymbol = getTokenSymbol(tokenAddress);

  // Calculate total amount based on periods until expiry
  const periodDuration = event.params.periodDuration;
  const amountPerPeriod = event.params.amountPerPeriod;
  const expiresAt = event.params.expiresAt;
  const duration = expiresAt - blockTimestamp;
  const periodsInGrant = duration / periodDuration;
  const totalAmount = amountPerPeriod * periodsInGrant;

  // Create permission entity
  const permission: Permission = {
    id: permissionId,
    user_id: userAddress,
    agent_id: agentId, // Link to agent if found by wallet address
    agentAddress: agentAddress, // Store wallet address directly
    permissionType: "erc20-token-periodic",
    tokenAddress: tokenAddress,
    tokenSymbol: tokenSymbol,
    amountPerPeriod: amountPerPeriod.toString(),
    periodDuration: periodDuration,
    totalAmount: totalAmount.toString(),
    grantedAt: blockTimestamp,
    expiresAt: expiresAt,
    revokedAt: undefined,
    isActive: true,
    amountUsed: ZERO_BD,
    amountRemaining: totalAmount.toString(),
    periodsElapsed: ZERO_BI,
    permissionHash: bytes32ToHex(event.params.permissionHash),
    grantTxHash: event.transaction?.hash || "",
    revokeTxHash: undefined,
  };

  context.Permission.set(permission);

  // Calculate delegation amounts (convert from token units to display units)
  // USDC has 6 decimals, so we store as string to preserve precision
  const currentTotalDelegated = parseFloat(user.totalDelegated) || 0;
  const currentCurrentDelegated = parseFloat(user.currentDelegated) || 0;
  const permissionTotalAmount = parseFloat(totalAmount.toString()) / 1e6; // Convert from 6 decimals

  // Update user stats with delegation amounts
  context.User.set({
    ...user,
    activePermissions: user.activePermissions + BigInt(1),
    totalPermissionsGranted: user.totalPermissionsGranted + BigInt(1),
    totalDelegated: (currentTotalDelegated + permissionTotalAmount).toString(),
    currentDelegated: (currentCurrentDelegated + permissionTotalAmount).toString(),
    lastActivityAt: blockTimestamp,
    firstDelegationAt: user.firstDelegationAt || blockTimestamp,
  });

  // Update global stats
  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalPermissions: globalStats.totalPermissions + BigInt(1),
    activePermissions: globalStats.activePermissions + BigInt(1),
    lastUpdated: blockTimestamp,
  });

  context.log.info(
    `Permission granted: ${permissionId} from ${userAddress} to ${agentAddress}`
  );
});

/**
 * Handle permission revoked events.
 */
PermissionRegistry.PermissionRevoked.handler(async ({ event, context }) => {
  const permissionId = bytes32ToHex(event.params.permissionId);
  const userAddress = event.params.user.toLowerCase();
  const agentAddress = event.params.agent.toLowerCase();
  const revokedAt = event.params.revokedAt;
  const blockTimestamp = BigInt(event.block.timestamp);

  // Update permission entity
  const permission = await context.Permission.get(permissionId);

  if (permission && permission.isActive) {
    context.Permission.set({
      ...permission,
      isActive: false,
      revokedAt: revokedAt,
      revokeTxHash: event.transaction?.hash || "",
    });

    // Update user stats
    const user = await context.User.get(userAddress);
    if (user) {
      // Calculate the remaining amount to subtract from currentDelegated
      const remainingAmount = parseFloat(permission.amountRemaining) || 0;
      const currentDelegated = parseFloat(user.currentDelegated) || 0;
      const newCurrentDelegated = Math.max(0, currentDelegated - remainingAmount / 1e6);

      context.User.set({
        ...user,
        activePermissions:
          user.activePermissions > BigInt(0)
            ? user.activePermissions - BigInt(1)
            : BigInt(0),
        currentDelegated: newCurrentDelegated.toString(),
        lastActivityAt: blockTimestamp,
      });
    }

    // Update global stats
    const globalStats = await getOrCreateGlobalStats(context);
    context.GlobalStats.set({
      ...globalStats,
      activePermissions:
        globalStats.activePermissions > BigInt(0)
          ? globalStats.activePermissions - BigInt(1)
          : BigInt(0),
      lastUpdated: blockTimestamp,
    });

    context.log.info(
      `Permission revoked: ${permissionId} from ${userAddress} to ${agentAddress}`
    );
  }
});

/**
 * Handle permission expired events.
 */
PermissionRegistry.PermissionExpired.handler(async ({ event, context }) => {
  const permissionId = bytes32ToHex(event.params.permissionId);
  const userAddress = event.params.user.toLowerCase();
  const agentAddress = event.params.agent.toLowerCase();
  const blockTimestamp = BigInt(event.block.timestamp);

  // Update permission entity
  const permission = await context.Permission.get(permissionId);

  if (permission && permission.isActive) {
    context.Permission.set({
      ...permission,
      isActive: false,
    });

    // Update user stats
    const user = await context.User.get(userAddress);
    if (user) {
      // Calculate the remaining amount to subtract from currentDelegated
      const remainingAmount = parseFloat(permission.amountRemaining) || 0;
      const currentDelegated = parseFloat(user.currentDelegated) || 0;
      const newCurrentDelegated = Math.max(0, currentDelegated - remainingAmount / 1e6);

      context.User.set({
        ...user,
        activePermissions:
          user.activePermissions > BigInt(0)
            ? user.activePermissions - BigInt(1)
            : BigInt(0),
        currentDelegated: newCurrentDelegated.toString(),
        lastActivityAt: blockTimestamp,
      });
    }

    // Update global stats
    const globalStats = await getOrCreateGlobalStats(context);
    context.GlobalStats.set({
      ...globalStats,
      activePermissions:
        globalStats.activePermissions > BigInt(0)
          ? globalStats.activePermissions - BigInt(1)
          : BigInt(0),
      lastUpdated: blockTimestamp,
    });

    context.log.info(
      `Permission expired: ${permissionId} from ${userAddress} to ${agentAddress}`
    );
  }
});

// ============================================
// HELPER: Token Symbol Lookup
// ============================================

/**
 * Get token symbol from address (simple mapping for common tokens)
 */
function getTokenSymbol(tokenAddress: string): string {
  const KNOWN_TOKENS: Record<string, string> = {
    "0x2BfBc55F4A360352Dc89e599D04898F150472cA6": "USDC", // Sepolia USDC
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC", // Mainnet USDC
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT", // Mainnet USDT
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI", // Mainnet DAI
  };

  return KNOWN_TOKENS[tokenAddress.toLowerCase()] || "TOKEN";
}
