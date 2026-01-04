import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import {
  EXPLORER_URLS,
  CHAIN_ID,
  REPUTATION_THRESHOLDS,
  UI,
  SCORE_WEIGHTS,
  SCORE_TIERS,
  MIN_EXECUTIONS_FOR_SCORE,
} from "./constants";

// ===========================================
// Class Name Utilities
// ===========================================

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===========================================
// Address Formatting
// ===========================================

/**
 * Truncate an Ethereum address for display
 */
export function truncateAddress(address: string, length = UI.ADDRESS_TRUNCATE_LENGTH): string {
  if (!address) return "";
  if (address.length <= length * 2 + 2) return address;
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
}

/**
 * Format address with optional ENS name
 */
export function formatAddress(address: string, ensName?: string): string {
  if (ensName) return ensName;
  return truncateAddress(address);
}

// ===========================================
// Number Formatting
// ===========================================

/**
 * Parse BigDecimal string from GraphQL to number
 * GraphQL returns amounts in wei (18 decimals)
 */
export function parseAmount(value: string | undefined, decimals = 18): number {
  if (!value) return 0;
  const num = parseFloat(value);
  return num / Math.pow(10, decimals);
}

/**
 * Format amount for display (e.g., USDC has 6 decimals)
 * Use this for raw token amounts from the blockchain
 */
