# 04 - Permission System

## Overview

The permission system is the core of Echelon's trust model, built on ERC-7715 (Grant Permissions Standard). It enables users to grant time-bound, amount-limited spending permissions to AI agents without giving full wallet access. Users maintain full control and can revoke permissions instantly.

---

## Technical Specifications

### Permission Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ERC-7715      ┌──────────────────┐       │
│  │   USER   │ ──────────────►  │     AGENT        │       │
│  │          │                   │                  │       │
│  │  Wallet  │ ◄──────────────  │ 10 USDC/day     │       │
│  │          │   Executions     │ for 7 days       │       │
│  └──────────┘                   └──────────────────┘       │
│       │                                │                    │
│       │ Instant Revoke                 │ Execute           │
│       ▼                                ▼                    │
│  ┌──────────┐                   ┌──────────────────┐       │
│  │ MetaMask │                   │  DeFi Protocol   │       │
│  │   Kit    │                   │  (Uniswap, etc)  │       │
│  └──────────┘                   └──────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Permission Types

| Type | Description |
|------|-------------|
| `erc20-token-periodic` | Spend X tokens per time period |
| `native-token-periodic` | Spend X ETH per time period |
| `execution` | General execution permission |

### Permission Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `chainId` | number | Target chain (11155111 for Sepolia) |
| `expiry` | number | Unix timestamp when permission expires |
| `signer` | object | Agent wallet address |
| `periodAmount` | bigint | Maximum amount per period |
| `periodDuration` | number | Period length in seconds |
| `tokenAddress` | address | ERC-20 token address |

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| Granular Control | Set exact amounts and time limits |
| Periodic Limits | Daily, weekly, or custom period caps |
| Instant Revocation | Revoke permissions at any time |
| Token-Specific | Permit specific tokens only |
| Chain-Specific | Permissions are chain-bound |
| Transparent | All permissions visible on-chain |

---

## Implementation Guide

### 1. Grant Permission Hook

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
      // Extend wallet client with ERC-7715 actions
      const extendedClient = walletClient.extend(erc7715ProviderActions());

      const currentTime = Math.floor(Date.now() / 1000);
      const expiry = currentTime + params.totalDuration;

      const decimals = params.tokenDecimals || 6; // Default USDC

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

### 2. Grant Permission Component

```typescript
// components/permissions/GrantPermission.tsx
"use client";

import { useState } from "react";
import { useGrantPermission } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface GrantPermissionProps {
  agentId: string;
  agentAddress: string;
  agentName: string;
}

const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const DAY_IN_SECONDS = 86400;

export function GrantPermission({
  agentId,
  agentAddress,
  agentName
}: GrantPermissionProps) {
  const [amount, setAmount] = useState("10");
  const [duration, setDuration] = useState("7"); // days
  const { grantPermission, isGranting, error } = useGrantPermission();

  const handleGrant = async () => {
    try {
      await grantPermission({
        agentAddress,
        tokenAddress: USDC_ADDRESS,
        amountPerPeriod: amount,
        periodDuration: DAY_IN_SECONDS,
        totalDuration: parseInt(duration) * DAY_IN_SECONDS,
        tokenDecimals: 6,
      });

      toast.success(`Permission granted to ${agentName}`);
    } catch (err) {
      toast.error("Failed to grant permission");
    }
  };

  const totalAmount = parseInt(amount) * parseInt(duration);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
      <h3 className="text-xl font-bold mb-4">
        Grant Permission to {agentName}
      </h3>

      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount per Day (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            min="1"
            max="1000"
          />
        </div>

        {/* Duration Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (Days)
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">1 Day (Trial)</option>
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Permission Summary</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>Agent: <strong>{agentName}</strong></li>
            <li>Daily Limit: <strong>{amount} USDC</strong></li>
            <li>Duration: <strong>{duration} days</strong></li>
            <li>Maximum Total: <strong>{totalAmount} USDC</strong></li>
          </ul>
        </div>

        {/* Grant Button */}
        <button
          onClick={handleGrant}
          disabled={isGranting}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isGranting ? "Granting..." : "Grant Permission"}
        </button>

        {/* Revoke Notice */}
        <p className="text-xs text-gray-500 text-center">
          You can revoke this permission at any time from your dashboard
        </p>

        {/* Error Display */}
        {error && (
          <p className="text-sm text-red-600 text-center">{error.message}</p>
        )}
      </div>
    </div>
  );
}
```

### 3. Permission List Component

