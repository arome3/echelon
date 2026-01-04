"use client";

import { useState, useMemo, useCallback } from "react";
import { cn, formatAmount, getScoreTier } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReputationMeter } from "./ReputationMeter";
import { ScalingProjectionChart } from "./ScalingProjectionChart";

// ===========================================
// ReputationGatedPermission Component
// ===========================================

export interface ReputationGatedPermissionProps {
  /** Agent wallet address */
  agentAddress: string;
  /** Agent name for display */
  agentName: string;
  /** Current reputation score (0-100) */
  currentScore: number;
  /** Whether reputation data is stale */
  isStale?: boolean;
  /** Token symbol */
  tokenSymbol?: string;
  /** Token decimals */
  decimals?: number;
  /** Callback when permission is submitted */
  onSubmit?: (params: PermissionParams) => Promise<void>;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Additional class */
  className?: string;
}

export interface PermissionParams {
  agentAddress: string;
  baseAmount: number;
  maxAmount: number;
  minReputationScore: number;
  maxStaleness: number;
}

// Preset configurations
const PRESETS = [
  {
    name: "Conservative",
    description: "Low base, high max, strict requirements",
    baseAmount: 10_000000, // 10 USDC
    maxAmount: 100_000000, // 100 USDC
    minReputationScore: 60,
    maxStaleness: 3600, // 1 hour
  },
  {
    name: "Moderate",
    description: "Balanced scaling for most users",
    baseAmount: 25_000000, // 25 USDC
    maxAmount: 500_000000, // 500 USDC
    minReputationScore: 40,
    maxStaleness: 86400, // 24 hours
  },
  {
    name: "Aggressive",
    description: "Higher limits, lower threshold",
    baseAmount: 100_000000, // 100 USDC
    maxAmount: 2000_000000, // 2000 USDC
    minReputationScore: 30,
    maxStaleness: 0, // No limit
  },
];

/**
 * Complete component for creating reputation-gated permissions
 *
 * This is the main UI for users to configure dynamic permission scaling.
 * It combines the ReputationMeter and ScalingProjectionChart to help
 * users understand how their permission limits will work.
 */
