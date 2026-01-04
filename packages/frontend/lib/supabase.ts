import { createClient } from "@supabase/supabase-js";

// ===========================================
// Supabase Client Configuration
// ===========================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not configured. Delegation storage will not work."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ===========================================
// Database Types
// ===========================================

export interface PendingDelegation {
  id?: string;
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
  created_at?: string;
  updated_at?: string;
}

// ===========================================
// Delegation Storage Functions
// ===========================================

/**
 * Store a new delegation after ERC-7715 permission is granted
 */
export async function storeDelegation(
  delegation: Omit<PendingDelegation, "id" | "created_at" | "updated_at">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Supabase not configured, skipping delegation storage");
      return { success: false, error: "Supabase not configured" };
    }

    const { data, error } = await supabase
      .from("pending_delegations")
      .insert([delegation])
      .select("id")
      .single();

    if (error) {
      console.error("Error storing delegation:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error("Failed to store delegation:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get pending delegations for a specific agent
 */
export async function getPendingDelegationsForAgent(
  agentAddress: string
): Promise<PendingDelegation[]> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return [];
    }

    const { data, error } = await supabase
      .from("pending_delegations")
      .select("*")
      .eq("agent_address", agentAddress.toLowerCase())
      .eq("status", "pending")
      .gt("expires_at", Math.floor(Date.now() / 1000))
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching delegations:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Failed to fetch delegations:", err);
    return [];
  }
}

/**
 * Get all pending delegations for a user
 */
export async function getPendingDelegationsForUser(
  userAddress: string
): Promise<PendingDelegation[]> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return [];
    }

    const { data, error } = await supabase
      .from("pending_delegations")
      .select("*")
      .eq("user_address", userAddress.toLowerCase())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user delegations:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Failed to fetch user delegations:", err);
    return [];
  }
}

/**
 * Mark a delegation as claimed by an agent
 */
export async function markDelegationClaimed(
  permissionId: string,
  txHash: string
): Promise<boolean> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return false;
    }

    const { error } = await supabase
      .from("pending_delegations")
      .update({
        status: "claimed",
        claimed_at: Math.floor(Date.now() / 1000),
        claimed_tx_hash: txHash,
        updated_at: new Date().toISOString(),
      })
      .eq("permission_id", permissionId);

    if (error) {
      console.error("Error marking delegation claimed:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to mark delegation claimed:", err);
    return false;
  }
}

/**
 * Revoke a delegation
 */
export async function revokeDelegation(permissionId: string): Promise<boolean> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return false;
    }

    const { error } = await supabase
      .from("pending_delegations")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("permission_id", permissionId);

    if (error) {
      console.error("Error revoking delegation:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to revoke delegation:", err);
    return false;
  }
}

/**
 * Subscribe to new delegations for an agent (realtime)
 */
export function subscribeToDelegations(
  agentAddress: string,
  onNewDelegation: (delegation: PendingDelegation) => void
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel(`delegations:${agentAddress}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "pending_delegations",
        filter: `agent_address=eq.${agentAddress.toLowerCase()}`,
      },
      (payload) => {
        onNewDelegation(payload.new as PendingDelegation);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
