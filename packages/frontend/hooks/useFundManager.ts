/**
 * useFundManager Hook
 *
 * Fetches the official Echelon Fund Manager agent data.
 * The Fund Manager is a pre-configured, verified agent that handles
 * A2A delegation to specialist agents.
 */

import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { FUND_MANAGER } from "@/lib/constants";
import type { Agent } from "@/lib/types";

// ===========================================
// GraphQL Query
// ===========================================

const GET_FUND_MANAGER = gql`
  query GetFundManager($agentId: String!) {
    Agent_by_pk(id: $agentId) {
      id
      walletAddress
      ownerAddress
      name
      strategyType
      riskLevel
      registeredAt
      isActive
      isVerified
      metadataUri
      reputationScore
      totalExecutions
      successfulExecutions
      failedExecutions
      winRate
      totalProfitLoss
      totalVolumeIn
      totalVolumeOut
      updatedAt
    }
  }
`;

// ===========================================
// Hook
// ===========================================

interface UseFundManagerResult {
  /** The Fund Manager agent data */
  fundManager: Agent | null;
  /** Whether the Fund Manager exists and is active */
  isAvailable: boolean;
  /** Whether the Fund Manager is verified */
  isVerified: boolean;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | undefined;
  /** Refetch function */
  refetch: () => void;
}

/**
 * Hook to fetch the official Echelon Fund Manager agent
 */
export function useFundManager(): UseFundManagerResult {
  const { data, loading, error, refetch } = useQuery(GET_FUND_MANAGER, {
    variables: { agentId: FUND_MANAGER.ID },
    // Poll every 30 seconds to keep data fresh
    pollInterval: 30000,
  });

  const fundManager = data?.Agent_by_pk || null;
  const isAvailable = fundManager?.isActive === true;
  const isVerified = fundManager?.isVerified === true;

  return {
    fundManager,
    isAvailable,
    isVerified,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// Static Fund Manager Data (Fallback)
// ===========================================

/**
 * Get static Fund Manager data for display when not yet indexed
 * Uses constants from lib/constants.ts
 */
export function getStaticFundManager(): Partial<Agent> {
  return {
    id: FUND_MANAGER.ID,
    walletAddress: FUND_MANAGER.ADDRESS,
    name: FUND_MANAGER.NAME,
    strategyType: FUND_MANAGER.STRATEGY as Agent["strategyType"],
    riskLevel: FUND_MANAGER.RISK_LEVEL,
    isActive: true,
    isVerified: true,
    reputationScore: 85, // Default high score for official Fund Manager
  };
}

/**
 * Check if an agent is the official Fund Manager
 * Checks by wallet address and name - NOT by ID since ID depends on registration order
 * which may vary between deployments
 */
export function isFundManager(agent: Agent | null | undefined): boolean {
  if (!agent) return false;

  // Check by wallet address (case-insensitive) - most reliable
  const addressMatch = agent.walletAddress?.toLowerCase() === FUND_MANAGER.ADDRESS?.toLowerCase();

  // Check by name as secondary identifier
  const nameMatch = agent.name === FUND_MANAGER.NAME || agent.name === "Echelon Fund Manager";

  // Only match by address OR name - do NOT match by ID since IDs are deployment-dependent
  return addressMatch || nameMatch;
}
