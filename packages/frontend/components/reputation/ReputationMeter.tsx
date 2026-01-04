"use client";

import { useMemo } from "react";
import { cn, formatAmount, getScoreTier } from "@/lib/utils";

// ===========================================
// ReputationMeter Component
// ===========================================

export interface ReputationMeterProps {
  /** Current reputation score (0-100) */
  score: number;
  /** Base amount for the permission (e.g., 1 USDC = 1e6 with 6 decimals) */
  baseAmount: number;
  /** Maximum amount for the permission */
  maxAmount: number;
  /** Minimum reputation score threshold */
  minReputationScore?: number;
  /** Token symbol for display */
  tokenSymbol?: string;
  /** Token decimals */
  decimals?: number;
  /** Whether the reputation data is stale */
  isStale?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Additional class */
  className?: string;
}

/**
 * Calculate the active limit based on reputation score
 * Mirrors the on-chain formula in ReputationGateEnforcer.sol
 */
function calculateActiveLimit(
  score: number,
  baseAmount: number,
  maxAmount: number,
  minReputationScore: number
): number {
  // If below minimum score, only allow base amount
  if (score <= minReputationScore) {
    return baseAmount;
  }

  // If at or above 100, return max amount
  if (score >= 100) {
    return maxAmount;
  }

  // Linear scaling between base and max based on score progress
  const scoreRange = 100 - minReputationScore;
  const currentProgress = score - minReputationScore;
  const amountRange = maxAmount - baseAmount;

  return baseAmount + (amountRange * currentProgress) / scoreRange;
}

/**
 * Visual meter showing current reputation and the resulting permission limit
 *
 * This component helps users understand the dynamic permission scaling:
 * - Shows current reputation score with color-coded indicator
 * - Displays the calculated active limit based on score
 * - Shows progress toward maximum limit
 */
export function ReputationMeter({
  score,
  baseAmount,
  maxAmount,
  minReputationScore = 40,
  tokenSymbol = "USDC",
  decimals = 6,
  isStale = false,
  compact = false,
  className,
}: ReputationMeterProps) {
  // Calculate active limit using the on-chain formula
  const activeLimit = useMemo(
    () => calculateActiveLimit(score, baseAmount, maxAmount, minReputationScore),
    [score, baseAmount, maxAmount, minReputationScore]
  );

  // Progress percentage toward max
  const limitProgress = ((activeLimit - baseAmount) / (maxAmount - baseAmount)) * 100;

  // Score progress percentage
  const scoreProgress = Math.min(100, Math.max(0, score));

  // Get tier info
  const tier = getScoreTier(score);

  // Color configuration based on score
  const colorConfig = {
    excellent: { fill: "bg-emerald-500", glow: "shadow-emerald-500/30" },
    good: { fill: "bg-lime-500", glow: "shadow-lime-500/30" },
    fair: { fill: "bg-yellow-500", glow: "shadow-yellow-500/30" },
    poor: { fill: "bg-orange-500", glow: "shadow-orange-500/30" },
    critical: { fill: "bg-red-500", glow: "shadow-red-500/30" },
  };

  const colors = colorConfig[tier.tier];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {/* Score badge */}
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              colors.fill,
              isStale && "opacity-50"
            )}
          />
          <span className="text-sm font-medium text-slate-200">{score}</span>
        </div>
        {/* Arrow */}
        <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none">
          <path d="M13 7l5 5-5 5M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {/* Active limit */}
        <span className="text-sm font-semibold text-slate-100">
          {formatAmount(activeLimit, decimals)} {tokenSymbol}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-400">Reputation-Gated Limit</h4>
        {isStale && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Stale data
          </span>
        )}
      </div>

      {/* Main meter visualization */}
      <div className="relative">
        {/* Background track */}
        <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
          {/* Score progress fill */}
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              colors.fill,
              isStale && "opacity-50"
            )}
            style={{ width: `${scoreProgress}%` }}
          />
        </div>

        {/* Score marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
          style={{ left: `${scoreProgress}%` }}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center",
              colors.fill,
              "shadow-lg",
              colors.glow
            )}
          >
            <span className="text-[8px] font-bold text-white">{score}</span>
          </div>
        </div>

        {/* Scale markers */}
        <div className="flex justify-between mt-2 text-[10px] text-slate-500">
          <span>0</span>
          <span className="absolute left-1/4 -translate-x-1/2">25</span>
          <span className="absolute left-1/2 -translate-x-1/2">50</span>
          <span className="absolute left-3/4 -translate-x-1/2">75</span>
          <span>100</span>
        </div>
      </div>

      {/* Active limit display */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">Active Limit</p>
            <p className="text-2xl font-bold text-slate-100">
              {formatAmount(activeLimit, decimals)}
              <span className="text-lg font-medium text-slate-400 ml-1">{tokenSymbol}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">of Maximum</p>
            <p className="text-lg font-semibold text-slate-300">
              {formatAmount(maxAmount, decimals)} {tokenSymbol}
            </p>
          </div>
        </div>

        {/* Limit progress bar */}
        <div className="mt-3">
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", colors.fill)}
              style={{ width: `${limitProgress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {limitProgress.toFixed(0)}% of maximum limit unlocked
          </p>
        </div>
      </div>

      {/* Score tier info */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            "px-2 py-0.5 rounded-full font-medium",
            tier.tier === "excellent" && "bg-emerald-500/20 text-emerald-400",
            tier.tier === "good" && "bg-lime-500/20 text-lime-400",
            tier.tier === "fair" && "bg-yellow-500/20 text-yellow-400",
            tier.tier === "poor" && "bg-orange-500/20 text-orange-400",
            tier.tier === "critical" && "bg-red-500/20 text-red-400"
          )}
        >
          {tier.label}
        </span>
        <span className="text-slate-500">{tier.recommendation}</span>
      </div>
    </div>
  );
}

export default ReputationMeter;
