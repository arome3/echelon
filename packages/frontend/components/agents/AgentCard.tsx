"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Activity, ChevronRight, BadgeCheck } from "lucide-react";
import { cn, getRankBadge, formatPercent, formatAmount, formatRelativeTime } from "@/lib/utils";
import { StrategyBadge, RiskBadge } from "@/components/ui/Badge";
import { ReputationBadge } from "@/components/agents/ReputationBadge";
import type { RankedAgent, Agent } from "@/lib/types";

// ===========================================
// Agent Card Component
// ===========================================

interface AgentCardProps {
  agent: RankedAgent | Agent;
  rank: number;
  /** Show as compact version */
  compact?: boolean;
  /** Additional class */
  className?: string;
}

export function AgentCard({
  agent,
  rank,
  compact = false,
  className,
}: AgentCardProps) {
  const winRate = parseFloat(agent.winRate) * 100;
  const profitLoss = parseFloat(agent.totalProfitLoss);
  const isProfit = profitLoss >= 0;
  const rankInfo = getRankBadge(rank);

  if (compact) {
    return (
      <Link
        href={`/agents/${agent.id}`}
        className={cn(
          "flex items-center justify-between p-3 rounded-lg hover:bg-stone-700/40 transition-colors",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              rankInfo.bgColor,
              rankInfo.textColor
            )}
          >
            {rankInfo.emoji}
          </span>
          <span className="font-medium text-stone-100">{agent.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-400">
            {winRate.toFixed(0)}% win
          </span>
          <ReputationBadge score={agent.reputationScore} size="sm" showLabel={false} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/agents/${agent.id}`}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-stone-700/30 rounded-lg",
        "hover:bg-stone-700/30 hover:border-stone-600/50 transition-all",
        "group",
        className
      )}
    >
      {/* Left: Rank + Agent Info */}
      <div className="flex items-center gap-4">
        {/* Rank Badge */}
        <span
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold",
            rankInfo.bgColor,
            rankInfo.textColor
          )}
        >
          {rankInfo.emoji}
        </span>

        {/* Agent Info */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-stone-100 text-lg group-hover:text-amber-400 transition-colors">
              {agent.name}
            </h3>
            {agent.isVerified && (
              <BadgeCheck className="w-5 h-5 text-emerald-400" aria-label="Verified Agent" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StrategyBadge strategy={agent.strategyType} />
            <RiskBadge level={agent.riskLevel} showLabel={false} />
            {agent.lastExecutionAt && (
              <span className="text-xs text-stone-500">
                Active {formatRelativeTime(agent.lastExecutionAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-6 sm:gap-8">
        {/* Win Rate */}
        <div className="text-center sm:text-right">
          <div className="flex items-center gap-1 justify-center sm:justify-end">
            <Activity className="w-4 h-4 text-stone-500" />
            <span className="font-medium text-stone-200">
              {formatPercent(agent.winRate)}
            </span>
          </div>
          <span className="text-xs text-stone-500">Win Rate</span>
        </div>

        {/* Profit/Loss */}
        <div className="text-center sm:text-right">
          <div
            className={cn(
              "flex items-center gap-1 justify-center sm:justify-end font-medium",
              isProfit ? "text-emerald-400" : "text-red-400"
            )}
          >
            {isProfit ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              {isProfit ? "+" : ""}
              {formatAmount(agent.totalProfitLoss)}
            </span>
          </div>
          <span className="text-xs text-stone-500">P&L (USDC)</span>
        </div>

        {/* Score */}
        <ReputationBadge
          score={agent.reputationScore}
          size="sm"
          showLabel={false}
          showRecommendation
        />

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-stone-600 group-hover:text-amber-400 transition-colors hidden sm:block" />
      </div>
    </Link>
  );
}

// ===========================================
// Agent Mini Card Component
// ===========================================

interface AgentMiniCardProps {
  agent: Agent;
  className?: string;
}

export function AgentMiniCard({ agent, className }: AgentMiniCardProps) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className={cn(
        "flex items-center gap-3 p-3 bg-stone-800/30 rounded-lg hover:bg-stone-700/40 transition-colors",
        className
      )}
    >
      <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
        <span className="text-amber-400 font-semibold">
          {agent.name.charAt(0)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-stone-100 truncate">{agent.name}</p>
        <p className="text-xs text-stone-400">
          Score: {agent.reputationScore}/100
        </p>
      </div>
    </Link>
  );
}

// ===========================================
// Agent List Item Component
// ===========================================

interface AgentListItemProps {
  agent: Agent;
  showScore?: boolean;
  showStrategy?: boolean;
  className?: string;
}

export function AgentListItem({
  agent,
  showScore = true,
  showStrategy = true,
  className,
}: AgentListItemProps) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className={cn(
        "flex items-center justify-between p-3 border-b border-stone-700/30 last:border-0",
        "hover:bg-stone-700/30 transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="font-medium text-stone-100">{agent.name}</span>
        {showStrategy && (
          <StrategyBadge strategy={agent.strategyType} />
        )}
      </div>
      {showScore && (
        <ReputationBadge score={agent.reputationScore} size="sm" showLabel={false} />
      )}
    </Link>
  );
}
