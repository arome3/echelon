"use client";

/**
 * useSmartAccount Hook
 *
 * Manages MetaMask Smart Account creation and bundler client setup
 * for ERC-4337 account abstraction operations.
 *
 * @see https://docs.metamask.io/smart-accounts-kit/
 */

import { useState, useCallback, useEffect } from "react";
import { useWalletClient, usePublicClient, useAccount, useChainId } from "wagmi";
import {
  toMetaMaskSmartAccount,
  Implementation,
  type MetaMaskSmartAccount,
} from "@metamask/smart-accounts-kit";
import { createBundlerClient, type BundlerClient } from "viem/account-abstraction";
import { http, type PublicClient } from "viem";
import { BUNDLER_RPC_URL, PIMLICO_API_KEY, ENTRY_POINT_ADDRESS } from "@/lib/constants";

// ============================================
// Types
// ============================================

export interface UseSmartAccountReturn {
  /** The MetaMask Smart Account instance */
  smartAccount: MetaMaskSmartAccount | null;
  /** The Pimlico bundler client for UserOperation submission */
  bundlerClient: BundlerClient | null;
  /** The smart account address (may differ from EOA address) */
  smartAccountAddress: `0x${string}` | null;
  /** Whether the smart account is being initialized */
  isLoading: boolean;
  /** Whether the smart account has been initialized */
  isInitialized: boolean;
  /** Any error that occurred during initialization */
  error: Error | null;
  /** Initialize the smart account (call manually or on mount) */
  initialize: () => Promise<void>;
  /** Reset the smart account state */
  reset: () => void;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook for managing MetaMask Smart Account and Pimlico bundler client.
 *
 * The smart account is a Hybrid implementation that supports both EOA
 * ownership and passkey (WebAuthn) signers.
 *
 * @example
 * ```tsx
 * const { smartAccount, bundlerClient, initialize, isInitialized } = useSmartAccount();
 *
 * useEffect(() => {
 *   if (!isInitialized && isConnected) {
 *     initialize();
 *   }
 * }, [isConnected, isInitialized, initialize]);
 *
 * // Use smartAccount for delegation operations
 * // Use bundlerClient for UserOperation submission
 * ```
 */
export function useSmartAccount(): UseSmartAccountReturn {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [smartAccount, setSmartAccount] = useState<MetaMaskSmartAccount | null>(null);
  const [bundlerClient, setBundlerClient] = useState<BundlerClient | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setSmartAccount(null);
    setBundlerClient(null);
    setSmartAccountAddress(null);
    setIsLoading(false);
    setError(null);
  }, []);

  /**
   * Initialize the MetaMask Smart Account and Pimlico bundler client
   */
  const initialize = useCallback(async () => {
    // Validate prerequisites
    if (!walletClient) {
      setError(new Error("Wallet client not available. Please connect your wallet."));
      return;
    }

    if (!publicClient) {
      setError(new Error("Public client not available."));
      return;
    }

    if (!address) {
      setError(new Error("No account connected."));
      return;
    }

    if (!PIMLICO_API_KEY) {
      setError(new Error("Pimlico API key not configured. Set NEXT_PUBLIC_PIMLICO_API_KEY."));
      return;
    }

    if (!BUNDLER_RPC_URL) {
      setError(new Error("Bundler RPC URL not configured."));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create MetaMask Smart Account (Hybrid implementation)
      // Hybrid supports both EOA owner and passkey signers
      const account = await toMetaMaskSmartAccount({
        client: publicClient as PublicClient,
        implementation: Implementation.Hybrid,
        deployParams: [address, [], [], []], // owner, signers, weights, threshold
        deploySalt: "0x", // Use default salt for deterministic address
        signer: {
          account: walletClient.account!,
        },
      });

      // Create Bundler Client with Pimlico
      // This client handles UserOperation gas estimation and submission
      const bundler = createBundlerClient({
        client: publicClient as PublicClient,
        transport: http(BUNDLER_RPC_URL),
      });

      setSmartAccount(account);
      setBundlerClient(bundler);
      setSmartAccountAddress(account.address);

      console.log("[useSmartAccount] Initialized:", {
        eoaAddress: address,
        smartAccountAddress: account.address,
        chainId,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to initialize smart account");
      setError(error);
      console.error("[useSmartAccount] Initialization failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address, chainId]);

  /**
   * Reset state when wallet disconnects or changes
   */
  useEffect(() => {
    if (!isConnected) {
      reset();
    }
  }, [isConnected, reset]);

  /**
   * Reinitialize when chain changes (smart account address may differ per chain)
   */
  useEffect(() => {
    if (smartAccount && chainId && isConnected && walletClient) {
      // Chain changed, reset and reinitialize
      reset();
      // Delay initialization to allow reset to complete
      const timer = setTimeout(() => {
        initialize();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  return {
    smartAccount,
    bundlerClient,
    smartAccountAddress,
    isLoading,
    isInitialized: !!smartAccount && !!bundlerClient,
    error,
    initialize,
    reset,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if the current chain supports Smart Accounts
 */
export function isSmartAccountSupported(chainId: number): boolean {
  // Sepolia and most EIP-7702 compatible chains are supported
  const supportedChains = [
    11155111, // Sepolia
    1, // Mainnet
    42161, // Arbitrum One
    421614, // Arbitrum Sepolia
    8453, // Base
    84532, // Base Sepolia
    10, // Optimism
    11155420, // Optimism Sepolia
  ];
  return supportedChains.includes(chainId);
}

/**
 * Get the bundler RPC URL for a specific chain
 */
export function getBundlerUrl(chainId: number, apiKey: string): string {
  return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${apiKey}`;
}
