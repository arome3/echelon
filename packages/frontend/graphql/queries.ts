import { gql } from "@apollo/client";
import {
  AGENT_CORE_FIELDS,
  AGENT_FULL_FIELDS,
  AGENT_REF_FIELDS,
  AGENT_DAILY_STAT_FIELDS,
  EXECUTION_FIELDS,
  EXECUTION_WITH_AGENT_FIELDS,
  USER_CORE_FIELDS,
  PERMISSION_FIELDS,
  PERMISSION_WITH_AGENT_FIELDS,
  REDELEGATION_FIELDS,
  GLOBAL_STATS_FIELDS,
  FEEDBACK_FIELDS,
  AGENT_REPUTATION_SUMMARY_FIELDS,
} from "./fragments";

// ===========================================
// GraphQL Queries for Echelon (Envio/Hasura)
// ===========================================

// -------------------------------------------
// AGENT QUERIES
// -------------------------------------------

/**
 * Get leaderboard - top agents sorted by reputation score
 * Used on: Home page
 */
export const GET_LEADERBOARD = gql`
  query GetLeaderboard($first: Int!, $strategyType: String) {
    Agent(
      limit: $first
      order_by: { reputationScore: desc }
      where: {
        isActive: { _eq: true }
        strategyType: { _eq: $strategyType }
      }
    ) {
      ...AgentCoreFields
      totalExecutions
      successfulExecutions
      winRate
      totalProfitLoss
      lastExecutionAt
    }
  }
  ${AGENT_CORE_FIELDS}
`;

/**
 * Get leaderboard without strategy filter (all active agents)
 * Used on: Home page when no filter selected
 */
export const GET_LEADERBOARD_ALL = gql`
  query GetLeaderboardAll($first: Int!) {
    Agent(
      limit: $first
      order_by: { reputationScore: desc }
      where: { isActive: { _eq: true } }
    ) {
      ...AgentCoreFields
      totalExecutions
      successfulExecutions
      winRate
      totalProfitLoss
      lastExecutionAt
    }
  }
  ${AGENT_CORE_FIELDS}
`;

/**
 * Get all active agents (paginated)
 * Used on: Agent browser/explorer
 */
export const GET_AGENTS = gql`
  query GetAgents($first: Int!, $skip: Int) {
    Agent(
      limit: $first
      offset: $skip
      order_by: { reputationScore: desc }
      where: { isActive: { _eq: true } }
    ) {
      ...AgentCoreFields
      totalExecutions
      winRate
      totalProfitLoss
    }
  }
  ${AGENT_CORE_FIELDS}
`;

/**
 * Get single agent with full details
 * Used on: Agent detail page
 */
export const GET_AGENT_DETAILS = gql`
  query GetAgentDetails($agentId: String!) {
    Agent_by_pk(id: $agentId) {
      ...AgentFullFields
      executions(limit: 20, order_by: { startedAt: desc }) {
        ...ExecutionFields
      }
      dailyStats(limit: 30, order_by: { timestamp: desc }) {
        ...AgentDailyStatFields
      }
    }
  }
  ${AGENT_FULL_FIELDS}
  ${EXECUTION_FIELDS}
  ${AGENT_DAILY_STAT_FIELDS}
`;

/**
 * Get agent with reputation details
 * Used on: Agent reputation tab
 */
export const GET_AGENT_REPUTATION = gql`
  query GetAgentReputation($agentId: String!) {
    Agent_by_pk(id: $agentId) {
      id
      name
      reputationScore
    }
  }
`;

/**
 * Search agents by name
 * Used on: Search functionality
 */
export const SEARCH_AGENTS = gql`
  query SearchAgents($search: String!, $first: Int!) {
    Agent(
      limit: $first
      where: {
        isActive: { _eq: true }
        name: { _ilike: $search }
      }
      order_by: { reputationScore: desc }
    ) {
      ...AgentCoreFields
      winRate
      totalProfitLoss
    }
  }
  ${AGENT_CORE_FIELDS}
`;

/**
 * Get agents by strategy type
 * Used on: Strategy-specific agent pages
 */
export const GET_AGENTS_BY_STRATEGY = gql`
  query GetAgentsByStrategy($strategyType: String!, $first: Int!) {
    Agent(
      limit: $first
      order_by: { reputationScore: desc }
      where: { isActive: { _eq: true }, strategyType: { _eq: $strategyType } }
    ) {
      ...AgentCoreFields
      totalExecutions
      winRate
      totalProfitLoss
    }
  }
  ${AGENT_CORE_FIELDS}
`;

/**
 * Get best agent for a specific strategy
 * Used on: Permission granting flow
 */
export const GET_BEST_AGENT = gql`
  query GetBestAgent($strategyType: String!, $maxRisk: Int!) {
    Agent(
      limit: 1
      order_by: { reputationScore: desc }
      where: {
        isActive: { _eq: true }
        strategyType: { _eq: $strategyType }
        riskLevel: { _lte: $maxRisk }
      }
    ) {
      ...AgentCoreFields
      winRate
      totalProfitLoss
    }
  }
  ${AGENT_CORE_FIELDS}
`;

