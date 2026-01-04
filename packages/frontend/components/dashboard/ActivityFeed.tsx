"use client";

import Link from "next/link";
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn, formatRelativeTime, formatAmount, getExplorerTxUrl } from "@/lib/utils";
import { NoExecutions } from "@/components/ui/EmptyState";
import type { Execution } from "@/lib/types";

// ===========================================
// Activity Feed Component
// ===========================================

interface ActivityFeedProps {
  executions: Execution[];
  loading?: boolean;
  limit?: number;
  showViewAll?: boolean;
  className?: string;
}

export function ActivityFeed({
  executions,
  loading,
  limit = 10,
  showViewAll = true,
  className,
}: ActivityFeedProps) {
  const displayExecutions = executions.slice(0, limit);

  if (!displayExecutions?.length && !loading) {
    return (
      <div className={cn("glass-card", className)}>
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-100">
              Recent Activity
            </h3>
          </div>
        </div>
        <NoExecutions />
      </div>
    );
  }

  return (
    <div className={cn("glass-card", className)}>
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-100">
              Recent Activity
            </h3>
          </div>
          {showViewAll && executions.length > limit && (
            <Link
              href="/dashboard/activity"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {displayExecutions.map((execution) => (
          <ActivityItem key={execution.id} execution={execution} />
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Activity Item Component
// ===========================================

interface ActivityItemProps {
  execution: Execution;
}

function ActivityItem({ execution }: ActivityItemProps) {
  const profitLoss = parseFloat(execution.profitLoss);
  const isProfit = profitLoss >= 0;
  const isPending = execution.result === "PENDING";

  const statusConfig = {
    SUCCESS: {
      icon: CheckCircle,
      bgColor: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    FAILURE: {
      icon: XCircle,
      bgColor: "bg-red-500/10",
      iconColor: "text-red-400",
    },
    PENDING: {
      icon: Clock,
      bgColor: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
  }[execution.result];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors">
      {/* Status Icon */}
      <div className={cn("p-2 rounded-xl shrink-0", statusConfig.bgColor)}>
        <StatusIcon className={cn("w-4 h-4", statusConfig.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-slate-100">
              {execution.tokenInSymbol || "Token"} →{" "}
              {execution.tokenOutSymbol || "Token"}
            </p>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              {execution.agent && (
                <>
                  <Link
                    href={`/agents/${execution.agent.id}`}
                    className="hover:text-primary-400 transition-colors"
                  >
                    {execution.agent.name}
                  </Link>
                  <span className="text-slate-600">•</span>
                </>
              )}
              <span>{formatRelativeTime(execution.startedAt)}</span>
            </div>
          </div>

          {/* P&L */}
          <div className="text-right shrink-0">
            {isPending ? (
              <span className="text-slate-500 text-sm">Pending...</span>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  {isProfit ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  <span
                    className={cn(
                      "font-semibold",
                      isProfit ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {isProfit ? "+" : ""}
                    {formatAmount(execution.profitLoss)}
                  </span>
                </div>
                <a
                  href={getExplorerTxUrl(execution.startTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 justify-end mt-1 transition-colors"
                >
                  View tx
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Amount Details */}
        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
          <span>
            In: <strong className="text-slate-300 font-mono">{formatAmount(execution.amountIn)}</strong>
          </span>
          {!isPending && (
            <span>
              Out:{" "}
              <strong className="text-slate-300 font-mono">
                {formatAmount(execution.amountOut)}
              </strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Compact Activity List Component
// ===========================================

interface CompactActivityListProps {
  executions: Execution[];
  limit?: number;
  className?: string;
}

export function CompactActivityList({
  executions,
  limit = 5,
  className,
}: CompactActivityListProps) {
  const displayExecutions = executions.slice(0, limit);

  return (
    <div className={cn("space-y-2", className)}>
      {displayExecutions.map((execution) => {
        const profitLoss = parseFloat(execution.profitLoss);
        const isProfit = profitLoss >= 0;
        const isPending = execution.result === "PENDING";

        return (
          <div
            key={execution.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl",
              execution.result === "SUCCESS"
                ? "bg-emerald-500/10"
                : execution.result === "FAILURE"
                ? "bg-red-500/10"
                : "bg-amber-500/10"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  execution.result === "SUCCESS"
                    ? "bg-emerald-400"
                    : execution.result === "FAILURE"
                    ? "bg-red-400"
                    : "bg-amber-400"
                )}
              />
              <span className="text-sm text-slate-200">
                {execution.tokenInSymbol || "Trade"}
              </span>
              <span className="text-xs text-slate-500">
                {formatRelativeTime(execution.startedAt)}
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-medium font-mono",
                isPending
                  ? "text-slate-500"
                  : isProfit
                  ? "text-emerald-400"
                  : "text-red-400"
              )}
            >
              {isPending
                ? "Pending"
                : `${isProfit ? "+" : ""}${formatAmount(execution.profitLoss)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================
// Activity Summary Component
// ===========================================

interface ActivitySummaryProps {
  executions: Execution[];
  className?: string;
}

export function ActivitySummary({
  executions,
  className,
}: ActivitySummaryProps) {
  const successCount = executions.filter((e) => e.result === "SUCCESS").length;
  const failureCount = executions.filter((e) => e.result === "FAILURE").length;
  const pendingCount = executions.filter((e) => e.result === "PENDING").length;

  const totalProfitLoss = executions.reduce(
    (sum, e) => sum + parseFloat(e.profitLoss),
    0
  );
  const isProfit = totalProfitLoss >= 0;

  return (
    <div className={cn("grid grid-cols-4 gap-4 text-center", className)}>
      <div className="p-3 bg-white/[0.04] rounded-xl">
        <p className="text-lg font-bold text-slate-100">{executions.length}</p>
        <p className="text-xs text-slate-500">Total</p>
      </div>
      <div className="p-3 bg-emerald-500/10 rounded-xl">
        <p className="text-lg font-bold text-emerald-400">{successCount}</p>
        <p className="text-xs text-slate-500">Success</p>
      </div>
      <div className="p-3 bg-red-500/10 rounded-xl">
        <p className="text-lg font-bold text-red-400">{failureCount}</p>
        <p className="text-xs text-slate-500">Failed</p>
      </div>
      <div className={cn("p-3 rounded-xl", isProfit ? "bg-emerald-500/10" : "bg-red-500/10")}>
        <p
          className={cn(
            "text-lg font-bold font-mono",
            isProfit ? "text-emerald-400" : "text-red-400"
          )}
        >
          {isProfit ? "+" : ""}
          {formatAmount(totalProfitLoss.toString())}
        </p>
        <p className="text-xs text-slate-500">P&L</p>
      </div>
    </div>
  );
}
