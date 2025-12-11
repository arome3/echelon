# 02 - Envio Indexer

## Overview

The Envio indexer is responsible for tracking all on-chain events from Echelon smart contracts and maintaining a queryable GraphQL database. It computes agent reputation scores, tracks execution performance, and provides real-time data for the frontend leaderboard and analytics.

---

## Technical Specifications

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ENVIO INDEXER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Sepolia    │───►│   HyperSync  │───►│   Handlers   │ │
│  │   Blockchain │    │              │    │              │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                  │         │
│                                                  ▼         │
│                                          ┌──────────────┐ │
│                                          │   Database   │ │
│                                          │   (SQLite)   │ │
│                                          └──────────────┘ │
│                                                  │         │
│                                                  ▼         │
│                                          ┌──────────────┐ │
│                                          │  GraphQL API │ │
│                                          └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Indexer Framework | Envio HyperIndex ^2.0.0 |
| Language | TypeScript |
| Database | SQLite (dev) / PostgreSQL (prod) |
| API | GraphQL |
| Sync Method | HyperSync |

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| Event Indexing | Track all contract events in real-time |
| Reputation Computation | Calculate agent scores on each execution |
| Performance Analytics | Win rate, P&L, volume tracking |
| User Tracking | Monitor user delegations and profits |
| Global Statistics | Aggregate platform metrics |
| A2A Tracking | Index agent-to-agent redelegations |

---

## Implementation Guide

### 1. Project Initialization

```bash
# Initialize Envio project
cd packages/indexer
envio init

# Select options:
# - Name: echelon-indexer
# - Language: TypeScript
# - Template: Blank
```

### 2. Schema Definition (schema.graphql)

