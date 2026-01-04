"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { CONTRACTS } from "@/lib/constants";

// ===========================================
// AgentRegistry ABI (minimal - only what we need)
// ===========================================

const AGENT_REGISTRY_ABI = [
  {
    name: "registerAgent",
    type: "function",
    inputs: [
      { name: "walletAddress", type: "address" },
      { name: "name", type: "string" },
      { name: "strategyType", type: "string" },
      { name: "riskLevel", type: "uint8" },
      { name: "metadataUri", type: "string" },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "getAgentByWallet",
    type: "function",
    inputs: [{ name: "walletAddress", type: "address" }],
    outputs: [
      { name: "agentId", type: "uint256" },
      {
        name: "metadata",
        type: "tuple",
        components: [
          { name: "walletAddress", type: "address" },
          { name: "name", type: "string" },
          { name: "strategyType", type: "string" },
          { name: "riskLevel", type: "uint8" },
          { name: "registeredAt", type: "uint256" },
          { name: "isActive", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    name: "validStrategyTypes",
    type: "function",
    inputs: [{ name: "strategyType", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

// ===========================================
// Types
// ===========================================

export interface RegisterAgentParams {
  /** Agent wallet address (defaults to connected wallet) */
  walletAddress?: string;
  /** Agent display name (3-50 characters) */
  name: string;
  /** Strategy type (must be valid) */
  strategyType: string;
  /** Risk level (1-10) */
  riskLevel: number;
  /** Metadata URI (IPFS or HTTPS) */
  metadataUri: string;
}

export interface RegisterAgentResult {
  /** The registered agent's ID */
  agentId: string;
  /** Transaction hash */
  txHash: string;
}

export interface UseRegisterAgentReturn {
  /** Function to register a new agent */
  registerAgent: (params: RegisterAgentParams) => Promise<RegisterAgentResult | null>;
  /** Check if wallet is already registered */
  checkIfRegistered: (walletAddress: string) => Promise<boolean>;
  /** Whether a registration is in progress */
  isRegistering: boolean;
  /** Error from the last registration attempt */
  error: Error | null;
  /** Reset the error state */
  reset: () => void;
}

// ===========================================
// Hook Implementation
// ===========================================

export function useRegisterAgent(): UseRegisterAgentReturn {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if a wallet address is already registered as an agent
   */
  const checkIfRegistered = useCallback(
    async (walletAddress: string): Promise<boolean> => {
      if (!publicClient) return false;

      try {
        await publicClient.readContract({
          address: CONTRACTS.REGISTRY as `0x${string}`,
          abi: AGENT_REGISTRY_ABI,
          functionName: "getAgentByWallet",
          args: [walletAddress as `0x${string}`],
        });
        // If we get here without error, the agent exists
        return true;
      } catch {
        // Agent not found
        return false;
      }
    },
    [publicClient]
  );

  /**
   * Register a new agent on-chain
   */
  const registerAgent = useCallback(
    async (params: RegisterAgentParams): Promise<RegisterAgentResult | null> => {
      // Validation
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return null;
      }

      if (!walletClient || !publicClient) {
        toast.error("Wallet not ready");
        return null;
      }

      // Validate name length
      if (params.name.length < 3 || params.name.length > 50) {
        setError(new Error("Name must be between 3 and 50 characters"));
        toast.error("Name must be between 3 and 50 characters");
        return null;
      }

      // Validate risk level
      if (params.riskLevel < 1 || params.riskLevel > 10) {
        setError(new Error("Risk level must be between 1 and 10"));
        toast.error("Risk level must be between 1 and 10");
        return null;
      }

      // Validate metadata URI
      if (!params.metadataUri || params.metadataUri.length === 0) {
        setError(new Error("Metadata URI is required"));
        toast.error("Metadata URI is required");
        return null;
      }

      const agentWallet = (params.walletAddress || address) as `0x${string}`;

      setIsRegistering(true);
      setError(null);

      try {
        // Check if already registered
        const isAlreadyRegistered = await checkIfRegistered(agentWallet);
        if (isAlreadyRegistered) {
          throw new Error("This wallet is already registered as an agent");
        }

        toast.info("Submitting agent registration...");

        // Prepare transaction
        const { request } = await publicClient.simulateContract({
          address: CONTRACTS.REGISTRY as `0x${string}`,
          abi: AGENT_REGISTRY_ABI,
          functionName: "registerAgent",
          args: [
            agentWallet,
            params.name,
            params.strategyType,
            params.riskLevel,
            params.metadataUri,
          ],
          account: address,
        });

        // Send transaction
        const txHash = await walletClient.writeContract(request);

        toast.info("Waiting for confirmation...");

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });

        if (receipt.status === "reverted") {
          throw new Error("Transaction reverted");
        }

        // Extract agent ID from logs (AgentRegistered event)
        // For now, we'll fetch it after registration
        const result = await publicClient.readContract({
          address: CONTRACTS.REGISTRY as `0x${string}`,
          abi: AGENT_REGISTRY_ABI,
          functionName: "getAgentByWallet",
          args: [agentWallet],
        });

        const agentId = result[0].toString();

        toast.success(`Agent registered successfully! ID: ${agentId}`);

        return {
          agentId,
          txHash,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to register agent";
        setError(new Error(errorMessage));

        // Parse common errors
        if (errorMessage.includes("already registered")) {
          toast.error("This wallet is already registered as an agent");
        } else if (errorMessage.includes("Invalid strategy type")) {
          toast.error("Invalid strategy type selected");
        } else if (errorMessage.includes("user rejected")) {
          toast.error("Transaction rejected by user");
        } else {
          toast.error(errorMessage);
        }

        return null;
      } finally {
        setIsRegistering(false);
      }
    },
    [address, isConnected, walletClient, publicClient, checkIfRegistered]
  );

  return {
    registerAgent,
    checkIfRegistered,
    isRegistering,
    error,
    reset,
  };
}
