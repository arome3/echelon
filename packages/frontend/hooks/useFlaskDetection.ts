"use client";

import { useState, useEffect, useCallback } from "react";
// Note: Window.ethereum type is declared in @/lib/types

// ===========================================
// Types
// ===========================================

export interface FlaskDetectionResult {
  /** Whether detection has completed */
  isChecking: boolean;
  /** Whether MetaMask is installed */
  hasMetaMask: boolean;
  /** Whether MetaMask Flask is installed (vs regular MetaMask) */
  hasFlask: boolean;
  /** The detected wallet version */
  walletVersion: string | null;
  /** Whether ERC-7715 is likely supported */
  supportsERC7715: boolean;
  /** Re-check the wallet */
  recheck: () => void;
}

// ===========================================
// Flask Detection Hook
// ===========================================

/**
 * Hook to detect if MetaMask Flask is installed.
 * ERC-7715 (Advanced Permissions) requires MetaMask Flask 13.5.0+
 */
export function useFlaskDetection(): FlaskDetectionResult {
  const [isChecking, setIsChecking] = useState(true);
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [hasFlask, setHasFlask] = useState(false);
  const [walletVersion, setWalletVersion] = useState<string | null>(null);
  const [supportsERC7715, setSupportsERC7715] = useState(false);

  const checkFlask = useCallback(async () => {
    setIsChecking(true);

    // Check if we're in browser environment
    if (typeof window === "undefined") {
      setIsChecking(false);
      return;
    }

    // Check if ethereum provider exists
    const ethereum = window.ethereum;
    if (!ethereum) {
      setHasMetaMask(false);
      setHasFlask(false);
      setIsChecking(false);
      return;
    }

    setHasMetaMask(true);

    try {
      // Try to get wallet client version
      // Flask has a different client version pattern
      const clientVersion = await ethereum.request({
        method: "web3_clientVersion",
      }) as string | undefined;

      if (clientVersion) {
        setWalletVersion(clientVersion);

        // Flask versions contain "flask" in the version string
        const isFlask = clientVersion.toLowerCase().includes("flask");
        setHasFlask(isFlask);

        // Check version number for ERC-7715 support (13.5.0+)
        if (isFlask) {
          const versionMatch = clientVersion.match(/(\d+)\.(\d+)\.(\d+)/);
          if (versionMatch) {
            const [, major, minor] = versionMatch.map(Number);
            // Flask 13.5.0 or later supports ERC-7715
            setSupportsERC7715(major > 13 || (major === 13 && minor >= 5));
          }
        }
      }

      // Alternative detection: try calling a Flask-specific method
      // or check for snaps capability (Flask feature)
      if (!hasFlask) {
        try {
          // Check if wallet_getSnaps exists (Flask-only feature)
          await ethereum.request({ method: "wallet_getSnaps" });
          setHasFlask(true);
          setSupportsERC7715(true); // If snaps work, likely Flask 13.5+
        } catch {
          // Method doesn't exist - likely regular MetaMask
          setHasFlask(false);
          setSupportsERC7715(false);
        }
      }
    } catch (error) {
      console.warn("Flask detection error:", error);
      // Assume regular MetaMask if detection fails
      setHasFlask(false);
      setSupportsERC7715(false);
    }

    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkFlask();
  }, [checkFlask]);

  return {
    isChecking,
    hasMetaMask,
    hasFlask,
    walletVersion,
    supportsERC7715,
    recheck: checkFlask,
  };
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Check if the current wallet supports ERC-7715 permissions
 * This is a one-time check that can be used outside of React
 */
export async function checkERC7715Support(): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    return false;
  }

  try {
    // Try to get snaps - this is a Flask-only feature
    await window.ethereum.request({ method: "wallet_getSnaps" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the Flask installation URL
 */
export function getFlaskInstallUrl(): string {
  return "https://flask.metamask.io/";
}

/**
 * Get the Flask documentation URL
 */
export function getFlaskDocsUrl(): string {
  return "https://docs.metamask.io/smart-accounts-kit/";
}