export function ReputationGatedPermission({
  agentAddress,
  agentName,
  currentScore,
  isStale = false,
  tokenSymbol = "USDC",
  decimals = 6,
  onSubmit,
  onCancel,
  className,
}: ReputationGatedPermissionProps) {
  // Form state
  const [baseAmount, setBaseAmount] = useState(25_000000); // 25 USDC
  const [maxAmount, setMaxAmount] = useState(500_000000); // 500 USDC
  const [minReputationScore, setMinReputationScore] = useState(40);
  const [maxStaleness, setMaxStaleness] = useState(86400); // 24 hours
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(1); // Moderate by default

  // Calculate current active limit
  const activeLimit = useMemo(() => {
    if (currentScore <= minReputationScore) {
      return baseAmount;
    }
    if (currentScore >= 100) {
      return maxAmount;
    }
    const scoreRange = 100 - minReputationScore;
    const currentProgress = currentScore - minReputationScore;
    const amountRange = maxAmount - baseAmount;
    return baseAmount + (amountRange * currentProgress) / scoreRange;
  }, [currentScore, baseAmount, maxAmount, minReputationScore]);

  // Get tier info
  const tier = getScoreTier(currentScore);

  // Apply preset
  const applyPreset = useCallback((index: number) => {
    const preset = PRESETS[index];
    setBaseAmount(preset.baseAmount);
    setMaxAmount(preset.maxAmount);
    setMinReputationScore(preset.minReputationScore);
    setMaxStaleness(preset.maxStaleness);
    setSelectedPreset(index);
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        agentAddress,
        baseAmount,
        maxAmount,
        minReputationScore,
        maxStaleness,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, agentAddress, baseAmount, maxAmount, minReputationScore, maxStaleness]);

  // Format staleness for display
  const formatStaleness = (seconds: number) => {
    if (seconds === 0) return "No limit";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  return (
    <Card className={cn("", className)} padding="lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Reputation-Gated Permission</CardTitle>
          <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded-full">
            Preview
          </span>
        </div>
        <CardDescription>
          Configure dynamic permission limits that scale with the agent&apos;s reputation.
          <span className="text-violet-400/80"> On-chain enforcement coming soon.</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Agent Info */}
        <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {agentName.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-100">{agentName}</p>
            <p className="text-xs text-slate-500 font-mono">
              {agentAddress.slice(0, 8)}...{agentAddress.slice(-6)}
            </p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "text-lg font-bold",
                tier.tier === "excellent" && "text-emerald-400",
                tier.tier === "good" && "text-lime-400",
                tier.tier === "fair" && "text-yellow-400",
                tier.tier === "poor" && "text-orange-400",
                tier.tier === "critical" && "text-red-400"
              )}
            >
              {currentScore}
            </p>
            <p className="text-xs text-slate-500">{tier.label}</p>
          </div>
        </div>

        {/* Preset selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Quick Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset, index) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(index)}
                className={cn(
                  "p-3 rounded-xl text-left transition-all",
                  selectedPreset === index
                    ? "glass-card ring-2 ring-violet-500/50"
                    : "bg-white/[0.03] hover:bg-white/[0.06]"
                )}
              >
                <p className="font-medium text-sm text-slate-200">{preset.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Current meter visualization */}
        <ReputationMeter
          score={currentScore}
          baseAmount={baseAmount}
          maxAmount={maxAmount}
          minReputationScore={minReputationScore}
          tokenSymbol={tokenSymbol}
          decimals={decimals}
          isStale={isStale}
        />

        {/* Advanced settings toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          <svg
            className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {showAdvanced ? "Hide" : "Show"} advanced settings
        </button>

        {/* Advanced settings */}
        {showAdvanced && (
          <div className="space-y-4 p-4 glass-card rounded-xl">
            {/* Base Amount */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Base Amount</span>
                <span className="text-sm text-slate-400">
                  {formatAmount(baseAmount, decimals)} {tokenSymbol}
                </span>
              </label>
              <input
                type="range"
                min={1_000000}
                max={100_000000}
                step={1_000000}
                value={baseAmount}
                onChange={(e) => {
                  setBaseAmount(Number(e.target.value));
                  setSelectedPreset(null);
                }}
                className="w-full accent-violet-500"
              />
              <p className="text-xs text-slate-500">
                Minimum amount the agent can use, regardless of reputation
              </p>
            </div>

            {/* Max Amount */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Maximum Amount</span>
                <span className="text-sm text-slate-400">
                  {formatAmount(maxAmount, decimals)} {tokenSymbol}
                </span>
              </label>
              <input
                type="range"
                min={baseAmount}
                max={5000_000000}
                step={10_000000}
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(Number(e.target.value));
                  setSelectedPreset(null);
                }}
                className="w-full accent-violet-500"
              />
              <p className="text-xs text-slate-500">
                Maximum amount at 100 reputation score
              </p>
            </div>

            {/* Min Reputation */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Minimum Reputation</span>
                <span className="text-sm text-slate-400">{minReputationScore}</span>
              </label>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={minReputationScore}
                onChange={(e) => {
                  setMinReputationScore(Number(e.target.value));
                  setSelectedPreset(null);
                }}
                className="w-full accent-violet-500"
              />
              <p className="text-xs text-slate-500">
                Agent must have at least this score to use the permission
              </p>
            </div>

            {/* Max Staleness */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Data Freshness</span>
                <span className="text-sm text-slate-400">{formatStaleness(maxStaleness)}</span>
              </label>
              <select
                value={maxStaleness}
                onChange={(e) => {
                  setMaxStaleness(Number(e.target.value));
                  setSelectedPreset(null);
                }}
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-slate-200"
              >
                <option value={0}>No limit</option>
                <option value={1800}>30 minutes</option>
                <option value={3600}>1 hour</option>
                <option value={21600}>6 hours</option>
                <option value={86400}>24 hours</option>
                <option value={604800}>7 days</option>
              </select>
              <p className="text-xs text-slate-500">
                How fresh the reputation data must be to execute
              </p>
            </div>
          </div>
        )}

        {/* Scaling chart */}
        <div className="pt-4">
          <ScalingProjectionChart
            currentScore={currentScore}
            baseAmount={baseAmount}
            maxAmount={maxAmount}
            minReputationScore={minReputationScore}
            tokenSymbol={tokenSymbol}
            decimals={decimals}
            height={180}
          />
        </div>

        {/* Summary */}
        <div className="glass-card p-4 rounded-xl space-y-2">
          <h5 className="text-sm font-medium text-slate-300">Permission Summary</h5>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500">Current Limit</p>
              <p className="font-semibold text-slate-100">
                {formatAmount(activeLimit, decimals)} {tokenSymbol}
              </p>
            </div>
            <div>
              <p className="text-slate-500">At Max Reputation</p>
              <p className="font-semibold text-slate-100">
                {formatAmount(maxAmount, decimals)} {tokenSymbol}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Score Needed for Max</p>
              <p className="font-semibold text-slate-100">100</p>
            </div>
            <div>
              <p className="text-slate-500">Points to Go</p>
              <p className="font-semibold text-violet-400">{100 - currentScore}</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting || currentScore < minReputationScore}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </>
          ) : currentScore < minReputationScore ? (
            `Score too low (need ${minReputationScore})`
          ) : (
            "Create Permission (Coming Soon)"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ReputationGatedPermission;
