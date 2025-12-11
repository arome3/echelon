/**
 * Reputation Calculation Utilities
 * Computes agent reputation scores based on performance metrics
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

// ============================================
// CONSTANTS
// ============================================

// Weight factors for reputation calculation
const WEIGHTS = {
  winRate: 0.35, // 35% - Consistency matters most
  profitability: 0.25, // 25% - Actual returns
  volume: 0.15, // 15% - Proven at scale
  experience: 0.15, // 15% - Track record length
  efficiency: 0.10, // 10% - Profit per trade
};

// Thresholds for volume normalization (in wei)
const VOLUME_THRESHOLDS = {
  min: 1e15, // 0.001 ETH equivalent
  max: 1e21, // 1000 ETH equivalent
};

// Minimum executions for full experience score
const MIN_EXECUTIONS_FOR_MAX_EXPERIENCE = 100;

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate overall reputation score (0-100)
 */
export function calculateReputationScore(input: ReputationInput): number {
  const {
    winRate,
    totalVolume,
    profitLoss,
    executionCount,
    avgProfitPerTrade,
  } = input;

  // If no executions, return initial score
  if (executionCount === 0) {
    return 50;
  }

  // Calculate component scores (0-100 each)
  const winRateScore = calculateWinRateScore(winRate);
  const profitabilityScore = calculateProfitabilityScore(profitLoss, totalVolume);
  const volumeScore = calculateVolumeScore(totalVolume);
  const experienceScore = calculateExperienceScore(executionCount);
  const efficiencyScore = calculateEfficiencyScore(avgProfitPerTrade);

  // Calculate weighted average
  const score =
    winRateScore * WEIGHTS.winRate +
    profitabilityScore * WEIGHTS.profitability +
    volumeScore * WEIGHTS.volume +
    experienceScore * WEIGHTS.experience +
    efficiencyScore * WEIGHTS.efficiency;

  // Clamp to 0-100 and round
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculate win rate (0-1)
 */
export function calculateWinRate(successCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return successCount / totalCount;
}

/**
 * Calculate win rate score component (0-100)
 */
function calculateWinRateScore(winRate: number): number {
  // Linear scaling from 0 to 100
  // 0% win rate = 0 score, 100% win rate = 100 score
  // But we also consider that >50% is good, >70% is excellent
  if (winRate < 0.3) {
    return winRate * 100; // Below 30%, linear scaling
  } else if (winRate < 0.5) {
    return 30 + (winRate - 0.3) * 100; // 30-50%, faster scaling
  } else if (winRate < 0.7) {
    return 50 + (winRate - 0.5) * 150; // 50-70%, even faster
  } else {
    return 80 + (winRate - 0.7) * 66.67; // 70-100%, capped scaling
  }
}

/**
 * Calculate profitability score component (0-100)
 */
function calculateProfitabilityScore(profitLoss: number, totalVolume: number): number {
  if (totalVolume === 0) return 50; // Neutral score if no volume

  // Calculate ROI percentage
  const roi = (profitLoss / totalVolume) * 100;

  // Map ROI to score
  // -10% or worse = 0
  // 0% = 50
  // +10% or better = 100
  const score = 50 + roi * 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate volume score component (0-100)
 */
function calculateVolumeScore(totalVolume: number): number {
  if (totalVolume <= VOLUME_THRESHOLDS.min) return 0;
  if (totalVolume >= VOLUME_THRESHOLDS.max) return 100;

  // Logarithmic scaling between thresholds
  const logMin = Math.log10(VOLUME_THRESHOLDS.min);
  const logMax = Math.log10(VOLUME_THRESHOLDS.max);
  const logVolume = Math.log10(totalVolume);

  return ((logVolume - logMin) / (logMax - logMin)) * 100;
}

/**
 * Calculate experience score component (0-100)
 */
function calculateExperienceScore(executionCount: number): number {
  if (executionCount >= MIN_EXECUTIONS_FOR_MAX_EXPERIENCE) return 100;

  // Square root scaling for diminishing returns
  return Math.sqrt(executionCount / MIN_EXECUTIONS_FOR_MAX_EXPERIENCE) * 100;
}

/**
 * Calculate efficiency score component (0-100)
 */
function calculateEfficiencyScore(avgProfitPerTrade: number): number {
  // Normalize average profit
  // Assuming average trade is around 0.1 ETH (1e17 wei)
  const normalizedProfit = avgProfitPerTrade / 1e17;

  // Map to score: -5% loss = 0, 0% = 50, +5% profit = 100
  const score = 50 + normalizedProfit * 1000;

  return Math.max(0, Math.min(100, score));
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
