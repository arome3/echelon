"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";
import { toast } from "sonner";

// Note: Window.ethereum type is declared in useGrantPermission.ts

// ===========================================
// Types
// ===========================================

export interface UseRevokePermissionReturn {
  /** Function to revoke a permission by its ID */
  revokePermission: (permissionId: string) => Promise<boolean>;
  /** Whether a revoke operation is in progress */
  isRevoking: boolean;
  /** Error from the last revoke attempt, if any */
  error: Error | null;
  /** Reset the error state */
  reset: () => void;
}

// ===========================================
// Hook Implementation
// ===========================================

/**
 * Hook for revoking ERC-7715 permissions via MetaMask Smart Accounts Kit.
 *
 * @example
 * ```tsx
 * const { revokePermission, isRevoking, error } = useRevokePermission();
 *
 * const handleRevoke = async () => {
 *   const success = await revokePermission(permission.id);
 *   if (success) {
 *     console.log("Permission revoked!");
 *   }
 * };
 * ```
 */
export function useRevokePermission(): UseRevokePermissionReturn {
  const { address, isConnected } = useAccount();

  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsRevoking(false);
  }, []);

  const revokePermission = useCallback(
    async (permissionId: string): Promise<boolean> => {
      // Validate wallet connection
      if (!isConnected || !address) {
        const err = new Error("No account connected");
        setError(err);
        toast.error("Please connect your wallet");
        return false;
      }

      // Check for ethereum provider (MetaMask)
      if (typeof window === "undefined" || !window.ethereum) {
        const err = new Error("MetaMask not detected");
        setError(err);
        toast.error("Please install MetaMask to use this feature");
        return false;
      }

      // Validate permission ID
      if (!permissionId) {
        const err = new Error("Invalid permission ID");
        setError(err);
        toast.error("Invalid permission ID");
        return false;
      }

      setIsRevoking(true);
      setError(null);

      try {
        // Create wallet client directly from window.ethereum
        // This avoids timing issues with useWalletClient hook
        const walletClient = createWalletClient({
          account: address,
          chain: sepolia,
          transport: custom(window.ethereum),
        });

        // Show toast to guide user - experimental methods don't auto-popup
        toast.info("Check MetaMask Flask to approve the revocation", {
          description: "Click the Flask extension icon if no popup appears",
          duration: 8000,
        });

        // Revoke the permission via MetaMask using wallet_revokePermissions RPC
        // Cast to any to bypass TypeScript's strict RPC method typing
        await (walletClient.request as any)({
          method: "wallet_revokePermissions",
          params: [{ permissionId }],
        });

        toast.success("Permission revoked successfully!");
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to revoke permission");
        setError(error);

        console.error("ERC-7715 Revoke Error:", error);
        console.error("Error message:", error.message);

        // Handle specific error cases
        if (error.message.includes("User rejected") || error.message.includes("user rejected")) {
          toast.error("Revocation was cancelled");
        } else if (error.message.includes("not found") || error.message.includes("Permission not found")) {
          toast.error("Permission not found or already revoked");
        } else if (error.message.includes("MetaMask Flask") || error.message.includes("Flask")) {
          toast.error("Please install MetaMask Flask 13.5.0+ for ERC-7715 support", {
            description: "Regular MetaMask doesn't support ERC-7715 yet",
            duration: 8000,
          });
        } else if (
          error.message.includes("not supported") ||
          error.message.includes("unsupported") ||
          error.message.includes("method not found") ||
          error.message.includes("does not exist")
        ) {
          toast.error("ERC-7715 requires MetaMask Flask", {
            description: "Please install MetaMask Flask 13.5.0+ from flask.metamask.io",
            duration: 10000,
          });
        } else {
          toast.error(`Revoke error: ${error.message.slice(0, 100)}`, {
            duration: 8000,
          });
        }

        return false;
      } finally {
        setIsRevoking(false);
      }
    },
    [isConnected, address]
  );

  return {
    revokePermission,
    isRevoking,
    error,
    reset,
  };
}
