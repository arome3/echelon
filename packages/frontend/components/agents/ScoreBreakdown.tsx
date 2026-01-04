"use client";

import { cn, calculateReputationComponents } from "@/lib/utils";
import { SCORE_WEIGHTS, MIN_EXECUTIONS_FOR_SCORE } from "@/lib/constants";

// ===========================================
// Score Breakdown Component
// ===========================================

export interface ScoreBreakdownProps {
  /** Win rate (0-1) */
  winRate: number;
  /** Total volume in wei (BigDecimal string) */
  totalVolume: string;
  /** Profit/Loss in wei (BigDecimal string) */
  profitLoss: string;
  /** Total execution count */
  executionCount: number;
  /** Show detailed tooltips */
  showDetails?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Additional class */
  className?: string;
}

/**
 * Displays breakdown of reputation score components with progress bars
 *
 * Per docs/07-reputation-system.md:
 * - Win Rate: 0-40 points (40%)
 * - Volume: 0-25 points (25%)
 * - Profitability: 0-25 points (25%)
 * - Consistency: 0-10 points (10%)
 */
export function ScoreBreakdown({
  winRate,
  totalVolume,
  profitLoss,
  executionCount,
  showDetails = false,
  compact = false,
  className,
}: ScoreBreakdownProps) {
  // Calculate score components using the same formula as the indexer
  const components = calculateReputationComponents(
    winRate,
    totalVolume,
    profitLoss,
    executionCount
  );

  // Component display data
  const scoreComponents = [
    {
      key: "winRate",
      label: SCORE_WEIGHTS.WIN_RATE.label,
      score: components.winRateScore,
      max: SCORE_WEIGHTS.WIN_RATE.max,
      color: SCORE_WEIGHTS.WIN_RATE.color,
      description: "Success rate of executions",
    },
    {
      key: "volume",
      label: SCORE_WEIGHTS.VOLUME.label,
      score: components.volumeScore,
      max: SCORE_WEIGHTS.VOLUME.max,
      color: SCORE_WEIGHTS.VOLUME.color,
      description: "Total volume processed (logarithmic scale)",
    },
    {
      key: "profitability",
      label: SCORE_WEIGHTS.PROFITABILITY.label,
      score: components.profitScore,
      max: SCORE_WEIGHTS.PROFITABILITY.max,
      color: SCORE_WEIGHTS.PROFITABILITY.color,
      description: "Profit/loss relative to volume",
    },
    {
      key: "consistency",
      label: SCORE_WEIGHTS.CONSISTENCY.label,
      score: components.consistencyScore,
      max: SCORE_WEIGHTS.CONSISTENCY.max,
      color: SCORE_WEIGHTS.CONSISTENCY.color,
      description: "Experience factor based on execution count",
    },
  ];

  // Neutral score message for new agents
  if (components.isNeutral) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-primary-200">Score Breakdown</h4>
          <span className="text-sm text-primary-500">Neutral: 50</span>
        </div>
        <div className="p-4 bg-dark-700/50 rounded-lg border border-primary-400/20">
          <p className="text-sm text-primary-400">
            This agent needs at least <strong className="text-primary-200">{MIN_EXECUTIONS_FOR_SCORE}</strong> executions
            before a reliable reputation score can be calculated.
          </p>
          <p className="mt-2 text-sm text-primary-500">
            Current executions: <strong className="text-primary-300">{executionCount}</strong> / {MIN_EXECUTIONS_FOR_SCORE}
          </p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {scoreComponents.map((component) => (
          <div key={component.key} className="flex items-center gap-2">
            <span className="text-xs text-primary-500 w-20 truncate">
              {component.label}
            </span>
            <div className="flex-1 bg-dark-700 rounded-full h-1.5">
              <div
                className={cn("h-1.5 rounded-full", component.color)}
                style={{ width: `${(component.score / component.max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-primary-400 w-12 text-right">
              {component.score.toFixed(0)}/{component.max}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-primary-200">Score Breakdown</h4>
        <span className="text-sm font-medium text-primary-300">
          Total: {components.total}/100
        </span>
      </div>

      <div className="space-y-3">
        {scoreComponents.map((component) => (
          <div key={component.key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-primary-300">{component.label}</span>
              <span className="text-primary-400 font-medium">
                {component.score.toFixed(1)} / {component.max}
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div
                className={cn("h-2 rounded-full transition-all duration-300", component.color)}
                style={{ width: `${(component.score / component.max) * 100}%` }}
              />
            </div>
            {showDetails && (
              <p className="text-xs text-primary-500">{component.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Score summary */}
      <div className="pt-3 border-t border-primary-400/20">
        <div className="flex items-center justify-between text-sm">
          <span className="text-primary-500">
            Based on {executionCount.toLocaleString()} executions
          </span>
          <span className="font-semibold text-primary-200">
            {components.total} points
          </span>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Score Progress Ring Component
// ===========================================

interface ScoreProgressRingProps {
  /** Score value (0-100) */
  score: number;
  /** Ring size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Additional class */
  className?: string;
}

/**
 * Circular progress ring showing score as percentage
 */
export function ScoreProgressRing({
  score,
  size = 120,
  strokeWidth = 8,
  className,
}: ScoreProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const getColor = (score: number) => {
    if (score >= 80) return "stroke-green-500";
    if (score >= 60) return "stroke-lime-500";
    if (score >= 40) return "stroke-yellow-500";
    if (score >= 20) return "stroke-orange-500";
    return "stroke-red-500";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-dark-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500", getColor(score))}
        />
      </svg>
      {/* Center score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-primary-100">{score}</span>
        <span className="text-xs text-primary-500">/ 100</span>
      </div>
    </div>
  );
}

export default ScoreBreakdown;
