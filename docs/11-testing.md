# 11 - Testing

## Overview

Comprehensive testing ensures Echelon's reliability and security. This document covers testing strategies for smart contracts (Foundry), frontend (Jest/Testing Library), and integration testing across the full stack.

---

## Technical Specifications

### Testing Stack

| Layer | Framework | Coverage Target |
|-------|-----------|----------------|
| Smart Contracts | Foundry | 90%+ |
| Frontend Components | Jest + Testing Library | 80%+ |
| Hooks | Jest | 90%+ |
| Integration | Custom + Foundry | Key flows |
| E2E | Playwright (optional) | Critical paths |

### Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TEST ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │ UNIT TESTS      │  │ INTEGRATION     │  │ E2E TESTS  │ │
│  │                 │  │ TESTS           │  │            │ │
│  │ - Contract funcs│  │ - Contract +    │  │ - Full     │ │
│  │ - Components    │  │   Indexer       │  │   user     │ │
│  │ - Hooks         │  │ - Frontend +    │  │   flows    │ │
│  │ - Utils         │  │   GraphQL       │  │            │ │
│  └─────────────────┘  └─────────────────┘  └────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Testing

### 1. Basic Test Setup

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

    // Tests go here...
}
```

### 2. Registration Tests

```solidity
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

    // Verify metadata
    IAgentRegistry.AgentMetadata memory metadata = registry.agents(agentId);
    assertEq(metadata.name, "TestAgent");
    assertEq(metadata.strategyType, "DCA");
    assertEq(metadata.riskLevel, 5);
    assertTrue(metadata.isActive);

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
        0,  // Invalid
        "ipfs://metadata"
    );

    vm.expectRevert("Risk level must be 1-10");
    registry.registerAgent(
        agentWallet,
        "TestAgent",
        "DCA",
        11,  // Invalid
        "ipfs://metadata"
    );
}

function test_RevertWhenInvalidStrategyType() public {
    vm.expectRevert("Invalid strategy type");
    registry.registerAgent(
        agentWallet,
        "TestAgent",
        "InvalidStrategy",
        5,
        "ipfs://metadata"
    );
}
```

### 3. Activation Tests

```solidity
function test_DeactivateAndReactivate() public {
    vm.startPrank(user);

    uint256 agentId = registry.registerAgent(
        agentWallet,
        "TestAgent",
        "DCA",
        5,
        "ipfs://metadata"
    );

    // Deactivate
    registry.deactivateAgent(agentId);
    assertFalse(registry.agents(agentId).isActive);

    // Reactivate
    registry.reactivateAgent(agentId);
    assertTrue(registry.agents(agentId).isActive);

    vm.stopPrank();
}

function test_RevertDeactivateNotOwner() public {
    vm.prank(user);
    uint256 agentId = registry.registerAgent(
        agentWallet,
        "TestAgent",
        "DCA",
        5,
        "ipfs://metadata"
    );

    address attacker = makeAddr("attacker");
    vm.prank(attacker);
    vm.expectRevert("Not agent owner");
    registry.deactivateAgent(agentId);
}
```

### 4. Fuzz Testing

```solidity
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

function testFuzz_RiskLevel(uint8 riskLevel) public {
    vm.assume(riskLevel >= 1 && riskLevel <= 10);

    uint256 agentId = registry.registerAgent(
        agentWallet,
        "TestAgent",
        "DCA",
        riskLevel,
        "ipfs://metadata"
    );

    assertEq(registry.agents(agentId).riskLevel, riskLevel);
}
```

### 5. Execution Tests

```solidity
// test/AgentExecution.t.sol
contract AgentExecutionTest is Test {
    AgentRegistry public registry;
    AgentExecution public execution;
    address public agentWallet;
    address public userAddress;

    function setUp() public {
        registry = new AgentRegistry();
        execution = new AgentExecution(address(registry));
        agentWallet = makeAddr("agentWallet");
        userAddress = makeAddr("user");

        // Register an agent
        registry.registerAgent(
            agentWallet,
            "TestAgent",
            "DCA",
            5,
            "ipfs://metadata"
        );
    }

    function test_LogExecutionStartAndComplete() public {
        vm.startPrank(agentWallet);

        uint256 executionId = execution.logExecutionStart(
            userAddress,
            1000e6,  // 1000 USDC
            address(0x1),  // tokenIn
            address(0x2)   // tokenOut
        );

        assertTrue(execution.isExecutionPending(executionId));

        execution.logExecutionComplete(
            executionId,
            userAddress,
            1000e6,
            1050e6,  // 1050 USDC out (5% profit)
            IAgentExecution.ExecutionResult.SUCCESS
        );

        assertFalse(execution.isExecutionPending(executionId));

        vm.stopPrank();
    }

    function test_RevertLogExecutionNotRegistered() public {
        address unregisteredAgent = makeAddr("unregistered");

        vm.prank(unregisteredAgent);
        vm.expectRevert("Not a registered agent");
        execution.logExecutionStart(
            userAddress,
            1000e6,
            address(0x1),
            address(0x2)
        );
    }
}
```

### 6. Running Contract Tests

```bash
# Navigate to contracts package
cd packages/contracts

# Run all tests
forge test

# Run with verbosity
forge test -vvvv

# Run specific test
forge test --match-test test_RegisterAgent

# Run with gas reporting
forge test --gas-report

