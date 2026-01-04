"use client";

/**
 * Delegators Component
 *
 * Shows users who have delegated permissions to an agent (Fund Manager).
 * Displays active permissions with amounts and user addresses.
 */

import { useQuery } from "@apollo/client";
import { Users, Wallet, TrendingUp, ExternalLink } from "lucide-react";
import { GET_AGENT_DELEGATORS } from "@/graphql/queries";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, truncateAddress, formatAmount, getExplorerAddressUrl, formatRelativeTime } from "@/lib/utils";
import { UI } from "@/lib/constants";

// ===========================================
// Types
// ===========================================

interface DelegatorsProps {
  agentId: string;
  className?: string;
}

interface DelegatorPermission {
  id: string;
  amountPerPeriod: string;
  periodDuration: string;
  grantedAt: string;
  expiresAt: string;
  tokenSymbol: string;
  user: {
    id: string;
    totalDelegated: string;
    activePermissions: number;
  };
}

// ===========================================
// Delegators Component
// ===========================================

export function Delegators({ agentId, className }: DelegatorsProps) {
  const { data, loading, error } = useQuery(GET_AGENT_DELEGATORS, {
    variables: { agentId, first: 20 },
    skip: !agentId,
    pollInterval: UI.POLL_INTERVAL,
  });

  const permissions: DelegatorPermission[] = data?.Permission || [];

  // Calculate aggregate stats client-side (Envio doesn't support aggregates)
  const totalDelegators = permissions.length;
  const totalAmount = permissions.reduce(
    (sum, p) => sum + parseFloat(p.amountPerPeriod || "0"),
    0
  ).toString();

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-400" />
            Delegators
          </CardTitle>
        </CardHeader>
        <div className="space-y-3 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-400" />
            Delegators
          </CardTitle>
        </CardHeader>
        <div className="p-4 text-center text-red-400">
          Failed to load delegators
        </div>
      </Card>
    );
  }

  // Empty state
  if (permissions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-400" />
            Delegators
          </CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
          <Users className="h-10 w-10 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No Active Delegators</p>
          <p className="text-sm text-slate-500 mt-1">
            No users have delegated to this agent yet
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-400" />
            Delegators
          </span>
          <span className="text-sm font-normal text-slate-400">
            {totalDelegators} active
          </span>
        </CardTitle>
      </CardHeader>

      {/* Summary Stats */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-3">
        <div className="bg-dark-700/50 rounded-lg p-3 border border-primary-400/10">
          <p className="text-xs text-slate-500 mb-1">Total Delegated</p>
          <p className="text-lg font-bold text-primary-300">
            {formatAmount(totalAmount)} USDC
          </p>
        </div>
        <div className="bg-dark-700/50 rounded-lg p-3 border border-primary-400/10">
          <p className="text-xs text-slate-500 mb-1">Per Period</p>
          <p className="text-lg font-bold text-emerald-400">
            {formatAmount(totalAmount)}/day
          </p>
        </div>
      </div>

      {/* Delegator List */}
      <div className="divide-y divide-white/[0.06]">
        {permissions.map((permission) => (
          <DelegatorRow key={permission.id} permission={permission} />
        ))}
      </div>
    </Card>
  );
}

// ===========================================
// Delegator Row Component
// ===========================================

interface DelegatorRowProps {
  permission: DelegatorPermission;
}

function DelegatorRow({ permission }: DelegatorRowProps) {
  const amount = formatAmount(permission.amountPerPeriod);
  const grantedAt = formatRelativeTime(permission.grantedAt);

  return (
    <div className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500/30 to-primary-700/30 rounded-full flex items-center justify-center border border-primary-400/20">
            <Wallet className="w-5 h-5 text-primary-400" />
          </div>

          {/* User Info */}
          <div>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-slate-200">
                {truncateAddress(permission.user.id)}
              </code>
              <a
                href={getExplorerAddressUrl(permission.user.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-primary-400 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Delegated {grantedAt}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          <p className="text-sm font-semibold text-emerald-400">
            {amount} {permission.tokenSymbol}
          </p>
          <p className="text-xs text-slate-500">per period</p>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Compact Delegators Stats (for header)
// ===========================================

interface DelegatorsStatsProps {
  agentId: string;
  className?: string;
}

export function DelegatorsStats({ agentId, className }: DelegatorsStatsProps) {
  const { data, loading } = useQuery(GET_AGENT_DELEGATORS, {
    variables: { agentId, first: 100 },
    skip: !agentId,
    pollInterval: UI.SLOW_POLL_INTERVAL,
  });

  if (loading) {
    return <Skeleton className={cn("h-6 w-24", className)} />;
  }

  const permissions = data?.Permission || [];
  const totalDelegators = permissions.length;
  const totalAmount = permissions.reduce(
    (sum: number, p: any) => sum + parseFloat(p.amountPerPeriod || "0"),
    0
  ).toString();

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex items-center gap-1.5 text-sm">
        <Users className="w-4 h-4 text-primary-400" />
        <span className="text-slate-300 font-medium">{totalDelegators}</span>
        <span className="text-slate-500">delegators</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <span className="text-emerald-400 font-medium">{formatAmount(totalAmount)}</span>
        <span className="text-slate-500">USDC</span>
      </div>
    </div>
  );
}
