"use client";

import { useMemo } from "react";
import { cn, formatAmount, getScoreTier } from "@/lib/utils";

// ===========================================
// ScalingProjectionChart Component
// ===========================================

export interface ScalingProjectionChartProps {
  /** Current reputation score (0-100) */
  currentScore: number;
  /** Base amount for the permission */
  baseAmount: number;
  /** Maximum amount for the permission */
  maxAmount: number;
  /** Minimum reputation score threshold */
  minReputationScore?: number;
  /** Token symbol for display */
  tokenSymbol?: string;
  /** Token decimals */
  decimals?: number;
  /** Chart height in pixels */
  height?: number;
  /** Show milestone markers */
  showMilestones?: boolean;
  /** Additional class */
  className?: string;
}

/**
 * Calculate limit at a given score (mirrors on-chain formula)
 */
function calculateLimitAtScore(
  score: number,
  baseAmount: number,
  maxAmount: number,
  minReputationScore: number
): number {
  if (score <= minReputationScore) {
    return baseAmount;
  }
  if (score >= 100) {
    return maxAmount;
  }
  const scoreRange = 100 - minReputationScore;
  const currentProgress = score - minReputationScore;
  const amountRange = maxAmount - baseAmount;
  return baseAmount + (amountRange * currentProgress) / scoreRange;
}

/**
 * Chart showing how limits scale with reputation
 *
 * Visualizes the linear scaling formula:
 *   activeLimit = baseAmount + (maxAmount - baseAmount) * (score - minScore) / (100 - minScore)
 *
 * Features:
 * - SVG-based chart for crisp rendering
 * - Highlights current position
 * - Shows tier milestones (Poor, Fair, Good, Excellent)
 * - Interactive hover states
 */
