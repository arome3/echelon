"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  BadgeCheck,
} from "lucide-react";
import { cn, truncateAddress, getExplorerAddressUrl, formatRelativeTime, formatPercent, formatAmount, getScoreColor, getScoreTier } from "@/lib/utils";
import { StrategyBadge, RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { ReputationBadge } from "@/components/agents/ReputationBadge";
import { Button } from "@/components/ui/Button";
import type { Agent } from "@/lib/types";

// ===========================================
// Agent Header Component
// ===========================================

interface AgentHeaderProps {
  agent: Agent;
  className?: string;
  /** Hide trading stats for portfolio managers like Fund Manager */
  isFundManager?: boolean;
}

export function AgentHeader({ agent, className, isFundManager = false }: AgentHeaderProps) {
  const winRate = parseFloat(agent.winRate) * 100;
  const profitLoss = parseFloat(agent.totalProfitLoss);
  const isProfit = profitLoss >= 0;

  return (
    <div className={cn("bg-dark-800 border border-primary-400/20 rounded-xl shadow-lg p-6", className)}>
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leaderboard
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        {/* Left: Agent Info */}
        <div className="flex-1">
          <div className="flex items-start gap-4">
            {/* Avatar/Initial */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-2xl">
                {agent.name.charAt(0)}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-primary-100">
                  {agent.name}
                </h1>
                {agent.isVerified && (
                  <BadgeCheck className="w-6 h-6 text-emerald-400" aria-label="Verified Agent" />
                )}
                <StatusBadge status={agent.isActive ? "active" : "inactive"} />
                {isFundManager && (
                  <span className="px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                    Fund Manager
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2">
                <StrategyBadge strategy={agent.strategyType} />
                <RiskBadge level={agent.riskLevel} />
              </div>

              {/* Wallet Address */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-sm text-primary-500">Wallet:</span>
                <code className="text-sm font-mono text-primary-300">
                  {truncateAddress(agent.walletAddress)}
                </code>
                <a
                  href={getExplorerAddressUrl(agent.walletAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Key Stats - Show only reputation for Fund Manager */}
        <div className={cn(
          "grid gap-4",
          isFundManager
            ? "grid-cols-1"
            : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4"
        )}>
          {/* Reputation Score */}
          <div className="bg-dark-700/50 border border-primary-400/20 rounded-xl p-4 flex flex-col items-center justify-center">
            <ReputationBadge
              score={agent.reputationScore}
              size="md"
              showLabel
              showRecommendation
            />
          </div>

          {/* Trading Stats - Hidden for Fund Manager */}
          {!isFundManager && (
            <>
              {/* Win Rate */}
              <div className="bg-dark-700/50 border border-primary-400/20 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Activity className="w-5 h-5 text-primary-400" />
                  <p className="text-2xl font-bold text-primary-100">
                    {formatPercent(agent.winRate)}
                  </p>
                </div>
                <p className="text-sm text-primary-500 mt-1">Win Rate</p>
              </div>

              {/* Profit/Loss */}
              <div className="bg-dark-700/50 border border-primary-400/20 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  {isProfit ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      isProfit ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {isProfit ? "+" : ""}
                    {formatAmount(agent.totalProfitLoss)}
                  </p>
                </div>
                <p className="text-sm text-primary-500 mt-1">Total P&L</p>
              </div>

              {/* Total Executions */}
              <div className="bg-dark-700/50 border border-primary-400/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-primary-100">
                  {parseInt(agent.totalExecutions).toLocaleString()}
                </p>
                <p className="text-sm text-primary-500 mt-1">Executions</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Additional Stats Row - Hidden for Fund Manager */}
      {!isFundManager && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary-400/20">
          <StatItem
            label="Successful"
            value={agent.successfulExecutions}
            className="text-green-400"
          />
          <StatItem
            label="Failed"
            value={agent.failedExecutions}
            className="text-red-400"
          />
          <StatItem
            label="Volume In"
            value={formatAmount(agent.totalVolumeIn) + " USDC"}
          />
          <StatItem
            label="Last Active"
            value={
              agent.lastExecutionAt
                ? formatRelativeTime(agent.lastExecutionAt)
                : "Never"
            }
            icon={<Clock className="w-4 h-4 text-primary-400" />}
          />
        </div>
      )}
    </div>
  );
}

// ===========================================
// Stat Item Component
// ===========================================

interface StatItemProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

function StatItem({ label, value, icon, className }: StatItemProps) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className={cn("font-semibold", className || "text-primary-200")}>
          {value}
        </p>
        <p className="text-xs text-primary-500">{label}</p>
      </div>
    </div>
  );
}
