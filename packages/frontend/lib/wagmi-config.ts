import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { metaMask, walletConnect } from "wagmi/connectors";
import { ALCHEMY_API_KEY, WALLETCONNECT_PROJECT_ID, CHAIN_ID } from "./constants";

// ===========================================
// Wagmi Configuration for Echelon
// ===========================================

/**
 * Supported chains
 * Sepolia is first (default) for ERC-7715 support
 */
const chains = [sepolia, mainnet] as const;

/**
 * Get the default chain based on environment
 */
export function getDefaultChain() {
  return CHAIN_ID === 1 ? mainnet : sepolia;
}

/**
 * Wagmi connectors configuration
 *
 * NOTE: For ERC-7715 support, users need MetaMask Flask.
 * If both MetaMask and Flask are installed, disable regular MetaMask
 * in browser extensions so only Flask responds.
 */
const connectors = WALLETCONNECT_PROJECT_ID
  ? [
      metaMask({
        dappMetadata: {
          name: "Echelon",
          url: typeof window !== "undefined" ? window.location.origin : "https://echelon.io",
        },
      }),
      walletConnect({
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata: {
          name: "Echelon",
          description: "AI Agent Marketplace with Performance-Gated Permissions",
          url: typeof window !== "undefined" ? window.location.origin : "https://echelon.io",
          icons: ["/logo.png"],
        },
        showQrModal: true,
      }),
    ]
  : [
      metaMask({
        dappMetadata: {
          name: "Echelon",
          url: typeof window !== "undefined" ? window.location.origin : "https://echelon.io",
        },
      }),
    ];

/**
 * RPC transport configuration
 * Uses Alchemy if available, otherwise reliable public RPCs
 */
const transports = {
  [sepolia.id]: http(
    ALCHEMY_API_KEY
      ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
      : "https://gateway.tenderly.co/public/sepolia"
  ),
  [mainnet.id]: http(
    ALCHEMY_API_KEY
      ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
      : "https://eth.llamarpc.com"
  ),
};

/**
 * Wagmi configuration
 * Used by WagmiProvider in the app
 */
export const config = createConfig({
  chains,
  connectors,
  transports,
  // Use cookie storage for SSR support
  storage: createStorage({
    storage: typeof window !== "undefined" ? cookieStorage : undefined,
  }),
  // Disable multi-provider discovery - we use MetaMask connector directly
  multiInjectedProviderDiscovery: false,
  // Batch multicall requests
  batch: {
    multicall: true,
  },
});

/**
 * TypeScript declaration for wagmi config type
 */
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

/**
 * Export chain constants for use elsewhere
 */
export { sepolia, mainnet };

/**
 * Get chain by ID
 */
export function getChainById(chainId: number) {
  return chains.find((chain) => chain.id === chainId);
}

/**
 * Check if a chain is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return chains.some((chain) => chain.id === chainId);
}
