# Echelon: Trustless AI Agent Marketplace with Performance-Gated Permissions

## 🎯 Hackathon Track Alignment

| Requirement | How Echelon Delivers |
|-------------|------------------------|
| **MetaMask Advanced Permissions (ERC-7715)** | Core permission granting mechanism for user → agent delegation |
| **ERC-8004 Agent Registry** | On-chain registry for agent discovery, identity, and metadata |
| **A2A (Agent-to-Agent) Flow** | Fund Manager agents re-delegate to Specialist agents |
| **Envio Integration** | Mission-critical: powers entire reputation/ranking system |
| **Smart Accounts Kit** | Permission granting UI and session account management |
| **EIP-7702 Supported Chains** | Deployed on Sepolia (or other supported testnet) |

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Technical Architecture](#technical-architecture)
5. [Smart Contracts](#smart-contracts)
6. [Envio Indexer](#envio-indexer)
7. [Frontend Application](#frontend-application)
8. [A2A Delegation Flow](#a2a-delegation-flow)
9. [Demo Script](#demo-script)
10. [Implementation Timeline](#implementation-timeline)
11. [Tech Stack](#tech-stack)
12. [Risk Mitigation](#risk-mitigation)
13. [Future Roadmap](#future-roadmap)

---

## Executive Summary

**Echelon** is a trustless marketplace where AI agents compete for user permissions based on verifiable on-chain performance. Users delegate spending authority to top-ranked agents without blind trust—every agent's track record is transparently indexed and scored by Envio.

### The Core Innovation

Traditional approaches to agent delegation require users to either:
- Trust agents blindly (risky)
- Give full wallet access (dangerous)
- Avoid agents entirely (miss opportunities)

Echelon introduces **performance-gated permissions**: agents earn the right to manage user funds through demonstrated on-chain competence, not promises.

### Key Differentiators

- **Trust Through Verification**: Reputation scores derived from indexed on-chain history
- **Granular Permissions**: ERC-7715 enables time-bound, amount-limited delegations
- **Agent Hierarchy**: A2A redelegation allows fund managers to hire specialists
- **Instant Revocation**: Users maintain full control and can revoke any permission instantly
- **Decentralized Registry**: ERC-8004 compliant agent identity system

---

## Problem Statement

### The Trust Gap in AI Agent Economy

As AI agents become capable of executing complex DeFi strategies, a fundamental question emerges: **How do you trust an AI agent with your money?**

#### Current Pain Points

| Problem | Impact |
|---------|--------|
| **No verifiable track record** | Users can't distinguish good agents from bad |
| **All-or-nothing permissions** | Either full access or no access |
| **No accountability** | Bad agents face no consequences |
| **Centralized trust** | Reputation depends on platform claims |
| **No agent coordination** | Agents can't hire specialists |

#### Market Opportunity

- DeFi TVL exceeds $100B, yet most users manually manage positions
- AI agent adoption is hindered by trust concerns
- No standardized way to evaluate agent performance on-chain
- ERC-7715 enables granular permissions but lacks discovery/ranking infrastructure

---

## Solution Overview

### How Echelon Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DISCOVER                                                    │
│     Browse Echelon leaderboard                                │
│     Filter by strategy type, risk level, performance metrics    │
│     All rankings powered by Envio-indexed on-chain history      │
│                                                                 │
│  2. EVALUATE                                                    │
│     View agent's complete transaction history                   │
│     Analyze win rate, ROI, max drawdown, Sharpe ratio          │
│     See which users have delegated to this agent               │
│                                                                 │
│  3. DELEGATE                                                    │
│     Grant ERC-7715 permission with specific limits:            │
│     - Amount per day (e.g., 10 USDC/day)                       │
│     - Duration (e.g., 7 days)                                  │
│     - Strategy constraints (optional)                          │
│                                                                 │
│  4. MONITOR                                                     │
│     Real-time activity feed of agent executions                │
│     Performance tracking against benchmarks                     │
│     Instant alerts for significant events                       │
│                                                                 │
│  5. CONTROL                                                     │
│     Increase permission if satisfied                           │
│     Revoke instantly if concerned                              │
│     Agent's ranking updates based on your outcome              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Echelon Flywheel

```
Better Agents → More Users → More Data → Better Rankings → Better Agents
       ↑                                                          │
       └──────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        LAYER 1: USER                            │
│  MetaMask Extension + Smart Accounts Kit                        │
│  - Connect wallet                                               │
│  - Grant ERC-7715 permissions                                   │
│  - Monitor and revoke                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 2: FRONTEND                           │
│  Next.js Application                                            │
│  - Agent leaderboard (Envio GraphQL)                           │
│  - Permission granting UI                                       │
│  - Real-time activity feed                                      │
│  - User dashboard                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 3: RESOLVER                            │
│  Application Logic                                              │
│  - Query Envio for best agent                                   │
│  - Construct ERC-7715 permission                                │
│  - Handle A2A redelegation logic                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 4: SMART CONTRACTS                       │
│  On-Chain Infrastructure                                        │
│  - AgentRegistry.sol (ERC-8004)                                │
│  - AgentExecution.sol (Logs agent actions)                     │
│  - Integration with MetaMask Delegation Framework              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LAYER 5: ENVIO                             │
│  Blockchain Indexer (HyperIndex + HyperSync)                   │
│  - Index agent registrations                                    │
│  - Track all agent executions                                   │
│  - Compute reputation scores                                    │
│  - Serve GraphQL API                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 6: AGENTS                             │
│  AI Trading Agents                                              │
│  - Register on AgentRegistry                                    │
│  - Execute strategies via granted permissions                  │
│  - Report results on-chain                                      │
│  - Optionally re-delegate to specialists                       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Agent Registers → Envio Indexes → Appears on Leaderboard
       │
       ▼
User Grants Permission → Envio Indexes → Permission Active
       │
       ▼
Agent Executes Trade → Envio Indexes → Updates Reputation
       │
       ▼
User Sees Results → Decides to Renew/Revoke → Envio Indexes
```

---

## Smart Contracts

### 1. AgentRegistry.sol (ERC-8004 Compliant)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @notice ERC-8004 compliant registry for AI agents
 * @dev Each agent is represented as an NFT with metadata URI
 */
contract AgentRegistry is ERC721URIStorage, Ownable {
    
    // Agent ID counter
    uint256 private _nextAgentId;
    
    // Agent metadata
    struct AgentMetadata {
        address walletAddress;      // Agent's execution wallet
        string name;                // Human-readable name
        string strategyType;        // e.g., "DCA", "Arbitrage", "Yield"
        uint8 riskLevel;            // 1-10 scale
        uint256 registeredAt;       // Registration timestamp
        bool isActive;              // Whether agent is accepting delegations
    }
    
    // Mappings
    mapping(uint256 => AgentMetadata) public agents;
    mapping(address => uint256) public walletToAgentId;
    
    // Events
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed walletAddress,
        string name,
        string strategyType,
        uint8 riskLevel
    );
    
    event AgentUpdated(
        uint256 indexed agentId,
        string metadataUri
    );
    
    event AgentDeactivated(uint256 indexed agentId);
    event AgentReactivated(uint256 indexed agentId);
    
    constructor() ERC721("Echelon Registry", "AGENT") Ownable(msg.sender) {}
    
    /**
     * @notice Register a new agent
     * @param walletAddress The wallet address the agent will use for executions
     * @param name Human-readable name for the agent
     * @param strategyType Type of strategy (DCA, Arbitrage, Yield, etc.)
     * @param riskLevel Risk level from 1 (conservative) to 10 (aggressive)
     * @param metadataUri URI pointing to full agent metadata (IPFS or HTTPS)
     */
    function registerAgent(
        address walletAddress,
        string calldata name,
        string calldata strategyType,
        uint8 riskLevel,
        string calldata metadataUri
    ) external returns (uint256 agentId) {
        require(walletToAgentId[walletAddress] == 0, "Wallet already registered");
        require(riskLevel >= 1 && riskLevel <= 10, "Invalid risk level");
        require(bytes(name).length > 0, "Name required");
        
        agentId = ++_nextAgentId;
        
        agents[agentId] = AgentMetadata({
            walletAddress: walletAddress,
            name: name,
            strategyType: strategyType,
            riskLevel: riskLevel,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        walletToAgentId[walletAddress] = agentId;
        
        _mint(msg.sender, agentId);
        _setTokenURI(agentId, metadataUri);
        
        emit AgentRegistered(agentId, walletAddress, name, strategyType, riskLevel);
    }
    
    /**
     * @notice Update agent metadata URI
     * @param agentId The agent's ID
     * @param metadataUri New metadata URI
     */
    function updateAgentMetadata(
        uint256 agentId,
        string calldata metadataUri
    ) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        _setTokenURI(agentId, metadataUri);
        emit AgentUpdated(agentId, metadataUri);
    }
    
    /**
     * @notice Deactivate an agent (stops appearing in rankings)
     * @param agentId The agent's ID
     */
    function deactivateAgent(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        agents[agentId].isActive = false;
        emit AgentDeactivated(agentId);
    }
    
    /**
     * @notice Reactivate a deactivated agent
     * @param agentId The agent's ID
     */
    function reactivateAgent(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        agents[agentId].isActive = true;
        emit AgentReactivated(agentId);
    }
    
    /**
     * @notice Get agent details by wallet address
     * @param walletAddress The agent's wallet address
     */
    function getAgentByWallet(address walletAddress) 
        external 
        view 
        returns (uint256 agentId, AgentMetadata memory metadata) 
    {
        agentId = walletToAgentId[walletAddress];
        require(agentId != 0, "Agent not found");
        metadata = agents[agentId];
    }
    
    /**
     * @notice Check if an address is a registered agent
     * @param walletAddress The address to check
     */
    function isRegisteredAgent(address walletAddress) external view returns (bool) {
        return walletToAgentId[walletAddress] != 0;
    }
    
    /**
     * @notice Get total number of registered agents
     */
    function totalAgents() external view returns (uint256) {
        return _nextAgentId;
    }
}
```

### 2. AgentExecution.sol (Execution Logger)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentRegistry.sol";

/**
 * @title AgentExecution
 * @notice Logs agent execution events for Envio indexing
 */
contract AgentExecution {
    
    AgentRegistry public immutable registry;
    
    // Execution result enum
    enum ExecutionResult { PENDING, SUCCESS, FAILURE }
    
    // Execution record
    struct Execution {
        uint256 agentId;
        address userAddress;
        uint256 amountIn;
        uint256 amountOut;
        address tokenIn;
        address tokenOut;
        ExecutionResult result;
        uint256 timestamp;
        bytes32 txHash;
    }
    
    // Execution counter
    uint256 private _executionCount;
    
    // Events (indexed for Envio)
    event ExecutionStarted(
        uint256 indexed executionId,
        uint256 indexed agentId,
        address indexed userAddress,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    );
    
    event ExecutionCompleted(
        uint256 indexed executionId,
        uint256 indexed agentId,
        address indexed userAddress,
        uint256 amountIn,
        uint256 amountOut,
        int256 profitLoss,  // Can be negative
        ExecutionResult result
    );
    
    event RedelegationCreated(
        uint256 indexed parentAgentId,
        uint256 indexed childAgentId,
        address indexed userAddress,
        uint256 amount,
        uint256 duration
    );
    
    constructor(address _registry) {
        registry = AgentRegistry(_registry);
    }
    
    /**
     * @notice Log the start of an execution
     * @dev Called by agents when they begin executing a strategy
     */
    function logExecutionStart(
        address userAddress,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external returns (uint256 executionId) {
        uint256 agentId = registry.walletToAgentId(msg.sender);
        require(agentId != 0, "Caller is not a registered agent");
        
        executionId = ++_executionCount;
        
        emit ExecutionStarted(
            executionId,
            agentId,
            userAddress,
            amountIn,
            tokenIn,
            tokenOut
        );
    }
    
    /**
     * @notice Log the completion of an execution
     * @dev Called by agents when they finish executing
     */
    function logExecutionComplete(
        uint256 executionId,
        address userAddress,
        uint256 amountIn,
        uint256 amountOut,
        ExecutionResult result
    ) external {
        uint256 agentId = registry.walletToAgentId(msg.sender);
        require(agentId != 0, "Caller is not a registered agent");
        
        // Calculate profit/loss (simplified - assumes same token or USD value)
        int256 profitLoss = int256(amountOut) - int256(amountIn);
        
        emit ExecutionCompleted(
            executionId,
            agentId,
            userAddress,
            amountIn,
            amountOut,
            profitLoss,
            result
        );
    }
    
    /**
     * @notice Log when an agent re-delegates to another agent (A2A)
     */
    function logRedelegation(
        uint256 childAgentId,
        address userAddress,
        uint256 amount,
        uint256 duration
    ) external {
        uint256 parentAgentId = registry.walletToAgentId(msg.sender);
        require(parentAgentId != 0, "Caller is not a registered agent");
        
        emit RedelegationCreated(
            parentAgentId,
            childAgentId,
            userAddress,
            amount,
            duration
        );
    }
}
```

### 3. Contract Deployment Order

```
1. Deploy AgentRegistry
2. Deploy AgentExecution (with AgentRegistry address)
3. Register mock agents for demo
4. Configure Envio to index both contracts
```

---

## Envio Indexer

### Project Initialization

```bash
# Initialize Envio project
envio init

# Select options:
# - Name: echelon-indexer
# - Language: TypeScript
# - Template: Blank
```

### Schema Definition (schema.graphql)

```graphql
# Agent entity - represents a registered AI agent
type Agent @entity {
  id: ID!                           # Agent ID from registry
  walletAddress: String!            # Execution wallet
  ownerAddress: String!             # NFT owner (can transfer)
  name: String!                     # Human-readable name
  strategyType: String!             # DCA, Arbitrage, Yield, etc.
  riskLevel: Int!                   # 1-10 scale
  registeredAt: BigInt!             # Unix timestamp
  isActive: Boolean!                # Accepting delegations?
  metadataUri: String!              # IPFS/HTTPS metadata
  
  # Computed performance metrics (updated by event handlers)
  totalExecutions: BigInt!          # Total trades executed
  successfulExecutions: BigInt!     # Trades with positive outcome
  failedExecutions: BigInt!         # Trades with negative outcome
  totalVolumeIn: BigDecimal!        # Total input volume (USD)
  totalVolumeOut: BigDecimal!       # Total output volume (USD)
  totalProfitLoss: BigDecimal!      # Cumulative P&L
  
  # Reputation metrics
  winRate: BigDecimal!              # successfulExecutions / totalExecutions
  reputationScore: Int!             # 0-100 computed score
  
  # Relationships
  executions: [Execution!]! @derivedFrom(field: "agent")
  permissionsReceived: [Permission!]! @derivedFrom(field: "agent")
  redelegationsAsParent: [Redelegation!]! @derivedFrom(field: "parentAgent")
  redelegationsAsChild: [Redelegation!]! @derivedFrom(field: "childAgent")
}

# Execution entity - represents a single agent action
type Execution @entity {
  id: ID!                           # executionId
  agent: Agent!                     # Executing agent
  user: User!                       # User who granted permission
  
  # Execution details
  amountIn: BigDecimal!             # Input amount
  amountOut: BigDecimal!            # Output amount (0 if pending/failed)
  tokenIn: String!                  # Input token address
  tokenOut: String!                 # Output token address
  profitLoss: BigDecimal!           # amountOut - amountIn
  
  # Status
  result: ExecutionResult!          # PENDING, SUCCESS, FAILURE
  startedAt: BigInt!                # Unix timestamp
  completedAt: BigInt               # Unix timestamp (null if pending)
  
  # Transaction info
  txHash: String!                   # Transaction hash
  blockNumber: BigInt!              # Block number
}

enum ExecutionResult {
  PENDING
  SUCCESS
  FAILURE
}

# User entity - represents a delegating user
type User @entity {
  id: ID!                           # User wallet address
  
  # Aggregated stats
  totalDelegated: BigDecimal!       # Total amount delegated
  activePermissions: BigInt!        # Currently active permissions
  
  # Relationships
  permissions: [Permission!]! @derivedFrom(field: "user")
  executions: [Execution!]! @derivedFrom(field: "user")
}

# Permission entity - represents an ERC-7715 permission grant
type Permission @entity {
  id: ID!                           # Unique ID (user + agent + timestamp)
  user: User!                       # Granting user
  agent: Agent!                     # Receiving agent
  
  # Permission parameters
  amountPerPeriod: BigDecimal!      # e.g., 10 USDC
  periodDuration: BigInt!           # e.g., 86400 (1 day in seconds)
  totalAmount: BigDecimal!          # Maximum total
  tokenAddress: String!             # Token being permitted
  
  # Timing
  grantedAt: BigInt!                # Unix timestamp
  expiresAt: BigInt!                # Unix timestamp
  revokedAt: BigInt                 # Unix timestamp (null if active)
  
  # Status
  isActive: Boolean!                # Currently active?
  amountUsed: BigDecimal!           # Amount already used
}

# Redelegation entity - represents A2A delegation
type Redelegation @entity {
  id: ID!                           # Unique ID
  parentAgent: Agent!               # Delegating agent
  childAgent: Agent!                # Receiving agent
  user: User!                       # Original user
  
  # Delegation parameters
  amount: BigDecimal!               # Delegated amount
  duration: BigInt!                 # Duration in seconds
  
  # Timing
  createdAt: BigInt!                # Unix timestamp
  expiresAt: BigInt!                # Unix timestamp
  
  # Status
  isActive: Boolean!
}

# Leaderboard snapshot - for historical ranking
type LeaderboardSnapshot @entity {
  id: ID!                           # timestamp
  timestamp: BigInt!
  rankings: [AgentRanking!]!
}

type AgentRanking @entity {
  id: ID!                           # snapshot_timestamp + agent_id
  snapshot: LeaderboardSnapshot!
  agent: Agent!
  rank: Int!
  reputationScore: Int!
  winRate: BigDecimal!
  totalVolume: BigDecimal!
}
```

### Event Handlers (src/EventHandlers.ts)

```typescript
import {
  AgentRegistry,
  AgentExecution,
  Agent,
  Execution,
  User,
  Permission,
  Redelegation,
} from "generated";

// ============================================
// AGENT REGISTRY HANDLERS
// ============================================

AgentRegistry.AgentRegistered.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  
  // Create new agent entity
  const agent: Agent = {
    id: agentId,
    walletAddress: event.params.walletAddress.toLowerCase(),
    ownerAddress: event.transaction.from.toLowerCase(),
    name: event.params.name,
    strategyType: event.params.strategyType,
    riskLevel: event.params.riskLevel,
    registeredAt: BigInt(event.block.timestamp),
    isActive: true,
    metadataUri: "", // Will be set by AgentUpdated event
    
    // Initialize performance metrics
    totalExecutions: BigInt(0),
    successfulExecutions: BigInt(0),
    failedExecutions: BigInt(0),
    totalVolumeIn: "0",
    totalVolumeOut: "0",
    totalProfitLoss: "0",
    
    // Initialize reputation
    winRate: "0",
    reputationScore: 50, // Start at neutral
  };
  
  context.Agent.set(agent);
});

AgentRegistry.AgentUpdated.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const agent = await context.Agent.get(agentId);
  
  if (agent) {
    context.Agent.set({
      ...agent,
      metadataUri: event.params.metadataUri,
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
    });
  }
});

AgentRegistry.AgentReactivated.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const agent = await context.Agent.get(agentId);
  
  if (agent) {
    context.Agent.set({
      ...agent,
      isActive: true,
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
  
  // Ensure user exists
  let user = await context.User.get(userAddress);
  if (!user) {
    user = {
      id: userAddress,
      totalDelegated: "0",
      activePermissions: BigInt(0),
    };
    context.User.set(user);
  }
  
  // Create execution entity
  const execution: Execution = {
    id: executionId,
    agent_id: agentId,
    user_id: userAddress,
    amountIn: event.params.amountIn.toString(),
    amountOut: "0",
    tokenIn: event.params.tokenIn.toLowerCase(),
    tokenOut: event.params.tokenOut.toLowerCase(),
    profitLoss: "0",
    result: "PENDING",
    startedAt: BigInt(event.block.timestamp),
    completedAt: undefined,
    txHash: event.transaction.hash,
    blockNumber: BigInt(event.block.number),
  };
  
  context.Execution.set(execution);
});

AgentExecution.ExecutionCompleted.handler(async ({ event, context }) => {
  const executionId = event.params.executionId.toString();
  const agentId = event.params.agentId.toString();
  
  // Update execution
  const execution = await context.Execution.get(executionId);
  if (execution) {
    const result = event.params.result === 1 ? "SUCCESS" : "FAILURE";
    
    context.Execution.set({
      ...execution,
      amountOut: event.params.amountOut.toString(),
      profitLoss: event.params.profitLoss.toString(),
      result: result,
      completedAt: BigInt(event.block.timestamp),
    });
  }
  
  // Update agent metrics
  const agent = await context.Agent.get(agentId);
  if (agent) {
    const isSuccess = event.params.result === 1;
    const newTotalExecutions = agent.totalExecutions + BigInt(1);
    const newSuccessful = isSuccess 
      ? agent.successfulExecutions + BigInt(1) 
      : agent.successfulExecutions;
    const newFailed = !isSuccess 
      ? agent.failedExecutions + BigInt(1) 
      : agent.failedExecutions;
    
    // Calculate new metrics
    const newVolumeIn = parseFloat(agent.totalVolumeIn) + parseFloat(event.params.amountIn.toString());
    const newVolumeOut = parseFloat(agent.totalVolumeOut) + parseFloat(event.params.amountOut.toString());
    const newProfitLoss = parseFloat(agent.totalProfitLoss) + parseFloat(event.params.profitLoss.toString());
    
    // Calculate win rate
    const winRate = Number(newSuccessful) / Number(newTotalExecutions);
    
    // Calculate reputation score (0-100)
    // Formula: 40% win rate + 30% volume + 30% profit consistency
    const reputationScore = calculateReputationScore(
      winRate,
      newVolumeIn,
      newProfitLoss,
      Number(newTotalExecutions)
    );
    
    context.Agent.set({
      ...agent,
      totalExecutions: newTotalExecutions,
      successfulExecutions: newSuccessful,
      failedExecutions: newFailed,
      totalVolumeIn: newVolumeIn.toString(),
      totalVolumeOut: newVolumeOut.toString(),
      totalProfitLoss: newProfitLoss.toString(),
      winRate: winRate.toFixed(4),
      reputationScore: reputationScore,
    });
  }
});

AgentExecution.RedelegationCreated.handler(async ({ event, context }) => {
  const redelegationId = `${event.params.parentAgentId}-${event.params.childAgentId}-${event.block.timestamp}`;
  
  const redelegation: Redelegation = {
    id: redelegationId,
    parentAgent_id: event.params.parentAgentId.toString(),
    childAgent_id: event.params.childAgentId.toString(),
    user_id: event.params.userAddress.toLowerCase(),
    amount: event.params.amount.toString(),
    duration: BigInt(event.params.duration),
    createdAt: BigInt(event.block.timestamp),
    expiresAt: BigInt(event.block.timestamp) + BigInt(event.params.duration),
    isActive: true,
  };
  
  context.Redelegation.set(redelegation);
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateReputationScore(
  winRate: number,
  totalVolume: number,
  profitLoss: number,
  executionCount: number
): number {
  // Minimum executions for reliable score
  if (executionCount < 5) {
    return 50; // Neutral score for new agents
  }
  
  // Win rate component (0-40 points)
  const winRateScore = winRate * 40;
  
  // Volume component (0-30 points) - logarithmic scale
  const volumeScore = Math.min(30, Math.log10(totalVolume + 1) * 10);
  
  // Profit component (0-30 points)
  const profitScore = profitLoss > 0 
    ? Math.min(30, (profitLoss / totalVolume) * 100)
    : Math.max(0, 15 + (profitLoss / totalVolume) * 50);
  
  return Math.round(winRateScore + volumeScore + profitScore);
}
```

### Envio Configuration (config.yaml)

```yaml
name: echelon-indexer
description: Indexes Echelon registry and execution events
networks:
  - id: 11155111  # Sepolia
    start_block: 0  # Set to deployment block
    contracts:
      - name: AgentRegistry
        address: "0x..."  # Deploy address
        handler: src/EventHandlers.ts
        events:
          - event: AgentRegistered(uint256 indexed agentId, address indexed walletAddress, string name, string strategyType, uint8 riskLevel)
          - event: AgentUpdated(uint256 indexed agentId, string metadataUri)
          - event: AgentDeactivated(uint256 indexed agentId)
          - event: AgentReactivated(uint256 indexed agentId)
      - name: AgentExecution
        address: "0x..."  # Deploy address
        handler: src/EventHandlers.ts
        events:
          - event: ExecutionStarted(uint256 indexed executionId, uint256 indexed agentId, address indexed userAddress, uint256 amountIn, address tokenIn, address tokenOut)
          - event: ExecutionCompleted(uint256 indexed executionId, uint256 indexed agentId, address indexed userAddress, uint256 amountIn, uint256 amountOut, int256 profitLoss, uint8 result)
          - event: RedelegationCreated(uint256 indexed parentAgentId, uint256 indexed childAgentId, address indexed userAddress, uint256 amount, uint256 duration)
```

### GraphQL Queries (For Frontend)

```graphql
# Get leaderboard (top agents by reputation)
query GetLeaderboard($limit: Int!, $strategyType: String) {
  agents(
    first: $limit
    orderBy: reputationScore
    orderDirection: desc
    where: { isActive: true, strategyType_contains: $strategyType }
  ) {
    id
    name
    walletAddress
    strategyType
    riskLevel
    reputationScore
    winRate
    totalExecutions
    totalProfitLoss
  }
}

# Get single agent with full details
query GetAgentDetails($agentId: ID!) {
  agent(id: $agentId) {
    id
    name
    walletAddress
    strategyType
    riskLevel
    registeredAt
    metadataUri
    reputationScore
    winRate
    totalExecutions
    successfulExecutions
    failedExecutions
    totalVolumeIn
    totalProfitLoss
    
    executions(first: 20, orderBy: startedAt, orderDirection: desc) {
      id
      amountIn
      amountOut
      profitLoss
      result
      startedAt
      txHash
    }
    
    redelegationsAsParent(first: 10) {
      childAgent {
        id
        name
        reputationScore
      }
      amount
      createdAt
    }
  }
}

# Get best agent for a given strategy and risk level
query GetBestAgent($strategyType: String!, $maxRisk: Int!) {
  agents(
    first: 1
    orderBy: reputationScore
    orderDirection: desc
    where: { 
      isActive: true, 
      strategyType: $strategyType,
      riskLevel_lte: $maxRisk 
    }
  ) {
    id
    walletAddress
    name
    reputationScore
    winRate
  }
}

# Get user's active permissions
query GetUserPermissions($userAddress: ID!) {
  user(id: $userAddress) {
    permissions(where: { isActive: true }) {
      agent {
        id
        name
        reputationScore
      }
      amountPerPeriod
      periodDuration
      grantedAt
      expiresAt
      amountUsed
    }
  }
}

# Get A2A delegation tree for an agent
query GetDelegationTree($agentId: ID!) {
  agent(id: $agentId) {
    id
    name
    redelegationsAsParent {
      childAgent {
        id
        name
        reputationScore
        redelegationsAsParent {
          childAgent {
            id
            name
            reputationScore
          }
        }
      }
      amount
      isActive
    }
  }
}
```

---

## Frontend Application

### Project Setup

```bash
# Create Next.js app with MetaMask integration
npx create-gator-app echelon-frontend

# Additional dependencies
npm install @apollo/client graphql recharts lucide-react
```

### Key Components

#### 1. Leaderboard Component

```typescript
// components/Leaderboard.tsx
import { useQuery, gql } from '@apollo/client';
import { Trophy, TrendingUp, Shield } from 'lucide-react';

const GET_LEADERBOARD = gql`
  query GetLeaderboard($limit: Int!) {
    agents(
      first: $limit
      orderBy: reputationScore
      orderDirection: desc
      where: { isActive: true }
    ) {
      id
      name
      strategyType
      riskLevel
      reputationScore
      winRate
      totalExecutions
      totalProfitLoss
    }
  }
`;

export function Leaderboard() {
  const { data, loading, error } = useQuery(GET_LEADERBOARD, {
    variables: { limit: 10 },
    pollInterval: 5000, // Real-time updates
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="text-yellow-500" />
        Agent Leaderboard
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3">Rank</th>
              <th className="text-left py-3">Agent</th>
              <th className="text-left py-3">Strategy</th>
              <th className="text-right py-3">Win Rate</th>
              <th className="text-right py-3">Score</th>
              <th className="text-right py-3">P&L</th>
              <th className="text-right py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.agents.map((agent, index) => (
              <AgentRow 
                key={agent.id} 
                agent={agent} 
                rank={index + 1} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgentRow({ agent, rank }) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="py-4 text-2xl">{getRankBadge(rank)}</td>
      <td className="py-4">
        <div className="font-medium">{agent.name}</div>
        <div className="text-sm text-gray-500">
          {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
        </div>
      </td>
      <td className="py-4">
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          {agent.strategyType}
        </span>
        <RiskBadge level={agent.riskLevel} />
      </td>
      <td className="py-4 text-right">
        <span className="flex items-center justify-end gap-1">
          <TrendingUp className="w-4 h-4" />
          {(parseFloat(agent.winRate) * 100).toFixed(1)}%
        </span>
      </td>
      <td className={`py-4 text-right font-bold ${getScoreColor(agent.reputationScore)}`}>
        {agent.reputationScore}/100
      </td>
      <td className="py-4 text-right">
        <span className={agent.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
          {agent.totalProfitLoss >= 0 ? '+' : ''}
          ${parseFloat(agent.totalProfitLoss).toFixed(2)}
        </span>
      </td>
      <td className="py-4 text-right">
        <DelegateButton agentId={agent.id} agentAddress={agent.walletAddress} />
      </td>
    </tr>
  );
}
```

#### 2. Permission Granting Component

```typescript
// components/GrantPermission.tsx
import { useState } from 'react';
import { useWalletClient } from 'wagmi';
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions';
import { parseUnits } from 'viem';
import { sepolia } from 'viem/chains';

interface GrantPermissionProps {
  agentId: string;
  agentAddress: string;
  agentName: string;
}

export function GrantPermission({ agentId, agentAddress, agentName }: GrantPermissionProps) {
  const [amount, setAmount] = useState('10');
  const [duration, setDuration] = useState('7'); // days
  const [isGranting, setIsGranting] = useState(false);
  
  const { data: walletClient } = useWalletClient();

  const handleGrant = async () => {
    if (!walletClient) return;
    
    setIsGranting(true);
    
    try {
      // Extend wallet client with ERC-7715 actions
      const extendedClient = walletClient.extend(erc7715ProviderActions());
      
      const currentTime = Math.floor(Date.now() / 1000);
      const expiry = currentTime + (parseInt(duration) * 24 * 60 * 60);
      
      // USDC address on Sepolia
      const USDC_ADDRESS = '0x2BfBc55F4A360352Dc89e599D04898F150472cA6';
      
      const grantedPermissions = await extendedClient.requestExecutionPermissions([
        {
          chainId: sepolia.id,
          expiry,
          signer: {
            type: 'account',
            data: {
              address: agentAddress,
            },
          },
          permission: {
            type: 'erc20-token-periodic',
            data: {
              tokenAddress: USDC_ADDRESS,
              periodAmount: parseUnits(amount, 6), // USDC has 6 decimals
              periodDuration: 86400, // 1 day in seconds
              justification: `Grant ${agentName} permission to spend ${amount} USDC per day`,
            },
          },
        },
      ]);
      
      console.log('Permission granted:', grantedPermissions);
      
      // Show success notification
      toast.success(`Successfully granted permission to ${agentName}`);
      
    } catch (error) {
      console.error('Failed to grant permission:', error);
      toast.error('Failed to grant permission');
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
      <h3 className="text-xl font-bold mb-4">
        Grant Permission to {agentName}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount per Day (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            min="1"
            max="1000"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (Days)
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="1">1 Day (Trial)</option>
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Summary:</strong> Grant {agentName} permission to spend up to{' '}
            <strong>{amount} USDC per day</strong> for{' '}
            <strong>{duration} days</strong>.
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Maximum total: <strong>{parseInt(amount) * parseInt(duration)} USDC</strong>
          </p>
        </div>
        
        <button
          onClick={handleGrant}
          disabled={isGranting}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isGranting ? 'Granting...' : 'Grant Permission'}
        </button>
        
        <p className="text-xs text-gray-500 text-center">
          You can revoke this permission at any time
        </p>
      </div>
    </div>
  );
}
```

#### 3. Delegation Tree Visualization

```typescript
// components/DelegationTree.tsx
import { useQuery, gql } from '@apollo/client';
import Tree from 'react-d3-tree';

const GET_DELEGATION_TREE = gql`
  query GetDelegationTree($agentId: ID!) {
    agent(id: $agentId) {
      id
      name
      reputationScore
      redelegationsAsParent {
        childAgent {
          id
          name
          reputationScore
          redelegationsAsParent {
            childAgent {
              id
              name
              reputationScore
            }
            amount
          }
        }
        amount
        isActive
      }
    }
  }
`;

export function DelegationTree({ agentId }: { agentId: string }) {
  const { data, loading } = useQuery(GET_DELEGATION_TREE, {
    variables: { agentId },
  });

  if (loading) return <LoadingSpinner />;
  if (!data?.agent) return null;

  // Transform to tree structure
  const treeData = transformToTreeData(data.agent);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">A2A Delegation Tree</h3>
      <div style={{ width: '100%', height: '400px' }}>
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          translate={{ x: 200, y: 50 }}
          nodeSize={{ x: 150, y: 100 }}
          renderCustomNodeElement={({ nodeDatum }) => (
            <g>
              <circle r="20" fill={getScoreColor(nodeDatum.score)} />
              <text dy=".31em" x="30" style={{ fontSize: '12px' }}>
                {nodeDatum.name}
              </text>
              <text dy="1.5em" x="30" style={{ fontSize: '10px', fill: '#666' }}>
                Score: {nodeDatum.score}
              </text>
            </g>
          )}
        />
      </div>
    </div>
  );
}

function transformToTreeData(agent) {
  return {
    name: agent.name,
    score: agent.reputationScore,
    children: agent.redelegationsAsParent?.map((redel) => ({
      name: redel.childAgent.name,
      score: redel.childAgent.reputationScore,
      amount: redel.amount,
      children: redel.childAgent.redelegationsAsParent?.map((subRedel) => ({
        name: subRedel.childAgent.name,
        score: subRedel.childAgent.reputationScore,
        amount: subRedel.amount,
      })),
    })),
  };
}
```

---

## A2A Delegation Flow

### Overview

The A2A (Agent-to-Agent) flow demonstrates hierarchical permission delegation where a "Fund Manager" agent can re-delegate portions of its permission to "Specialist" agents.

### Flow Diagram

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

### Implementation Code

```typescript
// agents/FundManagerAgent.ts
import { EnvioClient } from './envio-client';
import { DelegationToolkit } from '@metamask/delegation-toolkit';

export class FundManagerAgent {
  private agentId: string;
  private envio: EnvioClient;
  private delegationKit: DelegationToolkit;
  
  constructor(agentId: string) {
    this.agentId = agentId;
    this.envio = new EnvioClient();
  }
  
  /**
   * Main decision loop - called periodically
   */
  async executeStrategy(userPermission: Permission) {
    // 1. Analyze current market conditions
    const marketConditions = await this.analyzeMarket();
    
    // 2. Query Envio for best specialist based on conditions
    const bestSpecialist = await this.findBestSpecialist(marketConditions);
    
    // 3. Calculate optimal allocation
    const allocation = this.calculateAllocation(
      userPermission.remainingAmount,
      marketConditions,
      bestSpecialist
    );
    
    // 4. Re-delegate to specialist
    if (allocation.amount > 0) {
      await this.redelegateToSpecialist(
        bestSpecialist,
        allocation,
        userPermission
      );
    }
  }
  
  private async findBestSpecialist(conditions: MarketConditions) {
    // Query Envio for top-performing agent matching conditions
    const query = `
      query FindSpecialist($strategy: String!, $maxRisk: Int!) {
        agents(
          first: 1
          orderBy: reputationScore
          orderDirection: desc
          where: {
            isActive: true
            strategyType: $strategy
            riskLevel_lte: $maxRisk
          }
        ) {
          id
          walletAddress
          name
          reputationScore
          winRate
        }
      }
    `;
    
    const strategy = conditions.highVolatility ? 'Arbitrage' : 'Yield';
    const result = await this.envio.query(query, { 
      strategy, 
      maxRisk: 7 
    });
    
    return result.agents[0];
  }
  
  private async redelegateToSpecialist(
    specialist: Agent,
    allocation: Allocation,
    originalPermission: Permission
  ) {
    // Create redelegation using Delegation Toolkit
    const redelegation = await this.delegationKit.createRedelegation({
      from: this.agentId,
      to: specialist.walletAddress,
      amount: allocation.amount,
      duration: allocation.duration,
      originalDelegation: originalPermission.delegationHash,
    });
    
    // Log to AgentExecution contract for Envio indexing
    await this.logRedelegation(specialist.id, allocation);
    
    return redelegation;
  }
}
```

---

## Demo Script

### Video Structure (3 minutes)

```
┌─────────────────────────────────────────────────────────────────┐
│ SCENE 1: THE HOOK (0:00 - 0:20)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Split screen]                                                  │
│                                                                 │
│ LEFT: Terminal showing Envio indexing live transactions        │
│       > Indexing block 12847293...                             │
│       > Agent #7 executed swap: +$42.50 profit                 │
│       > Updating reputation score: 88 → 89                     │
│                                                                 │
│ RIGHT: Echelon leaderboard updating in real-time             │
│        Rankings shifting based on performance                   │
│                                                                 │
│ NARRATION:                                                      │
│ "Trust is the currency of the AI agent economy.                │
│  But how do you know which agent deserves your trust?          │
│  You don't guess. You verify. With Echelon."                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCENE 2: THE LEADERBOARD (0:20 - 0:45)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Full screen: Echelon Dashboard]                             │
│                                                                 │
│ Show leaderboard with:                                          │
│ - Agent names, strategies, risk levels                         │
│ - Win rates (85%, 78%, 72%...)                                 │
│ - Reputation scores (92, 88, 85...)                            │
│ - Total P&L (+$2,340, +$1,890, +$1,456...)                    │
│                                                                 │
│ [Click on Agent #1 to show detailed view]                      │
│ - Transaction history                                           │
│ - Performance chart over time                                   │
│ - Current delegations                                           │
│                                                                 │
│ NARRATION:                                                      │
│ "Every score you see is computed from real on-chain history,   │
│  indexed by Envio. No fake reviews. No manipulation.           │
│  Just verifiable performance."                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCENE 3: GRANT PERMISSION (0:45 - 1:15)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [User selects top agent and clicks "Delegate"]                 │
│                                                                 │
│ Permission form appears:                                        │
│ - Amount: 10 USDC per day                                      │
│ - Duration: 7 days                                              │
│ - Maximum: 70 USDC total                                        │
│                                                                 │
│ [MetaMask popup appears]                                        │
│ - Shows ERC-7715 permission request                            │
│ - Human-readable terms                                          │
│ - User clicks "Approve"                                         │
│                                                                 │
│ [Success notification]                                          │
│ "Permission granted! Agent can now execute on your behalf."    │
│                                                                 │
│ NARRATION:                                                      │
│ "Granting permission takes seconds. You set the limits.        │
│  The agent can only spend what you allow, when you allow it.   │
│  And you can revoke instantly if anything goes wrong."         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCENE 4: AGENT EXECUTES (1:15 - 1:40)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Show real-time activity feed]                                  │
│                                                                 │
│ Activity Feed:                                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 🟢 Agent #1 executed swap                                  │  │
│ │    8 USDC → 0.0032 ETH                                    │  │
│ │    Profit: +$0.42 (5.25%)                                 │  │
│ │    TX: 0x7f3a...                                          │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ [Dashboard updates]                                             │
│ - Remaining allowance: 2 USDC today                            │
│ - Total profit: +$0.42                                         │
│                                                                 │
│ NARRATION:                                                      │
│ "Watch your agent work in real-time. Every trade is logged,   │
│  indexed, and contributes to the agent's reputation score."    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCENE 5: A2A REDELEGATION (1:40 - 2:15)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Show delegation tree visualization]                            │
│                                                                 │
│           ┌─────────────────┐                                   │
│           │  Fund Manager   │                                   │
│           │  Agent #1       │                                   │
│           │  Score: 92      │                                   │
│           └────────┬────────┘                                   │
│                    │                                            │
│         ┌─────────┴─────────┐                                  │
│         ▼                   ▼                                   │
│  ┌─────────────┐    ┌─────────────┐                           │
│  │ DEX Agent   │    │Lending Agent│                           │
│  │ Agent #7    │    │ Agent #12   │                           │
│  │ Score: 88   │    │ Score: 85   │                           │
│  │ 50 USDC/day │    │ 50 USDC/day │                           │
│  └─────────────┘    └─────────────┘                           │
│                                                                 │
│ NARRATION:                                                      │
│ "This is where it gets powerful. Fund Manager agents can       │
│  re-delegate to specialists based on their Envio rankings.     │
│  A hierarchy of trust, all verifiable on-chain."               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCENE 6: REVOCATION & CLOSING (2:15 - 2:45)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Show an agent with declining performance]                      │
│                                                                 │
│ Agent #15:                                                      │
│ - Recent trades: -$12, -$8, -$15                               │
│ - Win rate dropping: 72% → 58%                                 │
│ - Reputation: 75 → 62                                          │
│                                                                 │
│ [User clicks "Revoke Permission"]                              │
│ - Instant confirmation                                          │
│ - Agent can no longer execute                                   │
│                                                                 │
│ NARRATION:                                                      │
│ "Bad performance? Revoke instantly. No withdrawal delays.      │
│  No locked funds. You're always in control."                   │
│                                                                 │
│ [Final shot: Architecture diagram]                              │
│                                                                 │
│ "Echelon: Built with ERC-8004 for agent identity,           │
│  ERC-7715 for granular permissions, and Envio for             │
│  real-time reputation indexing."                               │
│                                                                 │
│ "Trust through transparency. That's Echelon."                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Timeline

### 5-Day Hackathon Schedule

| Day | Focus | Deliverables |
|-----|-------|--------------|
| **Day 1** | Envio Setup | - Initialize indexer project<br>- Define schema<br>- Write event handlers<br>- Deploy to Envio hosted service |
| **Day 2** | Smart Contracts | - AgentRegistry.sol (ERC-8004)<br>- AgentExecution.sol<br>- Deploy to Sepolia<br>- Register 3-5 mock agents |
| **Day 3** | Frontend Core | - Next.js setup with create-gator-app<br>- Leaderboard component<br>- Agent detail view<br>- Connect to Envio GraphQL |
| **Day 4** | Permissions & A2A | - Permission granting UI<br>- MetaMask integration<br>- A2A redelegation demo<br>- Delegation tree visualization |
| **Day 5** | Polish & Demo | - UI polish<br>- Mock agent executions<br>- Record demo video<br>- Write README |

### Daily Checkpoints

**Day 1 EOD:**
- [ ] Envio indexer deployed and syncing
- [ ] Can query agents via GraphQL

**Day 2 EOD:**
- [ ] Contracts deployed to Sepolia
- [ ] Mock agents registered
- [ ] Events being indexed by Envio

**Day 3 EOD:**
- [ ] Leaderboard showing real data
- [ ] Can click agent to see details
- [ ] Wallet connection working

**Day 4 EOD:**
- [ ] Can grant ERC-7715 permission
- [ ] A2A flow demonstrated
- [ ] Tree visualization working

**Day 5 EOD:**
- [ ] Demo video recorded
- [ ] All code pushed to GitHub
- [ ] README complete
- [ ] Submission ready

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **State:** React Query + Apollo Client
- **Web3:** wagmi, viem, MetaMask Smart Accounts Kit
- **Visualization:** recharts, react-d3-tree

### Smart Contracts
- **Language:** Solidity 0.8.24
- **Framework:** Foundry
- **Standards:** ERC-721 (for ERC-8004), ERC-7715
- **Network:** Sepolia Testnet

### Indexing
- **Platform:** Envio HyperIndex
- **Language:** TypeScript
- **API:** GraphQL

### Infrastructure
- **Bundler:** Pimlico
- **RPC:** Alchemy or Infura
- **Hosting:** Vercel (frontend), Envio Hosted (indexer)

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| **Envio indexing delays** | Start indexer on Day 1; use mock data if needed |
| **MetaMask permission issues** | Test with Flask early; have fallback UI |
| **Contract deployment fails** | Have pre-deployed backup on Sepolia |
| **A2A complexity** | Simplify to single-level redelegation if needed |

### Scope Risks

| Risk | Mitigation |
|------|------------|
| **Too ambitious** | MVP = Leaderboard + Single permission grant |
| **Missing A2A demo** | Pre-record A2A segment if live demo fails |
| **UI not polished** | Functionality > aesthetics for hackathon |

### Demo Risks

| Risk | Mitigation |
|------|------------|
| **Live demo failure** | Pre-record backup video |
| **Network issues** | Use local mock data layer |
| **MetaMask popup issues** | Screenshot-based fallback |

---

## Future Roadmap

### Post-Hackathon Development

**Phase 1: Enhanced Reputation (1-2 months)**
- Multi-factor reputation scoring
- Time-weighted performance metrics
- Peer agent reviews

**Phase 2: Advanced Permissions (2-3 months)**
- Custom caveat enforcers
- Strategy-specific constraints
- Multi-sig delegation approval

**Phase 3: Ecosystem Growth (3-6 months)**
- Agent SDK for developers
- Marketplace for agent templates
- Cross-chain support

**Phase 4: Decentralization (6-12 months)**
- On-chain reputation disputes
- DAO governance for registry
- Staking and slashing mechanics

---

## Repository Structure

```
echelon/
├── contracts/
│   ├── src/
│   │   ├── AgentRegistry.sol
│   │   └── AgentExecution.sol
│   ├── test/
│   │   └── AgentRegistry.t.sol
│   └── foundry.toml
│
├── indexer/
│   ├── src/
│   │   └── EventHandlers.ts
│   ├── schema.graphql
│   └── config.yaml
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── agent/[id]/page.tsx
│   │   └── dashboard/page.tsx
│   ├── components/
│   │   ├── Leaderboard.tsx
│   │   ├── GrantPermission.tsx
│   │   ├── DelegationTree.tsx
│   │   └── ActivityFeed.tsx
│   └── lib/
│       ├── envio-client.ts
│       └── metamask.ts
│
├── agents/
│   ├── FundManagerAgent.ts
│   └── MockSpecialistAgent.ts
│
├── docs/
│   ├── ARCHITECTURE.md
│   └── API.md
│
└── README.md
```

---

## Submission Checklist

- [ ] **Code Repository**
  - [ ] All code pushed to GitHub
  - [ ] README with setup instructions
  - [ ] MIT or Apache 2.0 license

- [ ] **Demo Video (2-3 minutes)**
  - [ ] Problem statement
  - [ ] Solution walkthrough
  - [ ] Live permission granting
  - [ ] A2A flow demonstration
  - [ ] Envio dashboard showcase

- [ ] **Requirements Met**
  - [ ] Uses MetaMask Advanced Permissions (ERC-7715)
  - [ ] Uses Smart Accounts Kit
  - [ ] Uses ERC-8004 Agent Registry
  - [ ] Demonstrates A2A flow
  - [ ] Envio integration shown in demo

- [ ] **Deployment**
  - [ ] Contracts deployed to Sepolia
  - [ ] Envio indexer running
  - [ ] Frontend hosted (Vercel)
  - [ ] Working demo link

---

## Contact & Support

**Project:** Echelon  
**Track:** Most Creative Use of Advanced Permissions + Best Use of Envio  
**Team:** [Your Name/Team]

---

*Built with 💪 for the MetaMask Advanced Permissions Hackathon*