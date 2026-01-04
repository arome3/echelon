"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import type { Permission } from "@/lib/types";
import { FUND_MANAGER } from "@/lib/constants";

// ===========================================
// Local Storage Key
// ===========================================

const PERMISSIONS_STORAGE_KEY = "echelon_permissions";

// ===========================================
// Types
// ===========================================

export interface StoredPermission {
  id: string;
  userAddress: string;
  agentAddress: string;
  agentName: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  periodDuration: number;
  grantedAt: number;
  expiresAt: number;
  // Agent's numeric ID from the indexer (e.g., "1", "2", "3")
  // This is different from agentAddress which is the wallet address
  agentId?: string;
  // Optional agent metadata (added for display purposes)
  agentReputationScore?: number;
  agentStrategyType?: string;
  agentIsVerified?: boolean;
  // Reputation-gated permission fields
  isReputationGated?: boolean;
  baseAmount?: string;
  maxAmount?: string;
  minReputationScore?: number;
  maxStaleness?: number;
  encodedTerms?: string;
}

interface WalletPermission {
  /** Permission context (chain, account, etc.) */
  context: string;
  /** The signer/agent address that has permission */
  signer: {
    type: string;
    data: {
      address: string;
    };
  };
  /** Permission details */
  permission: {
    type: string;
    data: {
      tokenAddress: string;
      periodAmount: string;
      periodDuration: number;
      justification?: string;
    };
  };
  /** Expiry timestamp */
  expiry: number;
  /** Whether adjustments are allowed */
  isAdjustmentAllowed: boolean;
}

export interface UseWalletPermissionsReturn {
  /** Permissions fetched from wallet/localStorage */
  permissions: Permission[];
  /** Raw wallet permissions */
  rawPermissions: WalletPermission[];
  /** Whether permissions are loading */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch permissions */
  refetch: () => Promise<void>;
}

// ===========================================
// localStorage Helper Functions
// ===========================================

export function savePermissionToStorage(permission: StoredPermission): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getPermissionsFromStorage();
    // Remove any existing permission for the same agent from same user
    const filtered = existing.filter(
      (p) =>
        !(
          p.userAddress.toLowerCase() === permission.userAddress.toLowerCase() &&
          p.agentAddress.toLowerCase() === permission.agentAddress.toLowerCase()
        )
    );
    filtered.push(permission);
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to save permission to localStorage:", err);
  }
}

export function getPermissionsFromStorage(): StoredPermission[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as StoredPermission[];
  } catch (err) {
    console.error("Failed to read permissions from localStorage:", err);
    return [];
  }
}

export function removePermissionFromStorage(permissionId: string): void;
export function removePermissionFromStorage(userAddress: string, agentAddress: string): void;
export function removePermissionFromStorage(
  userAddressOrPermissionId: string,
  agentAddress?: string
): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getPermissionsFromStorage();
    let filtered: StoredPermission[];

    if (agentAddress) {
      // Remove by user + agent address
      filtered = existing.filter(
        (p) =>
          !(
            p.userAddress.toLowerCase() === userAddressOrPermissionId.toLowerCase() &&
            p.agentAddress.toLowerCase() === agentAddress.toLowerCase()
          )
      );
    } else {
      // Remove by permission ID
      filtered = existing.filter((p) => p.id !== userAddressOrPermissionId);
    }

    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to remove permission from localStorage:", err);
  }
}

export function clearExpiredPermissions(): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getPermissionsFromStorage();
    const now = Math.floor(Date.now() / 1000);
    const valid = existing.filter((p) => p.expiresAt > now);
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(valid));
  } catch (err) {
    console.error("Failed to clear expired permissions:", err);
  }
}

// ===========================================
// Hook Implementation
// ===========================================

/**
 * Hook to fetch ERC-7715 permissions from localStorage and MetaMask Flask.
 * localStorage is the primary source for hackathon demo reliability.
 */