```graphql
# ============================================
# CORE ENTITIES
# ============================================

type Agent @entity {
  id: ID!                              # Agent ID from contract
  walletAddress: String! @index        # Execution wallet
  ownerAddress: String! @index         # NFT owner
  name: String!                        # Human-readable name
  strategyType: String! @index         # DCA, Arbitrage, Yield, etc.
  riskLevel: Int!                      # 1-10 scale
  registeredAt: BigInt!                # Unix timestamp
  isActive: Boolean! @index            # Accepting delegations
  metadataUri: String!                 # IPFS/HTTPS metadata

  # Performance Metrics (Computed)
  totalExecutions: BigInt!
  successfulExecutions: BigInt!
  failedExecutions: BigInt!
  pendingExecutions: BigInt!

  # Volume Metrics
  totalVolumeIn: BigDecimal!           # Total input volume (wei)
  totalVolumeOut: BigDecimal!          # Total output volume (wei)
  totalProfitLoss: BigDecimal!         # Cumulative P&L (wei)

  # Reputation Metrics
  winRate: BigDecimal!                 # Success rate (0-1)
  avgProfitPerTrade: BigDecimal!       # Average profit per trade
  maxDrawdown: BigDecimal!             # Maximum drawdown observed
  sharpeRatio: BigDecimal!             # Risk-adjusted return
  reputationScore: Int!                # 0-100 composite score

  # Timestamps
  lastExecutionAt: BigInt              # Last activity timestamp
  updatedAt: BigInt!                   # Last update timestamp

  # Relationships
  executions: [Execution!]! @derivedFrom(field: "agent")
  permissionsReceived: [Permission!]! @derivedFrom(field: "agent")
  redelegationsAsParent: [Redelegation!]! @derivedFrom(field: "parentAgent")
  redelegationsAsChild: [Redelegation!]! @derivedFrom(field: "childAgent")
  dailyStats: [AgentDailyStat!]! @derivedFrom(field: "agent")
}

type Execution @entity {
  id: ID!                              # executionId from contract
  agent: Agent!                        # Executing agent
  user: User!                          # Delegating user

  # Trade Details
  amountIn: BigDecimal!                # Input amount (wei)
  amountOut: BigDecimal!               # Output amount (wei)
  tokenIn: String!                     # Input token address
  tokenOut: String!                    # Output token address
  tokenInSymbol: String                # Input token symbol
  tokenOutSymbol: String               # Output token symbol

  # Results
  profitLoss: BigDecimal!              # amountOut - amountIn
  profitLossPercent: BigDecimal!       # Percentage gain/loss
  result: ExecutionResult!             # PENDING, SUCCESS, FAILURE

  # Timing
  startedAt: BigInt!                   # Unix timestamp
  completedAt: BigInt                  # Unix timestamp (null if pending)
  duration: BigInt                     # Execution duration in seconds

  # Transaction Info
  startTxHash: String!                 # Start transaction hash
  completeTxHash: String               # Complete transaction hash
  blockNumber: BigInt!                 # Block number of start
}

enum ExecutionResult {
  PENDING
  SUCCESS
  FAILURE
}

type User @entity {
  id: ID!                              # User wallet address

  # Stats
  totalDelegated: BigDecimal!          # Total amount ever delegated
  currentDelegated: BigDecimal!        # Currently active delegations
  activePermissions: BigInt!           # Count of active permissions
  totalPermissionsGranted: BigInt!     # Total permissions ever granted

  # Performance
  totalProfitFromAgents: BigDecimal!   # Total profit earned via agents
  bestAgentUsed: Agent                 # Best performing agent

  # Timestamps
  firstDelegationAt: BigInt            # First delegation timestamp
  lastActivityAt: BigInt               # Last activity timestamp

  # Relationships
  permissions: [Permission!]! @derivedFrom(field: "user")
  executions: [Execution!]! @derivedFrom(field: "user")
}

type Permission @entity {
  id: ID!                              # Composite: user-agent-timestamp
  user: User!                          # Granting user
  agent: Agent!                        # Receiving agent

  # Permission Parameters
  permissionType: String!              # erc20-token-periodic, etc.
  tokenAddress: String!                # Token being permitted
  tokenSymbol: String                  # Token symbol
  amountPerPeriod: BigDecimal!         # Amount per period (wei)
  periodDuration: BigInt!              # Period in seconds
  totalAmount: BigDecimal!             # Maximum total (wei)

  # Timing
  grantedAt: BigInt!                   # Unix timestamp
  expiresAt: BigInt!                   # Unix timestamp
  revokedAt: BigInt                    # Unix timestamp (null if active)

  # Status
  isActive: Boolean! @index            # Currently active
  amountUsed: BigDecimal!              # Amount already used (wei)
  amountRemaining: BigDecimal!         # Amount remaining (wei)
  periodsElapsed: BigInt!              # Number of periods elapsed

  # Transaction Info
  grantTxHash: String!                 # Grant transaction hash
  revokeTxHash: String                 # Revoke transaction hash
}

type Redelegation @entity {
  id: ID!                              # Composite ID
  parentAgent: Agent!                  # Delegating (manager) agent
  childAgent: Agent!                   # Receiving (specialist) agent
  user: User!                          # Original user

  # Delegation Parameters
  amount: BigDecimal!                  # Delegated amount (wei)
  duration: BigInt!                    # Duration in seconds

  # Timing
  createdAt: BigInt!                   # Unix timestamp
  expiresAt: BigInt!                   # Unix timestamp

  # Status
  isActive: Boolean! @index

  # Transaction Info
  txHash: String!
}

# ============================================
# ANALYTICS ENTITIES
# ============================================

type AgentDailyStat @entity {
  id: ID!                              # agent-date
  agent: Agent!
  date: String!                        # YYYY-MM-DD format
  timestamp: BigInt!                   # Start of day timestamp

  # Daily Metrics
  executionCount: BigInt!
  successCount: BigInt!
  failureCount: BigInt!
  volumeIn: BigDecimal!
  volumeOut: BigDecimal!
  profitLoss: BigDecimal!
  winRate: BigDecimal!

  # Rankings
  dailyRank: Int                       # Rank for this day
}

type GlobalStats @entity {
  id: ID!                              # "global"

  # Counts
  totalAgents: BigInt!
  activeAgents: BigInt!
  totalUsers: BigInt!
  totalExecutions: BigInt!
  totalPermissions: BigInt!
  activePermissions: BigInt!
  totalRedelegations: BigInt!

  # Volume
  totalVolumeProcessed: BigDecimal!
  totalProfitGenerated: BigDecimal!

  # Timestamps
  lastUpdated: BigInt!
}
```

### 3. Event Handlers (src/EventHandlers.ts)

