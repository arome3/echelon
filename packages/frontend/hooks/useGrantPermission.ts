"use client";

import { useState, useCallback } from "react";
import { useAccount, useChainId } from "wagmi";
import { createWalletClient, createPublicClient, custom, parseUnits, http, keccak256, encodePacked } from "viem";
import { sepolia } from "viem/chains";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { toast } from "sonner";
import { useApolloClient } from "@apollo/client";
import { TOKENS, PERIOD_DURATIONS, CONTRACTS } from "@/lib/constants";
import { GET_USER_PERMISSIONS, GET_AGENT_PERMISSIONS } from "@/graphql/queries";
import { savePermissionToStorage, type StoredPermission } from "./useWalletPermissions";
import { storeDelegation } from "@/lib/supabase";
// Note: Window.ethereum type is declared in @/lib/types

// PermissionRegistry ABI (minimal - only what we need)
const PERMISSION_REGISTRY_ABI = [
  {
    name: "recordPermission",
    type: "function",
    inputs: [
      { name: "agent", type: "address" },
      { name: "token", type: "address" },
      { name: "amountPerPeriod", type: "uint256" },
      { name: "periodDuration", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
      { name: "permissionHash", type: "bytes32" },
    ],
    outputs: [{ name: "permissionId", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
] as const;

// ===========================================
// Types
// ===========================================

export interface GrantPermissionParams {
  /** The agent's wallet address that will receive the permission */
  agentAddress: string;
  /** The agent's display name (for UI) */
  agentName?: string;
  /** The agent's numeric ID from the indexer (e.g., "1", "2", "3") for routing */
  agentId?: string;
  /** Amount per period in token units (e.g., "100" for 100 USDC) */
  amount: string;
  /** Period duration in seconds (use PERIOD_DURATIONS constants) */
  periodDuration: number;
  /** Number of days until the permission expires */
  expiryDays: number;
  /** Token contract address (defaults to USDC) */
  tokenAddress?: string;
  /** Token decimals (defaults to 6 for USDC) */
  decimals?: number;
  /** Human-readable justification for the permission */
  justification?: string;
  /** Agent reputation score (for UI display) */
  agentReputationScore?: number;
  /** Agent strategy type (for UI display) */
  agentStrategyType?: string;
  /** Whether agent is verified (for UI display) */
  agentIsVerified?: boolean;
}

export interface GrantPermissionResult {
  /** Unique identifier for the granted permission */
  permissionId: string;
  /** Unix timestamp when the permission was granted */
  grantedAt: number;
  /** Unix timestamp when the permission will expire */
  expiresAt: number;
}

export interface UseGrantPermissionReturn {
  /** Function to grant a permission */
  grantPermission: (params: GrantPermissionParams) => Promise<GrantPermissionResult | null>;
  /** Whether a grant operation is in progress */
  isGranting: boolean;
  /** Error from the last grant attempt, if any */
  error: Error | null;
  /** Reset the error state */
  reset: () => void;
}

// ===========================================
// Hook Implementation
// ===========================================

/**
 * Hook for granting ERC-7715 permissions to AI agents via MetaMask Smart Accounts Kit.
 *
 * @example
 * ```tsx
 * const { grantPermission, isGranting, error } = useGrantPermission();
 *
 * const handleGrant = async () => {
 *   const result = await grantPermission({
 *     agentAddress: "0x...",
 *     amount: "100",
 *     periodDuration: PERIOD_DURATIONS.DAILY,
 *     expiryDays: 7,
 *   });
 *   if (result) {
 *     console.log("Permission granted:", result.permissionId);
 *   }
 * };
 * ```
 */
export function useGrantPermission(): UseGrantPermissionReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const apolloClient = useApolloClient();

  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsGranting(false);
  }, []);

  const grantPermission = useCallback(
    async (params: GrantPermissionParams): Promise<GrantPermissionResult | null> => {
      const {
        agentAddress,
        agentName,
        agentId,
        amount,
        periodDuration,
        expiryDays,
        tokenAddress = TOKENS.USDC,
        decimals = 6,
        justification,
        agentReputationScore,
        agentStrategyType,
        agentIsVerified,
      } = params;

      // Validate wallet connection
      if (!isConnected || !address) {
        const err = new Error("No account connected");
        setError(err);
        toast.error("Please connect your wallet");
        return null;
      }

      // Check for ethereum provider (MetaMask)
      if (typeof window === "undefined" || !window.ethereum) {
        const err = new Error("MetaMask not detected");
        setError(err);
        toast.error("Please install MetaMask to use this feature");
        return null;
      }

      // ERC-7715 is only supported on Sepolia testnet
      // Check if user is on the correct chain and switch if needed
      if (chainId !== sepolia.id) {
        toast.info("Switching to Sepolia network for ERC-7715 support...");
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${sepolia.id.toString(16)}` }],
          });
        } catch (switchError: unknown) {
          // If the chain hasn't been added to MetaMask, add it
          if ((switchError as { code?: number })?.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: `0x${sepolia.id.toString(16)}`,
                    chainName: "Sepolia",
                    nativeCurrency: {
                      name: "Sepolia ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: ["https://rpc.sepolia.org"],
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  },
                ],
              });
            } catch (addError) {
              const err = new Error("Failed to add Sepolia network");
              setError(err);
              toast.error("Please add Sepolia network to MetaMask manually");
              return null;
            }
          } else {
            const err = new Error("Failed to switch to Sepolia network");
            setError(err);
            toast.error("Please switch to Sepolia network in MetaMask");
            return null;
          }
        }
      }

      // Always use Sepolia for ERC-7715
      // Create wallet client directly from window.ethereum
      const walletClient = createWalletClient({
        account: address,
        chain: sepolia,
        transport: custom(window.ethereum),
      });

      // Validate agent address
      if (!agentAddress || !agentAddress.startsWith("0x")) {
        const err = new Error("Invalid agent address");
        setError(err);
        toast.error("Invalid agent address");
        return null;
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        const err = new Error("Invalid amount");
        setError(err);
        toast.error("Amount must be greater than 0");
        return null;
      }

      setIsGranting(true);
      setError(null);

      try {
        // Extend wallet client with ERC-7715 actions
        const extendedClient = walletClient.extend(erc7715ProviderActions());

        // Calculate timestamps
        const currentTime = Math.floor(Date.now() / 1000);
        const expiry = currentTime + expiryDays * 24 * 60 * 60;

        // Build justification message
        const periodLabel = getPeriodLabel(periodDuration);
        const defaultJustification = `Echelon AI Agent: ${amount} ${getTokenSymbol(tokenAddress)} per ${periodLabel.toLowerCase()}`;

        // Show toast to guide user - ERC-7715 doesn't auto-popup like regular txs
        toast.info("Check MetaMask Flask to approve the permission request", {
          description: "Click the Flask extension icon if no popup appears",
          duration: 10000,
        });

        // Request ERC-7715 permission from MetaMask (always on Sepolia)
        const grantedPermissions = await extendedClient.requestExecutionPermissions([
          {
            chainId: sepolia.id,
            expiry,
            signer: {
              type: "account",
              data: {
                address: agentAddress as `0x${string}`,
              },
            },
            permission: {
              type: "erc20-token-periodic",
              data: {
                tokenAddress: tokenAddress as `0x${string}`,
                periodAmount: parseUnits(amount, decimals),
                periodDuration,
                justification: justification || defaultJustification,
              },
            },
            isAdjustmentAllowed: true,
          },
        ]);

        // Generate a unique permission ID since the response doesn't include one
        // Format: grantor-agent-timestamp for deterministic identification
        const permissionId = `${address}-${agentAddress}-${currentTime}`;

        // Calculate total amount based on expiry and period
        const periodsInGrant = Math.ceil((expiryDays * 24 * 60 * 60) / periodDuration);
        const totalAmount = (amountNum * periodsInGrant).toString();

        // ========================================
        // FLASK PERMISSION GRANTED - from here on, we MUST return a result
        // All subsequent operations are optional and should not prevent success
        // ========================================
        const successResult: GrantPermissionResult = {
          permissionId,
          grantedAt: currentTime,
          expiresAt: expiry,
        };

        // ========================================
        // OPTIONAL OPERATIONS - wrap in try-catch to ensure we return successResult
        // ========================================
        try {
          // Create permission object for cache
          const newPermission = {
            __typename: "Permission",
            id: permissionId,
            user: {
              __typename: "User",
              id: address.toLowerCase(),
            },
            agent: {
              __typename: "Agent",
              id: agentAddress.toLowerCase(),
            },
            permissionType: "erc20-token-periodic",
            tokenAddress: tokenAddress,
            tokenSymbol: getTokenSymbol(tokenAddress),
            amountPerPeriod: amount,
            periodDuration: periodDuration.toString(),
            totalAmount: totalAmount,
            grantedAt: currentTime.toString(),
            expiresAt: expiry.toString(),
            revokedAt: null,
            isActive: true,
            amountUsed: "0",
            amountRemaining: totalAmount,
            periodsElapsed: "0",
            grantTxHash: "",
            revokeTxHash: null,
          };

          // Update Apollo cache to immediately show the new permission
          try {
            apolloClient.cache.modify({
              fields: {
                Permission(existingPermissions = [], { toReference }) {
                  const newRef = apolloClient.cache.writeFragment({
                    data: newPermission,
                    fragment: require("@/graphql/fragments").PERMISSION_FIELDS,
                  });
                  return [newRef, ...existingPermissions];
                },
              },
            });
          } catch (cacheError) {
            console.warn("Failed to update permission cache:", cacheError);
          }

          // Save to localStorage for persistence across page reloads
          const storedPermission: StoredPermission = {
            id: permissionId,
            userAddress: address,
            agentAddress: agentAddress,
            agentName: agentName || `Agent ${agentAddress.slice(0, 8)}...`,
            tokenAddress: tokenAddress,
            tokenSymbol: getTokenSymbol(tokenAddress),
            amount: amount,
            periodDuration: periodDuration,
            grantedAt: currentTime,
            expiresAt: expiry,
            agentId: agentId,
            agentReputationScore: agentReputationScore,
            agentStrategyType: agentStrategyType,
            agentIsVerified: agentIsVerified,
          };
          savePermissionToStorage(storedPermission);
          console.log("Permission saved to localStorage:", storedPermission);

          // Record permission on-chain for indexer to pick up
          if (CONTRACTS.PERMISSION_REGISTRY) {
            try {
              toast.info("Recording permission on-chain...", {
                description: "Confirm the transaction in MetaMask",
                duration: 8000,
              });

              const onChainPermissionHash = keccak256(
                encodePacked(
                  ["address", "address", "address", "uint256", "uint256", "uint256"],
                  [
                    address as `0x${string}`,
                    agentAddress as `0x${string}`,
                    tokenAddress as `0x${string}`,
                    parseUnits(amount, decimals),
                    BigInt(periodDuration),
                    BigInt(expiry),
                  ]
                )
              );

              const txHash = await walletClient.writeContract({
                address: CONTRACTS.PERMISSION_REGISTRY as `0x${string}`,
                abi: PERMISSION_REGISTRY_ABI,
                functionName: "recordPermission",
                args: [
                  agentAddress as `0x${string}`,
                  tokenAddress as `0x${string}`,
                  parseUnits(amount, decimals),
                  BigInt(periodDuration),
                  BigInt(expiry),
                  onChainPermissionHash,
                ],
              });

              console.log("Permission recorded on-chain, tx:", txHash);

              const publicClient = createPublicClient({
                chain: sepolia,
                transport: http(),
              });

              try {
                const receipt = await publicClient.waitForTransactionReceipt({
                  hash: txHash,
                  timeout: 30_000,
                  pollingInterval: 2_000,
                  confirmations: 1,
                });

                if (receipt.status === "success") {
                  toast.success("Permission recorded on-chain!", {
                    description: "The indexer will pick this up shortly",
                  });
                }
              } catch (receiptError) {
                console.log("Receipt timeout, but tx was submitted:", txHash);
                toast.success("Permission submitted on-chain!", {
                  description: `Transaction pending. Hash: ${txHash.slice(0, 10)}...`,
                });
              }
            } catch (onChainError) {
              console.error("Failed to record permission on-chain:", onChainError);
              toast.warning("Permission granted but on-chain recording failed", {
                description: "The permission is active but may not appear in the dashboard immediately",
                duration: 8000,
              });
            }
          }

          // Store delegation data in Supabase for agent retrieval
          try {
            const supabasePermissionHash = keccak256(
              encodePacked(
                ["address", "address", "address", "uint256", "uint256", "uint256"],
                [
                  address as `0x${string}`,
                  agentAddress as `0x${string}`,
                  tokenAddress as `0x${string}`,
                  parseUnits(amount, decimals),
                  BigInt(periodDuration),
                  BigInt(expiry),
                ]
              )
            );

            const delegationResult = await storeDelegation({
              permission_id: permissionId,
              user_address: address.toLowerCase(),
              agent_address: agentAddress.toLowerCase(),
              token_address: tokenAddress.toLowerCase(),
              amount_per_period: parseUnits(amount, decimals).toString(),
              period_duration: periodDuration,
              expires_at: expiry,
              granted_at: currentTime,
              delegation_data: JSON.stringify(grantedPermissions),
              permission_hash: supabasePermissionHash,
              status: "pending",
            });

            if (delegationResult.success) {
              console.log("Delegation stored in Supabase:", delegationResult.id);
            } else {
              console.warn("Failed to store delegation:", delegationResult.error);
            }
          } catch (supabaseError) {
            console.error("Supabase storage error:", supabaseError);
          }
        } catch (optionalOpsError) {
          // Even if optional operations fail, the Flask permission was granted
          console.error("Error in optional operations:", optionalOpsError);
        }

        // ALWAYS show success and return result - Flask permission was granted
        toast.success("Permission granted successfully!");
        return successResult;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to grant permission");
        setError(error);

        // Log the full error for debugging
        console.error("ERC-7715 Permission Error:", error);
        console.error("Error message:", error.message);

        // Handle specific error cases
        if (error.message.includes("User rejected") || error.message.includes("user rejected")) {
          toast.error("Permission request was cancelled");
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
          // ERC-7715 requires MetaMask Flask, not regular MetaMask
          toast.error("ERC-7715 requires MetaMask Flask", {
            description: "Please install MetaMask Flask 13.5.0+ from flask.metamask.io",
            duration: 10000,
          });
        } else {
          // Show actual error for debugging
          toast.error(`Permission error: ${error.message.slice(0, 100)}`, {
            duration: 8000,
          });
        }

        return null;
      } finally {
        setIsGranting(false);
      }
    },
    [isConnected, address, chainId, apolloClient]
  );

  return {
    grantPermission,
    isGranting,
    error,
    reset,
  };
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get human-readable label for period duration
 */
function getPeriodLabel(seconds: number): string {
  switch (seconds) {
    case PERIOD_DURATIONS.HOURLY:
      return "Hour";
    case PERIOD_DURATIONS.DAILY:
      return "Day";
    case PERIOD_DURATIONS.WEEKLY:
      return "Week";
    case PERIOD_DURATIONS.MONTHLY:
      return "Month";
    default:
      return `${seconds} seconds`;
  }
}

/**
 * Get token symbol from address
 */
function getTokenSymbol(tokenAddress: string): string {
  if (tokenAddress.toLowerCase() === TOKENS.USDC.toLowerCase()) {
    return "USDC";
  }
  return "tokens";
}
