import { useQuery } from "@apollo/client";
import {
  GET_LEADERBOARD,
  GET_LEADERBOARD_ALL,
  GET_AGENT_DETAILS,
  GET_AGENTS,
  GET_AGENTS_BY_STRATEGY,
  SEARCH_AGENTS,
  GET_BEST_AGENT,
  GET_AGENT_REPUTATION,
} from "@/graphql/queries";
import type { Agent, RankedAgent, StrategyType, Execution, AgentDailyStat } from "@/lib/types";
import { UI } from "@/lib/constants";

// ===========================================
// useLeaderboard Hook
// ===========================================

interface UseLeaderboardOptions {
  /** Number of agents to fetch */
  limit?: number;
  /** Filter by strategy type */
  strategyType?: StrategyType | string;
  /** Polling interval in ms (0 to disable) */
  pollInterval?: number;
  /** Skip the query */
  skip?: boolean;
}

interface UseLeaderboardResult {
  agents: RankedAgent[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useLeaderboard(
  options: UseLeaderboardOptions = {}
): UseLeaderboardResult {
  const {
    limit = UI.LEADERBOARD_PAGE_SIZE,
    strategyType,
    pollInterval = UI.POLL_INTERVAL,
    skip = false,
  } = options;

  // Use GET_LEADERBOARD_ALL when no strategy filter, otherwise GET_LEADERBOARD
  // This avoids Hasura error when passing null to _eq filter
  const query = strategyType ? GET_LEADERBOARD : GET_LEADERBOARD_ALL;
  const variables = strategyType
    ? { first: limit, strategyType }
    : { first: limit };

  const { data, loading, error, refetch } = useQuery(query, {
    variables,
    pollInterval,
    skip,
    // Don't notify on network status change to prevent UI flicker during polling
    notifyOnNetworkStatusChange: false,
  });

  // Add rank to each agent (Hasura returns data as 'Agent' not 'agents')
  const agents: RankedAgent[] = (data?.Agent || []).map(
    (agent: Agent, index: number) => ({
      ...agent,
      rank: index + 1,
    })
  );

  return {
    agents,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// useAgentDetails Hook
// ===========================================

interface UseAgentDetailsOptions {
  /** Polling interval in ms (0 to disable) */
  pollInterval?: number;
}

interface UseAgentDetailsResult {
  agent: Agent | null;
  executions: Execution[];
  dailyStats: AgentDailyStat[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useAgentDetails(
  agentId: string,
  options: UseAgentDetailsOptions = {}
): UseAgentDetailsResult {
  // Use slower polling to prevent UI flicker and modal interruption
  const { pollInterval = UI.SLOW_POLL_INTERVAL } = options;

  const { data, loading, error, refetch } = useQuery(GET_AGENT_DETAILS, {
    variables: { agentId },
    skip: !agentId,
    pollInterval,
    // Fetch fresh data from network while returning cached data immediately
    fetchPolicy: 'cache-and-network',
    // Don't notify on network status change to prevent re-renders during polling
    notifyOnNetworkStatusChange: false,
  });

  // Extract executions and dailyStats from nested agent data (Hasura uses Agent_by_pk)
  const agent = data?.Agent_by_pk || null;
  const executions: Execution[] = agent?.executions || [];
  const dailyStats: AgentDailyStat[] = agent?.dailyStats || [];

  return {
    agent,
    executions,
    dailyStats,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// useAgents Hook (Paginated)
// ===========================================

interface UseAgentsOptions {
  /** Number of agents per page */
  pageSize?: number;
  /** Current page (0-indexed) */
  page?: number;
  /** Order by field */
  orderBy?: "reputationScore" | "totalExecutions" | "winRate" | "totalProfitLoss";
  /** Order direction */
  orderDirection?: "asc" | "desc";
  /** Filter conditions */
  where?: {
    isActive?: boolean;
    strategyType?: string;
    riskLevel_lte?: number;
    riskLevel_gte?: number;
  };
}

interface UseAgentsResult {
  agents: Agent[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
  hasMore: boolean;
}

export function useAgents(options: UseAgentsOptions = {}): UseAgentsResult {
  const {
    pageSize = UI.LEADERBOARD_PAGE_SIZE,
    page = 0,
    orderBy = "reputationScore",
    orderDirection = "desc",
    where = { isActive: true },
  } = options;

  const { data, loading, error, refetch } = useQuery(GET_AGENTS, {
    variables: {
      first: pageSize + 1, // Fetch one extra to check if there's more
      skip: page * pageSize,
      orderBy,
      orderDirection,
      where,
    },
    notifyOnNetworkStatusChange: false,
  });

  const allAgents: Agent[] = data?.Agent || [];
  const hasMore = allAgents.length > pageSize;
  const agents = hasMore ? allAgents.slice(0, pageSize) : allAgents;

  return {
    agents,
    loading,
    error: error as Error | undefined,
    refetch,
    hasMore,
  };
}

// ===========================================
// useAgentsByStrategy Hook
// ===========================================

interface UseAgentsByStrategyOptions {
  /** Number of agents to fetch */
  limit?: number;
  /** Polling interval in ms (0 to disable) */
  pollInterval?: number;
}

interface UseAgentsByStrategyResult {
  agents: Agent[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Hook to fetch agents filtered by strategy type
 * Used on: Strategy-specific agent listings
 */
export function useAgentsByStrategy(
  strategyType: StrategyType | string,
  options: UseAgentsByStrategyOptions = {}
): UseAgentsByStrategyResult {
  const { limit = UI.LEADERBOARD_PAGE_SIZE, pollInterval = 0 } = options;

  const { data, loading, error, refetch } = useQuery(GET_AGENTS_BY_STRATEGY, {
    variables: {
      strategyType,
      first: limit,
    },
    skip: !strategyType,
    pollInterval,
    notifyOnNetworkStatusChange: false,
  });

  return {
    agents: data?.Agent || [],
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// useSearchAgents Hook
// ===========================================

interface UseSearchAgentsOptions {
  /** Minimum characters before search */
  minChars?: number;
  /** Maximum results */
  limit?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
}

interface UseSearchAgentsResult {
  agents: Agent[];
  loading: boolean;
  error: Error | undefined;
}

export function useSearchAgents(
  searchQuery: string,
  options: UseSearchAgentsOptions = {}
): UseSearchAgentsResult {
  const { minChars = 2, limit = 10 } = options;

  const shouldSearch = searchQuery.length >= minChars;

  const { data, loading, error } = useQuery(SEARCH_AGENTS, {
    variables: {
      search: searchQuery,
      first: limit,
    },
    skip: !shouldSearch,
  });

  return {
    agents: shouldSearch ? data?.Agent || [] : [],
    loading: shouldSearch ? loading : false,
    error: error as Error | undefined,
  };
}

// ===========================================
// useBestAgent Hook
// ===========================================

interface UseBestAgentOptions {
  strategyType: StrategyType | string;
  maxRiskLevel?: number;
}

interface UseBestAgentResult {
  agent: Agent | null;
  loading: boolean;
  error: Error | undefined;
}

export function useBestAgent(
  options: UseBestAgentOptions
): UseBestAgentResult {
  const { strategyType, maxRiskLevel = 10 } = options;

  const { data, loading, error } = useQuery(GET_BEST_AGENT, {
    variables: {
      strategyType,
      maxRisk: maxRiskLevel,
    },
    skip: !strategyType,
  });

  return {
    agent: data?.Agent?.[0] || null,
    loading,
    error: error as Error | undefined,
  };
}

// ===========================================
// useAgentReputation Hook
// ===========================================

interface UseAgentReputationResult {
  agent: Agent | null;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useAgentReputation(agentId: string): UseAgentReputationResult {
  const { data, loading, error, refetch } = useQuery(GET_AGENT_REPUTATION, {
    variables: { agentId },
    skip: !agentId,
    pollInterval: UI.SLOW_POLL_INTERVAL,
  });

  return {
    agent: data?.Agent_by_pk || null,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}
