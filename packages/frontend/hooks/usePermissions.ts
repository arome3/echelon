import { useQuery } from "@apollo/client";
import { useAccount } from "wagmi";
import { GET_PERMISSION, GET_AGENT_PERMISSIONS } from "@/graphql/queries";
import type { Permission, Agent } from "@/lib/types";
import { UI } from "@/lib/constants";

// ===========================================
// usePermission Hook (Single)
// ===========================================

interface UsePermissionResult {
  permission: Permission | null;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function usePermission(permissionId: string): UsePermissionResult {
  const { data, loading, error, refetch } = useQuery(GET_PERMISSION, {
    variables: { permissionId },
    skip: !permissionId,
    pollInterval: UI.POLL_INTERVAL,
  });

  return {
    permission: data?.Permission_by_pk || null,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// useAgentPermissions Hook
// ===========================================

interface UseAgentPermissionsOptions {
  /** Only fetch active permissions */
  activeOnly?: boolean;
  /** Maximum number to fetch */
  limit?: number;
}

interface UseAgentPermissionsResult {
  permissions: Permission[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useAgentPermissions(
  agentId: string,
  options: UseAgentPermissionsOptions = {}
): UseAgentPermissionsResult {
  const { activeOnly = false, limit = 20 } = options;

  const { data, loading, error, refetch } = useQuery(GET_AGENT_PERMISSIONS, {
    variables: {
      agentId,
      first: limit,
      activeOnly: activeOnly || undefined,
    },
    skip: !agentId,
    pollInterval: UI.POLL_INTERVAL,
  });

  return {
    permissions: data?.Permission || [],
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ===========================================
// Permission Status Helpers
// ===========================================

export interface PermissionStatus {
  isActive: boolean;
  isExpired: boolean;
  isRevoked: boolean;
  remainingTime: number; // in seconds
  usagePercent: number;
  statusLabel: "Active" | "Expired" | "Revoked" | "Exhausted";
}

export function getPermissionStatus(permission: Permission): PermissionStatus {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = parseInt(permission.expiresAt);
  const isExpired = now > expiresAt;
  const isRevoked = !!permission.revokedAt;

  // Calculate usage percentage
  const totalAmount = parseFloat(permission.totalAmount);
  const amountUsed = parseFloat(permission.amountUsed);
  const usagePercent = totalAmount > 0 ? (amountUsed / totalAmount) * 100 : 0;
  const isExhausted = usagePercent >= 100;

  // Determine status
  let statusLabel: PermissionStatus["statusLabel"];
  if (isRevoked) {
    statusLabel = "Revoked";
  } else if (isExpired) {
    statusLabel = "Expired";
  } else if (isExhausted) {
    statusLabel = "Exhausted";
  } else {
    statusLabel = "Active";
  }

  return {
    isActive: permission.isActive && !isExpired && !isRevoked && !isExhausted,
    isExpired,
    isRevoked,
    remainingTime: Math.max(0, expiresAt - now),
    usagePercent,
    statusLabel,
  };
}

// ===========================================
// Permission Time Helpers
// ===========================================

export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "Expired";

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

// ===========================================
// useMyPermissionForAgent Hook
// ===========================================

interface UseMyPermissionForAgentResult {
  permission: Permission | null;
  hasActivePermission: boolean;
  loading: boolean;
  isConnected: boolean;
  refetch: () => void;
}

export function useMyPermissionForAgent(
  agentId: string
): UseMyPermissionForAgentResult {
  const { address, isConnected } = useAccount();

  const { data, loading, refetch } = useQuery(GET_AGENT_PERMISSIONS, {
    variables: {
      agentId,
      first: 100,
      activeOnly: true,
    },
    skip: !agentId || !address,
  });

  // Find permission granted by current user
  const permissions: Permission[] = data?.Permission || [];
  const myPermission = permissions.find(
    (p) => p.user?.id?.toLowerCase() === address?.toLowerCase()
  );

  return {
    permission: myPermission || null,
    hasActivePermission: !!myPermission,
    loading,
    isConnected,
    refetch,
  };
}