export function useWalletPermissions(): UseWalletPermissionsReturn {
  const { address, isConnected } = useAccount();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rawPermissions, setRawPermissions] = useState<WalletPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!isConnected || !address) {
      setPermissions([]);
      setRawPermissions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Clear expired permissions first
      clearExpiredPermissions();

      // Get permissions from localStorage
      const storedPermissions = getPermissionsFromStorage();
      const userPermissions = storedPermissions.filter(
        (p) => p.userAddress.toLowerCase() === address.toLowerCase()
      );

      console.log("Stored permissions for user:", userPermissions);
      console.log("FUND_MANAGER.ADDRESS:", FUND_MANAGER.ADDRESS);

      // Convert stored permissions to Permission format
      const now = Math.floor(Date.now() / 1000);
      const convertedPermissions: Permission[] = userPermissions.map((p) => {
        const isActive = p.expiresAt > now;

        // Check if this is a known agent (e.g., Fund Manager) and enrich with stored data
        const isFundManager = p.agentAddress.toLowerCase() === FUND_MANAGER.ADDRESS.toLowerCase();

        // Get agent metadata - use stored values, fallback to known agent data, then defaults
        // Check for truthy agentName (handles empty string case)
        const agentName = (p.agentName && p.agentName.trim())
          ? p.agentName
          : (isFundManager ? FUND_MANAGER.NAME : `Agent ${p.agentAddress.slice(0, 6)}...${p.agentAddress.slice(-4)}`);
        const agentReputationScore = p.agentReputationScore ?? (isFundManager ? 75 : 50);
        const agentStrategyType = p.agentStrategyType || (isFundManager ? FUND_MANAGER.STRATEGY : "Unknown");
        const agentIsVerified = p.agentIsVerified ?? isFundManager;

        // Use stored agentId if available, fallback to Fund Manager ID if applicable,
        // otherwise use wallet address (links won't work but display will)
        const agentId = p.agentId || (isFundManager ? FUND_MANAGER.ID : p.agentAddress.toLowerCase());

        return {
          id: p.id,
          user: { id: p.userAddress.toLowerCase() } as any,
          agent: {
            id: agentId,
            name: agentName,
            walletAddress: p.agentAddress,
            reputationScore: agentReputationScore,
            strategyType: agentStrategyType,
            isVerified: agentIsVerified,
          } as any,
          agentAddress: p.agentAddress.toLowerCase(), // Add for consistent key matching with indexed permissions
          permissionType: "erc20-token-periodic",
          tokenAddress: p.tokenAddress,
          tokenSymbol: p.tokenSymbol,
          amountPerPeriod: p.amount,
          periodDuration: p.periodDuration.toString(),
          totalAmount: p.amount,
          grantedAt: p.grantedAt.toString(),
          expiresAt: p.expiresAt.toString(),
          revokedAt: null,
          isActive,
          amountUsed: "0",
          amountRemaining: p.amount,
          periodsElapsed: "0",
          grantTxHash: "",
          revokeTxHash: null,
        } as unknown as Permission;
      });

      setPermissions(convertedPermissions);

      // Also try to query MetaMask Flask (optional, may not work)
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const result = await window.ethereum.request({
            method: "wallet_getPermissions",
            params: [],
          });
          console.log("Wallet permissions response:", result);
          if (Array.isArray(result)) {
            setRawPermissions(result as WalletPermission[]);
          }
        } catch (walletErr) {
          // Wallet query failed, but we have localStorage - that's fine
          console.log("Wallet permissions query failed (using localStorage):", walletErr);
        }
      }
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch permissions"));
    } finally {
      setLoading(false);
    }
  }, [isConnected, address]);

  // Fetch on mount and when account changes
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Listen for storage events (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PERMISSIONS_STORAGE_KEY) {
        fetchPermissions();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fetchPermissions]);

  return {
    permissions,
    rawPermissions,
    loading,
    error,
    refetch: fetchPermissions,
  };
}

// ===========================================
// Helper to check if Flask supports permission queries
// ===========================================

export async function checkFlaskPermissionSupport(): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    return false;
  }

  try {
    await window.ethereum.request({
      method: "wallet_getPermissions",
      params: [],
    });
    return true;
  } catch {
    return false;
  }
}
