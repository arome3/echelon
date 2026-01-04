"use client";

import { cn, getScoreLabel, getScoreTier } from "@/lib/utils";
import { REPUTATION_THRESHOLDS } from "@/lib/constants";

// ===========================================
// Reputation Badge Component
// ===========================================

export interface ReputationBadgeProps {
  /** Reputation score (0-100) */
  score: number;
  /** Badge size */
  size?: "sm" | "md" | "lg";
  /** Show label below score (Excellent, Good, etc.) */
  showLabel?: boolean;
  /** Show recommendation tooltip */
  showRecommendation?: boolean;
  /** Additional class */
  className?: string;
}

/**
 * Circular badge displaying reputation score with color-coded styling
 * Per docs/07-reputation-system.md specification
 *
 * Score Thresholds:
 * - 80-100: Excellent (green)
 * - 60-79: Good (lime)
 * - 40-59: Fair (yellow)
 * - 20-39: Poor (orange)
 * - 0-19: Critical (red)
 */
export function ReputationBadge({
  score,
  size = "md",
  showLabel = true,
  showRecommendation = false,
  className,
}: ReputationBadgeProps) {
  const tier = getScoreTier(score);

  // Size configurations
  const sizeStyles = {
    sm: {
      container: "w-10 h-10",
      text: "text-sm font-bold",
      label: "text-[10px]",
    },
    md: {
      container: "w-14 h-14",
      text: "text-lg font-bold",
      label: "text-xs",
    },
    lg: {
      container: "w-20 h-20",
      text: "text-2xl font-bold",
      label: "text-sm",
    },
  };

  // Color configurations per tier
  const colorStyles = {
    excellent: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "ring-2 ring-green-200",
    },
    good: {
      bg: "bg-lime-100",
      text: "text-lime-700",
      border: "ring-2 ring-lime-200",
    },
    fair: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      border: "ring-2 ring-yellow-200",
    },
    poor: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "ring-2 ring-orange-200",
    },
    critical: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "ring-2 ring-red-200",
    },
  };

  const sizeConfig = sizeStyles[size];
  const colorConfig = colorStyles[tier.tier];

  return (
    <div
      className={cn("flex flex-col items-center", className)}
      title={showRecommendation ? tier.recommendation : undefined}
    >
      {/* Circular Score Badge */}
      <div
        className={cn(
          "rounded-full flex items-center justify-center",
          sizeConfig.container,
          colorConfig.bg,
          colorConfig.border
        )}
      >
        <span className={cn(sizeConfig.text, colorConfig.text)}>
          {score}
        </span>
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className={cn(
            "mt-1 font-medium",
            sizeConfig.label,
            colorConfig.text
          )}
        >
          {tier.label}
        </span>
      )}
    </div>
  );
}

// ===========================================
// Dual Score Display Component
// ===========================================

interface DualScoreDisplayProps {
  /** Execution-based reputation score */
  executionScore: number;
  /** Community feedback-based score (optional) */
  communityScore?: number;
  /** Size of badges */
  size?: "sm" | "md" | "lg";
  /** Additional class */
  className?: string;
}

/**
 * Displays both execution-based and community feedback scores side by side
 */
export function DualScoreDisplay({
  executionScore,
  communityScore,
  size = "md",
  className,
}: DualScoreDisplayProps) {
  return (
    <div className={cn("flex items-start gap-6", className)}>
      <div className="flex flex-col items-center">
        <ReputationBadge score={executionScore} size={size} showLabel />
        <span className="mt-1 text-[10px] text-gray-500 uppercase tracking-wide">
          Execution
        </span>
      </div>

      {communityScore !== undefined && (
        <div className="flex flex-col items-center">
          <ReputationBadge score={communityScore} size={size} showLabel />
          <span className="mt-1 text-[10px] text-gray-500 uppercase tracking-wide">
            Community
          </span>
        </div>
      )}
    </div>
  );
}

export default ReputationBadge;
