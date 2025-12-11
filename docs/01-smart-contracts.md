# 01 - Smart Contracts

## Overview

Echelon's smart contracts provide the on-chain infrastructure for agent registration, identity management, and execution logging. The contracts implement ERC-8004 for agent registry (using ERC-721 NFTs) and a custom execution logger that emits events for Envio indexing.

---

## Technical Specifications

### Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SMART CONTRACTS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐       │
│  │   AgentRegistry     │    │   AgentExecution    │       │
│  │   (ERC-8004)        │◄───│                     │       │
│  │                     │    │                     │       │
│  │ - ERC721URIStorage  │    │ - Execution Logging │       │
│  │ - ERC721Enumerable  │    │ - Redelegation Log  │       │
│  │ - Agent Metadata    │    │ - P&L Tracking      │       │
│  └─────────────────────┘    └─────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Solidity ^0.8.24 |
| Framework | Foundry |
| Libraries | OpenZeppelin Contracts |
| Network | Sepolia Testnet |

### Contract Standards

- **ERC-721**: Agent NFT ownership
- **ERC-8004**: Agent registry standard
- **ERC721URIStorage**: Metadata URI storage
- **ERC721Enumerable**: Token enumeration

---

## Key Capabilities

### AgentRegistry.sol

| Capability | Description |
|------------|-------------|
| Agent Registration | Register new AI agents with metadata |
| NFT Ownership | Each agent is an NFT owned by creator |
| Metadata Management | Update agent metadata URI |
| Activation Control | Activate/deactivate agents |
| Strategy Validation | Validate strategy types |
| Wallet Mapping | Map wallet addresses to agent IDs |

### AgentExecution.sol

| Capability | Description |
|------------|-------------|
| Execution Logging | Log start/complete of agent actions |
| P&L Calculation | Calculate profit/loss per execution |
| Redelegation Tracking | Track A2A redelegations |
| Pending State | Track pending executions |

---

## Implementation Guide

### 1. Contract Interfaces

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

    function updateAgentMetadata(uint256 agentId, string calldata metadataUri) external;
    function deactivateAgent(uint256 agentId) external;
    function reactivateAgent(uint256 agentId) external;
    function getAgentByWallet(address walletAddress) external view returns (uint256, AgentMetadata memory);
    function isRegisteredAgent(address walletAddress) external view returns (bool);
    function totalAgents() external view returns (uint256);
}
```

#### IAgentExecution.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentExecution {
    enum ExecutionResult { PENDING, SUCCESS, FAILURE }

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

### 2. AgentRegistry Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AgentRegistry is
    ERC721URIStorage,
    ERC721Enumerable,
    Ownable,
    ReentrancyGuard
{
    // State Variables
    uint256 private _nextAgentId;
    mapping(uint256 => AgentMetadata) private _agents;
    mapping(address => uint256) private _walletToAgentId;

    uint256 public constant MIN_NAME_LENGTH = 3;
    uint256 public constant MAX_NAME_LENGTH = 50;

    mapping(string => bool) public validStrategyTypes;

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

    constructor() ERC721("Echelon Registry", "AGENT") Ownable(msg.sender) {
        // Initialize valid strategy types
        validStrategyTypes["DCA"] = true;
        validStrategyTypes["Arbitrage"] = true;
        validStrategyTypes["Yield"] = true;
        validStrategyTypes["Momentum"] = true;
        validStrategyTypes["MeanReversion"] = true;
        validStrategyTypes["GridTrading"] = true;
    }

    function registerAgent(
        address walletAddress,
        string calldata name,
        string calldata strategyType,
        uint8 riskLevel,
        string calldata metadataUri
    ) external nonReentrant returns (uint256 agentId) {
        require(walletAddress != address(0), "Invalid wallet address");
        require(_walletToAgentId[walletAddress] == 0, "Wallet already registered");
        require(bytes(name).length >= MIN_NAME_LENGTH, "Name too short");
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long");
        require(validStrategyTypes[strategyType], "Invalid strategy type");
        require(riskLevel >= 1 && riskLevel <= 10, "Risk level must be 1-10");
        require(bytes(metadataUri).length > 0, "Metadata URI required");

        agentId = ++_nextAgentId;

        _agents[agentId] = AgentMetadata({
            walletAddress: walletAddress,
            name: name,
            strategyType: strategyType,
            riskLevel: riskLevel,
            registeredAt: block.timestamp,
            isActive: true
        });

        _walletToAgentId[walletAddress] = agentId;

        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, metadataUri);

        emit AgentRegistered(agentId, walletAddress, name, strategyType, riskLevel);
    }

    function deactivateAgent(uint256 agentId) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");
        require(_agents[agentId].isActive, "Already deactivated");
        _agents[agentId].isActive = false;
        emit AgentDeactivated(agentId);
    }

    function reactivateAgent(uint256 agentId) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");
        require(!_agents[agentId].isActive, "Already active");
        _agents[agentId].isActive = true;
        emit AgentReactivated(agentId);
    }

    function isRegisteredAgent(address walletAddress) external view returns (bool) {
        return _walletToAgentId[walletAddress] != 0;
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId;
    }

    function walletToAgentId(address wallet) external view returns (uint256) {
        return _walletToAgentId[wallet];
    }
}
```

