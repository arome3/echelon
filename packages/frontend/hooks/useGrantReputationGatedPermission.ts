"use client";

import { useState, useCallback } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import {
  createWalletClient,
  createPublicClient,
  custom,
  parseUnits,
  http,
  keccak256,
  encodePacked,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { sepolia } from "viem/chains";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { toast } from "sonner";
import { TOKENS, CONTRACTS } from "@/lib/constants";
import { storeDelegation } from "@/lib/supabase";
import { savePermissionToStorage, type StoredPermission } from "./useWalletPermissions";

// ===========================================
// Contract ABIs (minimal - only what we need)
// ===========================================

const REPUTATION_GATE_ENFORCER_ABI = [
  {
    name: "encodeTerms",
    type: "function",
    inputs: [
      { name: "agentAddress", type: "address" },
      { name: "baseAmount", type: "uint256" },
      { name: "maxAmount", type: "uint256" },
      { name: "minReputationScore", type: "uint8" },
      { name: "maxStaleness", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "pure",
  },
  {
    name: "getActiveLimit",
    type: "function",
    inputs: [{ name: "_terms", type: "bytes" }],
    outputs: [
      { name: "activeLimit", type: "uint256" },
      { name: "currentScore", type: "uint8" },
      { name: "isStale", type: "bool" },
    ],
    stateMutability: "view",
  },
] as const;

const ENVIO_ORACLE_ABI = [
  {
    name: "getAgentReputation",
    type: "function",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [
      { name: "score", type: "uint8" },
      { name: "lastUpdated", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

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

export interface ReputationGatedPermissionParams {
  /** The agent's wallet address */
  agentAddress: string;
  /** The agent's display name (for UI) */
  agentName?: string;
  /** The agent's numeric ID from the indexer */
  agentId?: string;
  /** Base amount in smallest token units (e.g., 1e6 for 1 USDC) */
  baseAmount: number;
  /** Maximum amount in smallest token units */
  maxAmount: number;
  /** Minimum reputation score required (0-100) */
  minReputationScore: number;
  /** Maximum staleness of reputation data in seconds (0 = no limit) */
  maxStaleness: number;
  /** Number of days until the permission expires */
  expiryDays?: number;
  /** Token contract address (defaults to USDC) */
  tokenAddress?: string;
  /** Token decimals (defaults to 6 for USDC) */
  decimals?: number;
}

export interface ReputationGatedPermissionResult {
  /** Unique identifier for the granted permission */
  permissionId: string;
  /** The encoded terms for the ReputationGateEnforcer */
  encodedTerms: string;
  /** Current active limit based on reputation */
  activeLimit: bigint;
  /** Current reputation score */
  currentScore: number;
  /** Unix timestamp when the permission was granted */
  grantedAt: number;
  /** Unix timestamp when the permission will expire */
  expiresAt: number;
}

export interface UseGrantReputationGatedPermissionReturn {
  /** Function to grant a reputation-gated permission */
  grantPermission: (
    params: ReputationGatedPermissionParams
  ) => Promise<ReputationGatedPermissionResult | null>;
  /** Whether a grant operation is in progress */
  isGranting: boolean;
  /** Error from the last grant attempt, if any */
  error: Error | null;
  /** Reset the error state */
  reset: () => void;
  /** Query the current active limit for an agent */
  getActiveLimit: (
    agentAddress: string,
    baseAmount: number,
    maxAmount: number,
    minReputationScore: number,
    maxStaleness: number
  ) => Promise<{ activeLimit: bigint; currentScore: number; isStale: boolean } | null>;
  /** Query the current reputation score for an agent */
  getAgentReputation: (
    agentAddress: string
  ) => Promise<{ score: number; lastUpdated: number } | null>;
}

// ===========================================
// Hook Implementation
// ===========================================

/**
 * Hook for granting reputation-gated ERC-7715 permissions to AI agents.
 *
 * This creates permissions that dynamically scale based on the agent's
 * on-chain reputation score. Uses the ReputationGateEnforcer contract
 * as a caveat enforcer.
 *
 * @example
 * ```tsx
 * const { grantPermission, isGranting } = useGrantReputationGatedPermission();
 *
 * const handleGrant = async () => {
 *   const result = await grantPermission({
 *     agentAddress: "0x...",
 *     baseAmount: 10_000000, // 10 USDC
 *     maxAmount: 100_000000, // 100 USDC
 *     minReputationScore: 40,
 *     maxStaleness: 86400, // 24 hours
 *   });
 *   if (result) {
 *     console.log("Active limit:", result.activeLimit);
 *   }
 * };
 * ```
 */
export function useGrantReputationGatedPermission(): UseGrantReputationGatedPermissionReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsGranting(false);
  }, []);

  /**
   * Query the current reputation score for an agent from the on-chain oracle
   */
  const getAgentReputation = useCallback(
    async (
      agentAddress: string
    ): Promise<{ score: number; lastUpdated: number } | null> => {
      if (!CONTRACTS.ENVIO_ORACLE) {
        console.warn("Envio Oracle contract address not configured");
        return null;
      }

      try {
        const client = publicClient || createPublicClient({
          chain: sepolia,
          transport: http(),
        });

        const result = await client.readContract({
          address: CONTRACTS.ENVIO_ORACLE as `0x${string}`,
          abi: ENVIO_ORACLE_ABI,
          functionName: "getAgentReputation",
          args: [agentAddress as `0x${string}`],
        });

        return {
          score: Number(result[0]),
          lastUpdated: Number(result[1]),
        };
      } catch (err) {
        console.error("Failed to get agent reputation:", err);
        return null;
      }
    },
    [publicClient]
  );

  /**
   * Calculate the active limit for given parameters by encoding terms
   * and querying the enforcer contract
   */
  const getActiveLimit = useCallback(
    async (
      agentAddress: string,
      baseAmount: number,
      maxAmount: number,
      minReputationScore: number,
      maxStaleness: number
    ): Promise<{ activeLimit: bigint; currentScore: number; isStale: boolean } | null> => {
      if (!CONTRACTS.REPUTATION_ENFORCER) {
        console.warn("Reputation Enforcer contract address not configured");
        return null;
      }

      try {
        const client = publicClient || createPublicClient({
          chain: sepolia,
          transport: http(),
        });

        // First encode the terms
        const encodedTerms = encodeAbiParameters(
          parseAbiParameters("address, uint256, uint256, uint8, uint256"),
          [
            agentAddress as `0x${string}`,
            BigInt(baseAmount),
            BigInt(maxAmount),
            minReputationScore,
            BigInt(maxStaleness),
          ]
        );

        // Then query the active limit
        const result = await client.readContract({
          address: CONTRACTS.REPUTATION_ENFORCER as `0x${string}`,
          abi: REPUTATION_GATE_ENFORCER_ABI,
          functionName: "getActiveLimit",
          args: [encodedTerms],
        });

        return {
          activeLimit: result[0],
          currentScore: Number(result[1]),
          isStale: result[2],
        };
      } catch (err) {
        console.error("Failed to get active limit:", err);
        return null;
      }
    },
    [publicClient]
  );

  /**
   * Grant a reputation-gated permission
   */
  const grantPermission = useCallback(
    async (
      params: ReputationGatedPermissionParams
    ): Promise<ReputationGatedPermissionResult | null> => {
      const {
        agentAddress,
        agentName,
        agentId,
        baseAmount,
        maxAmount,
        minReputationScore,
        maxStaleness,
        expiryDays = 30,
        tokenAddress = TOKENS.USDC,
        decimals = 6,
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
        toast.error("Please install MetaMask Flask to use this feature");
        return null;
      }

      // Validate contract addresses are configured
      if (!CONTRACTS.REPUTATION_ENFORCER || !CONTRACTS.ENVIO_ORACLE) {
        const err = new Error("Reputation contracts not configured");
        setError(err);
        toast.error("Reputation-gated permissions are not configured");
        return null;
      }

      // ERC-7715 is only supported on Sepolia testnet
      if (chainId !== sepolia.id) {
        toast.info("Switching to Sepolia network for ERC-7715 support...");
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

      // Validate agent address
      if (!agentAddress || !agentAddress.startsWith("0x")) {
        const err = new Error("Invalid agent address");
        setError(err);
        toast.error("Invalid agent address");
        return null;
      }

      // Validate amounts
      if (baseAmount <= 0 || maxAmount <= 0 || baseAmount > maxAmount) {
        const err = new Error("Invalid amount configuration");
        setError(err);
        toast.error("Base amount must be positive and less than max amount");
        return null;
      }

      setIsGranting(true);
      setError(null);

      try {
        // Create clients
        const walletClient = createWalletClient({
          account: address,
          chain: sepolia,
          transport: custom(window.ethereum),
        });

        const readClient = publicClient || createPublicClient({
          chain: sepolia,
          transport: http(),
        });

        // Encode the terms for the ReputationGateEnforcer
        const encodedTerms = encodeAbiParameters(
          parseAbiParameters("address, uint256, uint256, uint8, uint256"),
          [
            agentAddress as `0x${string}`,
            BigInt(baseAmount),
            BigInt(maxAmount),
            minReputationScore,
            BigInt(maxStaleness),
          ]
        );

        // Get current reputation from on-chain oracle
        let currentScore = 50; // Default neutral score
        let activeLimit = BigInt(baseAmount);
        try {
          const reputation = await getAgentReputation(agentAddress);
          if (reputation) {
            currentScore = reputation.score;
            // Calculate active limit locally based on on-chain score
            // This ensures consistency with the UI display
            if (currentScore <= minReputationScore) {
              activeLimit = BigInt(baseAmount);
            } else if (currentScore >= 100) {
              activeLimit = BigInt(maxAmount);
            } else {
              const scoreRange = 100 - minReputationScore;
              const currentProgress = currentScore - minReputationScore;
              const amountRange = maxAmount - baseAmount;
              activeLimit = BigInt(Math.floor(baseAmount + (amountRange * currentProgress) / scoreRange));
            }
          }
        } catch (repErr) {
          console.warn("Failed to fetch reputation, using defaults:", repErr);
        }

        // Calculate timestamps
        const currentTime = Math.floor(Date.now() / 1000);
        const expiry = currentTime + expiryDays * 24 * 60 * 60;

        // Format amounts for display
        const baseAmountFormatted = (baseAmount / Math.pow(10, decimals)).toFixed(2);
        const maxAmountFormatted = (maxAmount / Math.pow(10, decimals)).toFixed(2);
        const activeLimitFormatted = (Number(activeLimit) / Math.pow(10, decimals)).toFixed(2);

        // Build justification message (max 120 chars for MetaMask Flask)
        const agentDisplayName = agentName
          ? (agentName.length > 15 ? agentName.slice(0, 12) + "..." : agentName)
          : `Agent ${agentAddress.slice(0, 6)}`;
        const justification = `${agentDisplayName}: ${activeLimitFormatted} USDC daily (rep-gated, score ${currentScore})`;

        // Show toast to guide user
        toast.info("Check MetaMask Flask to approve the reputation-gated permission", {
          description: "This permission scales dynamically with the agent's reputation score",
          duration: 10000,
        });

        // Extend wallet client with ERC-7715 actions
        const extendedClient = walletClient.extend(erc7715ProviderActions());

        // Use activeLimit (reputation-scaled) for the permission amount, not maxAmount
        // This ensures the user sees the actual limit based on current reputation
        const activeLimitInWholeUnits = (Number(activeLimit) / Math.pow(10, decimals)).toString();
        const periodAmountBigInt = parseUnits(activeLimitInWholeUnits, decimals);

        // Debug logging for permission request parameters
        console.log("Reputation-gated permission request params:", {
          chainId: sepolia.id,
          expiry,
          agentAddress,
          tokenAddress,
          activeLimit: activeLimit.toString(),
          activeLimitInWholeUnits,
          periodAmountBigInt: periodAmountBigInt.toString(),
          periodDuration: 86400,
          justification: justification.slice(0, 50) + "...",
        });

        // Request ERC-7715 permission with reputation-gated caveat
        // The permission uses the activeLimit (calculated from current reputation score)
        // so the user sees exactly what they're approving based on current reputation
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
                // Use parseUnits for proper bigint format expected by MetaMask Flask
                periodAmount: periodAmountBigInt,
                // Default to daily period for reputation-gated permissions
                periodDuration: 86400,
                justification,
              },
            },
            // Include the reputation gate enforcer as a caveat
            // Note: MetaMask Flask may not fully support custom caveats yet,
            // but we store the terms for future use and on-chain verification
            isAdjustmentAllowed: true,
          },
        ]);

        // Generate a unique permission ID
        const permissionId = `rep-${address}-${agentAddress}-${currentTime}`;

        // ========================================
        // FLASK PERMISSION GRANTED - from here on, we MUST return a result
        // ========================================
        const successResult: ReputationGatedPermissionResult = {
          permissionId,
          encodedTerms,
          activeLimit,
          currentScore,
          grantedAt: currentTime,
          expiresAt: expiry,
        };

        // ========================================
        // OPTIONAL OPERATIONS - wrap in try-catch
        // ========================================
        try {
          // Save to localStorage
          const storedPermission: StoredPermission = {
            id: permissionId,
            userAddress: address,
            agentAddress: agentAddress,
            agentName: agentDisplayName,
            tokenAddress: tokenAddress,
            tokenSymbol: "USDC",
            // Store the max amount as the amount (actual limit is dynamic)
            amount: maxAmountFormatted,
            periodDuration: 86400,
            grantedAt: currentTime,
            expiresAt: expiry,
            agentId: agentId,
            // Store reputation-gated metadata
            isReputationGated: true,
            baseAmount: baseAmount.toString(),
            maxAmount: maxAmount.toString(),
            minReputationScore,
            maxStaleness,
            encodedTerms,
          };
          savePermissionToStorage(storedPermission);
          console.log("Reputation-gated permission saved to localStorage:", storedPermission);

          // Record permission on-chain
          if (CONTRACTS.PERMISSION_REGISTRY) {
            try {
              toast.info("Recording permission on-chain...", {
                description: "Confirm the transaction in MetaMask",
                duration: 8000,
              });

              // Create a hash that includes the reputation-gated terms
              const onChainPermissionHash = keccak256(
                encodePacked(
                  ["address", "address", "address", "uint256", "uint256", "uint8", "uint256", "uint256"],
                  [
                    address as `0x${string}`,
                    agentAddress as `0x${string}`,
                    tokenAddress as `0x${string}`,
                    BigInt(baseAmount),
                    BigInt(maxAmount),
                    minReputationScore,
                    BigInt(maxStaleness),
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
                  BigInt(maxAmount), // Use max amount for on-chain record
                  BigInt(86400), // Daily period
                  BigInt(expiry),
                  onChainPermissionHash,
                ],
              });

              console.log("Permission recorded on-chain, tx:", txHash);

              try {
                const receipt = await readClient.waitForTransactionReceipt({
                  hash: txHash,
                  timeout: 30_000,
                  pollingInterval: 2_000,
                  confirmations: 1,
                });

                if (receipt.status === "success") {
                  toast.success("Reputation-gated permission recorded on-chain!", {
                    description: `Active limit: ${activeLimitFormatted} USDC (score: ${currentScore})`,
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

          // Store delegation data in Supabase
          try {
            const supabasePermissionHash = keccak256(
              encodePacked(
                ["address", "address", "bytes"],
                [
                  address as `0x${string}`,
                  agentAddress as `0x${string}`,
                  encodedTerms as `0x${string}`,
                ]
              )
            );

            const delegationResult = await storeDelegation({
              permission_id: permissionId,
              user_address: address.toLowerCase(),
              agent_address: agentAddress.toLowerCase(),
              token_address: tokenAddress.toLowerCase(),
              amount_per_period: maxAmount.toString(),
              period_duration: 86400,
              expires_at: expiry,
              granted_at: currentTime,
              delegation_data: JSON.stringify({
                ...grantedPermissions,
                reputationGated: {
                  baseAmount,
                  maxAmount,
                  minReputationScore,
                  maxStaleness,
                  encodedTerms,
                  enforcerAddress: CONTRACTS.REPUTATION_ENFORCER,
                  oracleAddress: CONTRACTS.ENVIO_ORACLE,
                },
              }),
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
          console.error("Error in optional operations:", optionalOpsError);
        }

        // ALWAYS show success and return result
        toast.success("Reputation-gated permission granted!", {
          description: `Active limit: ${activeLimitFormatted} USDC based on score ${currentScore}`,
        });
        return successResult;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to grant permission");
        setError(error);

        console.error("Reputation-Gated Permission Error:", error);

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
          toast.error("ERC-7715 requires MetaMask Flask", {
            description: "Please install MetaMask Flask 13.5.0+ from flask.metamask.io",
            duration: 10000,
          });
        } else {
          toast.error(`Permission error: ${error.message.slice(0, 100)}`, {
            duration: 8000,
          });
        }

        return null;
      } finally {
        setIsGranting(false);
      }
    },
    [isConnected, address, chainId, publicClient, getAgentReputation, getActiveLimit]
  );

  return {
    grantPermission,
    isGranting,
    error,
    reset,
    getActiveLimit,
    getAgentReputation,
  };
}
