/**
 * Reputation Calculation Utilities
 * Computes agent reputation scores based on performance metrics
 *
 * Score Formula (per docs/07-reputation-system.md):
 * - Win Rate: 40% (0-40 points)
 * - Volume: 25% (0-25 points)
 * - Profitability: 25% (0-25 points)
 * - Consistency: 10% (0-10 points)
 *
 * Total: 0-100 points
 */

// ============================================
// TYPES
// ============================================

export interface ReputationInput {
  winRate: number;
  totalVolume: number;
  profitLoss: number;
  executionCount: number;
  avgProfitPerTrade: number;
}

export interface ScoreComponents {
  winRateScore: number;
  volumeScore: number;
  profitScore: number;
  consistencyScore: number;
  total: number;
  isNeutral: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Minimum executions required for reliable score calculation.
 * Agents with fewer executions receive neutral score of 50.
 */
export const MIN_EXECUTIONS_FOR_SCORE = 5;

/**
 * Score component maximums (per spec)
 */
export const SCORE_WEIGHTS = {
  WIN_RATE: 40,
  VOLUME: 25,
  PROFITABILITY: 25,
  CONSISTENCY: 10,
} as const;

/**
 * Score tier thresholds and labels
 */
export const SCORE_TIERS = {
  EXCELLENT: { min: 80, label: "Excellent", recommendation: "Safe for larger delegations" },
  GOOD: { min: 60, label: "Good", recommendation: "Standard delegations" },
  FAIR: { min: 40, label: "Fair", recommendation: "Small trial delegations" },
  POOR: { min: 20, label: "Poor", recommendation: "Use caution" },
  CRITICAL: { min: 0, label: "Critical", recommendation: "Not recommended" },
} as const;

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate overall reputation score (0-100)
 *
 * Formula:
 * - WinRateScore = winRate × 40
 * - VolumeScore = min(25, log₁₀(normalizedVolume + 1) × 8)
 * - ProfitScore = profit > 0 ? min(25, profitRatio × 250) : max(0, 12.5 - lossRatio × 125)
 * - ConsistencyScore = min(10, log₁₀(executionCount + 1) × 4)
 */
export function calculateReputationScore(input: ReputationInput): number {
  const components = calculateScoreComponents(input);
  return components.total;
}

/**
 * Calculate individual score components
 * Used for detailed score breakdown display
 */
export function calculateScoreComponents(input: ReputationInput): ScoreComponents {
  const { winRate, totalVolume, profitLoss, executionCount } = input;

  // Minimum executions check - return neutral score for new agents
  if (executionCount < MIN_EXECUTIONS_FOR_SCORE) {
    return {
      winRateScore: 0,
      volumeScore: 0,
      profitScore: 0,
      consistencyScore: 0,
      total: 50,
      isNeutral: true,
    };
  }

  // 1. Win Rate Component (0-40 points)
  // Linear: winRate × 40
  const winRateScore = Math.min(SCORE_WEIGHTS.WIN_RATE, winRate * SCORE_WEIGHTS.WIN_RATE);

  // 2. Volume Component (0-25 points)
  // Logarithmic: min(25, log₁₀(normalizedVolume + 1) × 8)
  const normalizedVolume = totalVolume / 1e18; // Convert from wei to ETH
  const volumeScore = Math.min(
    SCORE_WEIGHTS.VOLUME,
    Math.log10(normalizedVolume + 1) * 8
  );

  // 3. Profitability Component (0-25 points)
  // Positive profit: min(25, profitRatio × 250) - 10% ROI = 25 points
  // Negative profit: max(0, 12.5 - lossRatio × 125) - starts at 12.5 and decreases
  let profitScore: number;
  if (profitLoss > 0) {
    const profitRatio = totalVolume > 0 ? profitLoss / totalVolume : 0;
    profitScore = Math.min(SCORE_WEIGHTS.PROFITABILITY, profitRatio * 250);
  } else {
    const lossRatio = totalVolume > 0 ? Math.abs(profitLoss) / totalVolume : 0;
    profitScore = Math.max(0, 12.5 - lossRatio * 125);
  }

  // 4. Consistency Component (0-10 points)
  // Logarithmic: min(10, log₁₀(executionCount + 1) × 4)
  const consistencyScore = Math.min(
    SCORE_WEIGHTS.CONSISTENCY,
    Math.log10(executionCount + 1) * 4
  );

  // Calculate total and clamp to 0-100
  const total = Math.round(
    Math.max(0, Math.min(100, winRateScore + volumeScore + profitScore + consistencyScore))
  );

  return {
    winRateScore,
    volumeScore,
    profitScore,
    consistencyScore,
    total,
    isNeutral: false,
  };
}

/**
 * Calculate win rate (0-1)
 */
export function calculateWinRate(successCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return successCount / totalCount;
}

/**
 * Get score tier information
 */
export function getScoreTier(score: number): {
  tier: "excellent" | "good" | "fair" | "poor" | "critical";
  label: string;
  recommendation: string;
} {
  if (score >= SCORE_TIERS.EXCELLENT.min) {
    return { tier: "excellent", ...SCORE_TIERS.EXCELLENT };
  }
  if (score >= SCORE_TIERS.GOOD.min) {
    return { tier: "good", ...SCORE_TIERS.GOOD };
  }
  if (score >= SCORE_TIERS.FAIR.min) {
    return { tier: "fair", ...SCORE_TIERS.FAIR };
  }
  if (score >= SCORE_TIERS.POOR.min) {
    return { tier: "poor", ...SCORE_TIERS.POOR };
  }
  return { tier: "critical", ...SCORE_TIERS.CRITICAL };
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Get day ID from timestamp (days since epoch)
 */
export function getDayId(timestamp: bigint): number {
  return Math.floor(Number(timestamp) / 86400);
}

/**
 * Get date string (YYYY-MM-DD) from timestamp
 */
export function getDateString(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toISOString().split("T")[0];
}

/**
 * Calculate Sharpe Ratio (simplified version)
 * Would need historical returns data for accurate calculation
 */
export function calculateSharpeRatio(
  avgReturn: number,
  stdDev: number,
  riskFreeRate: number = 0.02
): number {
  if (stdDev === 0) return 0;
  return (avgReturn - riskFreeRate) / stdDev;
}

/**
 * Calculate maximum drawdown from a series of values
 */
export function calculateMaxDrawdown(values: number[]): number {
  if (values.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = values[0];

  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate running max drawdown for an agent (simplified version)
 *
 * This calculates maxDrawdown based on available aggregate data:
 * - If agent has positive P&L but had losses, calculate drawdown from losses
 * - Tracks the largest loss relative to cumulative gains at that point
 *
 * @param currentMaxDrawdown - Previous max drawdown
 * @param cumulativeProfitBeforeTrade - Total P&L before this trade
 * @param tradeProfitLoss - P&L of current trade
 * @param totalVolumeBeforeTrade - Total volume before this trade
 * @returns Updated max drawdown (0-1 range, e.g., 0.15 = 15% drawdown)
 */
export function calculateRunningMaxDrawdown(
  currentMaxDrawdown: number,
  cumulativeProfitBeforeTrade: number,
  tradeProfitLoss: number,
  totalVolumeBeforeTrade: number
): number {
  // If this trade was a loss, calculate potential drawdown
  if (tradeProfitLoss < 0) {
    // Calculate peak equity before this trade (treating volume as capital base)
    // Peak = max(0, cumulative profit) + volume used
    const peakEquity = Math.max(0, cumulativeProfitBeforeTrade) + totalVolumeBeforeTrade;

    if (peakEquity > 0) {
      // Current equity after the loss
      const currentEquity = peakEquity + tradeProfitLoss;

      // Drawdown from peak
      const drawdown = (peakEquity - currentEquity) / peakEquity;

      // Return the larger of current max or new drawdown
      return Math.max(currentMaxDrawdown, Math.min(1, drawdown));
    }
  }

  return currentMaxDrawdown;
}

/**
 * Calculate simplified Sharpe ratio based on available metrics
 *
 * True Sharpe = (mean return - risk free rate) / std deviation of returns
 *
 * Simplified version uses:
 * - Mean return = avgProfitPerTrade / avgTradeSize
 * - Approximated volatility from win rate variance
 *
 * @param avgProfitPerTrade - Average profit per trade
 * @param totalVolume - Total volume traded
 * @param executionCount - Number of executions
 * @param winRate - Success rate (0-1)
 * @param riskFreeRate - Annual risk-free rate (default 0.02 = 2%)
 * @returns Sharpe ratio (typically -3 to +3 range)
 */
export function calculateSimplifiedSharpe(
  avgProfitPerTrade: number,
  totalVolume: number,
  executionCount: number,
  winRate: number,
  riskFreeRate: number = 0.02
): number {
  if (executionCount < 5 || totalVolume === 0) {
    return 0; // Not enough data for meaningful calculation
  }

  // Calculate average trade size
  const avgTradeSize = totalVolume / executionCount;

  if (avgTradeSize === 0) return 0;

  // Mean return per trade (as percentage)
  const meanReturn = avgProfitPerTrade / avgTradeSize;

  // Approximate standard deviation using win rate
  // Higher variance when win rate is around 50%, lower at extremes
  // This is a simplification - true std dev needs actual return distribution
  const winRateVariance = winRate * (1 - winRate); // Bernoulli variance
  const approximatedStdDev = Math.sqrt(winRateVariance) * Math.abs(meanReturn) + 0.01;

  // Annualize (assuming ~250 trading days)
  const annualizedReturn = meanReturn * 250;
  const annualizedStdDev = approximatedStdDev * Math.sqrt(250);

  if (annualizedStdDev === 0) return 0;

  // Calculate Sharpe ratio
  const sharpe = (annualizedReturn - riskFreeRate) / annualizedStdDev;

  // Clamp to reasonable range
  return Math.max(-3, Math.min(3, sharpe));
}
