"use client";

import { Activity, TrendingUp, Users, Zap, DollarSign, BarChart3 } from "lucide-react";
import { cn, formatAmount } from "@/lib/utils";
import { useGlobalStats } from "@/hooks/useExecutions";

// ===========================================
// Global Stats Bar Component
// ===========================================

interface GlobalStatsBarProps {
  className?: string;
}

export function GlobalStatsBar({ className }: GlobalStatsBarProps) {
  const { stats, loading, error } = useGlobalStats();

  if (error || (!loading && !stats)) {
    return null;
  }

  return (
    <div className={cn("bg-dark-900 border-b border-primary-300/10", className)}>
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
          <StatItem
            icon={<Users className="w-4 h-4" />}
            label="Total Agents"
            value={loading ? "—" : stats?.totalAgents?.toLocaleString() || "0"}
          />
          <StatItem
            icon={<Activity className="w-4 h-4" />}
            label="Active Agents"
            value={loading ? "—" : stats?.activeAgents?.toLocaleString() || "0"}
            highlight
          />
          <StatItem
            icon={<Zap className="w-4 h-4" />}
            label="Executions"
            value={loading ? "—" : stats?.totalExecutions?.toLocaleString() || "0"}
          />
          <StatItem
            icon={<TrendingUp className="w-4 h-4" />}
            label="Active Permissions"
            value={loading ? "—" : stats?.activePermissions || "0"}
          />
          <StatItem
            icon={<DollarSign className="w-4 h-4" />}
            label="Total Volume"
            value={loading ? "—" : `$${formatAmount(stats?.totalVolumeProcessed || "0")}`}
            className="hidden lg:flex"
          />
          <StatItem
            icon={<BarChart3 className="w-4 h-4" />}
            label="Total P&L"
            value={loading ? "—" : `$${formatAmount(stats?.totalProfitGenerated || "0")}`}
            className="hidden lg:flex"
          />
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Stat Item Component
// ===========================================

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}

function StatItem({ icon, label, value, highlight, className }: StatItemProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "p-2 rounded-lg",
          highlight ? "bg-success-500/20 text-success-400" : "bg-primary-300/10 text-primary-400"
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-primary-200">{value}</p>
        <p className="text-xs text-primary-500">{label}</p>
      </div>
    </div>
  );
}

// ===========================================
// Compact Stats Row
// ===========================================

interface CompactStatsRowProps {
  className?: string;
}

export function CompactStatsRow({ className }: CompactStatsRowProps) {
  const { stats, loading } = useGlobalStats();

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-6 text-sm text-primary-500",
        className
      )}
    >
      <span>
        <strong className="text-primary-300">
          {loading ? "—" : stats?.totalAgents || "0"}
        </strong>{" "}
        agents
      </span>
      <span className="text-primary-600">•</span>
      <span>
        <strong className="text-primary-300">
          {loading ? "—" : stats?.totalExecutions || "0"}
        </strong>{" "}
        executions
      </span>
      <span className="text-primary-600">•</span>
      <span>
        <strong className="text-success-400">
          {loading ? "—" : `${formatAmount(stats?.totalVolumeProcessed || "0")}`}
        </strong>{" "}
        volume
      </span>
    </div>
  );
}