// -------------------------------------------
// USER QUERIES
// -------------------------------------------

/**
 * Get user dashboard data
 * Used on: Dashboard page
 */
export const GET_USER_DASHBOARD = gql`
  query GetUserDashboard($userId: String!) {
    User_by_pk(id: $userId) {
      ...UserCoreFields
    }
    Permission(
      limit: 20
      order_by: { grantedAt: desc }
      where: { user_id: { _eq: $userId } }
    ) {
      ...PermissionWithAgentFields
    }
    Execution(
      limit: 50
      order_by: { startedAt: desc }
      where: { user_id: { _eq: $userId } }
    ) {
      ...ExecutionWithAgentFields
    }
  }
  ${USER_CORE_FIELDS}
  ${PERMISSION_WITH_AGENT_FIELDS}
  ${EXECUTION_WITH_AGENT_FIELDS}
`;

/**
 * Get user's active permissions
 * Used on: Dashboard permissions tab
 */
export const GET_USER_PERMISSIONS = gql`
  query GetUserPermissions($userId: String!) {
    User_by_pk(id: $userId) {
      id
      activePermissions
    }
    Permission(
      order_by: { grantedAt: desc }
      where: { user_id: { _eq: $userId }, isActive: { _eq: true } }
    ) {
      ...PermissionWithAgentFields
    }
  }
  ${PERMISSION_WITH_AGENT_FIELDS}
`;

/**
 * Get user's execution history
 * Used on: Dashboard activity tab
 */
export const GET_USER_EXECUTIONS = gql`
  query GetUserExecutions($userId: String!, $first: Int!, $skip: Int) {
    Execution(
      limit: $first
      offset: $skip
      order_by: { startedAt: desc }
      where: { user_id: { _eq: $userId } }
    ) {
      ...ExecutionWithAgentFields
    }
  }
  ${EXECUTION_WITH_AGENT_FIELDS}
`;

// -------------------------------------------
// EXECUTION QUERIES
// -------------------------------------------

/**
 * Get recent executions
 * Used on: Global activity feed
 */
export const GET_RECENT_EXECUTIONS = gql`
  query GetRecentExecutions($first: Int!) {
    Execution(limit: $first, order_by: { startedAt: desc }) {
      ...ExecutionWithAgentFields
    }
  }
  ${EXECUTION_WITH_AGENT_FIELDS}
`;

/**
 * Get execution by ID
 * Used on: Execution detail view
 */
export const GET_EXECUTION = gql`
  query GetExecution($executionId: String!) {
    Execution_by_pk(id: $executionId) {
      ...ExecutionFields
      agent {
        ...AgentRefFields
      }
    }
  }
  ${EXECUTION_FIELDS}
  ${AGENT_REF_FIELDS}
`;

/**
 * Get paginated executions for an agent
 * Used on: Agent detail page execution history
 */
export const GET_AGENT_EXECUTIONS = gql`
  query GetAgentExecutions($agentId: String!, $limit: Int!, $offset: Int!) {
    Execution(
      where: { agent_id: { _eq: $agentId } }
      order_by: { startedAt: desc }
      limit: $limit
      offset: $offset
    ) {
      ...ExecutionFields
    }
  }
  ${EXECUTION_FIELDS}
`;

// -------------------------------------------
// GLOBAL STATS QUERIES
// -------------------------------------------

/**
 * Get global platform statistics
 * Used on: Header/Footer stats bar
 */
export const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    GlobalStats_by_pk(id: "global") {
      ...GlobalStatsFields
    }
  }
  ${GLOBAL_STATS_FIELDS}
`;

// -------------------------------------------
// PERMISSION QUERIES
// -------------------------------------------

/**
 * Get permission by ID
 * Used on: Permission detail view
 */
export const GET_PERMISSION = gql`
  query GetPermission($permissionId: String!) {
    Permission_by_pk(id: $permissionId) {
      ...PermissionFields
      agent {
        ...AgentRefFields
      }
    }
  }
  ${PERMISSION_FIELDS}
  ${AGENT_REF_FIELDS}
`;

/**
 * Get permissions for a specific agent
 * Used on: Agent permissions tab
 */
export const GET_AGENT_PERMISSIONS = gql`
  query GetAgentPermissions($agentId: String!, $first: Int!) {
    Permission(
      limit: $first
      order_by: { grantedAt: desc }
      where: { agent_id: { _eq: $agentId }, isActive: { _eq: true } }
    ) {
      ...PermissionFields
    }
  }
  ${PERMISSION_FIELDS}
