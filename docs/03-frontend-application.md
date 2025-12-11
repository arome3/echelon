# 03 - Frontend Application

## Overview

The Echelon frontend is a Next.js 14 application that provides the user interface for browsing agents, viewing leaderboards, granting permissions, and monitoring agent activity. It connects to the Envio GraphQL API for data and uses wagmi/viem for blockchain interactions.

---

## Technical Specifications

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND APPLICATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                    Next.js App Router                 │ │
│  │                                                        │ │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────┐ │ │
│  │  │  Home  │  │ Agent  │  │ Dash-  │  │  Delegate  │ │ │
│  │  │  Page  │  │ Detail │  │ board  │  │    Page    │ │ │
│  │  └────────┘  └────────┘  └────────┘  └────────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
│                              │                             │
│  ┌───────────────────────────┼───────────────────────────┐ │
│  │                   Components Layer                     │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐           │ │
│  │  │ Leaderboard│ │ Permission│ │ Activity  │           │ │
│  │  │           │ │   Grant   │ │   Feed    │           │ │
│  │  └───────────┘ └───────────┘ └───────────┘           │ │
│  └───────────────────────────────────────────────────────┘ │
│                              │                             │
│  ┌───────────────────────────┼───────────────────────────┐ │
│  │                     Hooks Layer                        │ │
│  │  useAgents │ usePermissions │ useExecutions │ useDelegation │
│  └───────────────────────────────────────────────────────┘ │
│                              │                             │
│  ┌───────────────────────────┼───────────────────────────┐ │
│  │                      Data Layer                        │ │
│  │      Apollo Client (GraphQL)  │  wagmi/viem (Web3)    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 14.x |
| React | React | 18.x |
| Styling | Tailwind CSS | 3.x |
| GraphQL | Apollo Client | ^3.8.0 |
| Web3 | wagmi | ^2.0.0 |
| Web3 Core | viem | ^2.0.0 |
| MetaMask SDK | @metamask/delegation-toolkit | Latest |
| Smart Accounts | @metamask/smart-accounts-kit | Latest |
| Icons | lucide-react | Latest |
| Charts | recharts | Latest |
| Tree Viz | react-d3-tree | Latest |

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| Agent Leaderboard | Real-time ranked list of agents by reputation |
| Agent Details | Full performance history and metrics |
| Permission Granting | ERC-7715 permission UI with MetaMask |
| User Dashboard | Monitor active permissions and profits |
| Activity Feed | Real-time execution tracking |
| Delegation Tree | Visualize A2A redelegations |

---

## Implementation Guide

### 1. Application Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | Leaderboard + featured agents |
| `/agents/[id]` | `AgentDetailPage` | Single agent details |
| `/dashboard` | `DashboardPage` | User's permissions and activity |
| `/delegate` | `DelegatePage` | Grant new permission flow |

### 2. Project Structure

```
packages/frontend/
├── app/
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Home page (leaderboard)
│   ├── agents/
│   │   └── [id]/
│   │       └── page.tsx     # Agent detail page
│   ├── dashboard/
│   │   └── page.tsx         # User dashboard
│   └── api/
│       └── health/
│           └── route.ts     # Health check endpoint
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   ├── agents/
│   │   ├── Leaderboard.tsx
│   │   ├── AgentCard.tsx
│   │   ├── AgentDetails.tsx
│   │   └── AgentStats.tsx
│   ├── permissions/
│   │   ├── GrantPermission.tsx
│   │   ├── PermissionList.tsx
│   │   └── RevokeButton.tsx
│   ├── delegation/
│   │   ├── DelegationTree.tsx
│   │   └── A2AFlow.tsx
│   ├── activity/
│   │   ├── ActivityFeed.tsx
│   │   └── ExecutionCard.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── Table.tsx
│       └── Toast.tsx
├── hooks/
│   ├── useAgents.ts
│   ├── usePermissions.ts
│   ├── useExecutions.ts
│   └── useDelegation.ts
├── lib/
│   ├── apollo-client.ts
│   ├── wagmi-config.ts
│   ├── constants.ts
│   ├── utils.ts
│   └── types.ts
├── graphql/
│   ├── queries.ts
│   └── fragments.ts
├── styles/
│   └── globals.css
├── next.config.js
├── tailwind.config.js
└── package.json
```

