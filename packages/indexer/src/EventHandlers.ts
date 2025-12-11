/**
 * Echelon Event Handlers
 * Processes blockchain events and updates indexed entities
 */

import {
  AgentRegistry,
  AgentExecution,
  Agent,
  Execution,
  User,
  Redelegation,
  AgentDailyStat,
  GlobalStats,
} from "generated";
import {
  calculateReputationScore,
  calculateWinRate,
  getDayId,
  getDateString,
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

async function getOrCreateUser(context: any, userAddress: string): Promise<User> {
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

async function getOrCreateGlobalStats(context: any): Promise<GlobalStats> {
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
  context: any,
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
    ownerAddress: event.transaction.from?.toLowerCase() || "",
    name: event.params.name,
    strategyType: event.params.strategyType,
    riskLevel: event.params.riskLevel,
    registeredAt: blockTimestamp,
    isActive: true,
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
    startTxHash: event.transaction.hash,
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
    completeTxHash: event.transaction.hash,
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
    txHash: event.transaction.hash,
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
