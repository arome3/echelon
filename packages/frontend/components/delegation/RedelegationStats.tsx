"use client";

/**
 * RedelegationStats Component
 *
 * Displays A2A delegation statistics for an agent, showing amounts
 * delegated out/in and top child/parent agents.
 */

import Link from "next/link";
import { useRedelegationStats, getScoreColorHex } from "@/hooks/useDelegation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatAmount } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  GitBranch,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

// ===========================================
// Types
// ===========================================

interface RedelegationStatsProps {
  /** Agent ID to get stats for */
  agentId: string;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode (less padding, smaller text) */
  compact?: boolean;
}

// ===========================================
// RedelegationStats Component
// ===========================================

export function RedelegationStats({
  agentId,
  className,
  compact = false,
}: RedelegationStatsProps) {
  const { stats, asParent, asChild, loading, error } = useRedelegationStats(agentId);

  // Loading state
  if (loading) {
    return (
      <Card className={className} padding={compact ? "sm" : "md"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-violet-400" />
            A2A Statistics
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className} padding={compact ? "sm" : "md"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-violet-400" />
            A2A Statistics
          </CardTitle>
        </CardHeader>
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Error loading stats</span>
        </div>
      </Card>
    );
  }

  // Empty state (no delegation activity)
  if (!stats || (stats.childAgentCount === 0 && stats.parentAgentCount === 0)) {
    return (
      <Card className={className} padding={compact ? "sm" : "md"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-violet-400" />
            A2A Statistics
          </CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No delegation activity</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding={compact ? "sm" : "md"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4 text-primary-600" />
          A2A Statistics
        </CardTitle>
      </CardHeader>

      <div className="grid grid-cols-2 gap-4">
        {/* Delegated Out (as Parent) */}
        <StatItem
          icon={<ArrowUpRight className="h-4 w-4" />}
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
          label="Delegated Out"
          value={formatAmount(stats.totalDelegatedOut.toString()) + " USDC"}
          subtext={`to ${stats.childAgentCount} specialist${stats.childAgentCount !== 1 ? "s" : ""}`}
          compact={compact}
        />

        {/* Delegated In (as Child) */}
        <StatItem
          icon={<ArrowDownLeft className="h-4 w-4" />}
          iconBg="bg-green-500/20"
          iconColor="text-green-400"
          label="Delegated In"
          value={formatAmount(stats.totalDelegatedIn.toString()) + " USDC"}
          subtext={`from ${stats.parentAgentCount} manager${stats.parentAgentCount !== 1 ? "s" : ""}`}
          compact={compact}
        />

        {/* Top Child Agent */}
        {stats.topChild && (
          <StatItem
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-purple-500/20"
            iconColor="text-purple-400"
            label="Top Specialist"
            value={stats.topChild.name}
            subtext={formatAmount(stats.topChild.amount) + " USDC"}
            valueLink={`/agents/${asParent[0]?.childAgent?.id}`}
            badge={{
              value: stats.topChild.score,
              color: getScoreColorHex(stats.topChild.score),
            }}
            compact={compact}
          />
        )}

        {/* Top Parent Agent */}
        {stats.topParent && (
          <StatItem
            icon={<Users className="h-4 w-4" />}
            iconBg="bg-orange-500/20"
            iconColor="text-orange-400"
            label="Top Manager"
            value={stats.topParent.name}
            subtext={formatAmount(stats.topParent.amount) + " USDC"}
            valueLink={`/agents/${asChild[0]?.parentAgent?.id}`}
            badge={{
              value: stats.topParent.score,
              color: getScoreColorHex(stats.topParent.score),
            }}
            compact={compact}
          />
        )}
      </div>

      {/* Quick list of child agents (if acting as parent) */}
      {asParent.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs font-medium text-gray-400 mb-2">Active Specialists</p>
          <div className="flex flex-wrap gap-2">
            {asParent.slice(0, 5).map((redel: any) => (
              <Link
                key={redel.id}
                href={`/agents/${redel.childAgent.id}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-full text-xs font-medium text-gray-300 transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: getScoreColorHex(redel.childAgent.reputationScore),
                  }}
                />
                {redel.childAgent.name}
              </Link>
            ))}
            {asParent.length > 5 && (
              <span className="inline-flex items-center px-2 py-1 text-xs text-gray-400">
                +{asParent.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ===========================================
// StatItem Component
// ===========================================

interface StatItemProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  subtext: string;
  valueLink?: string;
  badge?: {
    value: number;
    color: string;
  };
  compact?: boolean;
}

function StatItem({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  subtext,
  valueLink,
  badge,
  compact = false,
}: StatItemProps) {
  const valueClassName = cn(
    "font-bold text-gray-100 truncate block",
    compact ? "text-sm" : "text-lg",
    valueLink && "hover:text-primary-400 transition-colors cursor-pointer"
  );

  return (
    <div
      className={cn(
        "rounded-lg bg-white/5",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className={cn(
            "rounded-lg flex items-center justify-center",
            iconBg,
            iconColor,
            compact ? "p-1.5" : "p-2"
          )}
        >
          {icon}
        </div>
        {badge && (
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: badge.color }}
          >
            {badge.value}
          </span>
        )}
      </div>
      <p className={cn("text-gray-400", compact ? "text-[10px]" : "text-xs")}>
        {label}
      </p>
      {valueLink ? (
        <Link href={valueLink} className={valueClassName}>
          {value}
        </Link>
      ) : (
        <span className={valueClassName}>{value}</span>
      )}
      <p className={cn("text-gray-500 truncate", compact ? "text-[10px]" : "text-xs")}>
        {subtext}
      </p>
    </div>
  );
}

// ===========================================
// Inline Stats (for cards/rows)
// ===========================================

interface InlineRedelegationStatsProps {
  agentId: string;
  className?: string;
}

export function InlineRedelegationStats({ agentId, className }: InlineRedelegationStatsProps) {
  const { stats, loading } = useRedelegationStats(agentId);

  if (loading) {
    return <Skeleton className={cn("h-4 w-20", className)} />;
  }

  if (!stats || (stats.childAgentCount === 0 && stats.parentAgentCount === 0)) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-3 text-xs", className)}>
      {stats.childAgentCount > 0 && (
        <div className="flex items-center gap-1 text-blue-600">
          <ArrowUpRight className="h-3 w-3" />
          <span>{stats.childAgentCount} out</span>
        </div>
      )}
      {stats.parentAgentCount > 0 && (
        <div className="flex items-center gap-1 text-green-600">
          <ArrowDownLeft className="h-3 w-3" />
          <span>{stats.parentAgentCount} in</span>
        </div>
      )}
    </div>
  );
}
