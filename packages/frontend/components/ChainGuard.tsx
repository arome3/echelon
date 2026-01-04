"use client";

import { useEffect, useState, useRef } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "viem/chains";
import { toast } from "sonner";

/**
 * ChainGuard Component
 *
 * Automatically prompts users to switch to Sepolia when connected to a different chain.
 * ERC-7715 (Advanced Permissions) only works on Sepolia.
 */
export function ChainGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [hasSwitched, setHasSwitched] = useState(false);
  const switchAttempted = useRef(false);

  useEffect(() => {
    // Don't run if:
    // - Not connected
    // - Still connecting/reconnecting
    // - Already on Sepolia
    // - Already attempted switch
    // - Switch is pending
    if (
      !isConnected ||
      isConnecting ||
      isReconnecting ||
      chainId === sepolia.id ||
      hasSwitched ||
      isPending ||
      switchAttempted.current
    ) {
      return;
    }

    // Mark that we've attempted a switch to prevent duplicate calls
    switchAttempted.current = true;

    // Auto-switch to Sepolia
    const switchToSepolia = async () => {
      try {
        toast.info("Switching to Sepolia network for ERC-7715 support...");
        switchChain({ chainId: sepolia.id });
        setHasSwitched(true);
      } catch (error) {
        console.error("Failed to switch chain:", error);
        toast.error("Please switch to Sepolia network manually");
      }
    };

    // Delay to ensure wallet connection is fully established
    const timeout = setTimeout(switchToSepolia, 1000);
    return () => clearTimeout(timeout);
  }, [isConnected, isConnecting, isReconnecting, chainId, switchChain, hasSwitched, isPending]);

  // Reset state when disconnected
  useEffect(() => {
    if (!isConnected) {
      setHasSwitched(false);
      switchAttempted.current = false;
    }
  }, [isConnected]);

  // Reset switchAttempted when chain changes to Sepolia
  useEffect(() => {
    if (chainId === sepolia.id) {
      switchAttempted.current = false;
    }
  }, [chainId]);

  return <>{children}</>;
}

/**
 * Hook to check if on correct chain
 */
export function useIsCorrectChain(): boolean {
  const chainId = useChainId();
  return chainId === sepolia.id;
}

/**
 * Hook to get chain status info
 */
export function useChainStatus() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isCorrectChain = chainId === sepolia.id;
  const chainName = chainId === 1 ? "Mainnet" : chainId === sepolia.id ? "Sepolia" : `Chain ${chainId}`;

  const switchToSepolia = () => {
    if (!isPending) {
      switchChain({ chainId: sepolia.id });
    }
  };

  return {
    isConnected,
    chainId,
    chainName,
    isCorrectChain,
    isSwitching: isPending,
    switchToSepolia,
  };
}
