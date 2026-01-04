/**
 * Echelon Agents - Chain Configuration
 *
 * Chain-specific settings for supported networks.
 */

import type { Address } from 'viem';
import { sepolia } from 'viem/chains';

// ============================================
// CHAIN IDS
// ============================================

export const SEPOLIA_CHAIN_ID = 11155111;
export const DEFAULT_CHAIN_ID = SEPOLIA_CHAIN_ID;

// ============================================
// UNISWAP V3 ADDRESSES (Sepolia)
// ============================================

/**
 * Uniswap V3 contract addresses on Sepolia testnet
 * @see https://docs.uniswap.org/contracts/v3/reference/deployments
 */
export const UNISWAP_V3_ADDRESSES = {
  [SEPOLIA_CHAIN_ID]: {
    /** SwapRouter02 - Main router for swaps */
    swapRouter: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' as Address,
    /** QuoterV2 - For getting swap quotes */
    quoter: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3' as Address,
    /** Factory - For pool lookups */
    factory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c' as Address,
    /** PositionManager - For liquidity positions */
    positionManager: '0x1238536071E1c677A632429e3655c799b22cDA52' as Address,
  },
} as const;

// ============================================
// TOKEN ADDRESSES (Sepolia)
// ============================================

/**
 * Common token addresses on Sepolia testnet
 */
export const TOKEN_ADDRESSES = {
  [SEPOLIA_CHAIN_ID]: {
    /** Wrapped ETH */
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as Address,
    /** USDC (Circle testnet) */
    USDC: '0x2BfBc55F4A360352Dc89e599D04898F150472cA6' as Address,
    /** DAI */
    DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574' as Address,
    /** LINK */
    LINK: '0x779877A7B0D9E8603169DdbD7836e478b4624789' as Address,
  },
} as const;

/**
 * Token decimals for common tokens
 */
export const TOKEN_DECIMALS: Record<string, number> = {
  WETH: 18,
  ETH: 18,
  USDC: 6,
  DAI: 18,
  LINK: 18,
};

// ============================================
// CHAIN CONFIGURATION
// ============================================

export interface ChainConfig {
  /** Chain ID */
  id: number;
  /** Human-readable name */
  name: string;
  /** Default RPC URL (use env var in production) */
  defaultRpcUrl: string;
  /** Block explorer URL */
  blockExplorer: string;
  /** Native token symbol */
  nativeToken: string;
  /** viem chain object */
  viemChain: typeof sepolia;
  /** Whether chain is a testnet */
  isTestnet: boolean;
}

/**
 * Chain configurations by chain ID
 */
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  [SEPOLIA_CHAIN_ID]: {
    id: SEPOLIA_CHAIN_ID,
    name: 'Sepolia',
    defaultRpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/demo',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeToken: 'ETH',
    viemChain: sepolia,
    isTestnet: true,
  },
};

// ============================================
// POOL FEES
// ============================================

/**
 * Uniswap V3 pool fee tiers (in hundredths of a bip)
 * 100 = 0.01%, 500 = 0.05%, 3000 = 0.3%, 10000 = 1%
 */
export const POOL_FEES = {
  LOWEST: 100,   // 0.01% - stable pairs
  LOW: 500,      // 0.05% - stable pairs
  MEDIUM: 3000,  // 0.30% - most pairs
  HIGH: 10000,   // 1.00% - exotic pairs
} as const;

/**
 * Default pool fee for common pairs on Sepolia
 */
export const DEFAULT_POOL_FEES: Record<string, number> = {
  'WETH/USDC': POOL_FEES.MEDIUM,
  'USDC/WETH': POOL_FEES.MEDIUM,
  'WETH/DAI': POOL_FEES.MEDIUM,
  'DAI/WETH': POOL_FEES.MEDIUM,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get chain configuration by ID
 */
export function getChainConfig(chainId: number): ChainConfig {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
}

/**
 * Get Uniswap V3 addresses for a chain
 */
export function getUniswapAddresses(chainId: number) {
  const addresses = UNISWAP_V3_ADDRESSES[chainId as keyof typeof UNISWAP_V3_ADDRESSES];
  if (!addresses) {
    throw new Error(`Uniswap V3 not deployed on chain ID: ${chainId}`);
  }
  return addresses;
}

/**
 * Get token addresses for a chain
 */
export function getTokenAddresses(chainId: number) {
  const tokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  if (!tokens) {
    throw new Error(`Token addresses not configured for chain ID: ${chainId}`);
  }
  return tokens;
}

/**
 * Get pool fee for a token pair
 */
export function getPoolFee(tokenA: string, tokenB: string): number {
  const key = `${tokenA}/${tokenB}`;
  return DEFAULT_POOL_FEES[key] ?? POOL_FEES.MEDIUM;
}