```typescript
import {
  AgentRegistry,
  AgentExecution,
  Agent,
  Execution,
  User,
  Redelegation,
  GlobalStats,
} from "generated";
import { calculateReputationScore, calculateWinRate } from "./utils/reputation";

const ZERO_BD = "0";
const ZERO_BI = BigInt(0);
const INITIAL_REPUTATION = 50;

// Helper: Get or create user
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
  }

  return user;
}

// Helper: Get or create global stats
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

// ============================================
// AGENT REGISTRY HANDLERS
// ============================================

AgentRegistry.AgentRegistered.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const blockTimestamp = BigInt(event.block.timestamp);

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

    totalExecutions: ZERO_BI,
    successfulExecutions: ZERO_BI,
    failedExecutions: ZERO_BI,
    pendingExecutions: ZERO_BI,
    totalVolumeIn: ZERO_BD,
    totalVolumeOut: ZERO_BD,
    totalProfitLoss: ZERO_BD,
    winRate: ZERO_BD,
    avgProfitPerTrade: ZERO_BD,
    maxDrawdown: ZERO_BD,
    sharpeRatio: ZERO_BD,
    reputationScore: INITIAL_REPUTATION,
    lastExecutionAt: undefined,
    updatedAt: blockTimestamp,
  };

  context.Agent.set(agent);

  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalAgents: globalStats.totalAgents + BigInt(1),
    activeAgents: globalStats.activeAgents + BigInt(1),
    lastUpdated: blockTimestamp,
  });
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

    const globalStats = await getOrCreateGlobalStats(context);
    context.GlobalStats.set({
      ...globalStats,
      activeAgents: globalStats.activeAgents - BigInt(1),
      lastUpdated: BigInt(event.block.timestamp),
    });
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

  await getOrCreateUser(context, userAddress);

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
  };

  context.Execution.set(execution);

  const agent = await context.Agent.get(agentId);
  if (agent) {
    context.Agent.set({
      ...agent,
      pendingExecutions: agent.pendingExecutions + BigInt(1),
      lastExecutionAt: blockTimestamp,
      updatedAt: blockTimestamp,
    });
  }
});

AgentExecution.ExecutionCompleted.handler(async ({ event, context }) => {
  const executionId = event.params.executionId.toString();
  const agentId = event.params.agentId.toString();
  const blockTimestamp = BigInt(event.block.timestamp);

  const execution = await context.Execution.get(executionId);
  if (!execution) return;

  const amountIn = parseFloat(execution.amountIn);
  const amountOut = parseFloat(event.params.amountOut.toString());
  const profitLoss = parseFloat(event.params.profitLoss.toString());
  const profitLossPercent = amountIn > 0 ? (profitLoss / amountIn) * 100 : 0;
  const duration = blockTimestamp - execution.startedAt;

  const result = event.params.result === 1 ? "SUCCESS" : "FAILURE";

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

    const newVolumeIn = parseFloat(agent.totalVolumeIn) + amountIn;
    const newVolumeOut = parseFloat(agent.totalVolumeOut) + amountOut;
    const newProfitLoss = parseFloat(agent.totalProfitLoss) + profitLoss;

    const winRate = calculateWinRate(
      Number(newSuccessful),
      Number(newTotalExecutions)
    );

    const avgProfitPerTrade = Number(newTotalExecutions) > 0
      ? newProfitLoss / Number(newTotalExecutions)
      : 0;

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
      pendingExecutions: agent.pendingExecutions - BigInt(1),
      totalVolumeIn: newVolumeIn.toString(),
      totalVolumeOut: newVolumeOut.toString(),
      totalProfitLoss: newProfitLoss.toString(),
      winRate: winRate.toString(),
      avgProfitPerTrade: avgProfitPerTrade.toString(),
      reputationScore,
      updatedAt: blockTimestamp,
    });
  }
});

AgentExecution.RedelegationCreated.handler(async ({ event, context }) => {
  const blockTimestamp = BigInt(event.block.timestamp);
  const parentAgentId = event.params.parentAgentId.toString();
  const childAgentId = event.params.childAgentId.toString();
  const userAddress = event.params.userAddress.toLowerCase();

  const redelegationId = `${parentAgentId}-${childAgentId}-${blockTimestamp}`;

  await getOrCreateUser(context, userAddress);

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

  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalRedelegations: globalStats.totalRedelegations + BigInt(1),
    lastUpdated: blockTimestamp,
  });
});
```

### 4. Configuration (config.yaml)

```yaml
name: echelon-indexer
version: 1.0.0
description: Echelon - Trustless AI Agent Marketplace Indexer

networks:
  - id: 11155111  # Sepolia
    start_block: 0  # UPDATE: Set to contract deployment block
    confirmed_block_threshold: 5
    contracts:
      - name: AgentRegistry
        address:
          - "0x..."  # UPDATE: Deployed contract address
        handler: src/EventHandlers.ts
        events:
          - event: AgentRegistered(uint256 indexed agentId, address indexed walletAddress, string name, string strategyType, uint8 riskLevel)
          - event: AgentUpdated(uint256 indexed agentId, string metadataUri)
          - event: AgentDeactivated(uint256 indexed agentId)
          - event: AgentReactivated(uint256 indexed agentId)

      - name: AgentExecution
        address:
          - "0x..."  # UPDATE: Deployed contract address
        handler: src/EventHandlers.ts
        events:
          - event: ExecutionStarted(uint256 indexed executionId, uint256 indexed agentId, address indexed userAddress, uint256 amountIn, address tokenIn, address tokenOut)
          - event: ExecutionCompleted(uint256 indexed executionId, uint256 indexed agentId, address indexed userAddress, uint256 amountIn, uint256 amountOut, int256 profitLoss, uint8 result)
          - event: RedelegationCreated(uint256 indexed parentAgentId, uint256 indexed childAgentId, address indexed userAddress, uint256 amount, uint256 duration)

sync:
  initial_sync_method: hypersync

database:
  sqlite:
    path: ./data/indexer.db
```

### 5. Deploy Commands

```bash
# Development
cd packages/indexer
envio dev

# Generate types
envio codegen

# Deploy to hosted service
envio deploy
```

---

## Dependencies

```json
{
  "dependencies": {
    "envio": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

---

*See also: [Reputation System](./07-reputation-system.md), [GraphQL API](./08-graphql-api.md)*
