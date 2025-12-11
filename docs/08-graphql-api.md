# 08 - GraphQL API

## Overview

The Envio-powered GraphQL API provides real-time access to all indexed Echelon data including agents, executions, permissions, and redelegations. This document covers all available queries, fragments, and usage patterns for frontend development.

---

## Technical Specifications

### API Endpoint

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:8080/v1/graphql` |
| Production | `https://indexer.envio.dev/echelon/v1/graphql` |

### Query Features

| Feature | Support |
|---------|---------|
| Filtering | `where` clause with multiple conditions |
| Sorting | `orderBy` and `orderDirection` |
| Pagination | `first`, `skip` |
| Relationships | Nested queries |
| Subscriptions | Real-time updates (if enabled) |

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| Agent Queries | Leaderboard, details, filtering |
| Execution History | Track all agent actions |
| Permission Status | Active permissions per user |
| Delegation Trees | A2A relationship mapping |
| Global Statistics | Platform-wide metrics |
| Real-time Updates | Polling and subscriptions |

---

## Implementation Guide

### 1. GraphQL Fragments

```typescript
// graphql/fragments.ts
import { gql } from "@apollo/client";

// Agent fields used across queries
export const AGENT_FIELDS = gql`
  fragment AgentFields on Agent {
    id
    walletAddress
    ownerAddress
    name
    strategyType
    riskLevel
    registeredAt
    isActive
    totalExecutions
    successfulExecutions
    failedExecutions
    winRate
    totalProfitLoss
    reputationScore
    updatedAt
  }
`;

// Execution fields for activity tracking
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
  }
`;

// Permission fields for delegation tracking
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
  }
`;

// Redelegation fields for A2A tracking
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
```

### 2. Agent Queries

```typescript
// graphql/queries.ts
import { gql } from "@apollo/client";
import { AGENT_FIELDS, EXECUTION_FIELDS, PERMISSION_FIELDS } from "./fragments";

// Leaderboard - top agents by reputation
export const GET_LEADERBOARD = gql`
  ${AGENT_FIELDS}
  query GetLeaderboard(
    $first: Int!
    $skip: Int
    $strategyType: String
    $minScore: Int
  ) {
    agents(
      first: $first
      skip: $skip
      orderBy: reputationScore
      orderDirection: desc
      where: {
        isActive: true
        strategyType_contains: $strategyType
        reputationScore_gte: $minScore
      }
    ) {
      ...AgentFields
    }
  }
`;

// Single agent with full details
export const GET_AGENT_DETAILS = gql`
  ${AGENT_FIELDS}
  ${EXECUTION_FIELDS}
  query GetAgentDetails($agentId: ID!) {
    agent(id: $agentId) {
      ...AgentFields
      metadataUri
      totalVolumeIn
      totalVolumeOut
      avgProfitPerTrade
      maxDrawdown
      sharpeRatio
      lastExecutionAt

      executions(
        first: 20
        orderBy: startedAt
        orderDirection: desc
      ) {
        ...ExecutionFields
      }

      redelegationsAsParent(first: 10, where: { isActive: true }) {
        id
        childAgent {
          id
          name
          reputationScore
          strategyType
        }
        amount
        duration
        createdAt
        expiresAt
      }

      permissionsReceived(first: 10, where: { isActive: true }) {
        id
        user {
          id
        }
        amountPerPeriod
        periodDuration
        grantedAt
        expiresAt
        amountUsed
      }

      dailyStats(first: 30, orderBy: timestamp, orderDirection: desc) {
        date
        executionCount
        successCount
        profitLoss
        winRate
      }
    }
  }
`;

// Best agent for a specific strategy
export const GET_BEST_AGENT_FOR_STRATEGY = gql`
  query GetBestAgentForStrategy($strategyType: String!, $maxRisk: Int!) {
    agents(
      first: 1
      orderBy: reputationScore
      orderDirection: desc
      where: {
        isActive: true
        strategyType: $strategyType
        riskLevel_lte: $maxRisk
      }
    ) {
      id
      walletAddress
      name
      reputationScore
      winRate
      riskLevel
    }
  }
`;

// Agents by strategy type
export const GET_AGENTS_BY_STRATEGY = gql`
  ${AGENT_FIELDS}
  query GetAgentsByStrategy($strategyType: String!, $first: Int!) {
    agents(
      first: $first
      orderBy: reputationScore
      orderDirection: desc
      where: {
        isActive: true
        strategyType: $strategyType
      }
    ) {
      ...AgentFields
    }
  }
`;
```

### 3. User Queries

