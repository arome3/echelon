/**
 * Delegation Fetcher Service
 *
 * Fetches pending ERC-7715 delegations from Supabase for agent processing.
 * This bridges the gap between off-chain Flask permissions and agent execution.
 *
 * Flow:
 * 1. User grants permission in Flask → stored in Supabase
 * 2. Agent polls or subscribes to Supabase for pending delegations
 * 3. Agent calls redeemDelegations() on DelegationManager
 * 4. Agent marks delegation as claimed in Supabase
 */

import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// ===========================================
// Types
// ===========================================

export interface PendingDelegation {
  id: string;
  permission_id: string;
  user_address: string;
  agent_address: string;
  token_address: string;
  amount_per_period: string;
  period_duration: number;
  expires_at: number;
  granted_at: number;
  delegation_data: string; // JSON stringified ERC-7715 permission response
  permission_hash: string;
  status: "pending" | "claimed" | "expired" | "revoked";
  claimed_at?: number;
  claimed_tx_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface DelegationFetcherConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  agentAddress: string;
  pollIntervalMs?: number;
  onNewDelegation?: (delegation: PendingDelegation) => Promise<void>;
  onError?: (error: Error) => void;
}

// ===========================================
// Delegation Fetcher Class
// ===========================================

export class DelegationFetcher {
  private supabase: SupabaseClient;
  private agentAddress: string;
  private pollIntervalMs: number;
  private pollTimer?: NodeJS.Timeout;
  private realtimeChannel?: RealtimeChannel;
  private onNewDelegation?: (delegation: PendingDelegation) => Promise<void>;
  private onError?: (error: Error) => void;
  private isRunning: boolean = false;

  constructor(config: DelegationFetcherConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    this.agentAddress = config.agentAddress.toLowerCase();
    this.pollIntervalMs = config.pollIntervalMs || 10000; // Default: 10 seconds
    this.onNewDelegation = config.onNewDelegation;
    this.onError = config.onError;
  }

  /**
   * Start fetching delegations (realtime + polling fallback)
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[DelegationFetcher] Already running");
      return;
    }

    console.log(`[DelegationFetcher] Starting for agent ${this.agentAddress}`);
    this.isRunning = true;

    // Set up realtime subscription
    this.setupRealtimeSubscription();

    // Start polling as fallback
    this.startPolling();

    // Fetch any existing pending delegations
    await this.fetchPendingDelegations();
  }

  /**
   * Stop fetching delegations
   */
  stop(): void {
    console.log("[DelegationFetcher] Stopping");
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
    }
  }

  /**
   * Fetch all pending delegations for this agent
   */
  async fetchPendingDelegations(): Promise<PendingDelegation[]> {
    try {
      const now = Math.floor(Date.now() / 1000);

      const { data, error } = await this.supabase
        .from("pending_delegations")
        .select("*")
        .eq("agent_address", this.agentAddress)
        .eq("status", "pending")
        .gt("expires_at", now)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }

      const delegations = data || [];

      if (delegations.length > 0) {
        console.log(
          `[DelegationFetcher] Found ${delegations.length} pending delegation(s)`
        );

        // Process each delegation
        for (const delegation of delegations) {
          if (this.onNewDelegation) {
            await this.onNewDelegation(delegation);
          }
        }
      }

      return delegations;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[DelegationFetcher] Error fetching delegations:", error);
      this.onError?.(error);
      return [];
    }
  }

  /**
   * Mark a delegation as claimed
   */
  async markClaimed(permissionId: string, txHash: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("pending_delegations")
        .update({
          status: "claimed",
          claimed_at: Math.floor(Date.now() / 1000),
          claimed_tx_hash: txHash,
        })
        .eq("permission_id", permissionId);

      if (error) {
        throw new Error(`Failed to mark delegation claimed: ${error.message}`);
      }

      console.log(`[DelegationFetcher] Marked delegation ${permissionId} as claimed`);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[DelegationFetcher] Error marking claimed:", error);
      this.onError?.(error);
      return false;
    }
  }

  /**
   * Get a specific delegation by permission ID
   */
  async getDelegation(permissionId: string): Promise<PendingDelegation | null> {
    try {
      const { data, error } = await this.supabase
        .from("pending_delegations")
        .select("*")
        .eq("permission_id", permissionId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        throw new Error(`Failed to get delegation: ${error.message}`);
      }

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[DelegationFetcher] Error getting delegation:", error);
      this.onError?.(error);
      return null;
    }
  }

  /**
   * Parse the delegation data JSON to get the actual permission object
   */
  parseDelegationData(delegation: PendingDelegation): unknown {
    try {
      return JSON.parse(delegation.delegation_data);
    } catch (err) {
      console.error("[DelegationFetcher] Failed to parse delegation data:", err);
      return null;
    }
  }

  // ===========================================
  // Private Methods
  // ===========================================

  private setupRealtimeSubscription(): void {
    try {
      this.realtimeChannel = this.supabase
        .channel(`delegations:${this.agentAddress}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "pending_delegations",
            filter: `agent_address=eq.${this.agentAddress}`,
          },
          async (payload) => {
            console.log("[DelegationFetcher] New delegation received via realtime");
            const delegation = payload.new as PendingDelegation;

            if (this.onNewDelegation) {
              await this.onNewDelegation(delegation);
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("[DelegationFetcher] Realtime subscription active");
          } else if (status === "CHANNEL_ERROR") {
            console.warn("[DelegationFetcher] Realtime subscription error, falling back to polling");
          }
        });
    } catch (err) {
      console.warn("[DelegationFetcher] Failed to set up realtime:", err);
      // Polling will handle it
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.fetchPendingDelegations();
      }
    }, this.pollIntervalMs);
  }
}

// ===========================================
// Factory Function
// ===========================================

/**
 * Create a delegation fetcher from environment variables
 */
export function createDelegationFetcher(
  agentAddress: string,
  onNewDelegation?: (delegation: PendingDelegation) => Promise<void>,
  onError?: (error: Error) => void
): DelegationFetcher {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase credentials not found. Set SUPABASE_URL and SUPABASE_ANON_KEY in environment."
    );
  }

  return new DelegationFetcher({
    supabaseUrl,
    supabaseAnonKey,
    agentAddress,
    pollIntervalMs: parseInt(process.env.DELEGATION_POLL_INTERVAL_MS || "10000"),
    onNewDelegation,
    onError,
  });
}

// ===========================================
// Standalone Usage Example
// ===========================================

// This can be run directly with: tsx src/services/delegation-fetcher.ts
if (process.argv[1]?.includes("delegation-fetcher")) {
  const agentAddress = process.env.AGENT_ADDRESS;

  if (!agentAddress) {
    console.error("AGENT_ADDRESS environment variable is required");
    process.exit(1);
  }

  const fetcher = createDelegationFetcher(
    agentAddress,
    async (delegation) => {
      console.log("\n=== New Delegation ===");
      console.log(`Permission ID: ${delegation.permission_id}`);
      console.log(`From User: ${delegation.user_address}`);
      console.log(`Token: ${delegation.token_address}`);
      console.log(`Amount/Period: ${delegation.amount_per_period}`);
      console.log(`Expires: ${new Date(delegation.expires_at * 1000).toISOString()}`);
      console.log("======================\n");
    },
    (error) => {
      console.error("Delegation fetcher error:", error);
    }
  );

  fetcher.start().then(() => {
    console.log("Delegation fetcher started. Press Ctrl+C to stop.");
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    fetcher.stop();
    process.exit(0);
  });
}