export function formatAmount(value: string | number | undefined, decimals = 6): string {
  if (!value) return "0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  const parsed = num / Math.pow(10, decimals);

  if (Math.abs(parsed) >= 1_000_000) {
    return `${(parsed / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(parsed) >= 1_000) {
    return `${(parsed / 1_000).toFixed(2)}K`;
  }
  return parsed.toFixed(2);
}

/**
 * Format a display amount that's already in human-readable format
 * Use this for pre-converted values from the indexer (e.g., totalDelegated, currentDelegated)
 */
export function formatDisplayAmount(value: string | number | undefined): string {
  if (!value) return "0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(value: string | number | undefined, symbol = "USDC", decimals = 6): string {
  const formatted = formatAmount(value, decimals);
  return `${formatted} ${symbol}`;
}

/**
 * Format percentage (0-1 to 0-100)
 */
export function formatPercent(value: string | number | undefined, decimalPlaces = 1): string {
  if (!value) return "0%";
  const num = typeof value === "string" ? parseFloat(value) : value;
  // If already in 0-100 range
  if (num > 1) {
    return `${num.toFixed(decimalPlaces)}%`;
  }
  // Convert from 0-1 to percentage
  return `${(num * 100).toFixed(decimalPlaces)}%`;
}

/**
 * Format profit/loss with sign and color class
 */
export function formatProfitLoss(value: string | number | undefined, decimals = 6): {
  formatted: string;
  isPositive: boolean;
  colorClass: string;
} {
  const parsed = typeof value === "string" ? parseFloat(value) / Math.pow(10, decimals) : (value || 0);
  const isPositive = parsed >= 0;

  return {
    formatted: `${isPositive ? "+" : ""}${parsed.toFixed(2)}`,
    isPositive,
    colorClass: isPositive ? "text-green-600" : "text-red-600",
  };
}

/**
 * Format large numbers with abbreviations
 */
export function formatCompactNumber(value: number | string | undefined): string {
  if (!value) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// ===========================================
// Date/Time Formatting
// ===========================================

/**
 * Format Unix timestamp to relative time
 */
export function formatRelativeTime(timestamp: string | number | undefined): string {
  if (!timestamp) return "Never";
  const ts = typeof timestamp === "string" ? parseInt(timestamp) : timestamp;
  return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true });
}

/**
 * Format Unix timestamp to date string
 */
export function formatDate(timestamp: string | number | undefined, formatStr = "MMM d, yyyy"): string {
  if (!timestamp) return "N/A";
  const ts = typeof timestamp === "string" ? parseInt(timestamp) : timestamp;
  return format(new Date(ts * 1000), formatStr);
}

/**
 * Format Unix timestamp to datetime string
 */
export function formatDateTime(timestamp: string | number | undefined): string {
  return formatDate(timestamp, "MMM d, yyyy HH:mm");
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: string | number | undefined): string {
  if (!seconds) return "N/A";
  const secs = typeof seconds === "string" ? parseInt(seconds) : seconds;

  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  return `${hours}h ${mins}m`;
}

// ===========================================
// Reputation/Score Utilities
// ===========================================

/**
 * Get score color class based on value
 */
export function getScoreColor(score: number): string {
  if (score >= REPUTATION_THRESHOLDS.EXCELLENT) return "text-green-600";
  if (score >= REPUTATION_THRESHOLDS.GOOD) return "text-green-500";
  if (score >= REPUTATION_THRESHOLDS.AVERAGE) return "text-yellow-600";
  if (score >= REPUTATION_THRESHOLDS.POOR) return "text-orange-500";
  return "text-red-600";
}

/**
 * Get score background color class
 */
export function getScoreBgColor(score: number): string {
  if (score >= REPUTATION_THRESHOLDS.EXCELLENT) return "bg-green-100";
  if (score >= REPUTATION_THRESHOLDS.GOOD) return "bg-green-50";
  if (score >= REPUTATION_THRESHOLDS.AVERAGE) return "bg-yellow-50";
  if (score >= REPUTATION_THRESHOLDS.POOR) return "bg-orange-50";
  return "bg-red-50";
}

/**
 * Get score label
 */
export function getScoreLabel(score: number): string {
  if (score >= REPUTATION_THRESHOLDS.EXCELLENT) return "Excellent";
  if (score >= REPUTATION_THRESHOLDS.GOOD) return "Good";
  if (score >= REPUTATION_THRESHOLDS.AVERAGE) return "Average";
  if (score >= REPUTATION_THRESHOLDS.POOR) return "Poor";
  return "Very Poor";
}

/**
 * Get rank badge info
 */
export function getRankBadge(rank: number): { emoji: string; bgColor: string; textColor: string } {
  if (rank === 1) return { emoji: "1st", bgColor: "bg-yellow-100", textColor: "text-yellow-800" };
  if (rank === 2) return { emoji: "2nd", bgColor: "bg-gray-100", textColor: "text-gray-800" };
  if (rank === 3) return { emoji: "3rd", bgColor: "bg-orange-100", textColor: "text-orange-800" };
  return { emoji: `#${rank}`, bgColor: "bg-gray-50", textColor: "text-gray-600" };
}

/**
 * Score component breakdown result
 */
export interface ScoreComponents {
  winRateScore: number;
  volumeScore: number;
  profitScore: number;
  consistencyScore: number;
  total: number;
  isNeutral: boolean;
}

/**
 * Calculate reputation score components (mirrors indexer logic)
 * Used for ScoreBreakdown component display
 *
 * Formula per docs/07-reputation-system.md:
 * - WinRateScore = winRate × 40
 * - VolumeScore = min(25, log₁₀(normalizedVolume + 1) × 8)
 * - ProfitScore = profit > 0 ? min(25, profitRatio × 250) : max(0, 12.5 - lossRatio × 125)
 * - ConsistencyScore = min(10, log₁₀(executionCount + 1) × 4)
 */
export function calculateReputationComponents(
  winRate: number,
  totalVolumeWei: string,
  profitLossWei: string,
  executionCount: number
): ScoreComponents {
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

  // Parse volumes from wei strings
  const totalVolume = parseFloat(totalVolumeWei) || 0;
  const profitLoss = parseFloat(profitLossWei) || 0;

  // 1. Win Rate Component (0-40 points)
  const winRateScore = Math.min(SCORE_WEIGHTS.WIN_RATE.max, winRate * SCORE_WEIGHTS.WIN_RATE.max);

  // 2. Volume Component (0-25 points)
  // USDC uses 6 decimals, not 18
  const normalizedVolume = totalVolume / 1e6;
  const volumeScore = Math.min(
    SCORE_WEIGHTS.VOLUME.max,
    Math.log10(normalizedVolume + 1) * 8
  );

  // 3. Profitability Component (0-25 points)
  let profitScore: number;
  if (profitLoss > 0) {
    const profitRatio = totalVolume > 0 ? profitLoss / totalVolume : 0;
    profitScore = Math.min(SCORE_WEIGHTS.PROFITABILITY.max, profitRatio * 250);
  } else {
    const lossRatio = totalVolume > 0 ? Math.abs(profitLoss) / totalVolume : 0;
    profitScore = Math.max(0, 12.5 - lossRatio * 125);
  }

  // 4. Consistency Component (0-10 points)
  const consistencyScore = Math.min(
    SCORE_WEIGHTS.CONSISTENCY.max,
    Math.log10(executionCount + 1) * 4
  );

  // Total score
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
 * Get score tier with label and recommendation
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

// ===========================================
// Blockchain Utilities
// ===========================================

/**
 * Get block explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string, chainId = CHAIN_ID): string {
  const baseUrl = EXPLORER_URLS[chainId as keyof typeof EXPLORER_URLS] || EXPLORER_URLS[11155111];
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get block explorer URL for an address
 */
export function getExplorerAddressUrl(address: string, chainId = CHAIN_ID): string {
  const baseUrl = EXPLORER_URLS[chainId as keyof typeof EXPLORER_URLS] || EXPLORER_URLS[11155111];
  return `${baseUrl}/address/${address}`;
}

// ===========================================
// Validation Utilities
// ===========================================

/**
 * Check if string is valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if string is valid transaction hash
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

// ===========================================
// Execution Result Utilities
// ===========================================

/**
 * Get execution result config for display
 */
export function getExecutionResultConfig(result: string): {
  label: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
} {
  switch (result) {
    case "SUCCESS":
      return {
        label: "Success",
        bgColor: "bg-green-50",
        textColor: "text-green-800",
        iconColor: "text-green-500",
      };
    case "FAILURE":
      return {
        label: "Failed",
        bgColor: "bg-red-50",
        textColor: "text-red-800",
        iconColor: "text-red-500",
      };
    case "PENDING":
    default:
      return {
        label: "Pending",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-800",
        iconColor: "text-yellow-500",
      };
  }
}

// ===========================================
// Clipboard Utilities
// ===========================================

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
