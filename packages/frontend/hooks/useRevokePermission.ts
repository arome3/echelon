"use client";

import { useState, useCallback } from "react";
import { useAccount, useChainId } from "wagmi";
import { createWalletClient, createPublicClient, custom, http } from "viem";
import { sepolia } from "viem/chains";
import { useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import { CONTRACTS } from "@/lib/constants";
import { removePermissionFromStorage } from "./useWalletPermissions";

// Note: Window.ethereum type is declared in useGrantPermission.ts

// PermissionRegistry ABI (only revokePermission)
const PERMISSION_REGISTRY_ABI = [
  {
    name: "revokePermission",
    type: "function",
    inputs: [{ name: "permissionId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

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
 * Hook for revoking ERC-7715 permissions via the PermissionRegistry smart contract.
 * Calls the on-chain revokePermission function which emits PermissionRevoked event.
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
  const chainId = useChainId();
  const apolloClient = useApolloClient();

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

      // Validate contract address
      if (!CONTRACTS.PERMISSION_REGISTRY) {
        const err = new Error("Permission Registry contract not configured");
        setError(err);
        toast.error("Contract not configured");
        return false;
      }

      // ERC-7715 is only supported on Sepolia testnet
      if (chainId !== sepolia.id) {
        toast.info("Switching to Sepolia network...");
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${sepolia.id.toString(16)}` }],
          });
        } catch (switchError: unknown) {
          if ((switchError as { code?: number })?.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: `0x${sepolia.id.toString(16)}`,
                    chainName: "Sepolia",
                    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://rpc.sepolia.org"],
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  },
                ],
              });
            } catch {
              const err = new Error("Failed to add Sepolia network");
              setError(err);
              toast.error("Please add Sepolia network to MetaMask manually");
              return false;
            }
          } else {
            const err = new Error("Failed to switch to Sepolia network");
            setError(err);
            toast.error("Please switch to Sepolia network in MetaMask");
            return false;
          }
        }
      }

      setIsRevoking(true);
      setError(null);

      try {
        // Create wallet client
        const walletClient = createWalletClient({
          account: address,
          chain: sepolia,
          transport: custom(window.ethereum),
        });

        // Convert permission ID to bytes32 if needed
        // Permission IDs from the contract are already bytes32 hex strings
        let bytes32Id: `0x${string}`;
        if (permissionId.startsWith("0x") && permissionId.length === 66) {
          // Already a bytes32
          bytes32Id = permissionId as `0x${string}`;
        } else {
          // This shouldn't happen with on-chain permissions, but handle gracefully
          const err = new Error("Invalid permission ID format - must be a bytes32 hash");
          setError(err);
          toast.error("Invalid permission ID format");
          return false;
        }

        // Show toast to guide user
        toast.info("Confirm the revocation in MetaMask", {
          description: "This will revoke the agent's spending permission",
          duration: 10000,
        });

        // Call revokePermission on the PermissionRegistry contract
        const txHash = await walletClient.writeContract({
          address: CONTRACTS.PERMISSION_REGISTRY as `0x${string}`,
          abi: PERMISSION_REGISTRY_ABI,
          functionName: "revokePermission",
          args: [bytes32Id],
        });

        console.log("Revoke transaction submitted:", txHash);

        // Wait for confirmation
        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http(),
        });

        toast.info("Waiting for transaction confirmation...", { duration: 15000 });

        try {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            timeout: 60_000,
            pollingInterval: 2_000,
            confirmations: 1,
          });

          if (receipt.status === "success") {
            // Update Apollo cache to mark permission as inactive
            try {
              apolloClient.cache.modify({
                id: apolloClient.cache.identify({ __typename: "Permission", id: permissionId }),
                fields: {
                  isActive() { return false; },
                  revokedAt() { return Math.floor(Date.now() / 1000).toString(); },
                },
              });
            } catch (cacheError) {
              console.warn("Failed to update cache:", cacheError);
            }

            // Remove from localStorage
            removePermissionFromStorage(permissionId);

            toast.success("Permission revoked successfully!", {
              description: "The agent can no longer spend from your wallet",
            });
            return true;
          } else {
            throw new Error("Transaction failed");
          }
        } catch (receiptError) {
          console.log("Transaction submitted but receipt timeout:", txHash);
          // Transaction was submitted - it might still succeed
          toast.warning("Transaction submitted", {
            description: `Tx: ${txHash.slice(0, 10)}... - Check Etherscan for status`,
            duration: 10000,
          });
          return true; // Optimistically return true since tx was submitted
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to revoke permission");
        setError(error);

        console.error("Permission Revoke Error:", error);
        console.error("Error message:", error.message);

        // Handle specific error cases
        if (error.message.includes("User rejected") || error.message.includes("user rejected")) {
          toast.error("Revocation was cancelled");
        } else if (error.message.includes("PermissionNotFound") || error.message.includes("not found")) {
          toast.error("Permission not found on-chain", {
            description: "It may have already been revoked",
          });
        } else if (error.message.includes("NotPermissionOwner")) {
          toast.error("You are not the owner of this permission");
        } else if (error.message.includes("PermissionAlreadyRevoked") || error.message.includes("already revoked")) {
          toast.error("Permission already revoked");
        } else if (error.message.includes("insufficient funds")) {
          toast.error("Insufficient ETH for gas", {
            description: "You need Sepolia ETH to pay for the transaction",
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
    [isConnected, address, chainId, apolloClient]
  );

  return {
    revokePermission,
    isRevoking,
    error,
    reset,
  };
}
