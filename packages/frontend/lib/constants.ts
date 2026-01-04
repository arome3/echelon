// ===========================================
// Echelon Constants
// ===========================================

// Chain Configuration
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");
export const IS_MAINNET = CHAIN_ID === 1;
export const IS_SEPOLIA = CHAIN_ID === 11155111;

// Contract Addresses (Sepolia defaults for hackathon demo)
// Deployed: 2025-12-29 (Updated with verified flag support)
export const CONTRACTS = {
  REGISTRY: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0xCCf3E485bc5339C651f4fbb8F3c37881c0D0e704",
  EXECUTION: process.env.NEXT_PUBLIC_EXECUTION_ADDRESS || "0x861F841b1c2EB3756E3C00840e04B9393330eDF8",
  REPUTATION: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS || "0xe7577DCb82B739162f555d7B174B48B5f2D87e66",
  VALIDATION: process.env.NEXT_PUBLIC_VALIDATION_ADDRESS || "0x69B557C40669741688e82A712eddD68486935177",
  DELEGATION_MANAGER: process.env.NEXT_PUBLIC_DELEGATION_MANAGER_ADDRESS || "0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3",
  // Reputation-Gated Permission Contracts (ERC-7715 + Envio)
  ENVIO_ORACLE: process.env.NEXT_PUBLIC_ENVIO_ORACLE_ADDRESS || "0x00EEC585Aa6f948107FCe7B36FD4bB07774B4B3a",
  REPUTATION_ENFORCER: process.env.NEXT_PUBLIC_REPUTATION_ENFORCER_ADDRESS || "0xC9Ffdb47bda4E0cc9b06b335130f450d26fE6C56",
  // Permission Registry (on-chain ERC-7715 permission tracking)
  PERMISSION_REGISTRY: process.env.NEXT_PUBLIC_PERMISSION_REGISTRY_ADDRESS || "0x5182E277909e1e22db65360269BaEb145aC40b25",
} as const;

// ===========================================
// Echelon Fund Manager (Platform Default)
// ===========================================
// The official Fund Manager is a verified, pre-configured agent
// that handles A2A delegation to specialist agents

export const FUND_MANAGER = {
  // Agent ID in the registry (set after deployment)
  ID: process.env.NEXT_PUBLIC_FUND_MANAGER_ID || "1",
  // Fund Manager wallet address (deployed via RegisterAgents.s.sol)
  // Actual on-chain address: 0x562937835cdD5C92F54B94Df658Fd3b50A68ecD5
  ADDRESS: process.env.NEXT_PUBLIC_FUND_MANAGER_ADDRESS || "0x562937835cdD5C92F54B94Df658Fd3b50A68ecD5",
  // Display name
  NAME: "Echelon Fund Manager",
  // Strategy type
  STRATEGY: "Yield",
  // Risk level (1-10)
  RISK_LEVEL: 5,
  // Description for UI
  DESCRIPTION: "Echelon's official managed portfolio. Intelligently allocates your funds across top-performing specialist agents using A2A delegation.",
  // Features for marketing
  FEATURES: [
    "Diversified across multiple strategies",
    "Automatic rebalancing based on performance",
    "A2A delegation via ERC-7710",
    "Verified by Echelon team",
  ],
} as const;

// Token Addresses (Sepolia) - Circle's official testnet USDC
export const TOKENS = {
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x2BfBc55F4A360352Dc89e599D04898F150472cA6",
  // Add more tokens as needed
} as const;

// API Endpoints
export const ENVIO_GRAPHQL_URL = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL || "http://localhost:8080/v1/graphql";

// External API Keys
export const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "";
export const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY || "";

// Pimlico Bundler Configuration
export const BUNDLER_RPC_URL = PIMLICO_API_KEY
  ? `https://api.pimlico.io/v2/${CHAIN_ID}/rpc?apikey=${PIMLICO_API_KEY}`
  : "";

// ERC-4337 Entry Point (v0.7)
export const ENTRY_POINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

// RPC URLs
export const RPC_URLS = {
  [1]: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  [11155111]: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
} as const;

// Block Explorers
export const EXPLORER_URLS = {
  [1]: "https://etherscan.io",
  [11155111]: "https://sepolia.etherscan.io",
} as const;

