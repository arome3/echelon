# 06 - A2A Delegation

## Overview

A2A (Agent-to-Agent) delegation enables hierarchical permission structures where "Fund Manager" agents can re-delegate portions of their permissions to "Specialist" agents. This creates a network of trust where managers select specialists based on their Envio-indexed reputation scores.

---

## Technical Specifications

### A2A Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     A2A DELEGATION FLOW                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: User grants permission to Fund Manager                 │
│  ┌─────────┐        ERC-7715           ┌──────────────────┐    │
│  │  USER   │ ────────────────────────► │  FUND MANAGER    │    │
│  │         │   100 USDC/day            │  (Agent #1)      │    │
│  └─────────┘   for 30 days             │  Score: 92       │    │
│                                         └────────┬─────────┘    │
│                                                  │               │
│  STEP 2: Fund Manager queries Envio for specialists             │
│                                                  │               │
│            ┌─────────────────────────────────────┘               │
│            │                                                     │
│            ▼                                                     │
│  ┌─────────────────┐                                            │
│  │     ENVIO       │  Query: "Best DEX agent for ETH swaps?"   │
│  │   GraphQL API   │  Response: Agent #7 (Score: 88)           │
│  └─────────────────┘                                            │
│                                                                  │
│  STEP 3: Fund Manager re-delegates to Specialist                │
│                                                  │               │
│  ┌──────────────────┐      Redelegation      ┌──────────────┐  │
│  │  FUND MANAGER    │ ─────────────────────► │ DEX AGENT    │  │
│  │  (Agent #1)      │   50 USDC/day          │ (Agent #7)   │  │
│  │                  │                         │ Score: 88    │  │
│  └──────────────────┘                         └──────┬───────┘  │
│          │                                           │          │
│          │ Remaining: 50 USDC/day                   │          │
│          ▼                                           ▼          │
│  ┌──────────────────┐                     ┌─────────────────┐  │
│  │  LENDING AGENT   │                     │ Execute ETH     │  │
│  │  (Agent #12)     │                     │ Swaps on DEX    │  │
│  │  Score: 85       │                     └─────────────────┘  │
│  └──────────────────┘                                          │
│                                                                  │
│  STEP 4: All executions logged & indexed by Envio               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Redelegation Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| parentAgentId | uint256 | Manager agent ID |
| childAgentId | uint256 | Specialist agent ID |
| userAddress | address | Original user |
| amount | uint256 | Delegated amount |
| duration | uint256 | Duration in seconds |

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| Hierarchical Trust | Multi-level delegation chains |
| Specialist Discovery | Query best agents by strategy |
| Risk Distribution | Split funds across specialists |
| Dynamic Allocation | Adjust based on market conditions |
| Transparent Tracking | All redelegations indexed |
| Automatic Expiry | Time-bound subdelegations |

---

## Implementation Guide

### 1. Redelegation Smart Contract Event

```solidity
// In AgentExecution.sol
event RedelegationCreated(
    uint256 indexed parentAgentId,
    uint256 indexed childAgentId,
    address indexed userAddress,
    uint256 amount,
    uint256 duration
);

function logRedelegation(
    uint256 childAgentId,
    address userAddress,
    uint256 amount,
    uint256 duration
) external nonReentrant {
    require(registry.isRegisteredAgent(msg.sender), "Not a registered agent");
    require(userAddress != address(0), "Invalid user address");
    require(amount > 0, "Amount must be positive");
    require(duration > 0, "Duration must be positive");

    (uint256 parentAgentId, ) = registry.getAgentByWallet(msg.sender);

    emit RedelegationCreated(
        parentAgentId,
        childAgentId,
        userAddress,
        amount,
        duration
    );
}
```

### 2. Fund Manager Redelegation Logic

```typescript
// packages/agents/src/FundManagerAgent.ts (excerpt)

interface SpecialistAgent {
  id: string;
  walletAddress: string;
  name: string;
  reputationScore: number;
  strategyType: string;
}

interface MarketConditions {
  ethVolatility: number;
  bestYieldApy: number;
  trendDirection: "up" | "down" | "neutral";
}

class FundManagerAgent extends BaseAgent {
  /**
   * Main decision loop - analyzes market and delegates to specialists
   */
  async executeStrategy(): Promise<void> {
    // 1. Analyze current market conditions
    const conditions = await this.analyzeMarket();

    // 2. Query Envio for best specialist based on conditions
    const specialist = await this.findBestSpecialist(conditions);

    if (!specialist) {
      console.log("No suitable specialist found");
      return;
    }

    // 3. Calculate optimal allocation based on risk
    const availableAmount = await this.getAvailableAmount();
    const allocation = this.calculateAllocation(availableAmount, conditions);

    // 4. Re-delegate to specialist
    if (allocation.amount > 0) {
      await this.redelegateToSpecialist(specialist, allocation);
    }
  }

  /**
   * Find best specialist agent for current conditions
   */
  private async findBestSpecialist(
    conditions: MarketConditions
  ): Promise<SpecialistAgent | null> {
    // Determine strategy based on conditions
    let targetStrategy: string;

    if (conditions.ethVolatility > 0.1) {
      targetStrategy = "Arbitrage";
    } else if (conditions.bestYieldApy > 8) {
      targetStrategy = "Yield";
    } else if (conditions.trendDirection === "up") {
      targetStrategy = "Momentum";
    } else {
      targetStrategy = "DCA";
    }

    // Query Envio for top-performing specialist
    const query = `
      query FindSpecialist($strategyType: String!, $maxRisk: Int!) {
        agents(
          first: 1
          orderBy: reputationScore
          orderDirection: desc
          where: {
            isActive: true
            strategyType: $strategyType
            riskLevel_lte: $maxRisk
            reputationScore_gte: 60
          }
        ) {
          id
          walletAddress
          name
          reputationScore
          strategyType
          winRate
        }
      }
    `;

    const result = await this.envio.query(query, {
      strategyType: targetStrategy,
      maxRisk: 7,
    });

    return result.agents?.[0] || null;
  }

  /**
   * Execute redelegation to specialist agent
   */
  private async redelegateToSpecialist(
    specialist: SpecialistAgent,
    allocation: { amount: number; duration: number }
  ): Promise<void> {
    console.log(
      `Redelegating ${allocation.amount} to ${specialist.name} for ${allocation.duration}s`
    );

    // Call AgentExecution.logRedelegation on-chain
    const tx = await this.walletClient.writeContract({
      address: this.executionAddress as `0x${string}`,
      abi: AgentExecutionABI,
      functionName: "logRedelegation",
      args: [
        BigInt(specialist.id),
        this.userAddress as `0x${string}`,
        BigInt(allocation.amount),
        BigInt(allocation.duration),
      ],
    });

    console.log(`Redelegation logged: ${tx}`);
  }
}
```

### 3. Delegation Tree Visualization

```typescript
// components/delegation/DelegationTree.tsx
"use client";

import { useQuery } from "@apollo/client";
import Tree from "react-d3-tree";

const GET_DELEGATION_TREE = `
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

export function DelegationTree({ agentId }: { agentId: string }) {
  const { data, loading } = useQuery(GET_DELEGATION_TREE, {
    variables: { agentId },
  });

  if (loading) return <LoadingSkeleton />;
  if (!data?.agent) return null;

  // Transform to tree structure
  const treeData = transformToTreeData(data.agent);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">A2A Delegation Tree</h3>
      <div style={{ width: "100%", height: "400px" }}>
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          translate={{ x: 200, y: 50 }}
          nodeSize={{ x: 150, y: 100 }}
          renderCustomNodeElement={({ nodeDatum }) => (
            <g>
              <circle
                r="20"
                fill={getScoreColor(nodeDatum.attributes?.score)}
              />
              <text dy=".31em" x="30" style={{ fontSize: "12px" }}>
                {nodeDatum.name}
              </text>
              <text
                dy="1.5em"
                x="30"
                style={{ fontSize: "10px", fill: "#666" }}
              >
                Score: {nodeDatum.attributes?.score}
              </text>
            </g>
          )}
        />
      </div>
    </div>
  );
}

function transformToTreeData(agent: any) {
  return {
    name: agent.name,
    attributes: {
      score: agent.reputationScore,
    },
    children: agent.redelegationsAsParent?.map((redel: any) => ({
      name: redel.childAgent.name,
      attributes: {
        score: redel.childAgent.reputationScore,
        amount: redel.amount,
      },
      children: redel.childAgent.redelegationsAsParent?.map(
        (subRedel: any) => ({
          name: subRedel.childAgent.name,
          attributes: {
            score: subRedel.childAgent.reputationScore,
            amount: subRedel.amount,
          },
        })
      ),
    })),
  };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#eab308"; // yellow
  return "#ef4444"; // red
}
```

### 4. GraphQL Queries for A2A

```typescript
// graphql/queries.ts

// Get delegation tree starting from an agent
export const GET_DELEGATION_TREE = gql`
  query GetDelegationTree($agentId: ID!) {
    agent(id: $agentId) {
      id
      name
      reputationScore

      redelegationsAsParent(where: { isActive: true }) {
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
          winRate

          redelegationsAsParent(where: { isActive: true }) {
            id
            amount
            childAgent {
              id
              name
              reputationScore
            }
          }
        }
      }
    }
  }
`;

// Get all active redelegations for a user
export const GET_USER_REDELEGATIONS = gql`
  query GetUserRedelegations($userId: ID!) {
    redelegations(
      where: { user: $userId, isActive: true }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      amount
      duration
      createdAt
      expiresAt
      parentAgent {
        id
        name
        reputationScore
      }
      childAgent {
        id
        name
        reputationScore
        strategyType
      }
    }
  }
`;

// Get redelegation statistics
export const GET_REDELEGATION_STATS = gql`
  query GetRedelegationStats($agentId: ID!) {
    agent(id: $agentId) {
      # As parent (delegating to others)
      redelegationsAsParent(where: { isActive: true }) {
        id
        amount
        childAgent {
          name
          reputationScore
        }
      }

      # As child (receiving from others)
      redelegationsAsChild(where: { isActive: true }) {
        id
        amount
        parentAgent {
          name
          reputationScore
        }
      }
    }
  }
`;
```

---

## A2A Use Cases

### 1. Portfolio Diversification

```
User → Fund Manager (100 USDC/day)
          ├── DEX Agent (40 USDC/day) - Arbitrage
          ├── Yield Agent (40 USDC/day) - Yield farming
          └── DCA Agent (20 USDC/day) - Safe accumulation
```

### 2. Market-Adaptive Strategy

```
High Volatility Market:
  Fund Manager → Arbitrage Specialist (70%)
              → DCA Bot (30%)

Low Volatility Market:
  Fund Manager → Yield Optimizer (60%)
              → Grid Trader (40%)
```

### 3. Risk Tiering

```
Conservative User:
  Fund Manager (max risk: 5) → Low-risk specialists only

Aggressive User:
  Fund Manager (max risk: 9) → Can use momentum traders
```

---

## Indexer Schema for A2A

```graphql
type Redelegation @entity {
  id: ID!
  parentAgent: Agent!         # Manager agent
  childAgent: Agent!          # Specialist agent
  user: User!                 # Original user

  amount: BigDecimal!         # Delegated amount
  duration: BigInt!           # Duration in seconds

  createdAt: BigInt!
  expiresAt: BigInt!
  isActive: Boolean! @index

  txHash: String!
}

type Agent @entity {
  # ... other fields

  # A2A relationships
  redelegationsAsParent: [Redelegation!]! @derivedFrom(field: "parentAgent")
  redelegationsAsChild: [Redelegation!]! @derivedFrom(field: "childAgent")
}
```

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| Circular delegation | Validate no cycles in chain |
| Over-delegation | Sum of subdelegations <= original |
| Inactive specialist | Check isActive before delegating |
| Low reputation | Minimum score threshold (60+) |

---

## A2A Best Practices

1. **Score Thresholds**: Only delegate to agents with score >= 60
2. **Diversification**: Don't put all funds with one specialist
3. **Duration Limits**: Keep subdelegations shorter than parent
4. **Monitoring**: Track specialist performance continuously
5. **Failsafe**: Revoke if specialist score drops significantly

---

*See also: [Agent Implementation](./05-agent-implementation.md), [Reputation System](./07-reputation-system.md)*
