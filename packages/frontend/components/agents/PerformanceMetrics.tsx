"use client";

import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  BarChart3,
  Target,
} from "lucide-react";
import { cn, formatPercent, formatAmount, getScoreColor, getScoreLabel, getScoreTier } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ReputationBadge, DualScoreDisplay } from "@/components/agents/ReputationBadge";
import { ScoreBreakdown } from "@/components/agents/ScoreBreakdown";
import type { Agent } from "@/lib/types";

// ===========================================
// Performance Metrics Component
// ===========================================

interface PerformanceMetricsProps {
  agent: Agent;
  className?: string;
}

export function PerformanceMetrics({ agent, className }: PerformanceMetricsProps) {
  const winRate = parseFloat(agent.winRate) * 100;
  const avgProfit = parseFloat(agent.avgProfitPerTrade || "0");
  const maxDrawdown = parseFloat(agent.maxDrawdown || "0");
  const sharpeRatio = parseFloat(agent.sharpeRatio || "0");
  const totalProfitLoss = parseFloat(agent.totalProfitLoss);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-400" />
          Performance Metrics
        </CardTitle>
      </CardHeader>

      <div className="space-y-4">
        {/* Enhanced Reputation Score Section */}
        <div className="p-4 bg-dark-800/50 rounded-lg border border-primary-400/20">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary-400" />
            <span className="text-sm font-medium text-primary-200">Reputation Score</span>
          </div>

          {/* Dual Score Display if community score exists */}
          {agent.reputationSummary?.combinedReputationScore !== undefined ? (
            <DualScoreDisplay
              executionScore={agent.reputationScore}
              communityScore={agent.reputationSummary.combinedReputationScore}
              size="md"
              className="mb-4"
            />
          ) : (
            <div className="flex justify-center mb-4">
              <ReputationBadge
                score={agent.reputationScore}
                size="lg"
                showLabel
                showRecommendation
              />
            </div>
          )}

          {/* Score Breakdown */}
          <ScoreBreakdown
            winRate={parseFloat(agent.winRate)}
            totalVolume={agent.totalVolumeIn}
            profitLoss={agent.totalProfitLoss}
            executionCount={parseInt(agent.totalExecutions)}
            showDetails={false}
          />

          {/* Recommendation */}
          <div className="mt-3 pt-3 border-t border-primary-400/20">
            <p className="text-xs text-primary-500">
              {getScoreTier(agent.reputationScore).recommendation}
            </p>
          </div>
        </div>

        {/* Win Rate */}
        <MetricCard
          label="Win Rate"
          value={formatPercent(agent.winRate)}
          sublabel={`${agent.successfulExecutions} of ${agent.totalExecutions} trades`}
          icon={<Activity className="w-5 h-5" />}
          iconColor={winRate >= 50 ? "text-green-500" : "text-red-500"}
          progress={winRate}
        />

        {/* Total P&L */}
        <MetricCard
          label="Total Profit/Loss"
          value={`${totalProfitLoss >= 0 ? "+" : ""}${formatAmount(agent.totalProfitLoss)} USDC`}
          icon={
            totalProfitLoss >= 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )
          }
          iconColor={totalProfitLoss >= 0 ? "text-green-500" : "text-red-500"}
        />

        {/* Average Profit */}
        <MetricCard
          label="Avg Profit per Trade"
          value={`${avgProfit >= 0 ? "+" : ""}${formatAmount(agent.avgProfitPerTrade || "0")} USDC`}
          iconColor={avgProfit >= 0 ? "text-green-500" : "text-red-500"}
        />

        {/* Max Drawdown */}
        <MetricCard
          label="Max Drawdown"
          value={maxDrawdown > 0 ? `-${formatPercent(maxDrawdown, 2)}` : "0%"}
          sublabel="Largest peak-to-trough decline"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconColor={maxDrawdown > 20 ? "text-red-500" : "text-yellow-500"}
        />

        {/* Sharpe Ratio */}
        <MetricCard
          label="Sharpe Ratio"
          value={sharpeRatio.toFixed(2)}
          sublabel={getSharpeLabel(sharpeRatio)}
          iconColor={sharpeRatio > 1 ? "text-green-500" : sharpeRatio > 0 ? "text-yellow-500" : "text-red-500"}
        />

        {/* Volume */}
        <MetricCard
          label="Total Volume"
          value={`${formatAmount(agent.totalVolumeIn)} USDC`}
          sublabel="Total input volume processed"
        />
      </div>
    </Card>
  );
}

// ===========================================
// Metric Card Component
// ===========================================

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  progress?: number;
}

function MetricCard({
  label,
  value,
  sublabel,
  icon,
  iconColor = "text-primary-400",
  progress,
}: MetricCardProps) {
  return (
    <div className="p-4 bg-dark-800/50 rounded-lg border border-primary-400/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-primary-500">{label}</p>
          <p className={cn("text-xl font-bold mt-1", iconColor.includes("green") ? "text-green-400" : iconColor.includes("red") ? "text-red-400" : "text-primary-100")}>
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-primary-500 mt-1">{sublabel}</p>
          )}
        </div>
        {icon && <div className={cn("p-2 bg-dark-700 rounded-lg", iconColor)}>{icon}</div>}
      </div>

      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progress >= 80
                  ? "bg-green-500"
                  : progress >= 60
                  ? "bg-lime-500"
                  : progress >= 40
                  ? "bg-yellow-500"
                  : progress >= 20
                  ? "bg-orange-500"
                  : "bg-red-500"
              )}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Compact Metrics Component
// ===========================================

interface CompactMetricsProps {
  agent: Agent;
  className?: string;
}

export function CompactMetrics({ agent, className }: CompactMetricsProps) {
  const totalProfitLoss = parseFloat(agent.totalProfitLoss);
  const isProfit = totalProfitLoss >= 0;

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <div className="flex flex-col items-center justify-center p-3 bg-dark-800/50 rounded-lg border border-primary-400/20">
        <ReputationBadge score={agent.reputationScore} size="sm" showLabel={false} />
        <p className="text-xs text-primary-500 mt-1">Score</p>
      </div>

      <div className="text-center p-3 bg-dark-800/50 rounded-lg border border-primary-400/20">
        <p className="text-lg font-bold text-primary-100">
          {formatPercent(agent.winRate)}
        </p>
        <p className="text-xs text-primary-500">Win Rate</p>
      </div>

      <div className="text-center p-3 bg-dark-800/50 rounded-lg border border-primary-400/20">
        <p className={cn("text-lg font-bold", isProfit ? "text-green-400" : "text-red-400")}>
          {isProfit ? "+" : ""}{formatAmount(agent.totalProfitLoss)}
        </p>
        <p className="text-xs text-primary-500">P&L</p>
      </div>

      <div className="text-center p-3 bg-dark-800/50 rounded-lg border border-primary-400/20">
        <p className="text-lg font-bold text-primary-100">
          {agent.totalExecutions}
        </p>
        <p className="text-xs text-primary-500">Trades</p>
      </div>
    </div>
  );
}

// ===========================================
// Helper Functions
// ===========================================

function getSharpeLabel(sharpe: number): string {
  if (sharpe >= 2) return "Excellent risk-adjusted return";
  if (sharpe >= 1) return "Good risk-adjusted return";
  if (sharpe >= 0) return "Below average risk-adjusted return";
  return "Negative risk-adjusted return";
}
