# 09 - User Dashboard

## Overview

The user dashboard provides a centralized view for users to manage their agent delegations, monitor active permissions, track performance, and view execution history. It serves as the control center for all user-agent interactions.

---

## Technical Specifications

### Dashboard Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER DASHBOARD                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │               SUMMARY CARDS                          │  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐           │  │
│  │  │Active│  │ Total│  │Total │  │ Net  │           │  │
│  │  │Perms │  │ Del  │  │Trades│  │Profit│           │  │
│  │  │  3   │  │$500  │  │  45  │  │+$32  │           │  │
│  │  └──────┘  └──────┘  └──────┘  └──────┘           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐ │
│  │ ACTIVE PERMISSIONS  │  │     ACTIVITY FEED           │ │
│  │                     │  │                             │ │
│  │ Agent Alpha  [Rev]  │  │ Agent Alpha swapped...     │ │
│  │ 10 USDC/day         │  │ +$2.50  2 min ago          │ │
│  │ Expires: 5 days     │  │                             │ │
│  │                     │  │ Agent Beta executed...      │ │
│  │ Agent Beta   [Rev]  │  │ -$0.80  15 min ago         │ │
│  │ 25 USDC/day         │  │                             │ │
│  │ Expires: 12 days    │  │ Agent Alpha swapped...     │ │
│  │                     │  │ +$1.20  1 hour ago          │ │
│  └─────────────────────┘  └─────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              PERFORMANCE CHART                       │  │
│  │                                                       │  │
│  │      ^                                               │  │
│  │      |     ___/\___                                  │  │
│  │      |   _/        \_  /\                           │  │
│  │      | _/            \/  \___                       │  │
│  │      +─────────────────────────>                    │  │
│  │        7d    6d    5d   4d   3d   2d   1d   Today   │  │
│  │                                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Route

| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard` | `DashboardPage` | User's main control center |

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| Permission Overview | View all active and past permissions |
| Quick Revoke | One-click permission revocation |
| Activity Feed | Real-time execution monitoring |
| Performance Tracking | Chart profit/loss over time |
| Summary Statistics | Key metrics at a glance |
| Agent Quick Access | Direct links to delegated agents |

---

## Implementation Guide

### 1. Dashboard Page

```typescript
// app/dashboard/page.tsx
"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@apollo/client";
import { GET_USER_DASHBOARD } from "@/graphql/queries";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PermissionList } from "@/components/permissions/PermissionList";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { ConnectPrompt } from "@/components/ui/ConnectPrompt";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data, loading, error } = useQuery(GET_USER_DASHBOARD, {
    variables: { userId: address?.toLowerCase() },
    skip: !address,
    pollInterval: 10000,
  });

  if (!isConnected) {
    return <ConnectPrompt />;
  }

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorDisplay error={error} />;

  const user = data?.user;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>

      {/* Summary Statistics */}
      <SummaryCards user={user} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Active Permissions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Active Permissions</h2>
          <PermissionList permissions={user?.permissions} />
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <ActivityFeed executions={user?.executions} />
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Performance History</h2>
        <PerformanceChart executions={user?.executions} />
      </div>
    </div>
  );
}
```

### 2. Summary Cards Component

```typescript
// components/dashboard/SummaryCards.tsx
"use client";

import { Wallet, Activity, TrendingUp, DollarSign } from "lucide-react";

interface SummaryCardsProps {
  user: {
    activePermissions: string;
    totalDelegated: string;
    executions: any[];
    totalProfitFromAgents: string;
  } | null;
}

