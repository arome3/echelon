/**
 * Echelon Agents - Utility Helpers
 *
 * Shared utility functions for calculations, formatting, and common operations.
 */

import { formatUnits, parseUnits } from 'viem';

// ============================================
// ASYNC UTILITIES
// ============================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        onRetry?.(lastError, attempt + 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ============================================
// MATH UTILITIES
// ============================================

/**
 * Calculate standard deviation (volatility) from an array of values
 */
export function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Determine market trend from recent profit/loss values
 */
export function determineTrend(
  profitLosses: number[],
  threshold: number = 0.05
): 'up' | 'down' | 'neutral' {
  if (profitLosses.length < 3) return 'neutral';

  // Weight recent values more heavily
  const weights = profitLosses.map((_, i) => Math.pow(0.8, profitLosses.length - i - 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedAvg = profitLosses.reduce((sum, v, i) => sum + v * weights[i], 0) / totalWeight;

  if (weightedAvg > threshold) return 'up';
  if (weightedAvg < -threshold) return 'down';
  return 'neutral';
}

/**
 * Calculate simple moving average
 */
export function calculateSMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

/**
 * Calculate win rate from success/total counts
 */
export function calculateWinRate(
  successful: number | bigint,
  total: number | bigint
): number {
  const s = typeof successful === 'bigint' ? Number(successful) : successful;
  const t = typeof total === 'bigint' ? Number(total) : total;

  if (t === 0) return 0;
  return s / t;
}

/**
 * Calculate profit percentage
 */
export function calculateProfitPercent(
  amountIn: bigint,
  amountOut: bigint
): number {
  if (amountIn === 0n) return 0;
  return Number((amountOut - amountIn) * 10000n / amountIn) / 100;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format wei value to human-readable string
 */
export function formatWei(
  value: bigint,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  const formatted = formatUnits(value, decimals);
  const num = parseFloat(formatted);

  if (num === 0) return '0';
  if (Math.abs(num) < 0.0001) return num.toExponential(2);

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

/**
 * Parse token amount string to bigint
 */
export function parseTokenAmount(
  amount: string | number,
  decimals: number
): bigint {
  return parseUnits(String(amount), decimals);
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format timestamp to ISO string
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const ms = typeof timestamp === 'bigint' ? Number(timestamp) * 1000 : timestamp * 1000;
  return new Date(ms).toISOString();
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number | bigint): string {
  const s = typeof seconds === 'bigint' ? Number(seconds) : seconds;

  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

/**
 * Format percentage for display
 */
export function formatPercent(
  value: number,
  decimals: number = 2,
  includeSign: boolean = false
): string {
  const formatted = value.toFixed(decimals);
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${formatted}%`;
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if a string is a valid transaction hash
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Check if a value is a valid positive bigint
 */
export function isPositiveBigInt(value: bigint): boolean {
  return value > 0n;
}

// ============================================
// CONVERSION UTILITIES
// ============================================

/**
 * Convert string amounts from indexer to bigint
 */
export function parseBigDecimal(value: string, decimals: number = 18): bigint {
  // Handle scientific notation and decimal strings from indexer
  const num = parseFloat(value);
  if (isNaN(num)) return 0n;

  // Convert to string with full precision, then to bigint
  const factor = 10 ** decimals;
  return BigInt(Math.floor(num * factor));
}

/**
 * Safe BigInt conversion from various types
 */
export function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.floor(value));
  return BigInt(value);
}

/**
 * Convert basis points to decimal (10000 = 100%)
 */
export function bpsToDecimal(bps: number): number {
  return bps / 10000;
}

/**
 * Convert decimal to basis points
 */
export function decimalToBps(decimal: number): number {
  return Math.floor(decimal * 10000);
}

// ============================================
// ARRAY UTILITIES
// ============================================

/**
 * Get the last N elements from an array
 */
export function takeLast<T>(arr: T[], n: number): T[] {
  return arr.slice(-n);
}

/**
 * Chunk an array into smaller arrays of specified size
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Get current Unix timestamp in seconds
 */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Check if a timestamp (in seconds) has expired
 */
export function isExpired(expiresAt: number | bigint): boolean {
  const exp = typeof expiresAt === 'bigint' ? Number(expiresAt) : expiresAt;
  return exp <= nowSeconds();
}

/**
 * Get date string in YYYY-MM-DD format
 */
export function getDateString(timestamp?: number): string {
  const date = timestamp ? new Date(timestamp * 1000) : new Date();
  return date.toISOString().split('T')[0];
}

// ============================================
// CRYPTOGRAPHIC UTILITIES
// ============================================

/**
 * Generate a random 32-byte salt for delegation creation
 * Returns a hex string (0x-prefixed, 64 characters)
 */
export function generateRandomSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}` as `0x${string}`;
}

/**
 * Generate a deterministic salt from agent ID and timestamp
 * Useful for reproducible delegation creation
 */
export function generateDeterministicSalt(
  agentId: string,
  timestamp: number = nowSeconds()
): `0x${string}` {
  // Simple hash: combine agentId and timestamp
  const input = `${agentId}-${timestamp}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Pad to 32 bytes
  const hex = Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
  return `0x${hex}` as `0x${string}`;
}
