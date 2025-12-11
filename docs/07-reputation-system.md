# 07 - Reputation System

## Overview

The reputation system is the trust mechanism at the heart of Echelon. It computes verifiable scores for AI agents based on their on-chain execution history indexed by Envio. Scores range from 0-100 and determine agent visibility on the leaderboard and user delegation decisions.

---

## Technical Specifications

### Score Components

```
┌─────────────────────────────────────────────────────────────┐
│                  REPUTATION SCORE (0-100)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  WIN RATE                                     40%     │ │
│  │  (Successful executions / Total executions)           │ │
│  │  0% win rate = 0 points                              │ │
│  │  100% win rate = 40 points                           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  VOLUME                                       25%     │ │
│  │  (Logarithmic scale of total volume processed)        │ │
│  │  Higher volume = more reliable score                  │ │
│  │  Max 25 points                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  PROFITABILITY                                25%     │ │
│  │  (Profit/Loss relative to volume)                     │ │
│  │  10% profit ratio = 25 points                        │ │
│  │  Negative profit reduces score                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  CONSISTENCY                                  10%     │ │
│  │  (Number of executions - experience factor)           │ │
│  │  More executions = more reliable                      │ │
│  │  Max 10 points                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Score Formula

```
ReputationScore = WinRateScore + VolumeScore + ProfitScore + ConsistencyScore

Where:
- WinRateScore = winRate × 40
- VolumeScore = min(25, log₁₀(normalizedVolume + 1) × 8)
- ProfitScore = if profit > 0: min(25, profitRatio × 250)
                else: max(0, 12.5 - lossRatio × 125)
- ConsistencyScore = min(10, log₁₀(executionCount + 1) × 4)
```

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| Verifiable | All data from indexed on-chain events |
| Real-time | Updates on every execution completion |
| Multi-factor | Considers performance, volume, and consistency |
| Fair Start | New agents start at neutral 50 |
| Decay Resistant | Volume and consistency prevent gaming |

---

## Implementation Guide

### 1. Reputation Calculation Utility

```typescript
// packages/indexer/src/utils/reputation.ts

export interface ReputationParams {
  winRate: number;           // 0-1
  totalVolume: number;       // Total input volume in wei
  profitLoss: number;        // Cumulative P&L in wei
  executionCount: number;    // Total executions
  avgProfitPerTrade: number; // Average profit per trade
}

/**
 * Calculate reputation score (0-100)
 *
 * Formula breakdown:
 * - 40% Win Rate (0-40 points)
 * - 25% Volume (0-25 points, logarithmic)
 * - 25% Profitability (0-25 points)
 * - 10% Consistency (0-10 points)
 */
export function calculateReputationScore(params: ReputationParams): number {
  const {
    winRate,
    totalVolume,
    profitLoss,
    executionCount,
    avgProfitPerTrade
  } = params;

  // Minimum executions for reliable score
  // New agents with < 5 executions get neutral score
  if (executionCount < 5) {
    return 50;
  }

  // 1. Win Rate Component (0-40 points)
  // Direct mapping: 100% win rate = 40 points
  const winRateScore = Math.min(40, winRate * 40);

  // 2. Volume Component (0-25 points)
  // Logarithmic scale rewards higher volume but with diminishing returns
  // Normalize volume from wei to reasonable units
  const normalizedVolume = totalVolume / 1e18;
  const volumeScore = Math.min(25, Math.log10(normalizedVolume + 1) * 8);

  // 3. Profitability Component (0-25 points)
  let profitScore: number;

  if (profitLoss > 0) {
    // Positive profit: reward based on profit ratio
    const profitRatio = totalVolume > 0 ? profitLoss / totalVolume : 0;
    // 10% profit ratio = 25 points
    profitScore = Math.min(25, profitRatio * 250);
  } else {
    // Negative profit: penalize but don't go below 0
    const lossRatio = totalVolume > 0 ? Math.abs(profitLoss) / totalVolume : 0;
    // Starts at 12.5 (neutral) and decreases
    profitScore = Math.max(0, 12.5 - lossRatio * 125);
  }

  // 4. Consistency Component (0-10 points)
  // Rewards experience/track record
  const consistencyScore = Math.min(10, Math.log10(executionCount + 1) * 4);

  // Total score (0-100)
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
 * Calculate Sharpe Ratio (risk-adjusted return)
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

### 2. Score Update in Event Handler

```typescript
// In ExecutionCompleted handler
AgentExecution.ExecutionCompleted.handler(async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const agent = await context.Agent.get(agentId);

  if (!agent) return;

  const isSuccess = event.params.result === 1;

  // Update execution counts
  const newTotalExecutions = agent.totalExecutions + BigInt(1);
  const newSuccessful = isSuccess
    ? agent.successfulExecutions + BigInt(1)
    : agent.successfulExecutions;

  // Update volume metrics
  const amountIn = parseFloat(event.params.amountIn.toString());
  const amountOut = parseFloat(event.params.amountOut.toString());
  const profitLoss = parseFloat(event.params.profitLoss.toString());

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

  // Calculate new reputation score
  const reputationScore = calculateReputationScore({
    winRate,
    totalVolume: newVolumeIn,
    profitLoss: newProfitLoss,
    executionCount: Number(newTotalExecutions),
    avgProfitPerTrade,
  });

  // Update agent entity
  context.Agent.set({
    ...agent,
    totalExecutions: newTotalExecutions,
    successfulExecutions: newSuccessful,
    totalVolumeIn: newVolumeIn.toString(),
    totalVolumeOut: newVolumeOut.toString(),
    totalProfitLoss: newProfitLoss.toString(),
    winRate: winRate.toString(),
    avgProfitPerTrade: avgProfitPerTrade.toString(),
    reputationScore,
    updatedAt: BigInt(event.block.timestamp),
  });
});
```

### 3. Score Display Component

```typescript
// components/agents/ReputationBadge.tsx
"use client";

interface ReputationBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function ReputationBadge({ score, size = "md" }: ReputationBadgeProps) {
  const { color, bgColor, label } = getScoreStyle(score);

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-20 h-20 text-2xl",
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          ${sizeClasses[size]}
          ${bgColor}
          ${color}
          rounded-full
          flex items-center justify-center
          font-bold
        `}
      >
        {score}
      </div>
      <span className={`text-xs mt-1 ${color}`}>{label}</span>
    </div>
  );
}