`;

/**
 * Get permissions with user info for an agent (delegators)
 * Used on: Fund Manager page to show who delegated
 */
export const GET_AGENT_DELEGATORS = gql`
  query GetAgentDelegators($agentId: String!, $first: Int!) {
    Permission(
      limit: $first
      order_by: { grantedAt: desc }
      where: { agent_id: { _eq: $agentId }, isActive: { _eq: true } }
    ) {
      ...PermissionFields
      user {
        id
        totalDelegated
        activePermissions
      }
    }
  }
  ${PERMISSION_FIELDS}
`;

// -------------------------------------------
// REDELEGATION QUERIES
// -------------------------------------------

/**
 * Get delegation tree for an agent
 * Used on: A2A delegation visualization
 */
export const GET_DELEGATION_TREE = gql`
  query GetDelegationTree($agentId: String!) {
    Agent_by_pk(id: $agentId) {
      id
      name
      reputationScore
      redelegationsAsParent(where: { isActive: { _eq: true } }) {
        ...RedelegationFields
        childAgent {
          id
          name
          reputationScore
          strategyType
        }
      }
    }
  }
  ${REDELEGATION_FIELDS}
`;

/**
 * Get delegation tree for an agent filtered by a specific user
 * Used on: User delegation visualization (shows only current user's redelegations)
 */
export const GET_USER_DELEGATION_TREE = gql`
  query GetUserDelegationTree($agentId: String!, $userId: String!) {
    Agent_by_pk(id: $agentId) {
      id
      name
      reputationScore
      redelegationsAsParent(where: { isActive: { _eq: true }, user_id: { _eq: $userId } }) {
        ...RedelegationFields
        childAgent {
          id
          name
          reputationScore
          strategyType
        }
      }
    }
  }
  ${REDELEGATION_FIELDS}
`;

/**
 * Get all active redelegations for a user
 * Used on: User dashboard A2A tab
 */
export const GET_USER_REDELEGATIONS = gql`
  query GetUserRedelegations($userId: String!) {
    Redelegation(
      where: { user_id: { _eq: $userId }, isActive: { _eq: true } }
      order_by: { createdAt: desc }
    ) {
      ...RedelegationFields
      parentAgent {
        ...AgentRefFields
      }
      childAgent {
        ...AgentRefFields
      }
    }
  }
  ${REDELEGATION_FIELDS}
  ${AGENT_REF_FIELDS}
`;

/**
 * Get redelegation statistics for an agent
 * Used on: Agent detail page A2A stats
 */
export const GET_REDELEGATION_STATS = gql`
  query GetRedelegationStats($agentId: String!) {
    Agent_by_pk(id: $agentId) {
      id
      name
      reputationScore
      redelegationsAsParent(where: { isActive: { _eq: true } }) {
        id
        amount
        duration
        createdAt
        expiresAt
        childAgent {
          id
          name
          reputationScore
          strategyType
        }
      }
      redelegationsAsChild(where: { isActive: { _eq: true } }) {
        id
        amount
        duration
        createdAt
        expiresAt
        parentAgent {
          id
          name
          reputationScore
          strategyType
        }
      }
    }
  }
`;

/**
 * Get redelegation history for an agent (all, not just active)
 * Used on: Agent detail page redelegation history tab
 */
export const GET_REDELEGATION_HISTORY = gql`
  query GetRedelegationHistory($agentId: String!, $first: Int!) {
    redelegationsAsParent: Redelegation(
      where: { parentAgent_id: { _eq: $agentId } }
      limit: $first
      order_by: { createdAt: desc }
    ) {
      ...RedelegationFields
      childAgent {
        ...AgentRefFields
      }
    }
    redelegationsAsChild: Redelegation(
      where: { childAgent_id: { _eq: $agentId } }
      limit: $first
      order_by: { createdAt: desc }
    ) {
      ...RedelegationFields
      parentAgent {
        ...AgentRefFields
      }
    }
  }
  ${REDELEGATION_FIELDS}
  ${AGENT_REF_FIELDS}
`;

// -------------------------------------------
// ANALYTICS QUERIES
// -------------------------------------------

/**
 * Get agent performance over time
 * Used on: Agent performance chart
 */
export const GET_AGENT_DAILY_STATS = gql`
  query GetAgentDailyStats($agentId: String!, $days: Int!) {
    AgentDailyStat(
      limit: $days
      order_by: { timestamp: desc }
      where: { agent_id: { _eq: $agentId } }
    ) {
      ...AgentDailyStatFields
    }
  }
  ${AGENT_DAILY_STAT_FIELDS}
`;

// -------------------------------------------
// TYPE DEFINITIONS FOR QUERY VARIABLES
// -------------------------------------------

export type LeaderboardQueryVars = {
  first: number;
  skip?: number;
  strategyType?: string;
};

export type AgentDetailsQueryVars = {
  agentId: string;
};

export type UserDashboardQueryVars = {
  userId: string;
};

export type SearchAgentsQueryVars = {
  search: string;
  first: number;
};

export type PaginationQueryVars = {
  first: number;
  skip?: number;
};

export type AgentsByStrategyQueryVars = {
  strategyType: string;
  first: number;
};
