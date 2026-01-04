import { useQuery } from "@apollo/client";
import { useAccount } from "wagmi";
import {
  GET_USER_DASHBOARD,
  GET_USER_PERMISSIONS,
  GET_USER_EXECUTIONS,
} from "@/graphql/queries";
import type { User, Permission, Execution } from "@/lib/types";
import { UI } from "@/lib/constants";

// ===========================================
// useUserDashboard Hook
// ===========================================

interface UseUserDashboardResult {
  user: User | null;
  permissions: Permission[];
  executions: Execution[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
  isConnected: boolean;
  address: string | undefined;
}

export function useUserDashboard(userAddress?: string): UseUserDashboardResult {
  const { address: connectedAddress, isConnected } = useAccount();
  const address = userAddress || connectedAddress;

  const { data, loading, error, refetch } = useQuery(GET_USER_DASHBOARD, {
    variables: { userId: address?.toLowerCase() },
    skip: !address,
    pollInterval: UI.SLOW_POLL_INTERVAL,
    notifyOnNetworkStatusChange: false,
  });

  // Extract user, permissions, and executions from Hasura response
  const user = data?.User_by_pk || null;
  const permissions: Permission[] = data?.Permission || [];
  const executions: Execution[] = data?.Execution || [];

  return {
    user,
    permissions,
    executions,
    loading,
    error: error as Error | undefined,
    refetch,
    isConnected,
    address,
  };
}

// ===========================================
// useUserPermissions Hook
// ===========================================

interface UseUserPermissionsOptions {
  /** Only fetch active permissions */
  activeOnly?: boolean;
  /** Polling interval */
  pollInterval?: number;
}

interface UseUserPermissionsResult {
  permissions: Permission[];
  activeCount: number;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
  isConnected: boolean;
}

export function useUserPermissions(
  options: UseUserPermissionsOptions = {}
): UseUserPermissionsResult {
  const { pollInterval = UI.POLL_INTERVAL } = options;
  const { address, isConnected } = useAccount();

  const { data, loading, error, refetch } = useQuery(GET_USER_PERMISSIONS, {
    variables: { userId: address?.toLowerCase() },
    skip: !address,
    pollInterval,
    notifyOnNetworkStatusChange: false,
  });

  const user = data?.User_by_pk;
  const permissions: Permission[] = data?.Permission || [];
  const activeCount = parseInt(user?.activePermissions || "0");

  return {
    permissions,
    activeCount,
    loading,
    error: error as Error | undefined,
    refetch,
    isConnected,
  };
}

// ===========================================
// useUserExecutions Hook
// ===========================================

interface UseUserExecutionsOptions {
  /** Number of executions per page */
  pageSize?: number;
  /** Current page (0-indexed) */
  page?: number;
  /** Polling interval */
  pollInterval?: number;
}

interface UseUserExecutionsResult {
  executions: Execution[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
  hasMore: boolean;
  isConnected: boolean;
}

export function useUserExecutions(
  options: UseUserExecutionsOptions = {}
): UseUserExecutionsResult {
  const {
    pageSize = UI.EXECUTIONS_PAGE_SIZE,
    page = 0,
    pollInterval = UI.POLL_INTERVAL,
  } = options;

  const { address, isConnected } = useAccount();

  const { data, loading, error, refetch } = useQuery(GET_USER_EXECUTIONS, {
    variables: {
      userId: address?.toLowerCase(),
      first: pageSize + 1,
      skip: page * pageSize,
    },
    skip: !address,
    pollInterval,
    notifyOnNetworkStatusChange: false,
  });

  const allExecutions: Execution[] = data?.Execution || [];
  const hasMore = allExecutions.length > pageSize;
  const executions = hasMore ? allExecutions.slice(0, pageSize) : allExecutions;

  return {
    executions,
    loading,
    error: error as Error | undefined,
    refetch,
    hasMore,
    isConnected,
  };
}

// ===========================================
// useUserStats Hook
// ===========================================

interface UserStats {
  totalDelegated: string;
  currentDelegated: string;
  activePermissions: number;
  totalProfit: string;
}

interface UseUserStatsResult {
  stats: UserStats | null;
  loading: boolean;
  isConnected: boolean;
}

export function useUserStats(): UseUserStatsResult {
  const { user, loading, isConnected } = useUserDashboard();

  if (!user) {
    return {
      stats: null,
      loading,
      isConnected,
    };
  }

  return {
    stats: {
      totalDelegated: user.totalDelegated,
      currentDelegated: user.currentDelegated,
      activePermissions: parseInt(user.activePermissions),
      totalProfit: user.totalProfitFromAgents,
    },
    loading,
    isConnected,
  };
}

// ===========================================
// useIsWalletConnected Hook
// ===========================================

export function useIsWalletConnected(): boolean {
  const { isConnected } = useAccount();
  return isConnected;
}

// ===========================================
// useWalletAddress Hook
// ===========================================

export function useWalletAddress(): string | undefined {
  const { address } = useAccount();
  return address;
}
