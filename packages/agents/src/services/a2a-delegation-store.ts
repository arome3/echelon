/**
 * Echelon A2A Delegation Store
 *
 * Supabase-backed storage for Agent-to-Agent (ERC-7710) delegations.
 * Replaces the local file-based delegation-storage.js.
 *
 * Flow:
 * 1. FundManagerAgent receives ERC-7715 delegation from user (via delegation-fetcher)
 * 2. FundManagerAgent creates ERC-7710 delegation to specialist
 * 3. This service stores the A2A delegation in Supabase
 * 4. DexSwapAgent polls/subscribes for A2A delegations
 * 5. DexSwapAgent redeems and executes the trade
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Delegation } from '@metamask/smart-accounts-kit';
import type { Address, Hex } from 'viem';

// ===========================================
// Types
// ===========================================

export interface A2ADelegation {
  id?: string;
  delegation_hash: string;
  parent_permission_id: string;

  // Agents
  from_agent_id: number;
  from_agent_address: string;
  to_agent_id: number;
  to_agent_address: string;

  // Original user
  user_address: string;

  // Delegation params
  token_address: string;
  amount: string;
  expires_at: number;
  created_at?: string;

  // ERC-7710 delegation
  signed_delegation: Delegation & { hash: Hex };
  caveats?: object[];

  // Status
  status: 'pending' | 'redeemed' | 'expired' | 'revoked';
  redeemed_at?: number;
  redeemed_tx_hash?: string;

  // Metadata
  strategy_type?: string;
  notes?: string;
  updated_at?: string;
}

export interface A2AStoreConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

// ===========================================
// A2A Delegation Store
// ===========================================

export class A2ADelegationStore {
  private supabase: SupabaseClient;
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  constructor(config: A2AStoreConfig) {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase URL and key are required for A2A delegation store');
    }

    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  // ===========================================
  // Store Operations
  // ===========================================

  /**
   * Store a new A2A delegation
   */
  async storeDelegation(delegation: Omit<A2ADelegation, 'id' | 'created_at' | 'updated_at'>): Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }> {
    try {
      // Serialize the signed delegation to JSON
      const insertData = {
        ...delegation,
        signed_delegation: JSON.parse(JSON.stringify(delegation.signed_delegation)),
        caveats: delegation.caveats || [],
      };

      const { data, error } = await this.supabase
        .from('a2a_delegations')
        .insert([insertData])
        .select('id')
        .single();

      if (error) {
        console.error('Error storing A2A delegation:', error);
        return { success: false, error: error.message };
      }

      return { success: true, id: data.id };
    } catch (err) {
      console.error('Failed to store A2A delegation:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get pending A2A delegations for a specialist agent
   */
  async getPendingDelegations(agentAddress: string): Promise<A2ADelegation[]> {
    try {
      const { data, error } = await this.supabase
        .from('a2a_delegations')
        .select('*')
        .eq('to_agent_address', agentAddress.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', Math.floor(Date.now() / 1000))
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching A2A delegations:', error);
        return [];
      }

      return (data || []).map((d) => ({
        ...d,
        signed_delegation: d.signed_delegation as Delegation & { hash: Hex },
      }));
    } catch (err) {
      console.error('Failed to fetch A2A delegations:', err);
      return [];
    }
  }

  /**
   * Get all A2A delegations created by a manager agent
   */
  async getDelegationsFromAgent(agentAddress: string): Promise<A2ADelegation[]> {
    try {
      const { data, error } = await this.supabase
        .from('a2a_delegations')
        .select('*')
        .eq('from_agent_address', agentAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching A2A delegations from agent:', error);
        return [];
      }

      return (data || []).map((d) => ({
        ...d,
        signed_delegation: d.signed_delegation as Delegation & { hash: Hex },
      }));
    } catch (err) {
      console.error('Failed to fetch A2A delegations from agent:', err);
      return [];
    }
  }

  /**
   * Get the delegation chain for a permission
   */
  async getDelegationChain(parentPermissionId: string): Promise<A2ADelegation[]> {
    try {
      const { data, error } = await this.supabase
        .from('a2a_delegations')
        .select('*')
        .eq('parent_permission_id', parentPermissionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching delegation chain:', error);
        return [];
      }

      return (data || []).map((d) => ({
        ...d,
        signed_delegation: d.signed_delegation as Delegation & { hash: Hex },
      }));
    } catch (err) {
      console.error('Failed to fetch delegation chain:', err);
      return [];
    }
  }

  /**
   * Mark a delegation as redeemed
   */
  async markRedeemed(delegationHash: string, txHash: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('a2a_delegations')
        .update({
          status: 'redeemed',
          redeemed_at: Math.floor(Date.now() / 1000),
          redeemed_tx_hash: txHash,
          updated_at: new Date().toISOString(),
        })
        .eq('delegation_hash', delegationHash);

      if (error) {
        console.error('Error marking A2A delegation redeemed:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Failed to mark A2A delegation redeemed:', err);
      return false;
    }
  }

  /**
   * Revoke a delegation
   */
  async revokeDelegation(delegationHash: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('a2a_delegations')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString(),
        })
        .eq('delegation_hash', delegationHash);

      if (error) {
        console.error('Error revoking A2A delegation:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Failed to revoke A2A delegation:', err);
      return false;
    }
  }

  // ===========================================
  // Realtime Subscriptions
  // ===========================================

  /**
   * Subscribe to new A2A delegations for a specialist agent
   */
  subscribe(agentAddress: string, onNewDelegation: (delegation: A2ADelegation) => void): {
    unsubscribe: () => void;
  } {
    const channelName = `a2a:${agentAddress.toLowerCase()}`;

    // Avoid duplicate subscriptions
    if (this.subscriptions.has(channelName)) {
      return {
        unsubscribe: () => this.unsubscribe(channelName),
      };
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'a2a_delegations',
          filter: `to_agent_address=eq.${agentAddress.toLowerCase()}`,
        },
        (payload) => {
          const delegation = {
            ...payload.new,
            signed_delegation: payload.new.signed_delegation as Delegation & { hash: Hex },
          } as A2ADelegation;
          onNewDelegation(delegation);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return {
      unsubscribe: () => this.unsubscribe(channelName),
    };
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribe(channelName: string): void {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    for (const channelName of this.subscriptions.keys()) {
      this.unsubscribe(channelName);
    }
  }
}

// ===========================================
// Factory Function
// ===========================================

let storeInstance: A2ADelegationStore | null = null;

/**
 * Get or create the A2A delegation store instance
 */
export function getA2ADelegationStore(): A2ADelegationStore {
  if (!storeInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
    }

    storeInstance = new A2ADelegationStore({ supabaseUrl, supabaseKey });
  }

  return storeInstance;
}

// ===========================================
// Helper: Convert ERC-7710 Delegation to Store Format
// ===========================================

export function createA2ADelegationRecord(params: {
  signedDelegation: Delegation & { hash: Hex };
  parentPermissionId: string;
  fromAgentId: number;
  fromAgentAddress: Address;
  toAgentId: number;
  toAgentAddress: Address;
  userAddress: Address;
  tokenAddress: Address;
  amount: bigint;
  expiresAt: number;
  strategyType?: string;
  caveats?: object[];
}): Omit<A2ADelegation, 'id' | 'created_at' | 'updated_at'> {
  return {
    delegation_hash: params.signedDelegation.hash,
    parent_permission_id: params.parentPermissionId,
    from_agent_id: params.fromAgentId,
    from_agent_address: params.fromAgentAddress.toLowerCase(),
    to_agent_id: params.toAgentId,
    to_agent_address: params.toAgentAddress.toLowerCase(),
    user_address: params.userAddress.toLowerCase(),
    token_address: params.tokenAddress.toLowerCase(),
    amount: params.amount.toString(),
    expires_at: params.expiresAt,
    signed_delegation: params.signedDelegation,
    caveats: params.caveats || [],
    status: 'pending',
    strategy_type: params.strategyType,
  };
}