### 3. AgentExecution Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAgentRegistry {
    function isRegisteredAgent(address) external view returns (bool);
    function getAgentByWallet(address) external view returns (uint256, AgentMetadata memory);
    struct AgentMetadata {
        address walletAddress;
        string name;
        string strategyType;
        uint8 riskLevel;
        uint256 registeredAt;
        bool isActive;
    }
}

contract AgentExecution is ReentrancyGuard {
    IAgentRegistry public immutable registry;

    uint256 private _executionCount;
    mapping(uint256 => bool) private _pendingExecutions;
    mapping(uint256 => address) private _executionAgent;

    enum ExecutionResult { PENDING, SUCCESS, FAILURE }

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

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry address");
        registry = IAgentRegistry(_registry);
    }

    function logExecutionStart(
        address userAddress,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external nonReentrant returns (uint256 executionId) {
        require(registry.isRegisteredAgent(msg.sender), "Not a registered agent");
        require(userAddress != address(0), "Invalid user address");
        require(amountIn > 0, "Amount must be positive");

        (uint256 agentId, ) = registry.getAgentByWallet(msg.sender);

        executionId = ++_executionCount;
        _pendingExecutions[executionId] = true;
        _executionAgent[executionId] = msg.sender;

        emit ExecutionStarted(executionId, agentId, userAddress, amountIn, tokenIn, tokenOut);
    }

    function logExecutionComplete(
        uint256 executionId,
        address userAddress,
        uint256 amountIn,
        uint256 amountOut,
        ExecutionResult result
    ) external nonReentrant {
        require(_executionAgent[executionId] == msg.sender, "Not execution owner");
        require(_pendingExecutions[executionId], "Execution not pending");

        (uint256 agentId, ) = registry.getAgentByWallet(msg.sender);
        int256 profitLoss = int256(amountOut) - int256(amountIn);

        _pendingExecutions[executionId] = false;

        emit ExecutionCompleted(executionId, agentId, userAddress, amountIn, amountOut, profitLoss, result);
    }

    function logRedelegation(
        uint256 childAgentId,
        address userAddress,
        uint256 amount,
        uint256 duration
    ) external nonReentrant {
        require(registry.isRegisteredAgent(msg.sender), "Not a registered agent");

        (uint256 parentAgentId, ) = registry.getAgentByWallet(msg.sender);

        emit RedelegationCreated(parentAgentId, childAgentId, userAddress, amount, duration);
    }
}
```

### 4. Foundry Configuration

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

### 5. Deployment Script

```solidity
// script/Deploy.s.sol
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
    }
}
```

### 6. Deploy Commands

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
```

---

## Dependencies

### OpenZeppelin Contracts

```bash
# Install via Foundry
forge install OpenZeppelin/openzeppelin-contracts
```

### remappings.txt

```
@openzeppelin/=lib/openzeppelin-contracts/
forge-std/=lib/forge-std/src/
```

---

## Valid Strategy Types

| Strategy | Description |
|----------|-------------|
| DCA | Dollar-cost averaging |
| Arbitrage | Price arbitrage across DEXes |
| Yield | Yield farming optimization |
| Momentum | Trend-following strategies |
| MeanReversion | Mean reversion trading |
| GridTrading | Grid trading strategy |

---

## Contract Events

### AgentRegistry Events

| Event | Indexed Fields | Purpose |
|-------|---------------|---------|
| AgentRegistered | agentId, walletAddress | New agent registration |
| AgentUpdated | agentId | Metadata update |
| AgentDeactivated | agentId | Agent deactivation |
| AgentReactivated | agentId | Agent reactivation |

### AgentExecution Events

| Event | Indexed Fields | Purpose |
|-------|---------------|---------|
| ExecutionStarted | executionId, agentId, userAddress | Trade start |
| ExecutionCompleted | executionId, agentId, userAddress | Trade completion |
| RedelegationCreated | parentAgentId, childAgentId, userAddress | A2A delegation |

---

*See also: [Permission System](./04-permission-system.md), [Envio Indexer](./02-envio-indexer.md)*