export function ScalingProjectionChart({
  currentScore,
  baseAmount,
  maxAmount,
  minReputationScore = 40,
  tokenSymbol = "USDC",
  decimals = 6,
  height = 200,
  showMilestones = true,
  className,
}: ScalingProjectionChartProps) {
  // Chart dimensions
  const width = 400;
  const padding = { top: 20, right: 60, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate data points for the line
  const dataPoints = useMemo(() => {
    const points: { score: number; limit: number }[] = [];

    // Generate points from 0 to 100
    for (let score = 0; score <= 100; score += 5) {
      points.push({
        score,
        limit: calculateLimitAtScore(score, baseAmount, maxAmount, minReputationScore),
      });
    }

    return points;
  }, [baseAmount, maxAmount, minReputationScore]);

  // Current position
  const currentLimit = calculateLimitAtScore(currentScore, baseAmount, maxAmount, minReputationScore);

  // Scale functions
  const xScale = (score: number) => (score / 100) * chartWidth;
  const yScale = (limit: number) => chartHeight - ((limit - baseAmount) / (maxAmount - baseAmount)) * chartHeight;

  // Generate SVG path for the line
  const linePath = useMemo(() => {
    return dataPoints
      .map((p, i) => {
        const x = xScale(p.score);
        const y = yScale(p.limit);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [dataPoints]);

  // Area fill path (for gradient under line)
  const areaPath = useMemo(() => {
    const lineCommands = dataPoints
      .map((p, i) => {
        const x = xScale(p.score);
        const y = yScale(p.limit);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    return `${lineCommands} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
  }, [dataPoints, chartWidth, chartHeight]);

  // Milestone markers
  const milestones = [
    { score: 20, label: "Poor", tier: "poor" as const },
    { score: 40, label: "Fair", tier: "fair" as const },
    { score: 60, label: "Good", tier: "good" as const },
    { score: 80, label: "Excellent", tier: "excellent" as const },
  ];

  // Get current tier
  const currentTier = getScoreTier(currentScore);

  return (
    <div className={cn("", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-slate-400">Permission Scaling Curve</h4>
        <div className="text-xs text-slate-500">
          Min Score: {minReputationScore}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ maxHeight: height }}
        >
          <defs>
            {/* Gradient for area fill */}
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
            </linearGradient>

            {/* Glow filter for current position */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Grid lines */}
            <g className="text-slate-700">
              {[0, 25, 50, 75, 100].map((score) => (
                <line
                  key={`v-${score}`}
                  x1={xScale(score)}
                  y1={0}
                  x2={xScale(score)}
                  y2={chartHeight}
                  stroke="currentColor"
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              ))}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={ratio * chartHeight}
                  x2={chartWidth}
                  y2={ratio * chartHeight}
                  stroke="currentColor"
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              ))}
            </g>

            {/* Milestone zones (colored backgrounds) */}
            {showMilestones && (
              <g>
                {/* Poor zone: 0-20 */}
                <rect x={xScale(0)} y={0} width={xScale(20)} height={chartHeight}
                  fill="rgb(239, 68, 68)" fillOpacity="0.05" />
                {/* Fair zone: 20-40 */}
                <rect x={xScale(20)} y={0} width={xScale(20)} height={chartHeight}
                  fill="rgb(249, 115, 22)" fillOpacity="0.05" />
                {/* Good zone: 40-60 */}
                <rect x={xScale(40)} y={0} width={xScale(20)} height={chartHeight}
                  fill="rgb(234, 179, 8)" fillOpacity="0.05" />
                {/* Great zone: 60-80 */}
                <rect x={xScale(60)} y={0} width={xScale(20)} height={chartHeight}
                  fill="rgb(132, 204, 22)" fillOpacity="0.05" />
                {/* Excellent zone: 80-100 */}
                <rect x={xScale(80)} y={0} width={xScale(20)} height={chartHeight}
                  fill="rgb(34, 197, 94)" fillOpacity="0.05" />
              </g>
            )}

            {/* Area under curve */}
            <path d={areaPath} fill="url(#areaGradient)" />

            {/* Main line */}
            <path
              d={linePath}
              fill="none"
              stroke="rgb(139, 92, 246)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Minimum score vertical line */}
            <line
              x1={xScale(minReputationScore)}
              y1={0}
              x2={xScale(minReputationScore)}
              y2={chartHeight}
              stroke="rgb(239, 68, 68)"
              strokeWidth="1"
              strokeDasharray="6 3"
              strokeOpacity="0.5"
            />

            {/* Current position marker */}
            <g transform={`translate(${xScale(currentScore)}, ${yScale(currentLimit)})`}>
              {/* Vertical line from point to bottom */}
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={chartHeight - yScale(currentLimit)}
                stroke="rgb(139, 92, 246)"
                strokeWidth="1"
                strokeDasharray="4 2"
                strokeOpacity="0.5"
              />

              {/* Horizontal line from point to left axis */}
              <line
                x1={0}
                y1={0}
                x2={-xScale(currentScore)}
                y2={0}
                stroke="rgb(139, 92, 246)"
                strokeWidth="1"
                strokeDasharray="4 2"
                strokeOpacity="0.5"
              />

              {/* Glow circle */}
              <circle
                r="8"
                fill="rgb(139, 92, 246)"
                fillOpacity="0.3"
                filter="url(#glow)"
              />

              {/* Main marker */}
              <circle
                r="5"
                fill="rgb(139, 92, 246)"
                stroke="white"
                strokeWidth="2"
              />
            </g>

            {/* X-axis labels */}
            <g className="text-[10px]">
              {[0, 25, 50, 75, 100].map((score) => (
                <text
                  key={`x-${score}`}
                  x={xScale(score)}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  fill="rgb(148, 163, 184)"
                >
                  {score}
                </text>
              ))}
              <text
                x={chartWidth / 2}
                y={chartHeight + 32}
                textAnchor="middle"
                fill="rgb(100, 116, 139)"
                className="text-[11px]"
              >
                Reputation Score
              </text>
            </g>

            {/* Y-axis labels */}
            <g className="text-[10px]">
              <text
                x={-8}
                y={chartHeight}
                textAnchor="end"
                dominantBaseline="middle"
                fill="rgb(148, 163, 184)"
              >
                {formatAmount(baseAmount, decimals)}
              </text>
              <text
                x={-8}
                y={0}
                textAnchor="end"
                dominantBaseline="middle"
                fill="rgb(148, 163, 184)"
              >
                {formatAmount(maxAmount, decimals)}
              </text>
            </g>

            {/* Token symbol on Y-axis */}
            <text
              x={-8}
              y={chartHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill="rgb(100, 116, 139)"
              className="text-[10px]"
              transform={`rotate(-90, -30, ${chartHeight / 2})`}
            >
              {tokenSymbol}
            </text>
          </g>
        </svg>

        {/* Current value callout */}
        <div className="absolute top-2 right-2 glass-card px-3 py-2 rounded-lg text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Current</p>
          <p className="text-lg font-bold text-slate-100">
            {formatAmount(currentLimit, decimals)}
            <span className="text-sm font-normal text-slate-400 ml-1">{tokenSymbol}</span>
          </p>
          <p className="text-xs text-slate-500">@ score {currentScore}</p>
        </div>
      </div>

      {/* Milestone legend */}
      {showMilestones && (
        <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
          {milestones.map((m) => {
            const limit = calculateLimitAtScore(m.score, baseAmount, maxAmount, minReputationScore);
            const isActive = currentScore >= m.score;

            return (
              <div
                key={m.score}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full",
                  isActive ? "bg-white/[0.08]" : "bg-white/[0.03]",
                  isActive ? "text-slate-200" : "text-slate-500"
                )}
              >
                <span className="font-medium">{m.label}</span>
                <span className="text-slate-500">@{m.score}:</span>
                <span className={cn(isActive && "text-violet-400")}>
                  {formatAmount(limit, decimals)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ScalingProjectionChart;