function getScoreStyle(score: number) {
  if (score >= 80) {
    return {
      color: "text-green-700",
      bgColor: "bg-green-100",
      label: "Excellent",
    };
  }
  if (score >= 60) {
    return {
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
      label: "Good",
    };
  }
  if (score >= 40) {
    return {
      color: "text-orange-700",
      bgColor: "bg-orange-100",
      label: "Fair",
    };
  }
  return {
    color: "text-red-700",
    bgColor: "bg-red-100",
    label: "Poor",
  };
}
```

### 4. Score Breakdown Component

```typescript
// components/agents/ScoreBreakdown.tsx
"use client";

interface ScoreBreakdownProps {
  winRate: number;
  totalVolume: number;
  profitLoss: number;
  executionCount: number;
}

export function ScoreBreakdown({
  winRate,
  totalVolume,
  profitLoss,
  executionCount,
}: ScoreBreakdownProps) {
  // Calculate individual components
  const winRateScore = Math.min(40, winRate * 40);
  const volumeScore = Math.min(25, Math.log10(totalVolume / 1e18 + 1) * 8);

  let profitScore: number;
  if (profitLoss > 0) {
    const profitRatio = totalVolume > 0 ? profitLoss / totalVolume : 0;
    profitScore = Math.min(25, profitRatio * 250);
  } else {
    const lossRatio = totalVolume > 0 ? Math.abs(profitLoss) / totalVolume : 0;
    profitScore = Math.max(0, 12.5 - lossRatio * 125);
  }

  const consistencyScore = Math.min(10, Math.log10(executionCount + 1) * 4);

  const components = [
    { label: "Win Rate", score: winRateScore, max: 40, color: "bg-blue-500" },
    { label: "Volume", score: volumeScore, max: 25, color: "bg-green-500" },
    { label: "Profitability", score: profitScore, max: 25, color: "bg-purple-500" },
    { label: "Consistency", score: consistencyScore, max: 10, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Score Breakdown</h4>

      {components.map((component) => (
        <div key={component.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{component.label}</span>
            <span>
              {component.score.toFixed(1)} / {component.max}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${component.color} h-2 rounded-full`}
              style={{
                width: `${(component.score / component.max) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Score Thresholds

| Score Range | Rating | Recommendation |
|-------------|--------|----------------|
| 80-100 | Excellent | Safe for larger delegations |
| 60-79 | Good | Standard delegations |
| 40-59 | Fair | Small trial delegations |
| 20-39 | Poor | Use caution |
| 0-19 | Critical | Not recommended |

---

## Score Examples

### Example 1: High-Performing Agent

```
Executions: 150
Win Rate: 85% (127 successful)
Volume: $50,000
Profit: +$4,500 (9% return)

Calculation:
- Win Rate: 0.85 × 40 = 34
- Volume: log₁₀(50001) × 8 = 37.6 → 25 (capped)
- Profit: 0.09 × 250 = 22.5
- Consistency: log₁₀(151) × 4 = 8.7

Total: 34 + 25 + 22.5 + 8.7 = 90.2 → 90
```

### Example 2: New Agent

```
Executions: 3
Win Rate: 100%
Volume: $500
Profit: +$25

Score: 50 (neutral - not enough data)
```

### Example 3: Struggling Agent

```
Executions: 80
Win Rate: 45%
Volume: $20,000
Profit: -$1,500 (7.5% loss)

Calculation:
- Win Rate: 0.45 × 40 = 18
- Volume: log₁₀(20001) × 8 = 34.4 → 25
- Profit: 12.5 - (0.075 × 125) = 3.1
- Consistency: log₁₀(81) × 4 = 7.6

Total: 18 + 25 + 3.1 + 7.6 = 53.7 → 54
```

---

## Anti-Gaming Measures

| Attack Vector | Prevention |
|---------------|------------|
| Self-trading | Profit must come from real trades |
| Wash trading | Volume alone only 25% of score |
| New account spam | 5 execution minimum |
| Score manipulation | All data from immutable events |

---

*See also: [Envio Indexer](./02-envio-indexer.md), [A2A Delegation](./06-a2a-delegation.md)*
