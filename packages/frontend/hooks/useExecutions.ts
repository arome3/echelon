import { useQuery } from "@apollo/client";
import {
  GET_RECENT_EXECUTIONS,
  GET_EXECUTION,
  GET_AGENT_DAILY_STATS,
} from "@/graphql/queries";
import type { Execution, AgentDailyStat } from "@/lib/types";
import { UI } from "@/lib/constants";

// ===========================================
// useRecentExecutions Hook
// ===========================================

interface UseRecentExecutionsOptions {
  /** Number of executions to fetch */
  limit?: number;
  /** Polling interval in ms (0 to disable) */
  pollInterval?: number;
}

interface UseRecentExecutionsResult {
  executions: Execution[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useRecentExecutions(
  options: UseRecentExecutionsOptions = {}
): UseRecentExecutionsResult {
  const { limit = 20, pollInterval = UI.FAST_POLL_INTERVAL } = options;

  const { data, loading, error, refetch } = useQuery(GET_RECENT_EXECUTIONS, {
    variables: { first: limit },
    pollInterval,
    notifyOnNetworkStatusChange: false,
  });

  return {
    executions: data?.Execution || [],
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// useExecution Hook (Single)
// ===========================================

interface UseExecutionResult {
  execution: Execution | null;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useExecution(executionId: string): UseExecutionResult {
  const { data, loading, error, refetch } = useQuery(GET_EXECUTION, {
    variables: { executionId },
    skip: !executionId,
    pollInterval: UI.FAST_POLL_INTERVAL,
  });

  return {
    execution: data?.Execution_by_pk || null,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// useAgentDailyStats Hook
// ===========================================

interface UseAgentDailyStatsOptions {
  /** Number of days to fetch */
  days?: number;
}

interface UseAgentDailyStatsResult {
  dailyStats: AgentDailyStat[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useAgentDailyStats(
  agentId: string,
  options: UseAgentDailyStatsOptions = {}
): UseAgentDailyStatsResult {
  const { days = 30 } = options;

  const { data, loading, error, refetch } = useQuery(GET_AGENT_DAILY_STATS, {
    variables: { agentId, days },
    skip: !agentId,
    pollInterval: UI.SLOW_POLL_INTERVAL,
  });

  // Sort by date ascending for charts (query returns desc, so reverse)
  const dailyStats: AgentDailyStat[] = [
    ...(data?.AgentDailyStat || []),
  ].reverse();

  return {
    dailyStats,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// Execution Statistics Helpers
// ===========================================

export interface ExecutionStats {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  winRate: number;
  totalProfitLoss: number;
  avgProfitPerTrade: number;
}

export function calculateExecutionStats(executions: Execution[]): ExecutionStats {
  const total = executions.length;
  const successful = executions.filter((e) => e.result === "SUCCESS").length;
  const failed = executions.filter((e) => e.result === "FAILURE").length;
  const pending = executions.filter((e) => e.result === "PENDING").length;

  // Calculate profit/loss
  const completedExecutions = executions.filter((e) => e.result !== "PENDING");
  const totalProfitLoss = completedExecutions.reduce(
    (sum, e) => sum + parseFloat(e.profitLoss),
    0
  );

  const winRate = total > 0 ? (successful / (total - pending)) * 100 : 0;
  const avgProfitPerTrade =
    completedExecutions.length > 0
      ? totalProfitLoss / completedExecutions.length
      : 0;

  return {
    total,
    successful,
    failed,
    pending,
    winRate: isNaN(winRate) ? 0 : winRate,
    totalProfitLoss,
    avgProfitPerTrade,
  };
}

// ===========================================
// Daily Stats Helpers for Charts
// ===========================================

export interface ChartDataPoint {
  date: string;
  timestamp: number;
  value: number;
  label?: string;
}

export function transformDailyStatsForChart(
  dailyStats: AgentDailyStat[],
  metric: "profitLoss" | "winRate" | "volumeIn" | "executionCount"
): ChartDataPoint[] {
  return dailyStats.map((stat) => ({
    date: stat.date,
    timestamp: parseInt(stat.timestamp),
    value: parseFloat(stat[metric]),
    label: stat.date,
  }));
}

export function calculateCumulativeProfitLoss(
  dailyStats: AgentDailyStat[]
): ChartDataPoint[] {
  let cumulative = 0;

  return dailyStats.map((stat) => {
    cumulative += parseFloat(stat.profitLoss);
    return {
      date: stat.date,
      timestamp: parseInt(stat.timestamp),
      value: cumulative,
      label: stat.date,
    };
  });
}

// ===========================================
// useGlobalStats Hook
// ===========================================

import { GET_GLOBAL_STATS } from "@/graphql/queries";
import type { GlobalStats } from "@/lib/types";

interface UseGlobalStatsResult {
  stats: GlobalStats | null;
  loading: boolean;
  error: Error | undefined;
}

export function useGlobalStats(): UseGlobalStatsResult {
  const { data, loading, error } = useQuery(GET_GLOBAL_STATS, {
    pollInterval: UI.SLOW_POLL_INTERVAL,
  });

  return {
    stats: data?.GlobalStats_by_pk || null,
    loading,
    error: error as Error | undefined,
  };
}