export function SummaryCards({ user }: SummaryCardsProps) {
  const stats = [
    {
      label: "Active Permissions",
      value: user?.activePermissions || "0",
      icon: Wallet,
      color: "bg-blue-500",
    },
    {
      label: "Total Delegated",
      value: `$${formatNumber(user?.totalDelegated || "0")}`,
      icon: DollarSign,
      color: "bg-green-500",
    },
    {
      label: "Total Executions",
      value: user?.executions?.length || "0",
      icon: Activity,
      color: "bg-purple-500",
    },
    {
      label: "Net Profit",
      value: formatProfit(user?.totalProfitFromAgents || "0"),
      icon: TrendingUp,
      color: parseFloat(user?.totalProfitFromAgents || "0") >= 0
        ? "bg-green-500"
        : "bg-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4"
        >
          <div className={`${stat.color} p-3 rounded-lg`}>
            <stat.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatNumber(value: string): string {
  const num = parseFloat(value) / 1e6; // Assuming 6 decimals (USDC)
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatProfit(value: string): string {
  const num = parseFloat(value) / 1e6;
  const sign = num >= 0 ? "+" : "";
  return `${sign}$${Math.abs(num).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}
```

### 3. Activity Feed Component

```typescript
// components/activity/ActivityFeed.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Execution {
  id: string;
  agent: { name: string };
  amountIn: string;
  amountOut: string;
  profitLoss: string;
  result: "PENDING" | "SUCCESS" | "FAILURE";
  startedAt: string;
  completedAt?: string;
  startTxHash: string;
}

interface ActivityFeedProps {
  executions: Execution[];
}

export function ActivityFeed({ executions }: ActivityFeedProps) {
  if (!executions?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No activity yet. Grant permission to an agent to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {executions.map((execution) => (
        <ExecutionCard key={execution.id} execution={execution} />
      ))}
    </div>
  );
}

function ExecutionCard({ execution }: { execution: Execution }) {
  const statusIcon = {
    PENDING: <Clock className="w-5 h-5 text-yellow-500" />,
    SUCCESS: <CheckCircle className="w-5 h-5 text-green-500" />,
    FAILURE: <XCircle className="w-5 h-5 text-red-500" />,
  };

  const profitLoss = parseFloat(execution.profitLoss) / 1e6;
  const isProfit = profitLoss >= 0;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {statusIcon[execution.result]}
        <div>
          <p className="font-medium">{execution.agent.name}</p>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(
              new Date(Number(execution.startedAt) * 1000),
              { addSuffix: true }
            )}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p
          className={`font-semibold ${
            isProfit ? "text-green-600" : "text-red-600"
          }`}
        >
          {isProfit ? "+" : ""}${profitLoss.toFixed(2)}
        </p>
        <a
          href={`https://sepolia.etherscan.io/tx/${execution.startTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          View TX
        </a>
      </div>
    </div>
  );
}
```

### 4. Performance Chart Component

```typescript
// components/dashboard/PerformanceChart.tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface PerformanceChartProps {
  executions: any[];
}

export function PerformanceChart({ executions }: PerformanceChartProps) {
  if (!executions?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        Not enough data to display chart
      </div>
    );
  }

  // Process executions into daily P&L data
  const chartData = processExecutions(executions);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), "MMM d")}
          />
          <YAxis
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]}
            labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
          />
          <Line
            type="monotone"
            dataKey="cumulativePnL"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function processExecutions(executions: any[]) {
  // Group by date and calculate cumulative P&L
  const byDate = new Map<string, number>();

  // Sort by date ascending
  const sorted = [...executions].sort(
    (a, b) => Number(a.startedAt) - Number(b.startedAt)
  );

  let cumulative = 0;

  sorted.forEach((exec) => {
    if (exec.result !== "SUCCESS") return;

    const date = format(
      new Date(Number(exec.startedAt) * 1000),
      "yyyy-MM-dd"
    );
    const pnl = parseFloat(exec.profitLoss) / 1e6;

    cumulative += pnl;
    byDate.set(date, cumulative);
  });

  return Array.from(byDate.entries()).map(([date, cumulativePnL]) => ({
    date,
    cumulativePnL,
  }));
}
```

### 5. GraphQL Query for Dashboard

```typescript
// graphql/queries.ts
export const GET_USER_DASHBOARD = gql`
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
        id
        isActive
        amountPerPeriod
        periodDuration
        grantedAt
        expiresAt
        amountUsed
        amountRemaining
        agent {
          id
          name
          reputationScore
          strategyType
          walletAddress
        }
      }

      executions(
        first: 50
        orderBy: startedAt
        orderDirection: desc
      ) {
        id
        amountIn
        amountOut
        profitLoss
        result
        startedAt
        completedAt
        startTxHash
        agent {
          id
          name
        }
      }
    }
  }
`;
```

---

## Dashboard Features

| Feature | Description |
|---------|-------------|
| Real-time Updates | Polls every 10 seconds |
| Permission Management | View, monitor, and revoke |
| Activity Timeline | Chronological execution history |
| Performance Metrics | Charts and statistics |
| Quick Actions | One-click revocation |
| External Links | Etherscan transaction links |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| recharts | Chart visualization |
| date-fns | Date formatting |
| lucide-react | Icons |
| @apollo/client | Data fetching |
| wagmi | Wallet connection |

---

*See also: [Permission System](./04-permission-system.md), [Frontend Application](./03-frontend-application.md)*
