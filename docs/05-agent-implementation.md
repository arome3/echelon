# 05 - Agent Implementation

## Overview

Echelon agents are autonomous programs that execute trading strategies on behalf of users who have granted them permissions. This document covers the base agent architecture and specialized agent implementations including Fund Manager and DEX Swap agents.

---

## Technical Specifications

### Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AGENT SYSTEM                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    BaseAgent                         │  │
│  │                                                       │  │
│  │  - Wallet Client (viem)                              │  │
│  │  - Envio Client (GraphQL)                            │  │
│  │  - Execution Logging                                 │  │
│  │  - Start/Stop Lifecycle                              │  │
│  └─────────────────────────────────────────────────────┘  │
│                            │                               │
│              ┌─────────────┴─────────────┐                │
│              ▼                           ▼                 │
│  ┌─────────────────────┐    ┌─────────────────────┐      │
│  │  FundManagerAgent   │    │    DexSwapAgent     │      │
│  │                     │    │                     │      │
│  │  - Market Analysis  │    │  - Price Fetching   │      │
│  │  - Specialist Query │    │  - Arbitrage Find   │      │
│  │  - Redelegation     │    │  - Swap Execution   │      │
│  └─────────────────────┘    └─────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js ^20.0.0 |
| Language | TypeScript |
| Web3 | viem |
| Data | Envio GraphQL |

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| Autonomous Execution | Run continuously without human intervention |
| Permission Compliance | Only use granted permissions |
| On-chain Logging | Log all executions for reputation |
| Specialist Discovery | Query Envio for best specialists |
| A2A Redelegation | Delegate to other agents |
| Error Recovery | Handle failures gracefully |

---

## Implementation Guide

### 1. Base Agent Class

```typescript
// packages/agents/src/BaseAgent.ts
import { createWalletClient, http, type WalletClient, type PublicClient } from "viem";
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

  // Abstract methods - must be implemented by subclasses
  abstract getName(): string;
  abstract getStrategyType(): string;
  abstract executeStrategy(): Promise<void>;

  // Start the agent's execution loop
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
      await this.sleep(60000); // 1 minute default
    }
  }

  // Stop the agent
  stop(): void {
    this.isRunning = false;
    console.log(`[${this.getName()}] Stopping agent...`);
  }

  // Utility: Sleep for specified milliseconds
  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Log execution start to AgentExecution contract
  protected async logExecutionStart(
    userAddress: string,
    amountIn: bigint,
    tokenIn: string,
    tokenOut: string
  ): Promise<bigint> {
    // Implementation would call AgentExecution.logExecutionStart
    console.log(`[${this.getName()}] Logging execution start...`);

    // This is a placeholder - actual implementation would use walletClient
    // to send transaction to AgentExecution contract
    return BigInt(Date.now());
  }

  // Log execution completion to AgentExecution contract
  protected async logExecutionComplete(
    executionId: bigint,
    userAddress: string,
    amountIn: bigint,
    amountOut: bigint,
    success: boolean
  ): Promise<void> {
    console.log(`[${this.getName()}] Logging execution complete...`);
    // Implementation would call AgentExecution.logExecutionComplete
  }

  // Query active permissions for this agent
  protected async getActivePermissions(): Promise<any[]> {
    const query = `
      query GetAgentPermissions($agentId: ID!) {
        agent(id: $agentId) {
          permissionsReceived(where: { isActive: true }) {
            id
            user { id }
            amountPerPeriod
            periodDuration
            amountRemaining
            expiresAt
          }
        }
      }
    `;

    const data = await this.envio.query(query, { agentId: this.agentId });
    return data?.agent?.permissionsReceived || [];
  }
}
```