# Generate coverage report
forge coverage
```

---

## Frontend Testing

### 1. Component Test Setup

```typescript
// __tests__/components/Leaderboard.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { Leaderboard } from "@/components/agents/Leaderboard";
import { GET_LEADERBOARD } from "@/graphql/queries";

const mockAgents = [
  {
    id: "1",
    name: "AlphaBot",
    walletAddress: "0x123...",
    strategyType: "DCA",
    riskLevel: 5,
    reputationScore: 85,
    winRate: "0.75",
    totalProfitLoss: "1000000000", // 1000 USDC
    isActive: true,
  },
];

const mocks = [
  {
    request: {
      query: GET_LEADERBOARD,
      variables: { first: 10, minScore: 0 },
    },
    result: {
      data: {
        agents: mockAgents,
      },
    },
  },
];
```

### 2. Component Tests

```typescript
describe("Leaderboard", () => {
  it("renders loading state initially", () => {
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
      expect(screen.getByText("AlphaBot")).toBeInTheDocument();
    });

    expect(screen.getByText("85")).toBeInTheDocument(); // Score
    expect(screen.getByText("DCA")).toBeInTheDocument(); // Strategy
  });

  it("handles error state", async () => {
    const errorMocks = [
      {
        request: {
          query: GET_LEADERBOARD,
          variables: { first: 10, minScore: 0 },
        },
        error: new Error("Network error"),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <Leaderboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### 3. Hook Tests

```typescript
// __tests__/hooks/useAgents.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { useLeaderboard } from "@/hooks/useAgents";

describe("useLeaderboard", () => {
  it("returns agents sorted by reputation", async () => {
    const wrapper = ({ children }) => (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );

    const { result } = renderHook(() => useLeaderboard({ limit: 10 }), {
      wrapper,
    });

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agents).toHaveLength(1);
    expect(result.current.agents[0].name).toBe("AlphaBot");
    expect(result.current.agents[0].rank).toBe(1);
  });
});
```

### 4. Utility Function Tests

```typescript
// __tests__/lib/reputation.test.ts
import { calculateReputationScore } from "@/lib/reputation";

describe("calculateReputationScore", () => {
  it("returns 50 for new agents with < 5 executions", () => {
    const score = calculateReputationScore({
      winRate: 1.0,
      totalVolume: 1000,
      profitLoss: 100,
      executionCount: 3,
      avgProfitPerTrade: 33,
    });

    expect(score).toBe(50);
  });

  it("calculates high score for excellent performance", () => {
    const score = calculateReputationScore({
      winRate: 0.85,
      totalVolume: 50000e18,
      profitLoss: 4500e18,
      executionCount: 150,
      avgProfitPerTrade: 30e18,
    });

    expect(score).toBeGreaterThan(80);
  });

  it("calculates low score for poor performance", () => {
    const score = calculateReputationScore({
      winRate: 0.3,
      totalVolume: 10000e18,
      profitLoss: -2000e18,
      executionCount: 50,
      avgProfitPerTrade: -40e18,
    });

    expect(score).toBeLessThan(40);
  });
});
```

### 5. Running Frontend Tests

```bash
# Navigate to frontend package
cd packages/frontend

# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run in watch mode
pnpm test --watch

# Run specific test file
pnpm test Leaderboard.test.tsx
```

---

## Integration Testing

### 1. Full Flow Integration Test

```typescript
// __tests__/integration/permission-flow.test.ts
import { createTestClient, anvil } from "viem/test";
import { sepolia } from "viem/chains";

describe("Permission Flow Integration", () => {
  let registryAddress: string;
  let executionAddress: string;
  let agentId: bigint;

  beforeAll(async () => {
    // Deploy contracts to local anvil fork
    const deployment = await deployContracts();
    registryAddress = deployment.registry;
    executionAddress = deployment.execution;

    // Register a test agent
    agentId = await registerAgent(registryAddress, {
      name: "IntegrationTestAgent",
      strategy: "DCA",
      riskLevel: 5,
    });
  });

  it("should complete full permission grant and execution flow", async () => {
    // 1. Grant permission
    const permission = await grantPermission({
      agentId,
      amount: "100",
      duration: 3600,
    });

    expect(permission).toBeDefined();

    // 2. Agent executes trade
    const executionId = await startExecution(executionAddress, {
      userAddress: permission.user,
      amountIn: 10n * 10n ** 6n,
    });

    // 3. Complete execution
    await completeExecution(executionAddress, {
      executionId,
      amountOut: 11n * 10n ** 6n, // 10% profit
      success: true,
    });

    // 4. Verify indexer updated
    await waitForIndexer();

    const agentData = await queryAgent(agentId);
    expect(agentData.totalExecutions).toBe("1");
    expect(agentData.successfulExecutions).toBe("1");
  });
});
```

---

## Test Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| Smart Contracts | 90% |
| Frontend Components | 80% |
| Hooks | 90% |
| Utility Functions | 95% |

---

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: foundry-rs/foundry-toolchain@v1
      - run: cd packages/contracts && forge build
      - run: cd packages/contracts && forge test
      - run: cd packages/contracts && forge coverage

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: cd packages/frontend && pnpm test --coverage
      - run: cd packages/frontend && pnpm build
```

---

*See also: [Smart Contracts](./01-smart-contracts.md), [Security](./10-security.md)*
