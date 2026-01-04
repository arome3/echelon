"use client";

import { useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { CheckCircle, XCircle, Clock, ExternalLink, Activity, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn, formatRelativeTime, formatAmount, getExplorerTxUrl, getExecutionResultConfig } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { NoExecutions } from "@/components/ui/EmptyState";
import { GET_AGENT_EXECUTIONS } from "@/graphql/queries";
import type { Execution } from "@/lib/types";

const PAGE_SIZE = 20;

// ===========================================
// Execution History Component
// ===========================================

interface ExecutionHistoryProps {
  /** Initial executions (first page) */
  executions: Execution[];
  /** Agent ID for fetching more pages */
  agentId?: string;
  /** Total execution count (from agent.totalExecutions) */
  totalCount?: number;
  showAgent?: boolean;
  className?: string;
}

export function ExecutionHistory({
  executions: initialExecutions,
  agentId,
  totalCount = 0,
  showAgent = false,
  className,
}: ExecutionHistoryProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [executions, setExecutions] = useState<Execution[]>(initialExecutions);

  const [fetchExecutions, { loading }] = useLazyQuery(GET_AGENT_EXECUTIONS, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.Execution) {
        setExecutions(data.Execution);
      }
    },
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const startIndex = currentPage * PAGE_SIZE + 1;
  const endIndex = Math.min((currentPage + 1) * PAGE_SIZE, totalCount);

  const handlePageChange = (newPage: number) => {
    if (!agentId || newPage < 0 || newPage >= totalPages) return;

    setCurrentPage(newPage);
    fetchExecutions({
      variables: {
        agentId,
        limit: PAGE_SIZE,
        offset: newPage * PAGE_SIZE,
      },
    });
  };

  if (!executions?.length && !loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
        </CardHeader>
        <NoExecutions />
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      <div className="p-6 border-b border-primary-400/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-primary-200">
              Execution History
            </h3>
          </div>
          <span className="text-sm text-primary-500">
            {totalCount > PAGE_SIZE
              ? `${startIndex}-${endIndex} of ${totalCount}`
              : `${totalCount} execution${totalCount !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Execution List */}
      <div className={cn("divide-y divide-primary-400/20", loading && "opacity-50")}>
        {executions.map((execution) => (
          <ExecutionRow
            key={execution.id}
            execution={execution}
            showAgent={showAgent}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between p-4 border-t border-primary-400/20">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0 || loading}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              currentPage === 0 || loading
                ? "text-primary-600 cursor-not-allowed"
                : "text-primary-300 hover:bg-primary-300/10"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />}
            <span className="text-sm text-primary-500">
              Page {currentPage + 1} of {totalPages}
            </span>
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1 || loading}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              currentPage >= totalPages - 1 || loading
                ? "text-primary-600 cursor-not-allowed"
                : "text-primary-300 hover:bg-primary-300/10"
            )}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </Card>
  );
}

// ===========================================
// Execution Row Component
// ===========================================

interface ExecutionRowProps {
  execution: Execution;
  showAgent?: boolean;
}

export function ExecutionRow({ execution, showAgent = false }: ExecutionRowProps) {
  const config = getExecutionResultConfig(execution.result);
  const profitLoss = parseFloat(execution.profitLoss);
  const isProfit = profitLoss >= 0;

  const StatusIcon = {
    PENDING: Clock,
    SUCCESS: CheckCircle,
    FAILURE: XCircle,
  }[execution.result];

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4",
        "hover:bg-dark-700/50 transition-colors"
      )}
    >
      {/* Left: Status and Details */}
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", config.bgColor)}>
          <StatusIcon className={cn("w-5 h-5", config.iconColor)} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-primary-200">
              {execution.tokenInSymbol || "Token"} → {execution.tokenOutSymbol || "Token"}
            </p>
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                config.bgColor,
                config.textColor
              )}
            >
              {config.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-sm text-primary-500">
            <span>{formatRelativeTime(execution.startedAt)}</span>
            {execution.duration && (
              <>
                <span className="text-primary-600">•</span>
                <span>{parseInt(execution.duration)}s</span>
              </>
            )}
            {showAgent && execution.agent && (
              <>
                <span className="text-primary-600">•</span>
                <span>by {execution.agent.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Amounts and Link */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Amount In */}
        <div className="text-right">
          <p className="text-sm text-primary-500">In</p>
          <p className="font-medium text-primary-200">
            {formatAmount(execution.amountIn)}
          </p>
        </div>

        {/* Amount Out */}
        <div className="text-right">
          <p className="text-sm text-primary-500">Out</p>
          <p className="font-medium text-primary-200">
            {execution.result === "PENDING"
              ? "—"
              : formatAmount(execution.amountOut)}
          </p>
        </div>

        {/* Profit/Loss */}
        <div className="text-right min-w-[80px]">
          <p className="text-sm text-primary-500">P&L</p>
          <p
            className={cn(
              "font-semibold",
              execution.result === "PENDING"
                ? "text-primary-500"
                : isProfit
                ? "text-green-400"
                : "text-red-400"
            )}
          >
            {execution.result === "PENDING"
              ? "—"
              : `${isProfit ? "+" : ""}${formatAmount(execution.profitLoss)}`}
          </p>
        </div>

        {/* Explorer Link */}
        <a
          href={getExplorerTxUrl(execution.startTxHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-primary-400 hover:text-primary-200 hover:bg-dark-700 rounded-lg transition-colors"
          title="View on Explorer"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

// ===========================================
// Compact Execution List Component
// ===========================================

interface CompactExecutionListProps {
  executions: Execution[];
  limit?: number;
  className?: string;
}

export function CompactExecutionList({
  executions,
  limit = 5,
  className,
}: CompactExecutionListProps) {
  const displayExecutions = executions.slice(0, limit);

  return (
    <div className={cn("space-y-2", className)}>
      {displayExecutions.map((execution) => {
        const config = getExecutionResultConfig(execution.result);
        const profitLoss = parseFloat(execution.profitLoss);
        const isProfit = profitLoss >= 0;

        return (
          <div
            key={execution.id}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg",
              config.bgColor
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  execution.result === "SUCCESS"
                    ? "bg-green-500"
                    : execution.result === "FAILURE"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                )}
              />
              <span className="text-sm text-primary-300">
                {execution.tokenInSymbol || "Trade"}
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                execution.result === "PENDING"
                  ? "text-primary-500"
                  : isProfit
                  ? "text-green-400"
                  : "text-red-400"
              )}
            >
              {execution.result === "PENDING"
                ? "Pending"
                : `${isProfit ? "+" : ""}${formatAmount(execution.profitLoss)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
