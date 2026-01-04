/**
 * Echelon Agents - Envio GraphQL Client
 *
 * Client for querying the Envio indexer GraphQL API.
 * Query patterns match those used in the frontend for consistency.
 */

import type {
  GraphQLResponse,
  LeaderboardResponse,
  AgentPermissionsResponse,
  RecentExecutionsResponse,
  SpecialistAgent,
  Permission,
  IndexedExecution,
  AgentPerformance,
  IndexedAgent,
} from '../types/index.js';
import { withRetry } from './helpers.js';

// ============================================
// GRAPHQL QUERIES
// ============================================

const QUERIES = {
  /**
   * Get top agents sorted by reputation score
   */
  LEADERBOARD: `
    query GetLeaderboard($first: Int!) {
      agents(
        first: $first
        orderBy: reputationScore
        orderDirection: desc
        where: { isActive: true }
      ) {
        id
        walletAddress
        name
        strategyType
        riskLevel
        reputationScore
        winRate
        totalExecutions
        totalProfitLoss
      }
    }
  `,

  /**
   * Get active permissions for an agent
   */
  AGENT_PERMISSIONS: `
    query GetAgentPermissions($agentId: ID!) {
      agent(id: $agentId) {
        permissionsReceived(where: { isActive: true }) {
          id
          user { id }
          agent { id }
          permissionType
          tokenAddress
          tokenSymbol
          amountPerPeriod
          periodDuration
          totalAmount
          grantedAt
          expiresAt
          isActive
          amountUsed
          amountRemaining
        }
      }
    }
  `,

  /**
   * Get recent executions for market analysis
   */
  RECENT_EXECUTIONS: `
    query GetRecentExecutions($first: Int!) {
      executions(
        first: $first
        orderBy: startedAt
        orderDirection: desc
        where: { result_not: PENDING }
      ) {
        id
        agent { id name }
        user { id }
        amountIn
        amountOut
        tokenIn
        tokenOut
        profitLoss
        profitLossPercent
        result
        startedAt
        completedAt
        startTxHash
        completeTxHash
      }
    }
  `,

  /**
   * Find best specialist by strategy type
   */
  FIND_SPECIALIST: `
    query FindSpecialist($strategyType: String!, $minScore: Int!) {
      agents(
        first: 1
        orderBy: reputationScore
        orderDirection: desc
        where: {
          isActive: true
          strategyType: $strategyType
          reputationScore_gte: $minScore
        }
      ) {
        id
        walletAddress
        name
        strategyType
        reputationScore
        winRate
      }
    }
  `,

  /**
   * Get agent performance metrics
   */
  AGENT_PERFORMANCE: `
    query GetAgentPerformance($agentId: ID!) {
      agent(id: $agentId) {
        totalExecutions
        successfulExecutions
        failedExecutions
        winRate
        totalProfitLoss
        reputationScore
        avgProfitPerTrade
      }
    }
  `,

  /**
   * Get full agent details
   */
  AGENT_DETAILS: `
    query GetAgentDetails($agentId: ID!) {
      agent(id: $agentId) {
        id
        walletAddress
        ownerAddress
        name
        strategyType
        riskLevel
        registeredAt
        isActive
        metadataUri
        totalExecutions
        successfulExecutions
        failedExecutions
        totalVolumeIn
        totalVolumeOut
        totalProfitLoss
        winRate
        reputationScore
        lastExecutionAt
      }
    }
  `,
};

// ============================================
// ENVIO CLIENT CLASS
// ============================================

/**
 * GraphQL client for Envio indexer
 */
export class EnvioClient {
  private url: string;
  private headers: Record<string, string>;

  constructor(url: string, apiKey?: string) {
    this.url = url;
    this.headers = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      this.headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  // ============================================
  // CORE QUERY METHOD
  // ============================================

  /**
   * Execute a GraphQL query
   */
  async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const execute = async () => {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `GraphQL request failed: ${response.status} ${response.statusText}`
        );
      }

      const json = (await response.json()) as GraphQLResponse<T>;

