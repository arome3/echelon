/**
 * Echelon Agents - Configuration Loader
 *
 * Loads and validates environment variables for agent configuration.
 */

import type { Address } from 'viem';
import type { AgentConfig, DexSwapAgentConfig } from '../types/index.js';
import {
  DEFAULT_CHAIN_ID,
  getUniswapAddresses,
  getTokenAddresses
} from './chains.js';

// ============================================
// ENVIRONMENT VARIABLE NAMES
// ============================================

const ENV_KEYS = {
  // Required
  AGENT_ID: 'AGENT_ID',
  AGENT_PRIVATE_KEY: 'AGENT_PRIVATE_KEY',
  REGISTRY_ADDRESS: 'REGISTRY_ADDRESS',
  EXECUTION_ADDRESS: 'EXECUTION_ADDRESS',
  RPC_URL: 'RPC_URL',
  ENVIO_URL: 'ENVIO_URL',

  // Optional
  CHAIN_ID: 'CHAIN_ID',
  POLLING_INTERVAL_MS: 'POLLING_INTERVAL_MS',
  AGENT_TYPE: 'AGENT_TYPE',

  // Uniswap (optional - uses defaults if not set)
  UNISWAP_ROUTER_ADDRESS: 'UNISWAP_ROUTER_ADDRESS',
  UNISWAP_QUOTER_ADDRESS: 'UNISWAP_QUOTER_ADDRESS',
  WETH_ADDRESS: 'WETH_ADDRESS',
  USDC_ADDRESS: 'USDC_ADDRESS',
  SLIPPAGE_TOLERANCE: 'SLIPPAGE_TOLERANCE',
} as const;

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULTS = {
  CHAIN_ID: DEFAULT_CHAIN_ID,
  POLLING_INTERVAL_MS: 60000, // 1 minute
  SLIPPAGE_TOLERANCE: 0.005,  // 0.5%
  AGENT_TYPE: 'FundManager',
} as const;

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that a string is a valid hex address
 */
function isValidAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Validate that a string is a valid private key
 */
function isValidPrivateKey(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Get required environment variable or throw
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getOptionalEnv<T>(key: string, defaultValue: T, parser?: (v: string) => T): T {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return parser ? parser(value) : (value as unknown as T);
}

/**
 * Validate all required environment variables are present and valid
 */
export function validateEnv(): void {
  const errors: string[] = [];

  // Check required variables
  const required = [
    ENV_KEYS.AGENT_ID,
    ENV_KEYS.AGENT_PRIVATE_KEY,
    ENV_KEYS.REGISTRY_ADDRESS,
    ENV_KEYS.EXECUTION_ADDRESS,
    ENV_KEYS.RPC_URL,
    ENV_KEYS.ENVIO_URL,
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate address formats
  const privateKey = process.env[ENV_KEYS.AGENT_PRIVATE_KEY];
  if (privateKey && !isValidPrivateKey(privateKey)) {
    errors.push(`Invalid private key format for ${ENV_KEYS.AGENT_PRIVATE_KEY} (must be 0x followed by 64 hex chars)`);
  }

  const registryAddress = process.env[ENV_KEYS.REGISTRY_ADDRESS];
  if (registryAddress && !isValidAddress(registryAddress)) {
    errors.push(`Invalid address format for ${ENV_KEYS.REGISTRY_ADDRESS}`);
  }

  const executionAddress = process.env[ENV_KEYS.EXECUTION_ADDRESS];
  if (executionAddress && !isValidAddress(executionAddress)) {
    errors.push(`Invalid address format for ${ENV_KEYS.EXECUTION_ADDRESS}`);
  }

  // Validate URL formats
  const rpcUrl = process.env[ENV_KEYS.RPC_URL];
  if (rpcUrl && !rpcUrl.startsWith('http')) {
    errors.push(`Invalid URL format for ${ENV_KEYS.RPC_URL}`);
  }

  const envioUrl = process.env[ENV_KEYS.ENVIO_URL];
  if (envioUrl && !envioUrl.startsWith('http')) {
    errors.push(`Invalid URL format for ${ENV_KEYS.ENVIO_URL}`);
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
}

// ============================================
// CONFIGURATION LOADERS
// ============================================

/**
 * Load base agent configuration from environment variables
 */
export function loadConfig(): AgentConfig {
  validateEnv();

  const chainId = getOptionalEnv(
    ENV_KEYS.CHAIN_ID,
    DEFAULTS.CHAIN_ID,
    (v) => parseInt(v, 10)
  );

  return {
    agentId: getRequiredEnv(ENV_KEYS.AGENT_ID),
    privateKey: getRequiredEnv(ENV_KEYS.AGENT_PRIVATE_KEY) as `0x${string}`,
    registryAddress: getRequiredEnv(ENV_KEYS.REGISTRY_ADDRESS) as Address,
    executionAddress: getRequiredEnv(ENV_KEYS.EXECUTION_ADDRESS) as Address,
    rpcUrl: getRequiredEnv(ENV_KEYS.RPC_URL),
    envioUrl: getRequiredEnv(ENV_KEYS.ENVIO_URL),
    pollingIntervalMs: getOptionalEnv(
      ENV_KEYS.POLLING_INTERVAL_MS,
      DEFAULTS.POLLING_INTERVAL_MS,
      (v) => parseInt(v, 10)
    ),
    chainId,
  };
}

/**
 * Load DexSwapAgent configuration with Uniswap addresses
 */
export function loadDexSwapConfig(): DexSwapAgentConfig {
  const baseConfig = loadConfig();
  const chainId = baseConfig.chainId;

  // Get default Uniswap addresses for this chain
  const uniswapAddresses = getUniswapAddresses(chainId);
  const tokenAddresses = getTokenAddresses(chainId);

  return {
    ...baseConfig,
    uniswapRouterAddress: getOptionalEnv(
      ENV_KEYS.UNISWAP_ROUTER_ADDRESS,
      uniswapAddresses.swapRouter,
      (v) => v as Address
    ),
    uniswapQuoterAddress: getOptionalEnv(
      ENV_KEYS.UNISWAP_QUOTER_ADDRESS,
      uniswapAddresses.quoter,
      (v) => v as Address
    ),
    wethAddress: getOptionalEnv(
      ENV_KEYS.WETH_ADDRESS,
      tokenAddresses.WETH,
      (v) => v as Address
    ),
    usdcAddress: getOptionalEnv(
      ENV_KEYS.USDC_ADDRESS,
      tokenAddresses.USDC,
      (v) => v as Address
    ),
    slippageTolerance: getOptionalEnv(
      ENV_KEYS.SLIPPAGE_TOLERANCE,
      DEFAULTS.SLIPPAGE_TOLERANCE,
      (v) => parseFloat(v)
    ),
  };
}

/**
 * Get the agent type from environment (FundManager or DexSwap)
 */
export function getAgentType(): string {
  return getOptionalEnv(ENV_KEYS.AGENT_TYPE, DEFAULTS.AGENT_TYPE);
}

/**
 * Get polling interval in milliseconds
 */
export function getPollingInterval(): number {
  return getOptionalEnv(
    ENV_KEYS.POLLING_INTERVAL_MS,
    DEFAULTS.POLLING_INTERVAL_MS,
    (v) => parseInt(v, 10)
  );
}

// Re-export chain config
export * from './chains.js';

// Re-export delegation config
export * from './delegation.js';