```typescript
// User dashboard - permissions and activity
export const GET_USER_DASHBOARD = gql`
  ${PERMISSION_FIELDS}
  ${EXECUTION_FIELDS}
  query GetUserDashboard($userId: ID!) {
    user(id: $userId) {
      id
      totalDelegated
      currentDelegated
      activePermissions
      totalProfitFromAgents

      permissions(
        first: 20
        orderBy: grantedAt
        orderDirection: desc
      ) {
        ...PermissionFields
        agent {
          id
          name
          reputationScore
          strategyType
        }
      }

      executions(
        first: 30
        orderBy: startedAt
        orderDirection: desc
      ) {
        ...ExecutionFields
        agent {
          id
          name
        }
      }
    }
  }
`;

// Active permissions only
export const GET_USER_ACTIVE_PERMISSIONS = gql`
  query GetUserActivePermissions($userId: ID!) {
    user(id: $userId) {
      permissions(where: { isActive: true }) {
        id
        agent {
          id
          walletAddress
          name
          reputationScore
        }
        amountPerPeriod
        periodDuration
        expiresAt
        amountUsed
        amountRemaining
      }
    }
  }
`;
```

### 4. Delegation Queries

```typescript
// Delegation tree from an agent
export const GET_DELEGATION_TREE = gql`
  query GetDelegationTree($agentId: ID!) {
    agent(id: $agentId) {
      id
      name
      reputationScore

      redelegationsAsParent(where: { isActive: true }) {
        id
        amount
        childAgent {
          id
          name
          reputationScore
          strategyType

          redelegationsAsParent(where: { isActive: true }) {
            id
            amount
            childAgent {
              id
              name
              reputationScore
              strategyType
            }
          }
        }
      }
    }
  }
`;
```

### 5. Activity & Statistics Queries

```typescript
// Recent executions - activity feed
export const GET_RECENT_EXECUTIONS = gql`
  ${EXECUTION_FIELDS}
  query GetRecentExecutions($first: Int!, $agentId: ID) {
    executions(
      first: $first
      orderBy: startedAt
      orderDirection: desc
      where: { agent: $agentId }
    ) {
      ...ExecutionFields
      agent {
        id
        name
        walletAddress
      }
      user {
        id
      }
    }
  }
`;

// Global platform statistics
export const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    globalStats(id: "global") {
      totalAgents
      activeAgents
      totalUsers
      totalExecutions
      activePermissions
      totalVolumeProcessed
      totalProfitGenerated
      lastUpdated
    }
  }
`;

// Agent daily statistics
export const GET_AGENT_DAILY_STATS = gql`
  query GetAgentDailyStats($agentId: ID!, $days: Int!) {
    agentDailyStats(
      first: $days
      orderBy: timestamp
      orderDirection: desc
      where: { agent: $agentId }
    ) {
      date
      executionCount
      successCount
      failureCount
      volumeIn
      volumeOut
      profitLoss
      winRate
    }
  }
`;
```

### 6. Apollo Client Setup

```typescript
// lib/apollo-client.ts
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const ENVIO_GRAPHQL_URL = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL!;

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: ENVIO_GRAPHQL_URL }),
  cache: new InMemoryCache({
    typePolicies: {
      Agent: { keyFields: ["id"] },
      Execution: { keyFields: ["id"] },
      Permission: { keyFields: ["id"] },
      User: { keyFields: ["id"] },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
      errorPolicy: "ignore",
    },
    query: {
      fetchPolicy: "network-only",
      errorPolicy: "all",
    },
  },
});
```

### 7. Usage in Components

```typescript
// Example: Using queries in a component
"use client";

import { useQuery } from "@apollo/client";
import { GET_LEADERBOARD } from "@/graphql/queries";

export function Leaderboard() {
  const { data, loading, error, refetch } = useQuery(GET_LEADERBOARD, {
    variables: {
      first: 10,
      minScore: 0,
    },
    pollInterval: 10000, // Refresh every 10 seconds
  });

  if (loading) return <Loading />;
  if (error) return <Error error={error} />;

  return (
    <div>
      {data.agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
```

---

## Query Parameters

### Filtering (`where`)

```graphql
# Multiple conditions
where: {
  isActive: true
  strategyType: "DCA"
  reputationScore_gte: 60
  riskLevel_lte: 5
}

# String matching
where: {
  name_contains: "Alpha"
  strategyType_in: ["DCA", "Yield"]
}
```

### Sorting

```graphql
orderBy: reputationScore
orderDirection: desc  # or asc
```

### Pagination

```graphql
first: 10   # Limit
skip: 20    # Offset
```

---

## Rate Limits

| Tier | Requests/min |
|------|-------------|
| Development | 100 |
| Production | 1000 |

---

*See also: [Envio Indexer](./02-envio-indexer.md), [Frontend Application](./03-frontend-application.md)*
