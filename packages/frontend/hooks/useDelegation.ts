/**
 * Echelon Hooks - A2A Delegation Hooks
 *
 * Custom hooks for managing Agent-to-Agent delegation data
 */

import { useQuery } from "@apollo/client";
import {
  GET_DELEGATION_TREE,
  GET_USER_DELEGATION_TREE,
  GET_USER_REDELEGATIONS,
  GET_REDELEGATION_STATS,
  GET_REDELEGATION_HISTORY,
} from "@/graphql/queries";
import { UI } from "@/lib/constants";
import type { Redelegation, Agent } from "@/lib/types";

// ===========================================
// Types
// ===========================================

/** Tree node structure for react-d3-tree */
export interface TreeNode {
  name: string;
  attributes: {
    id: string;
    score: number;
    amount?: string;
    strategyType?: string;
  };
  children?: TreeNode[];
}

/** Redelegation stats summary */
export interface RedelegationStats {
  totalDelegatedOut: number;
  totalDelegatedIn: number;
  childAgentCount: number;
  parentAgentCount: number;
  topChild: { name: string; amount: string; score: number } | null;
  topParent: { name: string; amount: string; score: number } | null;
}

/** Partial agent from redelegation queries */
interface RedelegationAgent {
  id: string;
  name: string;
  reputationScore: number;
  strategyType?: string;
}

/** Redelegation with parent/child details */
interface RedelegationWithAgents extends Omit<Redelegation, "parentAgent" | "childAgent"> {
  parentAgent: RedelegationAgent;
  childAgent: RedelegationAgent;
}

// ===========================================
// useDelegationTree Hook
// ===========================================

interface UseDelegationTreeResult {
  treeData: TreeNode | null;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
  hasChildren: boolean;
}

/**
 * Hook to fetch and transform delegation tree data for visualization
 * @param agentId - The root agent ID for the tree
 */
export function useDelegationTree(agentId: string): UseDelegationTreeResult {
  const { data, loading, error, refetch } = useQuery(GET_DELEGATION_TREE, {
    variables: { agentId },
    skip: !agentId,
    pollInterval: UI.SLOW_POLL_INTERVAL,
  });

  // Note: GraphQL returns "Agent_by_pk" matching the query field name
  const treeData = data?.Agent_by_pk ? transformToTreeData(data.Agent_by_pk) : null;
  const hasChildren = (treeData?.children?.length ?? 0) > 0;

  return {
    treeData,
    loading,
    error: error as Error | undefined,
    refetch,
    hasChildren,
  };
}

// ===========================================
// useUserDelegationTree Hook (Filtered by User)
// ===========================================

/**
 * Hook to fetch delegation tree for an agent, filtered by a specific user.
 * This shows only the redelegations that belong to the specified user.
 * @param agentId - The root agent ID for the tree
 * @param userId - The user's wallet address to filter redelegations
 */
export function useUserDelegationTree(agentId: string, userId: string): UseDelegationTreeResult {
  const { data, loading, error, refetch } = useQuery(GET_USER_DELEGATION_TREE, {
    variables: { agentId, userId: userId?.toLowerCase() },
    skip: !agentId || !userId,
    pollInterval: UI.SLOW_POLL_INTERVAL,
  });

  // Note: GraphQL returns "Agent_by_pk" matching the query field name
  const treeData = data?.Agent_by_pk ? transformToTreeData(data.Agent_by_pk) : null;
  const hasChildren = (treeData?.children?.length ?? 0) > 0;

  return {
    treeData,
    loading,
    error: error as Error | undefined,
    refetch,
    hasChildren,
  };
}

/**
 * Transform GraphQL agent data into tree structure for react-d3-tree
 */
function transformToTreeData(agent: any): TreeNode {
  return {
    name: agent.name,
    attributes: {
      id: agent.id,
      score: agent.reputationScore,
    },
    children: agent.redelegationsAsParent?.map((redel: any) => ({
      name: redel.childAgent.name,
      attributes: {
        id: redel.childAgent.id,
        score: redel.childAgent.reputationScore,
        amount: redel.amount,
        strategyType: redel.childAgent.strategyType,
      },
      children: redel.childAgent.redelegationsAsParent?.map((subRedel: any) => ({
        name: subRedel.childAgent.name,
        attributes: {
          id: subRedel.childAgent.id,
          score: subRedel.childAgent.reputationScore,
          amount: subRedel.amount,
          strategyType: subRedel.childAgent.strategyType,
        },
        // Only 2 levels deep for now
        children: [],
      })),
    })),
  };
}

// ===========================================
// useUserRedelegations Hook
// ===========================================