// Strategy Types
export const STRATEGY_TYPES = [
  { value: "DCA", label: "Dollar Cost Average", description: "Automated periodic purchases" },
  { value: "Arbitrage", label: "Arbitrage", description: "Price difference exploitation" },
  { value: "Yield", label: "Yield Farming", description: "Optimize yield across protocols" },
  { value: "Momentum", label: "Momentum", description: "Trend-following strategies" },
  { value: "MeanReversion", label: "Mean Reversion", description: "Price mean reversion plays" },
  { value: "GridTrading", label: "Grid Trading", description: "Range-based order grids" },
] as const;

// Risk Levels
export const RISK_LEVELS = [
  { value: 1, label: "Very Conservative", color: "text-green-600" },
  { value: 2, label: "Conservative", color: "text-green-500" },
  { value: 3, label: "Moderately Conservative", color: "text-green-400" },
  { value: 4, label: "Moderate Low", color: "text-lime-500" },
  { value: 5, label: "Moderate", color: "text-yellow-500" },
  { value: 6, label: "Moderate High", color: "text-orange-400" },
  { value: 7, label: "Moderately Aggressive", color: "text-orange-500" },
  { value: 8, label: "Aggressive", color: "text-red-400" },
  { value: 9, label: "Very Aggressive", color: "text-red-500" },
  { value: 10, label: "Maximum Risk", color: "text-red-600" },
] as const;

// Reputation Score Thresholds
export const REPUTATION_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  AVERAGE: 40,
  POOR: 20,
} as const;

/**
 * Score tier definitions with labels and recommendations
 * Per docs/07-reputation-system.md
 */
export const SCORE_TIERS = {
  EXCELLENT: { min: 80, label: "Excellent", recommendation: "Safe for larger delegations" },
  GOOD: { min: 60, label: "Good", recommendation: "Standard delegations" },
  FAIR: { min: 40, label: "Fair", recommendation: "Small trial delegations" },
  POOR: { min: 20, label: "Poor", recommendation: "Use caution" },
  CRITICAL: { min: 0, label: "Critical", recommendation: "Not recommended" },
} as const;

/**
 * Score component weights (max points per component)
 * Win Rate: 40%, Volume: 25%, Profitability: 25%, Consistency: 10%
 */
export const SCORE_WEIGHTS = {
  WIN_RATE: { max: 40, label: "Win Rate", color: "bg-blue-500" },
  VOLUME: { max: 25, label: "Volume", color: "bg-green-500" },
  PROFITABILITY: { max: 25, label: "Profitability", color: "bg-purple-500" },
  CONSISTENCY: { max: 10, label: "Consistency", color: "bg-orange-500" },
} as const;

/**
 * Minimum executions required for reliable score (agents with fewer get neutral 50)
 */
export const MIN_EXECUTIONS_FOR_SCORE = 5;

// UI Constants
export const UI = {
  LEADERBOARD_PAGE_SIZE: 10,
  EXECUTIONS_PAGE_SIZE: 20,
  POLL_INTERVAL: 10000, // 10 seconds
  FAST_POLL_INTERVAL: 5000, // 5 seconds
  SLOW_POLL_INTERVAL: 30000, // 30 seconds
  TOAST_DURATION: 5000, // 5 seconds
  DECIMAL_PLACES: 4,
  ADDRESS_TRUNCATE_LENGTH: 6,
} as const;

// Period Durations in seconds (for ERC-7715)
export const PERIOD_DURATIONS = {
  HOURLY: 3600,
  DAILY: 86400,
  WEEKLY: 604800,
  MONTHLY: 2592000,
} as const;

// Permission Durations (in days)
export const PERMISSION_DURATIONS = [
  { value: 1, label: "1 Day (Trial)" },
  { value: 7, label: "7 Days" },
  { value: 14, label: "14 Days" },
  { value: 30, label: "30 Days" },
  { value: 90, label: "90 Days" },
] as const;

// Default Permission Amounts (USDC, in whole units)
export const DEFAULT_AMOUNTS = [
  { value: 10, label: "10 USDC" },
  { value: 25, label: "25 USDC" },
  { value: 50, label: "50 USDC" },
  { value: 100, label: "100 USDC" },
  { value: 250, label: "250 USDC" },
] as const;

// Navigation Links
export const NAV_LINKS = [
  { href: "/", label: "Leaderboard" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/register", label: "Register Agent" },
] as const;

// External Links
export const EXTERNAL_LINKS = {
  DOCS: "https://docs.echelon.io",
  GITHUB: "https://github.com/echelon",
  TWITTER: "https://twitter.com/echelon",
  DISCORD: "https://discord.gg/echelon",
} as const;