### 3. Root Layout with Providers

```typescript
// app/layout.tsx
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Header />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

// app/providers.tsx
"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client";
import { config } from "@/lib/wagmi-config";
import { apolloClient } from "@/lib/apollo-client";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          {children}
        </ApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 4. Wagmi Configuration

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

### 5. Apollo Client Configuration

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

### 6. Leaderboard Component

```typescript
// components/agents/Leaderboard.tsx
"use client";

import { useQuery } from "@apollo/client";
import { Trophy, TrendingUp } from "lucide-react";
import { GET_LEADERBOARD } from "@/graphql/queries";
import { AgentCard } from "./AgentCard";

export function Leaderboard() {
  const { data, loading, error } = useQuery(GET_LEADERBOARD, {
    variables: { first: 10 },
    pollInterval: 10000, // Real-time updates every 10s
  });

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="text-yellow-500" />
        Agent Leaderboard
      </h2>

      <div className="space-y-4">
        {data?.agents.map((agent: any, index: number) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agent, rank }: { agent: any; rank: number }) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <span className="text-2xl">{getRankBadge(rank)}</span>
        <div>
          <h3 className="font-semibold">{agent.name}</h3>
          <span className="text-sm text-gray-500">{agent.strategyType}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {(parseFloat(agent.winRate) * 100).toFixed(1)}%
          </div>
          <span className="text-sm text-gray-500">Win Rate</span>
        </div>

        <div className="text-right">
          <div className="font-bold text-lg">
            {agent.reputationScore}/100
          </div>
          <span className="text-sm text-gray-500">Score</span>
        </div>

        <a
          href={`/agents/${agent.id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View
        </a>
      </div>
    </div>
  );
}
```

### 7. Custom Hooks

```typescript
// hooks/useAgents.ts
import { useQuery } from "@apollo/client";
import { GET_LEADERBOARD, GET_AGENT_DETAILS } from "@/graphql/queries";

interface UseLeaderboardOptions {
  limit?: number;
  strategyType?: string;
  pollInterval?: number;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const { limit = 10, strategyType, pollInterval = 10000 } = options;

  const { data, loading, error, refetch } = useQuery(GET_LEADERBOARD, {
    variables: {
      first: limit,
      strategyType: strategyType || undefined,
    },
    pollInterval,
  });

  const agents = data?.agents || [];
  const rankedAgents = agents.map((agent: any, index: number) => ({
    ...agent,
    rank: index + 1,
  }));

  return { agents: rankedAgents, loading, error, refetch };
}

export function useAgentDetails(agentId: string) {
  const { data, loading, error, refetch } = useQuery(GET_AGENT_DETAILS, {
    variables: { agentId },
    skip: !agentId,
    pollInterval: 5000,
  });

  return { agent: data?.agent, loading, error, refetch };
}
```

### 8. Type Definitions

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
  totalExecutions: bigint;
  successfulExecutions: bigint;
  failedExecutions: bigint;
  winRate: string;
  totalProfitLoss: string;
  reputationScore: number;
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
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@apollo/client": "^3.8.0",
    "graphql": "^16.8.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@metamask/delegation-toolkit": "latest",
    "@metamask/smart-accounts-kit": "latest",
    "lucide-react": "^0.300.0",
    "recharts": "^2.10.0",
    "react-d3-tree": "^3.6.0",
    "sonner": "^1.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0"
  }
}
```

---

## Environment Variables

```bash
# Required for frontend
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_EXECUTION_ADDRESS=0x...
NEXT_PUBLIC_ENVIO_GRAPHQL_URL=https://...
NEXT_PUBLIC_PIMLICO_API_KEY=your_key
NEXT_PUBLIC_WALLETCONNECT_ID=your_project_id
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

---

*See also: [Permission System](./04-permission-system.md), [User Dashboard](./09-user-dashboard.md)*