interface UseUserRedelegationsResult {
  redelegations: RedelegationWithAgents[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
  count: number;
}

/**
 * Hook to fetch all active redelegations for a user
 * @param userId - The user's wallet address (lowercased)
 */
export function useUserRedelegations(userId: string): UseUserRedelegationsResult {
  const { data, loading, error, refetch } = useQuery(GET_USER_REDELEGATIONS, {
    variables: { userId: userId?.toLowerCase() },
    skip: !userId,
    pollInterval: UI.POLL_INTERVAL,
  });

  // Note: GraphQL returns "Redelegation" (capital R) matching the query field name
  const redelegations = data?.Redelegation || [];

  return {
    redelegations,
    loading,
    error: error as Error | undefined,
    refetch,
    count: redelegations.length,
  };
}

// ===========================================
// useRedelegationStats Hook
// ===========================================

interface UseRedelegationStatsResult {
  stats: RedelegationStats | null;
  asParent: any[];
  asChild: any[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Hook to fetch redelegation statistics for an agent
 * @param agentId - The agent ID to get stats for
 */
export function useRedelegationStats(agentId: string): UseRedelegationStatsResult {
  const { data, loading, error, refetch } = useQuery(GET_REDELEGATION_STATS, {
    variables: { agentId },
    skip: !agentId,
    pollInterval: UI.SLOW_POLL_INTERVAL,
  });

  // Note: GraphQL returns "Agent_by_pk" matching the query field name
  if (!data?.Agent_by_pk) {
    return {
      stats: null,
      asParent: [],
      asChild: [],
      loading,
      error: error as Error | undefined,
      refetch,
    };
  }

  const asParent = data.Agent_by_pk.redelegationsAsParent || [];
  const asChild = data.Agent_by_pk.redelegationsAsChild || [];

  // Calculate totals
  const totalDelegatedOut = asParent.reduce(
    (sum: number, r: any) => sum + parseFloat(r.amount || "0"),
    0
  );
  const totalDelegatedIn = asChild.reduce(
    (sum: number, r: any) => sum + parseFloat(r.amount || "0"),
    0
  );

  // Find top child (most amount delegated)
  const sortedChildren = [...asParent].sort(
    (a: any, b: any) => parseFloat(b.amount) - parseFloat(a.amount)
  );
  const topChild = sortedChildren.length > 0
    ? {
        name: sortedChildren[0].childAgent.name,
        amount: sortedChildren[0].amount,
        score: sortedChildren[0].childAgent.reputationScore,
      }
    : null;

  // Find top parent (most amount received from)
  const sortedParents = [...asChild].sort(
    (a: any, b: any) => parseFloat(b.amount) - parseFloat(a.amount)
  );
  const topParent = sortedParents.length > 0
    ? {
        name: sortedParents[0].parentAgent.name,
        amount: sortedParents[0].amount,
        score: sortedParents[0].parentAgent.reputationScore,
      }
    : null;

  const stats: RedelegationStats = {
    totalDelegatedOut,
    totalDelegatedIn,
    childAgentCount: asParent.length,
    parentAgentCount: asChild.length,
    topChild,
    topParent,
  };

  return {
    stats,
    asParent,
    asChild,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// useRedelegationHistory Hook
// ===========================================

interface UseRedelegationHistoryResult {
  asParent: any[];
  asChild: any[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
  totalCount: number;
}

/**
 * Hook to fetch redelegation history for an agent (all, not just active)
 * @param agentId - The agent ID
 * @param first - Number of records to fetch (default: 20)
 */
export function useRedelegationHistory(
  agentId: string,
  first: number = 20
): UseRedelegationHistoryResult {
  const { data, loading, error, refetch } = useQuery(GET_REDELEGATION_HISTORY, {
    variables: { agentId, first },
    skip: !agentId,
  });

  const asParent = data?.redelegationsAsParent || [];
  const asChild = data?.redelegationsAsChild || [];

  return {
    asParent,
    asChild,
    loading,
    error: error as Error | undefined,
    refetch,
    totalCount: asParent.length + asChild.length,
  };
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Get color hex value based on reputation score
 * Used for tree visualization
 */
export function getScoreColorHex(score: number): string {
  if (score >= 80) return "#22c55e"; // green-500
  if (score >= 60) return "#eab308"; // yellow-500
  return "#ef4444"; // red-500
}

/**
 * Check if a redelegation is expired
 */
export function isRedelegationExpired(expiresAt: string | number): boolean {
  const expiry = typeof expiresAt === "string" ? parseInt(expiresAt) : expiresAt;
  return expiry * 1000 < Date.now();
}

/**
 * Calculate time remaining for a redelegation
 */
export function getTimeRemaining(expiresAt: string | number): string {
  const expiry = typeof expiresAt === "string" ? parseInt(expiresAt) : expiresAt;
  const now = Math.floor(Date.now() / 1000);
  const remaining = expiry - now;

  if (remaining <= 0) return "Expired";
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m remaining`;
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h remaining`;
  return `${Math.floor(remaining / 86400)}d remaining`;
}
