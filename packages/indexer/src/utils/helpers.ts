/**
 * Indexer Helper Utilities
 */

// ============================================
// ADDRESS UTILITIES
// ============================================

/**
 * Normalize address to lowercase
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Check if address is valid
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get checksum address
 */
export function toChecksumAddress(address: string): string {
  // Simple implementation - in production use viem or ethers
  return address.toLowerCase();
}

// ============================================
// BIGINT UTILITIES
// ============================================

/**
 * Convert BigInt to string safely
 */
export function bigIntToString(value: bigint): string {
  return value.toString();
}

/**
 * Parse string to BigInt safely
 */
export function stringToBigInt(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

/**
 * Add two BigDecimal strings
 */
export function addBigDecimal(a: string, b: string): string {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;
  return (numA + numB).toString();
}

/**
 * Subtract two BigDecimal strings
 */
export function subtractBigDecimal(a: string, b: string): string {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;
  return (numA - numB).toString();
}

// ============================================
// TOKEN UTILITIES
// ============================================

// Common token addresses on Sepolia
export const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238": { symbol: "USDC", decimals: 6 },
  "0x7169d38820dfd117c3fa1f22a697dba58d90ba06": { symbol: "USDT", decimals: 6 },
  "0xfff9976782d46cc05630d1f6ebab18b2324d6b14": { symbol: "WETH", decimals: 18 },
  "0x0000000000000000000000000000000000000000": { symbol: "ETH", decimals: 18 },
};

/**
 * Get token symbol from address
 */
export function getTokenSymbol(address: string): string | undefined {
  const normalized = normalizeAddress(address);
  return KNOWN_TOKENS[normalized]?.symbol;
}

/**
 * Get token decimals from address
 */
export function getTokenDecimals(address: string): number {
  const normalized = normalizeAddress(address);
  return KNOWN_TOKENS[normalized]?.decimals || 18;
}

/**
 * Format token amount based on decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, "0");
  const trimmedFraction = fractionStr.replace(/0+$/, "");

  return `${whole}.${trimmedFraction}`;
}

// ============================================
// TIME UTILITIES
// ============================================

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

/**
 * Check if a timestamp is expired
 */
export function isExpired(expiresAt: bigint): boolean {
  return getCurrentTimestamp() > expiresAt;
}

/**
 * Get time remaining until expiry
 */
export function getTimeRemaining(expiresAt: bigint): bigint {
  const now = getCurrentTimestamp();
  return expiresAt > now ? expiresAt - now : BigInt(0);
}

/**
 * Format duration in human readable format
 */
export function formatDuration(seconds: bigint): string {
  const secs = Number(seconds);

  if (secs < 60) return `${secs} seconds`;
  if (secs < 3600) return `${Math.floor(secs / 60)} minutes`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hours`;
  return `${Math.floor(secs / 86400)} days`;
}

// ============================================
// PERCENTAGE UTILITIES
// ============================================

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate composite ID from parts
 */
export function generateCompositeId(...parts: (string | number | bigint)[]): string {
  return parts.map(String).join("-");
}

/**
 * Generate execution ID
 */
export function generateExecutionId(
  agentId: string,
  userAddress: string,
  timestamp: bigint
): string {
  return generateCompositeId(agentId, userAddress, timestamp);
}

/**
 * Generate permission ID
 */
export function generatePermissionId(
  userAddress: string,
  agentId: string,
  grantedAt: bigint
): string {
  return generateCompositeId(userAddress, agentId, grantedAt);
}

/**
 * Generate daily stat ID
 */
export function generateDailyStatId(agentId: string, dayId: number): string {
  return generateCompositeId(agentId, dayId);
}