### 2. Fund Manager Agent

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

    console.log(
      `[${this.getName()}] Selected specialist: ${specialist.name} (Score: ${specialist.reputationScore})`
    );

    // 3. Check available amount to delegate
    const availableAmount = await this.getAvailableAmount();

    if (availableAmount <= 0) {
      console.log(`[${this.getName()}] No available amount to delegate`);
      return;
    }

    // 4. Calculate optimal allocation
    const allocation = this.calculateAllocation(availableAmount, conditions);

    // 5. Redelegate to specialist
    await this.redelegateToSpecialist(specialist, allocation);
  }

  private async analyzeMarket(): Promise<MarketConditions> {
    // Query recent executions from Envio to gauge market conditions
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
        }
      }
    `;

    const data = await this.envio.query(query);
    const executions = data.executions || [];
    const profitLosses = executions.map((e: any) => parseFloat(e.profitLoss));

    const volatility = this.calculateVolatility(profitLosses);

    return {
      ethVolatility: volatility,
      bestYieldApy: 5.0, // Mock - would query DeFi protocols
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
    // Determine target strategy based on conditions
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
    const permissions = await this.getActivePermissions();

    // Sum up remaining amounts
    return permissions.reduce((sum, p) => {
      return sum + parseFloat(p.amountRemaining);
    }, 0);
  }

  private calculateAllocation(
    available: number,
    conditions: MarketConditions
  ): { amount: number; duration: number } {
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
      `[${this.getName()}] Redelegating ${allocation.amount} to ${specialist.name}`
    );

    // Call AgentExecution.logRedelegation
    // Implementation would send transaction to contract
  }
}
```

### 3. DEX Swap Agent

```typescript
// packages/agents/src/DexSwapAgent.ts
import { BaseAgent, type AgentConfig } from "./BaseAgent";
import { parseUnits, formatUnits } from "viem";

interface SwapOpportunity {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  expectedOut: bigint;
  profitPercent: number;
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

    // 1. Get current prices from multiple sources
    const prices = await this.getPrices();

    // 2. Find arbitrage opportunity
    const opportunity = this.findArbitrageOpportunity(prices);

    if (!opportunity) {
      console.log(`[${this.getName()}] No arbitrage opportunity found`);
      return;
    }

    console.log(
      `[${this.getName()}] Found opportunity: ${opportunity.profitPercent}% profit`
    );

    // 3. Execute swap if profitable enough
    if (opportunity.profitPercent > 0.5) {
      await this.executeSwap(opportunity);
    }
  }

  private async getPrices(): Promise<Map<string, number>> {
    // In production, fetch from Uniswap, Sushiswap, etc.
    // This is a mock implementation
    return new Map([
      ["ETH/USDC", 2000 + Math.random() * 10],
      ["WBTC/USDC", 40000 + Math.random() * 100],
    ]);
  }

  private findArbitrageOpportunity(
    prices: Map<string, number>
  ): SwapOpportunity | null {
    const ethPrice = prices.get("ETH/USDC") || 2000;
    const targetPrice = 2005; // Hypothetical better price

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

  private async executeSwap(opportunity: SwapOpportunity): Promise<void> {
    console.log(`[${this.getName()}] Executing swap...`);

    // Get user address from active permission
    const permissions = await this.getActivePermissions();
    if (permissions.length === 0) {
      console.log(`[${this.getName()}] No active permissions`);
      return;
    }

    const userAddress = permissions[0].user.id;

    // 1. Log execution start
    const executionId = await this.logExecutionStart(
      userAddress,
      opportunity.amountIn,
      opportunity.tokenIn,
      opportunity.tokenOut
    );

    try {
      // 2. Execute the swap (would call DEX router)
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

### 4. Envio Client Utility

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
}
```

### 5. Running an Agent

```typescript
// packages/agents/src/index.ts
import { FundManagerAgent } from "./FundManagerAgent";
import { DexSwapAgent } from "./DexSwapAgent";

async function main() {
  const config = {
    agentId: process.env.AGENT_ID!,
    privateKey: process.env.AGENT_PRIVATE_KEY!,
    registryAddress: process.env.REGISTRY_ADDRESS!,
    executionAddress: process.env.EXECUTION_ADDRESS!,
    rpcUrl: process.env.RPC_URL!,
    envioUrl: process.env.ENVIO_URL!,
  };

  // Create and start agent
  const agent = new FundManagerAgent(config);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("Shutting down...");
    agent.stop();
  });

  await agent.start();
}

main().catch(console.error);
```

---

## Dependencies

```json
{
  "dependencies": {
    "viem": "^2.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0"
  }
}
```

---

## Agent Strategy Types

| Type | Description | Risk Level |
|------|-------------|------------|
| DCA | Dollar-cost averaging | Low (1-3) |
| Arbitrage | Price arbitrage | Medium (4-6) |
| Yield | Yield optimization | Medium (4-6) |
| Momentum | Trend following | High (7-9) |
| MeanReversion | Mean reversion | Medium (5-7) |
| GridTrading | Grid strategy | Medium (4-7) |

---

*See also: [A2A Delegation](./06-a2a-delegation.md), [Reputation System](./07-reputation-system.md)*
