# Echelon Technical Specification

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Status:** Implementation Ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Requirements](#2-system-requirements)
3. [Project Structure](#3-project-structure)
4. [Smart Contract Specification](#4-smart-contract-specification)
5. [Envio Indexer Specification](#5-envio-indexer-specification)
6. [Frontend Specification](#6-frontend-specification)
7. [Agent Implementation](#7-agent-implementation)
8. [API Specification](#8-api-specification)
9. [Data Models](#9-data-models)
10. [Security Considerations](#10-security-considerations)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment Guide](#12-deployment-guide)
13. [Environment Configuration](#13-environment-configuration)
14. [Error Handling](#14-error-handling)
15. [Performance Optimization](#15-performance-optimization)

---

## 1. Overview

### 1.1 Project Description

Echelon is a trustless AI agent marketplace that enables users to delegate spending permissions to AI agents based on verifiable on-chain performance metrics. The system uses ERC-7715 for permission management, ERC-8004 for agent registry, and Envio for real-time performance indexing.

### 1.2 Core Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ECHELON SYSTEM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │   CONTRACTS │  │    ENVIO    │  │  FRONTEND   │  │   AGENTS  │ │
│  │             │  │   INDEXER   │  │             │  │           │ │
│  │ - Registry  │  │             │  │ - Next.js   │  │ - Manager │ │
│  │ - Execution │  │ - Schema    │  │ - React     │  │ - Workers │ │
│  │             │  │ - Handlers  │  │ - wagmi     │  │           │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│         │                │                │                │       │
│         └────────────────┴────────────────┴────────────────┘       │
│                              │                                      │
│                      ┌───────────────┐                             │
│                      │    SEPOLIA    │                             │
│                      │   TESTNET     │                             │
│                      └───────────────┘                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Smart Contracts | Solidity | ^0.8.24 |
| Contract Framework | Foundry | Latest |
| Indexer | Envio HyperIndex | ^2.0.0 |
| Frontend Framework | Next.js | 14.x |
| React | React | 18.x |
| Styling | Tailwind CSS | 3.x |
| Web3 Library | viem | ^2.0.0 |
| Wallet Hooks | wagmi | ^2.0.0 |
| GraphQL Client | Apollo Client | ^3.8.0 |
| MetaMask SDK | @metamask/delegation-toolkit | Latest |
| Smart Accounts | @metamask/smart-accounts-kit | Latest |
| Node.js | Node.js | ^20.0.0 |
| Package Manager | pnpm | ^8.0.0 |

---

## 2. System Requirements

### 2.1 Development Environment

```bash
# Required software
- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Foundry (forge, cast, anvil)
- Git >= 2.40.0
- Docker (optional, for local Envio)

# Recommended IDE
- VS Code with extensions:
  - Solidity (Juan Blanco)
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
```

### 2.2 External Services

| Service | Purpose | Required |
|---------|---------|----------|
| Alchemy/Infura | RPC Provider | Yes |
| Pimlico | Bundler + Paymaster | Yes |
| Envio Hosted | Indexer Hosting | Yes |
| Vercel | Frontend Hosting | Optional |
| IPFS (Pinata) | Metadata Storage | Optional |

### 2.3 API Keys Required

```bash
# .env.local template
NEXT_PUBLIC_ALCHEMY_API_KEY=        # Sepolia RPC
NEXT_PUBLIC_PIMLICO_API_KEY=        # Bundler service
NEXT_PUBLIC_WALLETCONNECT_ID=       # WalletConnect (optional)
ENVIO_API_KEY=                       # Envio hosted service
PRIVATE_KEY=                         # Deployer wallet (DO NOT COMMIT)
```

---

## 3. Project Structure

### 3.1 Monorepo Layout

```
echelon/
│
├── packages/
│   ├── contracts/                 # Smart contracts (Foundry)
│   │   ├── src/
│   │   │   ├── AgentRegistry.sol
│   │   │   ├── AgentExecution.sol
│   │   │   ├── interfaces/
│   │   │   │   ├── IAgentRegistry.sol
│   │   │   │   └── IAgentExecution.sol
│   │   │   └── libraries/
│   │   │       └── ReputationLib.sol
│   │   ├── test/
│   │   │   ├── AgentRegistry.t.sol
│   │   │   ├── AgentExecution.t.sol
│   │   │   └── Integration.t.sol
│   │   ├── script/
│   │   │   ├── Deploy.s.sol
│   │   │   └── RegisterMockAgents.s.sol
│   │   ├── foundry.toml
│   │   └── remappings.txt
│   │
│   ├── indexer/                   # Envio indexer
│   │   ├── src/
│   │   │   ├── EventHandlers.ts
│   │   │   ├── utils/
│   │   │   │   ├── reputation.ts
│   │   │   │   └── helpers.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── schema.graphql
│   │   ├── config.yaml
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── frontend/                  # Next.js application
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── agents/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   └── api/
│   │   │       └── health/
│   │   │           └── route.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── agents/
│   │   │   │   ├── Leaderboard.tsx
│   │   │   │   ├── AgentCard.tsx
│   │   │   │   ├── AgentDetails.tsx
│   │   │   │   └── AgentStats.tsx
│   │   │   ├── permissions/
│   │   │   │   ├── GrantPermission.tsx
│   │   │   │   ├── PermissionList.tsx
│   │   │   │   └── RevokeButton.tsx
│   │   │   ├── delegation/
│   │   │   │   ├── DelegationTree.tsx
│   │   │   │   └── A2AFlow.tsx
│   │   │   ├── activity/
│   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   └── ExecutionCard.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Table.tsx
│   │   │       └── Toast.tsx
│   │   ├── hooks/
│   │   │   ├── useAgents.ts
│   │   │   ├── usePermissions.ts
│   │   │   ├── useExecutions.ts
│   │   │   └── useDelegation.ts
│   │   ├── lib/
│   │   │   ├── apollo-client.ts
│   │   │   ├── wagmi-config.ts
│   │   │   ├── constants.ts
│   │   │   ├── utils.ts
│   │   │   └── types.ts
│   │   ├── graphql/
│   │   │   ├── queries.ts
│   │   │   └── fragments.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── agents/                    # Mock agents for demo
│       ├── src/
│       │   ├── FundManagerAgent.ts
│       │   ├── DexSwapAgent.ts
│       │   ├── LendingAgent.ts
│       │   └── utils/
│       │       ├── executor.ts
│       │       └── envio-client.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT.md
│
├── scripts/
│   ├── setup.sh
│   ├── deploy-all.sh
│   └── seed-data.sh
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── package.json                   # Root package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
└── README.md
```

### 3.2 Package Dependencies

#### Root package.json

```json
{
  "name": "echelon",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "deploy:contracts": "pnpm --filter contracts run deploy",
    "deploy:indexer": "pnpm --filter indexer run deploy",
    "deploy:frontend": "pnpm --filter frontend run deploy"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "typescript": "^5.3.0"
  }
}
```

#### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
```

---

## 4. Smart Contract Specification

### 4.1 Contract Interfaces

#### IAgentRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    // Structs
    struct AgentMetadata {
        address walletAddress;
        string name;
        string strategyType;
        uint8 riskLevel;
        uint256 registeredAt;
        bool isActive;
    }

    // Events
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed walletAddress,
        string name,
        string strategyType,
        uint8 riskLevel
    );
    event AgentUpdated(uint256 indexed agentId, string metadataUri);
    event AgentDeactivated(uint256 indexed agentId);
    event AgentReactivated(uint256 indexed agentId);

    // Functions
    function registerAgent(
        address walletAddress,
        string calldata name,
        string calldata strategyType,
        uint8 riskLevel,
        string calldata metadataUri
    ) external returns (uint256 agentId);

    function updateAgentMetadata(
        uint256 agentId,
        string calldata metadataUri
    ) external;

    function deactivateAgent(uint256 agentId) external;
    function reactivateAgent(uint256 agentId) external;

    function getAgentByWallet(address walletAddress)
        external
        view
        returns (uint256 agentId, AgentMetadata memory metadata);

    function isRegisteredAgent(address walletAddress) external view returns (bool);
    function totalAgents() external view returns (uint256);
    function agents(uint256 agentId) external view returns (AgentMetadata memory);
    function walletToAgentId(address wallet) external view returns (uint256);
}
```

#### IAgentExecution.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentExecution {
    // Enums
    enum ExecutionResult { PENDING, SUCCESS, FAILURE }

    // Events
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
        int256 profitLoss,
        ExecutionResult result
    );

    event RedelegationCreated(
        uint256 indexed parentAgentId,
        uint256 indexed childAgentId,
        address indexed userAddress,
        uint256 amount,
        uint256 duration
    );

    // Functions
    function logExecutionStart(
        address userAddress,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external returns (uint256 executionId);

    function logExecutionComplete(
        uint256 executionId,
        address userAddress,
        uint256 amountIn,
        uint256 amountOut,
        ExecutionResult result
    ) external;

    function logRedelegation(
        uint256 childAgentId,
        address userAddress,
        uint256 amount,
        uint256 duration
    ) external;
}
```

### 4.2 Contract Implementation Details

#### AgentRegistry.sol - Full Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentRegistry.sol";

/**
 * @title AgentRegistry
 * @author Echelon Team
 * @notice ERC-8004 compliant registry for AI trading agents
 * @dev Implements ERC-721 with URI storage for agent metadata
 */
contract AgentRegistry is 
    IAgentRegistry, 
    ERC721URIStorage, 
    ERC721Enumerable, 
    Ownable, 
    ReentrancyGuard 
{
    // ============ State Variables ============
    
    /// @notice Counter for agent IDs
    uint256 private _nextAgentId;
    
    /// @notice Mapping from agent ID to metadata
    mapping(uint256 => AgentMetadata) private _agents;
    
    /// @notice Mapping from wallet address to agent ID
    mapping(address => uint256) private _walletToAgentId;
    
    /// @notice Minimum name length
    uint256 public constant MIN_NAME_LENGTH = 3;
    
    /// @notice Maximum name length
    uint256 public constant MAX_NAME_LENGTH = 50;
    
    /// @notice Valid strategy types
    mapping(string => bool) public validStrategyTypes;
    
    // ============ Constructor ============
    
    constructor() ERC721("Echelon Registry", "AGENT") Ownable(msg.sender) {
        // Initialize valid strategy types
        validStrategyTypes["DCA"] = true;
        validStrategyTypes["Arbitrage"] = true;
        validStrategyTypes["Yield"] = true;
        validStrategyTypes["Momentum"] = true;
        validStrategyTypes["MeanReversion"] = true;
        validStrategyTypes["GridTrading"] = true;
    }
    
    // ============ External Functions ============
    
    /**
     * @inheritdoc IAgentRegistry
     */
    function registerAgent(
        address walletAddress,
        string calldata name,
        string calldata strategyType,
        uint8 riskLevel,
        string calldata metadataUri
    ) external nonReentrant returns (uint256 agentId) {
        // Validations
        require(walletAddress != address(0), "Invalid wallet address");
        require(_walletToAgentId[walletAddress] == 0, "Wallet already registered");
        require(bytes(name).length >= MIN_NAME_LENGTH, "Name too short");
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long");
        require(validStrategyTypes[strategyType], "Invalid strategy type");
        require(riskLevel >= 1 && riskLevel <= 10, "Risk level must be 1-10");
        require(bytes(metadataUri).length > 0, "Metadata URI required");
        
        // Increment and assign agent ID
        agentId = ++_nextAgentId;
        
        // Store agent metadata
        _agents[agentId] = AgentMetadata({
            walletAddress: walletAddress,
            name: name,
            strategyType: strategyType,
            riskLevel: riskLevel,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        // Map wallet to agent ID
        _walletToAgentId[walletAddress] = agentId;
        
        // Mint NFT to caller
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, metadataUri);
        
        emit AgentRegistered(agentId, walletAddress, name, strategyType, riskLevel);
    }
    
    /**
     * @inheritdoc IAgentRegistry
     */
    function updateAgentMetadata(
        uint256 agentId,
        string calldata metadataUri
    ) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");
        require(bytes(metadataUri).length > 0, "Metadata URI required");
        
        _setTokenURI(agentId, metadataUri);
        
        emit AgentUpdated(agentId, metadataUri);
    }
    
    /**
     * @inheritdoc IAgentRegistry
     */
    function deactivateAgent(uint256 agentId) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");
        require(_agents[agentId].isActive, "Already deactivated");
        
        _agents[agentId].isActive = false;
        
        emit AgentDeactivated(agentId);
    }
    
    /**
     * @inheritdoc IAgentRegistry
     */
    function reactivateAgent(uint256 agentId) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");
        require(!_agents[agentId].isActive, "Already active");
        
        _agents[agentId].isActive = true;
        
        emit AgentReactivated(agentId);
    }
    
    // ============ View Functions ============
    
    /**
     * @inheritdoc IAgentRegistry
     */
    function getAgentByWallet(address walletAddress)
        external
        view
        returns (uint256 agentId, AgentMetadata memory metadata)
    {
        agentId = _walletToAgentId[walletAddress];
        require(agentId != 0, "Agent not found");
        metadata = _agents[agentId];
    }
    
    /**
     * @inheritdoc IAgentRegistry
     */
    function isRegisteredAgent(address walletAddress) external view returns (bool) {
        return _walletToAgentId[walletAddress] != 0;
    }
    
    /**
     * @inheritdoc IAgentRegistry
     */
    function totalAgents() external view returns (uint256) {
        return _nextAgentId;
    }
    
    /**
     * @inheritdoc IAgentRegistry
     */
    function agents(uint256 agentId) external view returns (AgentMetadata memory) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        return _agents[agentId];
    }
    
    /**
     * @inheritdoc IAgentRegistry
     */
    function walletToAgentId(address wallet) external view returns (uint256) {
        return _walletToAgentId[wallet];
    }
    
    /**
     * @notice Get all agents owned by an address
     * @param owner The owner address
     * @return agentIds Array of agent IDs
     */
    function getAgentsByOwner(address owner) 
        external 
        view 
        returns (uint256[] memory agentIds) 
    {
        uint256 balance = balanceOf(owner);
        agentIds = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            agentIds[i] = tokenOfOwnerByIndex(owner, i);
        }
    }
    
    /**
     * @notice Get active agents with pagination
     * @param offset Start index
     * @param limit Number of agents to return
     * @return agentIds Array of active agent IDs
     */
    function getActiveAgents(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory agentIds)
    {
        uint256 total = totalSupply();
        uint256 count = 0;
        
        // First pass: count active agents
        for (uint256 i = 1; i <= total; i++) {
            if (_agents[i].isActive) count++;
        }
        
        // Calculate actual return size
        uint256 start = offset;
        uint256 end = offset + limit > count ? count : offset + limit;
        uint256 resultSize = end > start ? end - start : 0;
        
        agentIds = new uint256[](resultSize);
        
        // Second pass: collect active agents
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;
        
        for (uint256 i = 1; i <= total && resultIndex < resultSize; i++) {
            if (_agents[i].isActive) {
                if (currentIndex >= start) {
                    agentIds[resultIndex] = i;
                    resultIndex++;
                }
                currentIndex++;
            }
        }
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add a new valid strategy type
     * @param strategyType The strategy type to add
     */
    function addStrategyType(string calldata strategyType) external onlyOwner {
        require(!validStrategyTypes[strategyType], "Strategy type exists");
        validStrategyTypes[strategyType] = true;
    }
    
    /**
     * @notice Remove a strategy type
     * @param strategyType The strategy type to remove
     */
    function removeStrategyType(string calldata strategyType) external onlyOwner {
        require(validStrategyTypes[strategyType], "Strategy type not found");
        validStrategyTypes[strategyType] = false;
    }
    
    // ============ Override Functions ============
    
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

#### AgentExecution.sol - Full Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAgentRegistry.sol";
import "./interfaces/IAgentExecution.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentExecution
 * @author Echelon Team
 * @notice Logs agent execution events for Envio indexing
 */
contract AgentExecution is IAgentExecution, ReentrancyGuard {
    // ============ State Variables ============
    
    /// @notice Reference to the agent registry
    IAgentRegistry public immutable registry;
    
    /// @notice Counter for execution IDs
    uint256 private _executionCount;
    
    /// @notice Mapping to track pending executions
    mapping(uint256 => bool) private _pendingExecutions;
    
    /// @notice Mapping to track execution ownership
    mapping(uint256 => address) private _executionAgent;
    
    // ============ Constructor ============
    
    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry address");
        registry = IAgentRegistry(_registry);
    }
    
    // ============ External Functions ============
    
    /**
     * @inheritdoc IAgentExecution
     */
    function logExecutionStart(
        address userAddress,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external nonReentrant returns (uint256 executionId) {
        // Verify caller is a registered agent
        require(registry.isRegisteredAgent(msg.sender), "Not a registered agent");
        require(userAddress != address(0), "Invalid user address");
        require(amountIn > 0, "Amount must be positive");
        require(tokenIn != address(0), "Invalid input token");
        require(tokenOut != address(0), "Invalid output token");
        
        // Get agent ID
        (uint256 agentId, ) = registry.getAgentByWallet(msg.sender);
        
        // Generate execution ID
        executionId = ++_executionCount;
        
        // Track pending execution
        _pendingExecutions[executionId] = true;
        _executionAgent[executionId] = msg.sender;
        
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
     * @inheritdoc IAgentExecution
     */
    function logExecutionComplete(
        uint256 executionId,
        address userAddress,
        uint256 amountIn,
        uint256 amountOut,
        ExecutionResult result
    ) external nonReentrant {
        // Verify caller is the same agent that started the execution
        require(_executionAgent[executionId] == msg.sender, "Not execution owner");
        require(_pendingExecutions[executionId], "Execution not pending");
        require(userAddress != address(0), "Invalid user address");
        
        // Get agent ID
        (uint256 agentId, ) = registry.getAgentByWallet(msg.sender);
        
        // Calculate profit/loss
        int256 profitLoss = int256(amountOut) - int256(amountIn);
        
        // Mark execution as complete
        _pendingExecutions[executionId] = false;
        
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
     * @inheritdoc IAgentExecution
     */
    function logRedelegation(
        uint256 childAgentId,
        address userAddress,
        uint256 amount,
        uint256 duration
    ) external nonReentrant {
        // Verify caller is a registered agent
        require(registry.isRegisteredAgent(msg.sender), "Not a registered agent");
        require(userAddress != address(0), "Invalid user address");
        require(amount > 0, "Amount must be positive");
        require(duration > 0, "Duration must be positive");
        
        // Verify child agent exists
        IAgentRegistry.AgentMetadata memory childAgent = registry.agents(childAgentId);
        require(childAgent.walletAddress != address(0), "Child agent not found");
        require(childAgent.isActive, "Child agent not active");
        
        // Get parent agent ID
        (uint256 parentAgentId, ) = registry.getAgentByWallet(msg.sender);
        
        emit RedelegationCreated(
            parentAgentId,
            childAgentId,
            userAddress,
            amount,
            duration
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if an execution is pending
     * @param executionId The execution ID to check
     * @return isPending Whether the execution is pending
     */
    function isExecutionPending(uint256 executionId) external view returns (bool) {
        return _pendingExecutions[executionId];
    }
    
    /**
     * @notice Get total execution count
     * @return count Total number of executions
     */
    function totalExecutions() external view returns (uint256) {
        return _executionCount;
    }
    
    /**
     * @notice Get the agent address for an execution
     * @param executionId The execution ID
     * @return agent The agent's wallet address
     */
    function getExecutionAgent(uint256 executionId) external view returns (address) {
        return _executionAgent[executionId];
    }
}
```

### 4.3 Foundry Configuration

#### foundry.toml

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200
via_ir = true

[profile.default.fuzz]
runs = 256
max_test_rejects = 65536

[rpc_endpoints]
sepolia = "${SEPOLIA_RPC_URL}"
mainnet = "${MAINNET_RPC_URL}"

[etherscan]
sepolia = { key = "${ETHERSCAN_API_KEY}" }

[fmt]
bracket_spacing = true
int_types = "long"
line_length = 100
multiline_func_header = "attributes_first"
number_underscore = "thousands"
quote_style = "double"
tab_width = 4
wrap_comments = true
```

#### Deploy Script (script/Deploy.s.sol)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/AgentExecution.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy AgentRegistry
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed to:", address(registry));
        
        // Deploy AgentExecution
        AgentExecution execution = new AgentExecution(address(registry));
        console.log("AgentExecution deployed to:", address(execution));
        
        vm.stopBroadcast();
        
        // Write deployment addresses to file
        string memory deploymentInfo = string(
            abi.encodePacked(
                '{"registry":"', vm.toString(address(registry)),
                '","execution":"', vm.toString(address(execution)), '"}'
            )
        );
        vm.writeFile("deployments/sepolia.json", deploymentInfo);
    }
}
```

---

## 5. Envio Indexer Specification

### 5.1 Schema Definition

```graphql
# schema.graphql

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
  tokenInSymbol: String                # Input token symbol (if known)
  tokenOutSymbol: String               # Output token symbol (if known)
  
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
  
  # Gas Info (if available)
  gasUsed: BigInt
  gasPrice: BigInt
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
  bestAgentUsed: Agent                 # Best performing agent for this user
  
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
  revokeTxHash: String                 # Revoke transaction hash (if revoked)
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

type LeaderboardSnapshot @entity {
  id: ID!                              # timestamp
  timestamp: BigInt!
  rankings: [LeaderboardEntry!]! @derivedFrom(field: "snapshot")
}

type LeaderboardEntry @entity {
  id: ID!                              # snapshot-rank
  snapshot: LeaderboardSnapshot!
  agent: Agent!
  rank: Int!
  reputationScore: Int!
  winRate: BigDecimal!
  totalVolume: BigDecimal!
  profitLoss: BigDecimal!
}
```

### 5.2 Event Handlers Implementation

```typescript
// src/EventHandlers.ts

import {
  AgentRegistry,
  AgentExecution,
  Agent,
  Execution,
  User,
  Permission,
  Redelegation,
  AgentDailyStat,
  GlobalStats,
} from "generated";
import {
  calculateReputationScore,
  calculateWinRate,
  calculateSharpeRatio,
  getDayId,
  getDateString,
} from "./utils/reputation";

// ============================================
// CONSTANTS
// ============================================

const ZERO_BD = "0";
const ZERO_BI = BigInt(0);
const INITIAL_REPUTATION = 50;

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getOrCreateUser(
  context: any,
  userAddress: string
): Promise<User> {
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

async function getOrCreateDailyStat(
  context: any,
  agentId: string,
  timestamp: bigint
): Promise<AgentDailyStat> {
  const dayId = getDayId(timestamp);
  const id = `${agentId}-${dayId}`;
  
  let stat = await context.AgentDailyStat.get(id);
  
  if (!stat) {
    stat = {
      id,
      agent_id: agentId,
      date: getDateString(timestamp),
      timestamp: BigInt(dayId) * BigInt(86400),
      executionCount: ZERO_BI,
      successCount: ZERO_BI,
      failureCount: ZERO_BI,
      volumeIn: ZERO_BD,
      volumeOut: ZERO_BD,
      profitLoss: ZERO_BD,
      winRate: ZERO_BD,
      dailyRank: undefined,
    };
    context.AgentDailyStat.set(stat);
  }
  
  return stat;
}

// ============================================
// AGENT REGISTRY HANDLERS
// ============================================

AgentRegistry.AgentRegistered.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const blockTimestamp = BigInt(event.block.timestamp);
  
  // Create new agent entity
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
    
    // Initialize performance metrics
    totalExecutions: ZERO_BI,
    successfulExecutions: ZERO_BI,
    failedExecutions: ZERO_BI,
    pendingExecutions: ZERO_BI,
    
    // Initialize volume metrics
    totalVolumeIn: ZERO_BD,
    totalVolumeOut: ZERO_BD,
    totalProfitLoss: ZERO_BD,
    
    // Initialize reputation metrics
    winRate: ZERO_BD,
    avgProfitPerTrade: ZERO_BD,
    maxDrawdown: ZERO_BD,
    sharpeRatio: ZERO_BD,
    reputationScore: INITIAL_REPUTATION,
    
    // Initialize timestamps
    lastExecutionAt: undefined,
    updatedAt: blockTimestamp,
  };
  
  context.Agent.set(agent);
  
  // Update global stats
  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalAgents: globalStats.totalAgents + BigInt(1),
    activeAgents: globalStats.activeAgents + BigInt(1),
    lastUpdated: blockTimestamp,
  });
  
  context.log.info(`Agent registered: ${agentId} - ${event.params.name}`);
});

AgentRegistry.AgentUpdated.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const agent = await context.Agent.get(agentId);
  
  if (agent) {
    context.Agent.set({
      ...agent,
      metadataUri: event.params.metadataUri,
      updatedAt: BigInt(event.block.timestamp),
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
      updatedAt: BigInt(event.block.timestamp),
    });
    
    // Update global stats
    const globalStats = await getOrCreateGlobalStats(context);
    context.GlobalStats.set({
      ...globalStats,
      activeAgents: globalStats.activeAgents - BigInt(1),
      lastUpdated: BigInt(event.block.timestamp),
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
      updatedAt: BigInt(event.block.timestamp),
    });
    
    // Update global stats
    const globalStats = await getOrCreateGlobalStats(context);
    context.GlobalStats.set({
      ...globalStats,
      activeAgents: globalStats.activeAgents + BigInt(1),
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
  
  // Ensure user exists
  await getOrCreateUser(context, userAddress);
  
  // Create execution entity
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
    gasUsed: undefined,
    gasPrice: undefined,
  };
  
  context.Execution.set(execution);
  
  // Update agent pending count
  const agent = await context.Agent.get(agentId);
  if (agent) {
    context.Agent.set({
      ...agent,
      pendingExecutions: agent.pendingExecutions + BigInt(1),
      lastExecutionAt: blockTimestamp,
      updatedAt: blockTimestamp,
    });
  }
  
  // Update global stats
  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalExecutions: globalStats.totalExecutions + BigInt(1),
    lastUpdated: blockTimestamp,
  });
});

AgentExecution.ExecutionCompleted.handler(async ({ event, context }) => {
  const executionId = event.params.executionId.toString();
  const agentId = event.params.agentId.toString();
  const blockTimestamp = BigInt(event.block.timestamp);
  
  // Update execution
  const execution = await context.Execution.get(executionId);
  if (!execution) {
    context.log.warn(`Execution not found: ${executionId}`);
    return;
  }
  
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
    const newPending = agent.pendingExecutions - BigInt(1);
    
    const newVolumeIn = parseFloat(agent.totalVolumeIn) + amountIn;
    const newVolumeOut = parseFloat(agent.totalVolumeOut) + amountOut;
    const newProfitLoss = parseFloat(agent.totalProfitLoss) + profitLoss;
    
    // Calculate new metrics
    const winRate = calculateWinRate(
      Number(newSuccessful),
      Number(newTotalExecutions)
    );
    
    const avgProfitPerTrade =
      Number(newTotalExecutions) > 0
        ? newProfitLoss / Number(newTotalExecutions)
        : 0;
    
    // Calculate reputation score
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
      pendingExecutions: newPending,
      totalVolumeIn: newVolumeIn.toString(),
      totalVolumeOut: newVolumeOut.toString(),
      totalProfitLoss: newProfitLoss.toString(),
      winRate: winRate.toString(),
      avgProfitPerTrade: avgProfitPerTrade.toString(),
      reputationScore,
      updatedAt: blockTimestamp,
    });
    
    // Update daily stats
    const dailyStat = await getOrCreateDailyStat(context, agentId, blockTimestamp);
    context.AgentDailyStat.set({
      ...dailyStat,
      executionCount: dailyStat.executionCount + BigInt(1),
      successCount: isSuccess
        ? dailyStat.successCount + BigInt(1)
        : dailyStat.successCount,
      failureCount: !isSuccess
        ? dailyStat.failureCount + BigInt(1)
        : dailyStat.failureCount,
      volumeIn: (parseFloat(dailyStat.volumeIn) + amountIn).toString(),
      volumeOut: (parseFloat(dailyStat.volumeOut) + amountOut).toString(),
      profitLoss: (parseFloat(dailyStat.profitLoss) + profitLoss).toString(),
      winRate: calculateWinRate(
        Number(dailyStat.successCount) + (isSuccess ? 1 : 0),
        Number(dailyStat.executionCount) + 1
      ).toString(),
    });
  }
  
  // Update user stats
  const user = await context.User.get(execution.user_id);
  if (user) {
    const newProfit = parseFloat(user.totalProfitFromAgents) + profitLoss;
    context.User.set({
      ...user,
      totalProfitFromAgents: newProfit.toString(),
      lastActivityAt: blockTimestamp,
    });
  }
  
  // Update global stats
  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalVolumeProcessed: (
      parseFloat(globalStats.totalVolumeProcessed) + amountIn
    ).toString(),
    totalProfitGenerated: (
      parseFloat(globalStats.totalProfitGenerated) + profitLoss
    ).toString(),
    lastUpdated: blockTimestamp,
  });
});

AgentExecution.RedelegationCreated.handler(async ({ event, context }) => {
  const blockTimestamp = BigInt(event.block.timestamp);
  const parentAgentId = event.params.parentAgentId.toString();
  const childAgentId = event.params.childAgentId.toString();
  const userAddress = event.params.userAddress.toLowerCase();
  
  const redelegationId = `${parentAgentId}-${childAgentId}-${blockTimestamp}`;
  
  // Ensure user exists
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
  
  // Update global stats
  const globalStats = await getOrCreateGlobalStats(context);
  context.GlobalStats.set({
    ...globalStats,
    totalRedelegations: globalStats.totalRedelegations + BigInt(1),
    lastUpdated: blockTimestamp,
  });
  
  context.log.info(
    `Redelegation created: ${parentAgentId} -> ${childAgentId}`
  );
});
```

### 5.3 Utility Functions

```typescript
// src/utils/reputation.ts

export interface ReputationParams {
  winRate: number;
  totalVolume: number;
  profitLoss: number;
  executionCount: number;
  avgProfitPerTrade: number;
}

/**
 * Calculate reputation score (0-100)
 * 
 * Formula:
 * - 40% Win Rate (0-40 points)
 * - 25% Volume (0-25 points, logarithmic)
 * - 25% Profitability (0-25 points)
 * - 10% Consistency (0-10 points)
 */
export function calculateReputationScore(params: ReputationParams): number {
  const { winRate, totalVolume, profitLoss, executionCount, avgProfitPerTrade } = params;
  
  // Minimum executions for reliable score
  if (executionCount < 5) {
    return 50; // Neutral score for new agents
  }
  
  // Win rate component (0-40 points)
  const winRateScore = Math.min(40, winRate * 40);
  
  // Volume component (0-25 points) - logarithmic scale
  // Assumes volume in wei, normalize to reasonable range
  const normalizedVolume = totalVolume / 1e18; // Convert from wei
  const volumeScore = Math.min(25, Math.log10(normalizedVolume + 1) * 8);
  
  // Profitability component (0-25 points)
  let profitScore: number;
  if (profitLoss > 0) {
    const profitRatio = totalVolume > 0 ? profitLoss / totalVolume : 0;
    profitScore = Math.min(25, profitRatio * 250); // 10% profit = 25 points
  } else {
    // Negative profit reduces score
    const lossRatio = totalVolume > 0 ? Math.abs(profitLoss) / totalVolume : 0;
    profitScore = Math.max(0, 12.5 - lossRatio * 125);
  }
  
  // Consistency component (0-10 points)
  // Based on execution count and avg profit stability
  const consistencyScore = Math.min(10, Math.log10(executionCount + 1) * 4);
  
  // Total score
  const totalScore = winRateScore + volumeScore + profitScore + consistencyScore;
  
  return Math.round(Math.min(100, Math.max(0, totalScore)));
}

/**
 * Calculate win rate
 */
export function calculateWinRate(
  successCount: number,
  totalCount: number
): number {
  if (totalCount === 0) return 0;
  return successCount / totalCount;
}

/**
 * Calculate Sharpe Ratio (simplified)
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0
): number {
  if (returns.length < 2) return 0;
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
    (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  return (avgReturn - riskFreeRate) / stdDev;
}

/**
 * Get day ID from timestamp (days since epoch)
 */
export function getDayId(timestamp: bigint): number {
  return Math.floor(Number(timestamp) / 86400);
}

/**
 * Get date string from timestamp (YYYY-MM-DD)
 */
export function getDateString(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toISOString().split("T")[0];
}

/**
 * Calculate maximum drawdown
 */
export function calculateMaxDrawdown(balanceHistory: number[]): number {
  if (balanceHistory.length < 2) return 0;
  
  let maxDrawdown = 0;
  let peak = balanceHistory[0];
  
  for (const balance of balanceHistory) {
    if (balance > peak) {
      peak = balance;
    }
    const drawdown = (peak - balance) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}
```

### 5.4 Envio Configuration

```yaml
# config.yaml
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

# Sync configuration
sync:
  initial_sync_method: hypersync

# Database configuration (for local development)
database:
  sqlite:
    path: ./data/indexer.db
```

---

## 6. Frontend Specification

### 6.1 Application Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | Leaderboard + featured agents |
| `/agents/[id]` | `AgentDetailPage` | Single agent details |
| `/dashboard` | `DashboardPage` | User's permissions and activity |
| `/delegate` | `DelegatePage` | Grant new permission flow |

### 6.2 State Management

```typescript
// lib/types.ts

export interface Agent {
  id: string;
  walletAddress: string;
  ownerAddress: string;
  name: string;
  strategyType: StrategyType;
  riskLevel: number;
  registeredAt: bigint;
  isActive: boolean;
  metadataUri: string;
  
  // Performance
  totalExecutions: bigint;
  successfulExecutions: bigint;
  failedExecutions: bigint;
  winRate: string;
  totalProfitLoss: string;
  reputationScore: number;
  
  // Computed
  rank?: number;
}

export type StrategyType = 
  | "DCA" 
  | "Arbitrage" 
  | "Yield" 
  | "Momentum" 
  | "MeanReversion" 
  | "GridTrading";

export interface Execution {
  id: string;
  agent: Agent;
  user: User;
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  tokenOut: string;
  profitLoss: string;
  result: ExecutionResult;
  startedAt: bigint;
  completedAt?: bigint;
  txHash: string;
}

export type ExecutionResult = "PENDING" | "SUCCESS" | "FAILURE";

export interface Permission {
  id: string;
  user: User;
  agent: Agent;
  tokenAddress: string;
  amountPerPeriod: string;
  periodDuration: bigint;
  totalAmount: string;
  grantedAt: bigint;
  expiresAt: bigint;
  isActive: boolean;
  amountUsed: string;
}

export interface User {
  id: string;
  totalDelegated: string;
  activePermissions: bigint;
  totalProfitFromAgents: string;
}

export interface Redelegation {
  id: string;
  parentAgent: Agent;
  childAgent: Agent;
  user: User;
  amount: string;
  duration: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  isActive: boolean;
}
```

### 6.3 GraphQL Queries

```typescript
// graphql/queries.ts

import { gql } from "@apollo/client";
import { AGENT_FIELDS, EXECUTION_FIELDS, PERMISSION_FIELDS } from "./fragments";

// ============================================
// AGENT QUERIES
// ============================================

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

// ============================================
// USER QUERIES
// ============================================

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

// ============================================
// DELEGATION TREE QUERIES
// ============================================

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

// ============================================
// GLOBAL STATS QUERIES
// ============================================

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

// ============================================
// ACTIVITY FEED QUERIES
// ============================================

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
```

### 6.4 GraphQL Fragments

```typescript
// graphql/fragments.ts

import { gql } from "@apollo/client";

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

### 6.5 Custom Hooks

```typescript
// hooks/useAgents.ts

import { useQuery } from "@apollo/client";
import { GET_LEADERBOARD, GET_AGENT_DETAILS, GET_BEST_AGENT_FOR_STRATEGY } from "@/graphql/queries";
import type { Agent, StrategyType } from "@/lib/types";

interface UseLeaderboardOptions {
  limit?: number;
  offset?: number;
  strategyType?: StrategyType;
  minScore?: number;
  pollInterval?: number;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const {
    limit = 10,
    offset = 0,
    strategyType,
    minScore = 0,
    pollInterval = 10000,
  } = options;

  const { data, loading, error, refetch } = useQuery(GET_LEADERBOARD, {
    variables: {
      first: limit,
      skip: offset,
      strategyType: strategyType || undefined,
      minScore,
    },
    pollInterval,
  });

  const agents: Agent[] = data?.agents || [];
  
  // Add rank to each agent
  const rankedAgents = agents.map((agent, index) => ({
    ...agent,
    rank: offset + index + 1,
  }));

  return {
    agents: rankedAgents,
    loading,
    error,
    refetch,
  };
}

export function useAgentDetails(agentId: string) {
  const { data, loading, error, refetch } = useQuery(GET_AGENT_DETAILS, {
    variables: { agentId },
    skip: !agentId,
    pollInterval: 5000,
  });

  return {
    agent: data?.agent,
    loading,
    error,
    refetch,
  };
}

export function useBestAgent(strategyType: StrategyType, maxRisk: number = 10) {
  const { data, loading, error } = useQuery(GET_BEST_AGENT_FOR_STRATEGY, {
    variables: { strategyType, maxRisk },
  });

  return {
    agent: data?.agents?.[0],
    loading,
    error,
  };
}
```

```typescript
// hooks/usePermissions.ts

import { useState } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { parseUnits } from "viem";
import { sepolia } from "viem/chains";

export interface GrantPermissionParams {
  agentAddress: string;
  tokenAddress: string;
  amountPerPeriod: string;
  periodDuration: number; // in seconds
  totalDuration: number; // in seconds
  tokenDecimals?: number;
}

export function useGrantPermission() {
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const grantPermission = async (params: GrantPermissionParams) => {
    if (!walletClient || !address) {
      throw new Error("Wallet not connected");
    }

    setIsGranting(true);
    setError(null);

    try {
      const extendedClient = walletClient.extend(erc7715ProviderActions());
      
      const currentTime = Math.floor(Date.now() / 1000);
      const expiry = currentTime + params.totalDuration;
      
      const decimals = params.tokenDecimals || 6; // Default to USDC decimals
      
      const grantedPermissions = await extendedClient.requestExecutionPermissions([
        {
          chainId: sepolia.id,
          expiry,
          signer: {
            type: "account",
            data: {
              address: params.agentAddress as `0x${string}`,
            },
          },
          permission: {
            type: "erc20-token-periodic",
            data: {
              tokenAddress: params.tokenAddress as `0x${string}`,
              periodAmount: parseUnits(params.amountPerPeriod, decimals),
              periodDuration: params.periodDuration,
              justification: `Grant permission to spend ${params.amountPerPeriod} tokens per period`,
            },
          },
        },
      ]);

      return grantedPermissions;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to grant permission");
      setError(error);
      throw error;
    } finally {
      setIsGranting(false);
    }
  };

  return {
    grantPermission,
    isGranting,
    error,
  };
}
```

### 6.6 Wagmi Configuration

```typescript
// lib/wagmi-config.ts

import { http, createConfig } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID!;

export const config = createConfig({
  chains: [sepolia, mainnet],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId }),
  ],
  transports: {
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    ),
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    ),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
```

### 6.7 Apollo Client Configuration

```typescript
// lib/apollo-client.ts

import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const ENVIO_GRAPHQL_URL = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL!;

const httpLink = new HttpLink({
  uri: ENVIO_GRAPHQL_URL,
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Agent: {
        keyFields: ["id"],
      },
      Execution: {
        keyFields: ["id"],
      },
      Permission: {
        keyFields: ["id"],
      },
      User: {
        keyFields: ["id"],
      },
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

---

## 7. Agent Implementation

### 7.1 Base Agent Class

```typescript
// packages/agents/src/BaseAgent.ts

import { createWalletClient, http, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { EnvioClient } from "./utils/envio-client";

export interface AgentConfig {
  agentId: string;
  privateKey: string;
  registryAddress: string;
  executionAddress: string;
  rpcUrl: string;
  envioUrl: string;
}

export abstract class BaseAgent {
  protected agentId: string;
  protected walletClient: WalletClient;
  protected envio: EnvioClient;
  protected registryAddress: string;
  protected executionAddress: string;
  protected isRunning: boolean = false;

  constructor(config: AgentConfig) {
    this.agentId = config.agentId;
    this.registryAddress = config.registryAddress;
    this.executionAddress = config.executionAddress;

    const account = privateKeyToAccount(config.privateKey as `0x${string}`);
    
    this.walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(config.rpcUrl),
    });

    this.envio = new EnvioClient(config.envioUrl);
  }

  abstract getName(): string;
  abstract getStrategyType(): string;
  abstract executeStrategy(): Promise<void>;

  async start(): Promise<void> {
    this.isRunning = true;
    console.log(`[${this.getName()}] Starting agent...`);
    
    while (this.isRunning) {
      try {
        await this.executeStrategy();
      } catch (error) {
        console.error(`[${this.getName()}] Strategy execution error:`, error);
      }
      
      // Wait before next iteration
      await this.sleep(60000); // 1 minute
    }
  }

  stop(): void {
    this.isRunning = false;
    console.log(`[${this.getName()}] Stopping agent...`);
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async logExecutionStart(
    userAddress: string,
    amountIn: bigint,
    tokenIn: string,
    tokenOut: string
  ): Promise<bigint> {
    // Call AgentExecution.logExecutionStart
    // Implementation depends on contract interaction pattern
    throw new Error("Not implemented");
  }

  protected async logExecutionComplete(
    executionId: bigint,
    userAddress: string,
    amountIn: bigint,
    amountOut: bigint,
    success: boolean
  ): Promise<void> {
    // Call AgentExecution.logExecutionComplete
    throw new Error("Not implemented");
  }
}
```

### 7.2 Fund Manager Agent

```typescript
// packages/agents/src/FundManagerAgent.ts

import { BaseAgent, type AgentConfig } from "./BaseAgent";

interface MarketConditions {
  ethVolatility: number;
  bestYieldApy: number;
  trendDirection: "up" | "down" | "neutral";
}

interface SpecialistAgent {
  id: string;
  walletAddress: string;
  name: string;
  reputationScore: number;
  strategyType: string;
}

export class FundManagerAgent extends BaseAgent {
  getName(): string {
    return "FundManager";
  }

  getStrategyType(): string {
    return "Manager";
  }

  async executeStrategy(): Promise<void> {
    console.log(`[${this.getName()}] Analyzing market conditions...`);
    
    // 1. Analyze current market conditions
    const conditions = await this.analyzeMarket();
    console.log(`[${this.getName()}] Market conditions:`, conditions);
    
    // 2. Find best specialist based on conditions
    const specialist = await this.findBestSpecialist(conditions);
    
    if (!specialist) {
      console.log(`[${this.getName()}] No suitable specialist found`);
      return;
    }
    
    console.log(`[${this.getName()}] Selected specialist: ${specialist.name} (Score: ${specialist.reputationScore})`);
    
    // 3. Check if we have available permissions to redelegate
    const availableAmount = await this.getAvailableAmount();
    
    if (availableAmount <= 0) {
      console.log(`[${this.getName()}] No available amount to delegate`);
      return;
    }
    
    // 4. Calculate allocation
    const allocation = this.calculateAllocation(availableAmount, conditions);
    
    // 5. Redelegate to specialist
    await this.redelegateToSpecialist(specialist, allocation);
  }

  private async analyzeMarket(): Promise<MarketConditions> {
    // Query Envio for recent market data
    // This is a simplified implementation
    
    const query = `
      query GetMarketConditions {
        executions(
          first: 100
          orderBy: startedAt
          orderDirection: desc
        ) {
          profitLoss
          amountIn
          amountOut
          tokenIn
          tokenOut
        }
      }
    `;
    
    const data = await this.envio.query(query);
    
    // Calculate volatility from recent executions
    const executions = data.executions || [];
    const profitLosses = executions.map((e: any) => parseFloat(e.profitLoss));
    
    const volatility = this.calculateVolatility(profitLosses);
    
    return {
      ethVolatility: volatility,
      bestYieldApy: 5.0, // Mock: In reality, query from DeFi protocols
      trendDirection: this.determineTrend(profitLosses),
    };
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private determineTrend(profitLosses: number[]): "up" | "down" | "neutral" {
    if (profitLosses.length < 5) return "neutral";
    
    const recent = profitLosses.slice(0, 5);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    
    if (avgRecent > 0.05) return "up";
    if (avgRecent < -0.05) return "down";
    return "neutral";
  }

  private async findBestSpecialist(
    conditions: MarketConditions
  ): Promise<SpecialistAgent | null> {
    // Determine which strategy type is best for current conditions
    let targetStrategy: string;
    
    if (conditions.ethVolatility > 0.1) {
      targetStrategy = "Arbitrage"; // High volatility = arbitrage opportunities
    } else if (conditions.bestYieldApy > 8) {
      targetStrategy = "Yield"; // Good yields available
    } else if (conditions.trendDirection === "up") {
      targetStrategy = "Momentum"; // Ride the trend
    } else {
      targetStrategy = "DCA"; // Default to safe DCA
    }
    
    // Query Envio for best agent with this strategy
    const query = `
      query FindSpecialist($strategyType: String!) {
        agents(
          first: 1
          orderBy: reputationScore
          orderDirection: desc
          where: {
            isActive: true
            strategyType: $strategyType
            reputationScore_gte: 60
          }
        ) {
          id
          walletAddress
          name
          reputationScore
          strategyType
        }
      }
    `;
    
    const data = await this.envio.query(query, { strategyType: targetStrategy });
    
    return data.agents?.[0] || null;
  }

  private async getAvailableAmount(): Promise<number> {
    // Query permissions granted to this agent
    // Return remaining amount that can be used
    
    // Mock implementation
    return 100; // 100 USDC available
  }

  private calculateAllocation(
    available: number,
    conditions: MarketConditions
  ): { amount: number; duration: number } {
    // Allocate based on conditions
    // Higher volatility = smaller allocation (risk management)
    
    const riskFactor = Math.max(0.3, 1 - conditions.ethVolatility);
    const amount = available * riskFactor;
    
    return {
      amount,
      duration: 3600, // 1 hour
    };
  }

  private async redelegateToSpecialist(
    specialist: SpecialistAgent,
    allocation: { amount: number; duration: number }
  ): Promise<void> {
    console.log(
      `[${this.getName()}] Redelegating ${allocation.amount} to ${specialist.name} for ${allocation.duration}s`
    );
    
    // Call AgentExecution.logRedelegation
    // This would involve:
    // 1. Creating the redelegation transaction
    // 2. Signing and submitting
    // 3. Waiting for confirmation
    
    // Mock implementation - in reality, use walletClient to send transaction
    console.log(`[${this.getName()}] Redelegation complete`);
  }
}
```

### 7.3 DEX Swap Agent

```typescript
// packages/agents/src/DexSwapAgent.ts

import { BaseAgent, type AgentConfig } from "./BaseAgent";
import { parseUnits, formatUnits } from "viem";

interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  deadline: number;
}

export class DexSwapAgent extends BaseAgent {
  private routerAddress: string;

  constructor(config: AgentConfig & { routerAddress: string }) {
    super(config);
    this.routerAddress = config.routerAddress;
  }

  getName(): string {
    return "DexSwap";
  }

  getStrategyType(): string {
    return "Arbitrage";
  }

  async executeStrategy(): Promise<void> {
    console.log(`[${this.getName()}] Checking for swap opportunities...`);
    
    // 1. Get current prices from multiple DEXes
    const prices = await this.getPrices();
    
    // 2. Find arbitrage opportunity
    const opportunity = this.findArbitrageOpportunity(prices);
    
    if (!opportunity) {
      console.log(`[${this.getName()}] No arbitrage opportunity found`);
      return;
    }
    
    console.log(`[${this.getName()}] Found opportunity: ${opportunity.profitPercent}% profit`);
    
    // 3. Execute swap if profitable
    if (opportunity.profitPercent > 0.5) {
      await this.executeSwap(opportunity);
    }
  }

  private async getPrices(): Promise<Map<string, number>> {
    // Mock: Get prices from Uniswap, Sushiswap, etc.
    return new Map([
      ["ETH/USDC", 2000 + Math.random() * 10],
      ["WBTC/USDC", 40000 + Math.random() * 100],
    ]);
  }

  private findArbitrageOpportunity(prices: Map<string, number>) {
    // Mock: Find price discrepancies
    const ethPrice = prices.get("ETH/USDC") || 2000;
    const targetPrice = 2005; // Hypothetical better price elsewhere
    
    const profitPercent = ((targetPrice - ethPrice) / ethPrice) * 100;
    
    if (profitPercent > 0) {
      return {
        tokenIn: "USDC",
        tokenOut: "ETH",
        amountIn: parseUnits("100", 6), // 100 USDC
        expectedOut: parseUnits("0.05", 18), // ~0.05 ETH
        profitPercent,
      };
    }
    
    return null;
  }

  private async executeSwap(opportunity: any): Promise<void> {
    console.log(`[${this.getName()}] Executing swap...`);
    
    const userAddress = "0x..."; // Get from active permissions
    
    // 1. Log execution start
    const executionId = await this.logExecutionStart(
      userAddress,
      opportunity.amountIn,
      opportunity.tokenIn,
      opportunity.tokenOut
    );
    
    try {
      // 2. Execute the swap
      // This would call the DEX router contract
      
      const amountOut = opportunity.expectedOut;
      
      // 3. Log execution complete
      await this.logExecutionComplete(
        executionId,
        userAddress,
        opportunity.amountIn,
        amountOut,
        true
      );
      
      console.log(`[${this.getName()}] Swap successful`);
    } catch (error) {
      // Log failed execution
      await this.logExecutionComplete(
        executionId,
        userAddress,
        opportunity.amountIn,
        BigInt(0),
        false
      );
      
      console.error(`[${this.getName()}] Swap failed:`, error);
    }
  }
}
```

### 7.4 Envio Client Utility

```typescript
// packages/agents/src/utils/envio-client.ts

export class EnvioClient {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async query<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    }

    return json.data;
  }

  async getAgentLeaderboard(limit: number = 10) {
    return this.query(`
      query GetLeaderboard($limit: Int!) {
        agents(
          first: $limit
          orderBy: reputationScore
          orderDirection: desc
          where: { isActive: true }
        ) {
          id
          walletAddress
          name
          strategyType
          reputationScore
          winRate
        }
      }
    `, { limit });
  }

  async getAgentPerformance(agentId: string) {
    return this.query(`
      query GetAgentPerformance($agentId: ID!) {
        agent(id: $agentId) {
          totalExecutions
          successfulExecutions
          winRate
          totalProfitLoss
          reputationScore
        }
      }
    `, { agentId });
  }

  async getRecentExecutions(agentId: string, limit: number = 20) {
    return this.query(`
      query GetRecentExecutions($agentId: ID!, $limit: Int!) {
        executions(
          first: $limit
          orderBy: startedAt
          orderDirection: desc
          where: { agent: $agentId }
        ) {
          id
          amountIn
          amountOut
          profitLoss
          result
          startedAt
        }
      }
    `, { agentId, limit });
  }
}
```

---

## 8. API Specification

### 8.1 GraphQL API (Envio)

**Endpoint:** `https://indexer.envio.dev/echelon/v1/graphql`

#### Queries

| Query | Description | Parameters |
|-------|-------------|------------|
| `agents` | List agents with filtering/sorting | `first`, `skip`, `where`, `orderBy` |
| `agent` | Get single agent by ID | `id` |
| `executions` | List executions | `first`, `skip`, `where`, `orderBy` |
| `user` | Get user by address | `id` |
| `globalStats` | Get global statistics | - |
| `redelegations` | List redelegations | `first`, `skip`, `where` |

#### Filtering

```graphql
# Example: Get active DCA agents with score > 70
query {
  agents(
    where: {
      isActive: true
      strategyType: "DCA"
      reputationScore_gte: 70
    }
    orderBy: reputationScore
    orderDirection: desc
  ) {
    id
    name
    reputationScore
  }
}
```

#### Subscriptions (if enabled)

```graphql
subscription OnNewExecution {
  executionAdded {
    id
    agent {
      id
      name
    }
    amountIn
    result
  }
}
```

### 8.2 Contract ABIs

#### AgentRegistry ABI (Key Functions)

```json
[
  {
    "inputs": [
      { "name": "walletAddress", "type": "address" },
      { "name": "name", "type": "string" },
      { "name": "strategyType", "type": "string" },
      { "name": "riskLevel", "type": "uint8" },
      { "name": "metadataUri", "type": "string" }
    ],
    "name": "registerAgent",
    "outputs": [{ "name": "agentId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "agentId", "type": "uint256" }],
    "name": "agents",
    "outputs": [
      {
        "components": [
          { "name": "walletAddress", "type": "address" },
          { "name": "name", "type": "string" },
          { "name": "strategyType", "type": "string" },
          { "name": "riskLevel", "type": "uint8" },
          { "name": "registeredAt", "type": "uint256" },
          { "name": "isActive", "type": "bool" }
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "walletAddress", "type": "address" }],
    "name": "isRegisteredAgent",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
]
```

---

## 9. Data Models

### 9.1 Agent Metadata JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "description", "strategy", "version"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 3,
      "maxLength": 50
    },
    "description": {
      "type": "string",
      "maxLength": 500
    },
    "strategy": {
      "type": "object",
      "required": ["type", "description"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["DCA", "Arbitrage", "Yield", "Momentum", "MeanReversion", "GridTrading"]
        },
        "description": {
          "type": "string"
        },
        "parameters": {
          "type": "object"
        }
      }
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "image": {
      "type": "string",
      "format": "uri"
    },
    "social": {
      "type": "object",
      "properties": {
        "twitter": { "type": "string" },
        "discord": { "type": "string" },
        "website": { "type": "string", "format": "uri" }
      }
    },
    "fees": {
      "type": "object",
      "properties": {
        "performanceFee": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        },
        "managementFee": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      }
    }
  }
}
```

### 9.2 Example Agent Metadata

```json
{
  "name": "AlphaBot DCA",
  "description": "A sophisticated DCA bot that uses market sentiment analysis to optimize entry points.",
  "strategy": {
    "type": "DCA",
    "description": "Dollar-cost averaging with sentiment-adjusted timing",
    "parameters": {
      "baseInterval": 86400,
      "sentimentThreshold": 0.3,
      "maxSlippage": 0.5
    }
  },
  "version": "1.2.0",
  "image": "ipfs://QmXxx.../logo.png",
  "social": {
    "twitter": "@alphabot_dca",
    "website": "https://alphabot.io"
  },
  "fees": {
    "performanceFee": 10,
    "managementFee": 0
  }
}
```

---

## 10. Security Considerations

### 10.1 Smart Contract Security

| Risk | Mitigation |
|------|------------|
| Reentrancy | Use `ReentrancyGuard` on all state-changing functions |
| Integer Overflow | Use Solidity 0.8+ with built-in overflow checks |
| Access Control | Use `onlyOwner` and require agent registration |
| Front-running | Not critical for this use case (logging only) |
| Signature Replay | N/A - uses ERC-7715 standard |

### 10.2 Frontend Security

| Risk | Mitigation |
|------|------------|
| XSS | Use React's built-in escaping, sanitize user input |
| CSRF | Use SameSite cookies, verify origin |
| Private Key Exposure | Never handle private keys in frontend |
| Malicious Agents | Display reputation scores prominently |

### 10.3 Agent Security

| Risk | Mitigation |
|------|------------|
| Private Key Theft | Use hardware wallets or secure key management |
| API Key Exposure | Use environment variables, never commit |
| Permission Abuse | Implement rate limiting, maximum per-trade limits |

---

## 11. Testing Strategy

### 11.1 Contract Tests

```solidity
// test/AgentRegistry.t.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public owner;
    address public user;
    address public agentWallet;

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        agentWallet = makeAddr("agentWallet");
        
        registry = new AgentRegistry();
    }

    function test_RegisterAgent() public {
        vm.startPrank(user);
        
        uint256 agentId = registry.registerAgent(
            agentWallet,
            "TestAgent",
            "DCA",
            5,
            "ipfs://metadata"
        );
        
        assertEq(agentId, 1);
        assertEq(registry.totalAgents(), 1);
        assertTrue(registry.isRegisteredAgent(agentWallet));
        
        vm.stopPrank();
    }

    function test_RevertWhenWalletAlreadyRegistered() public {
        vm.startPrank(user);
        
        registry.registerAgent(
            agentWallet,
            "TestAgent",
            "DCA",
            5,
            "ipfs://metadata"
        );
        
        vm.expectRevert("Wallet already registered");
        registry.registerAgent(
            agentWallet,
            "TestAgent2",
            "DCA",
            5,
            "ipfs://metadata2"
        );
        
        vm.stopPrank();
    }

    function test_RevertWhenInvalidRiskLevel() public {
        vm.expectRevert("Risk level must be 1-10");
        registry.registerAgent(
            agentWallet,
            "TestAgent",
            "DCA",
            0,
            "ipfs://metadata"
        );
        
        vm.expectRevert("Risk level must be 1-10");
        registry.registerAgent(
            agentWallet,
            "TestAgent",
            "DCA",
            11,
            "ipfs://metadata"
        );
    }

    function test_DeactivateAndReactivate() public {
        vm.startPrank(user);
        
        uint256 agentId = registry.registerAgent(
            agentWallet,
            "TestAgent",
            "DCA",
            5,
            "ipfs://metadata"
        );
        
        registry.deactivateAgent(agentId);
        assertFalse(registry.agents(agentId).isActive);
        
        registry.reactivateAgent(agentId);
        assertTrue(registry.agents(agentId).isActive);
        
        vm.stopPrank();
    }

    function testFuzz_RegisterMultipleAgents(uint8 count) public {
        vm.assume(count > 0 && count <= 100);
        
        for (uint8 i = 0; i < count; i++) {
            address wallet = makeAddr(string(abi.encodePacked("wallet", i)));
            
            uint256 agentId = registry.registerAgent(
                wallet,
                string(abi.encodePacked("Agent", i)),
                "DCA",
                5,
                "ipfs://metadata"
            );
            
            assertEq(agentId, i + 1);
        }
        
        assertEq(registry.totalAgents(), count);
    }
}
```

### 11.2 Frontend Tests

```typescript
// __tests__/components/Leaderboard.test.tsx

import { render, screen, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { Leaderboard } from "@/components/agents/Leaderboard";
import { GET_LEADERBOARD } from "@/graphql/queries";

const mocks = [
  {
    request: {
      query: GET_LEADERBOARD,
      variables: { first: 10, skip: 0, minScore: 0 },
    },
    result: {
      data: {
        agents: [
          {
            id: "1",
            name: "TestAgent",
            walletAddress: "0x123",
            strategyType: "DCA",
            riskLevel: 5,
            reputationScore: 85,
            winRate: "0.75",
            totalProfitLoss: "1000",
          },
        ],
      },
    },
  },
];

describe("Leaderboard", () => {
  it("renders loading state", () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Leaderboard />
      </MockedProvider>
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders agents after loading", async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Leaderboard />
      </MockedProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText("TestAgent")).toBeInTheDocument();
    });
    
    expect(screen.getByText("85")).toBeInTheDocument(); // Score
    expect(screen.getByText("DCA")).toBeInTheDocument(); // Strategy
  });
});
```

### 11.3 Integration Tests

```typescript
// __tests__/integration/permission-flow.test.ts

import { createTestClient } from "viem";
import { sepolia } from "viem/chains";
import { deployContracts, registerAgent, grantPermission } from "./helpers";

describe("Permission Flow Integration", () => {
  let registryAddress: string;
  let executionAddress: string;
  let agentId: bigint;

  beforeAll(async () => {
    // Deploy contracts to local fork
    const deployment = await deployContracts();
    registryAddress = deployment.registry;
    executionAddress = deployment.execution;
    
    // Register a test agent
    agentId = await registerAgent(registryAddress, {
      name: "TestAgent",
      strategy: "DCA",
      riskLevel: 5,
    });
  });

  it("should grant and use permission", async () => {
    // Grant permission
    const permission = await grantPermission({
      agentId,
      amount: "100",
      duration: 3600,
    });
    
    expect(permission).toBeDefined();
    
    // Agent uses permission to execute
    // ... test execution flow
  });
});
```

---

## 12. Deployment Guide

### 12.1 Prerequisites

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Verify Foundry installation
forge --version

# Verify Node version
node --version  # Should be >= 20
```

### 12.2 Deploy Contracts

```bash
# Navigate to contracts package
cd packages/contracts

# Build contracts
forge build

# Run tests
forge test

# Deploy to Sepolia
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv

# Note deployed addresses from output
# Update packages/frontend/lib/constants.ts
```

### 12.3 Deploy Indexer

```bash
# Navigate to indexer package
cd packages/indexer

# Update config.yaml with deployed addresses
# Update start_block to deployment block

# Initialize Envio
envio dev

# Test locally first
# Then deploy to hosted service
envio deploy
```

### 12.4 Deploy Frontend

```bash
# Navigate to frontend package
cd packages/frontend

# Update environment variables
# NEXT_PUBLIC_REGISTRY_ADDRESS
# NEXT_PUBLIC_EXECUTION_ADDRESS
# NEXT_PUBLIC_ENVIO_GRAPHQL_URL

# Build
pnpm build

# Deploy to Vercel
vercel --prod
```

### 12.5 Register Mock Agents

```bash
# From contracts package
cd packages/contracts

# Run registration script
forge script script/RegisterMockAgents.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

---

## 13. Environment Configuration

### 13.1 Development (.env.local)

```bash
# Network
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key

# Contracts (update after deployment)
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_EXECUTION_ADDRESS=0x...

# Envio
NEXT_PUBLIC_ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql

# Pimlico (for bundler)
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_key

# WalletConnect (optional)
NEXT_PUBLIC_WALLETCONNECT_ID=your_wc_project_id

# Tokens (Sepolia)
NEXT_PUBLIC_USDC_ADDRESS=0x2BfBc55F4A360352Dc89e599D04898F150472cA6
```

### 13.2 Production

```bash
# Same variables but with production values
NEXT_PUBLIC_ENVIO_GRAPHQL_URL=https://indexer.envio.dev/echelon/v1/graphql
```

### 13.3 Contract Deployment

```bash
# For Foundry scripts
PRIVATE_KEY=0x...  # Deployer private key (never commit!)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_key
```

---

## 14. Error Handling

### 14.1 Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `AGENT_NOT_FOUND` | Agent ID doesn't exist | Verify agent ID |
| `WALLET_ALREADY_REGISTERED` | Wallet already has agent | Use different wallet |
| `PERMISSION_DENIED` | Caller not authorized | Check ownership |
| `INSUFFICIENT_PERMISSION` | Not enough delegated amount | Request more |
| `EXECUTION_FAILED` | Trade execution failed | Check logs |

### 14.2 Frontend Error Handling

```typescript
// lib/errors.ts

export class EchelonError extends Error {
  code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "EchelonError";
  }
}

export function handleError(error: unknown): EchelonError {
  if (error instanceof EchelonError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Parse contract errors
    if (error.message.includes("Wallet already registered")) {
      return new EchelonError(
        "WALLET_ALREADY_REGISTERED",
        "This wallet is already registered as an agent"
      );
    }
    
    // Parse GraphQL errors
    if (error.message.includes("Agent not found")) {
      return new EchelonError(
        "AGENT_NOT_FOUND",
        "The requested agent was not found"
      );
    }
  }
  
  return new EchelonError(
    "UNKNOWN_ERROR",
    "An unexpected error occurred"
  );
}
```

### 14.3 Toast Notifications

```typescript
// components/ui/toast.tsx

import { toast } from "sonner";
import { EchelonError } from "@/lib/errors";

export function showError(error: EchelonError) {
  toast.error(error.message, {
    description: `Error code: ${error.code}`,
    action: {
      label: "Learn more",
      onClick: () => window.open(`/docs/errors#${error.code}`),
    },
  });
}

export function showSuccess(message: string) {
  toast.success(message);
}

export function showLoading(message: string) {
  return toast.loading(message);
}
```

---

## 15. Performance Optimization

### 15.1 Frontend Optimizations

| Optimization | Implementation |
|--------------|----------------|
| Code Splitting | Use Next.js dynamic imports |
| Image Optimization | Use `next/image` |
| Bundle Size | Analyze with `@next/bundle-analyzer` |
| Caching | Use Apollo Client cache |
| Polling | Use appropriate poll intervals |

### 15.2 GraphQL Query Optimization

```typescript
// Use fragments to avoid over-fetching
const MINIMAL_AGENT = gql`
  fragment MinimalAgent on Agent {
    id
    name
    reputationScore
  }
`;

// Paginate large lists
const GET_PAGINATED = gql`
  query GetAgents($first: Int!, $skip: Int!) {
    agents(first: $first, skip: $skip) {
      ...MinimalAgent
    }
  }
`;

// Use specific fields, not *
const LEADERBOARD_FIELDS = gql`
  query {
    agents(first: 10) {
      id
      name
      strategyType
      reputationScore
      winRate
    }
  }
`;
```

### 15.3 Indexer Optimizations

```typescript
// Batch database writes
context.Agent.set(agent);  // Batched automatically by Envio

// Use indexes on frequently queried fields
// In schema.graphql:
// isActive: Boolean! @index
// strategyType: String! @index

// Precompute derived fields
// Calculate reputationScore in handler, not in queries
```

---

## Appendix A: Commands Reference

```bash
# Development
pnpm dev                    # Start all dev servers
pnpm build                  # Build all packages
pnpm test                   # Run all tests
pnpm lint                   # Lint all packages

# Contracts
cd packages/contracts
forge build                 # Compile contracts
forge test                  # Run contract tests
forge test -vvvv            # Verbose test output
forge coverage              # Generate coverage report

# Indexer
cd packages/indexer
envio dev                   # Start local indexer
envio codegen               # Generate types from schema
envio deploy                # Deploy to Envio hosted

# Frontend
cd packages/frontend
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm start                  # Start production server
```

---

## Appendix B: Useful Links

- [MetaMask Delegation Toolkit Docs](https://docs.gator.metamask.io)
- [ERC-7715 Specification](https://eips.ethereum.org/EIPS/eip-7715)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Envio Documentation](https://docs.envio.dev)
- [Foundry Book](https://book.getfoundry.sh)
- [Viem Documentation](https://viem.sh)
- [wagmi Documentation](https://wagmi.sh)

---

*Document Version: 1.0.0*  
*Last Updated: December 2024*