      if (json.errors && json.errors.length > 0) {
        const errorMessages = json.errors.map((e) => e.message).join(', ');
        throw new Error(`GraphQL errors: ${errorMessages}`);
      }

      return json.data;
    };

    // Retry with exponential backoff for transient failures
    return withRetry(execute, {
      maxRetries: 3,
      baseDelayMs: 1000,
    });
  }

  // ============================================
  // SPECIALIZED QUERY METHODS
  // ============================================

  /**
   * Get top agents sorted by reputation score
   */
  async getAgentLeaderboard(limit: number = 10): Promise<SpecialistAgent[]> {
    const data = await this.query<LeaderboardResponse>(QUERIES.LEADERBOARD, {
      first: limit,
    });

    return data.agents.map((agent) => ({
      id: agent.id,
      walletAddress: agent.walletAddress,
      name: agent.name,
      strategyType: agent.strategyType,
      reputationScore: agent.reputationScore,
      winRate: parseFloat(String(agent.winRate)),
    }));
  }

  /**
   * Get active permissions for an agent
   */
  async getAgentPermissions(agentId: string): Promise<Permission[]> {
    const data = await this.query<AgentPermissionsResponse>(
      QUERIES.AGENT_PERMISSIONS,
      { agentId }
    );

    return data.agent?.permissionsReceived || [];
  }

  /**
   * Get recent executions for market analysis
   */
  async getRecentExecutions(limit: number = 100): Promise<IndexedExecution[]> {
    const data = await this.query<RecentExecutionsResponse>(
      QUERIES.RECENT_EXECUTIONS,
      { first: limit }
    );

    return data.executions;
  }

  /**
   * Find best specialist by strategy type
   */
  async findBestSpecialist(
    strategyType: string,
    minReputationScore: number = 60
  ): Promise<SpecialistAgent | null> {
    const data = await this.query<{ agents: SpecialistAgent[] }>(
      QUERIES.FIND_SPECIALIST,
      {
        strategyType,
        minScore: minReputationScore,
      }
    );

    const agent = data.agents[0];
    if (!agent) return null;

    return {
      id: agent.id,
      walletAddress: agent.walletAddress,
      name: agent.name,
      strategyType: agent.strategyType,
      reputationScore: agent.reputationScore,
      winRate: parseFloat(String(agent.winRate)),
    };
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(agentId: string): Promise<AgentPerformance | null> {
    const data = await this.query<{ agent: AgentPerformance | null }>(
      QUERIES.AGENT_PERFORMANCE,
      { agentId }
    );

    return data.agent;
  }

  /**
   * Get full agent details
   */
  async getAgentDetails(agentId: string): Promise<IndexedAgent | null> {
    const data = await this.query<{ agent: IndexedAgent | null }>(
      QUERIES.AGENT_DETAILS,
      { agentId }
    );

    return data.agent;
  }

  /**
   * Check if agent exists and is active
   */
  async isAgentActive(agentId: string): Promise<boolean> {
    const agent = await this.getAgentDetails(agentId);
    return agent?.isActive ?? false;
  }

  // ============================================
  // MARKET ANALYSIS HELPERS
  // ============================================

  /**
   * Get profit/loss values from recent executions for volatility calculation
   */
  async getRecentProfitLosses(limit: number = 100): Promise<number[]> {
    const executions = await this.getRecentExecutions(limit);

    return executions
      .filter((e) => e.result !== 'PENDING')
      .map((e) => parseFloat(e.profitLossPercent || '0'));
  }

  /**
   * Get available delegation amount from permissions
   */
  async getAvailableDelegationAmount(agentId: string): Promise<bigint> {
    const permissions = await this.getAgentPermissions(agentId);

    // Sum up remaining amounts from active permissions
    return permissions.reduce((sum, p) => {
      if (!p.isActive) return sum;
      const remaining = BigInt(Math.floor(parseFloat(p.amountRemaining)));
      return sum + remaining;
    }, 0n);
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create an Envio client instance
 */
export function createEnvioClient(url: string, apiKey?: string): EnvioClient {
  return new EnvioClient(url, apiKey);
}