```typescript
// components/permissions/PermissionList.tsx
"use client";

import { useQuery } from "@apollo/client";
import { useAccount } from "wagmi";
import { GET_USER_ACTIVE_PERMISSIONS } from "@/graphql/queries";
import { RevokeButton } from "./RevokeButton";
import { formatDistance } from "date-fns";

export function PermissionList() {
  const { address } = useAccount();

  const { data, loading, error } = useQuery(GET_USER_ACTIVE_PERMISSIONS, {
    variables: { userId: address?.toLowerCase() },
    skip: !address,
    pollInterval: 10000,
  });

  if (!address) {
    return <p>Connect wallet to view permissions</p>;
  }

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  const permissions = data?.user?.permissions || [];

  if (permissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No active permissions. Grant permission to an agent to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Active Permissions</h3>

      {permissions.map((permission: any) => (
        <PermissionCard key={permission.id} permission={permission} />
      ))}
    </div>
  );
}

function PermissionCard({ permission }: { permission: any }) {
  const expiresAt = new Date(Number(permission.expiresAt) * 1000);
  const timeRemaining = formatDistance(expiresAt, new Date(), { addSuffix: true });

  const usedPercent = (
    (parseFloat(permission.amountUsed) /
      parseFloat(permission.amountPerPeriod)) *
    100
  ).toFixed(1);

  return (
    <div className="border rounded-lg p-4 flex justify-between items-center">
      <div>
        <h4 className="font-medium">{permission.agent.name}</h4>
        <p className="text-sm text-gray-500">
          {permission.amountPerPeriod} USDC/day
        </p>
        <p className="text-sm text-gray-500">
          Expires {timeRemaining}
        </p>
      </div>

      <div className="text-right">
        <div className="mb-2">
          <span className="text-sm text-gray-500">Used: </span>
          <span className="font-medium">{usedPercent}%</span>
        </div>
        <RevokeButton permissionId={permission.id} />
      </div>
    </div>
  );
}
```

### 4. Revoke Permission

```typescript
// components/permissions/RevokeButton.tsx
"use client";

import { useState } from "react";
import { useWalletClient } from "wagmi";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { toast } from "sonner";

interface RevokeButtonProps {
  permissionId: string;
  onRevoke?: () => void;
}

export function RevokeButton({ permissionId, onRevoke }: RevokeButtonProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const { data: walletClient } = useWalletClient();

  const handleRevoke = async () => {
    if (!walletClient) {
      toast.error("Wallet not connected");
      return;
    }

    setIsRevoking(true);

    try {
      const extendedClient = walletClient.extend(erc7715ProviderActions());

      await extendedClient.revokePermissions({
        permissionId,
      });

      toast.success("Permission revoked successfully");
      onRevoke?.();
    } catch (error) {
      toast.error("Failed to revoke permission");
      console.error(error);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <button
      onClick={handleRevoke}
      disabled={isRevoking}
      className="px-3 py-1 text-sm text-red-600 border border-red-600
                 rounded hover:bg-red-50 disabled:opacity-50"
    >
      {isRevoking ? "Revoking..." : "Revoke"}
    </button>
  );
}
```

### 5. Permission Duration Options

| Duration | Use Case |
|----------|----------|
| 1 Day | Trial period for new agents |
| 7 Days | Standard short-term delegation |
| 14 Days | Medium-term strategy execution |
| 30 Days | Long-term DCA or yield strategies |

### 6. Recommended Amount Limits

| Strategy Type | Recommended Daily Limit |
|---------------|------------------------|
| DCA | 10-50 USDC |
| Arbitrage | 50-200 USDC |
| Yield | 100-500 USDC |
| Momentum | 25-100 USDC |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| @metamask/smart-accounts-kit | ERC-7715 permission actions |
| @metamask/delegation-toolkit | Delegation framework |
| wagmi | Wallet connection |
| viem | Transaction building |

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| Over-delegation | UI enforces reasonable limits |
| Forgot to revoke | Show expiration prominently |
| Agent misbehavior | Reputation system warns users |
| Token drain | Period limits cap exposure |

---

## Permission Lifecycle

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   GRANT    │────►│   ACTIVE   │────►│  EXPIRED   │
└────────────┘     └────────────┘     └────────────┘
                          │
                          │ Revoke
                          ▼
                   ┌────────────┐
                   │  REVOKED   │
                   └────────────┘
```

---

*See also: [Smart Contracts](./01-smart-contracts.md), [User Dashboard](./09-user-dashboard.md)*
