/**
 * Echelon Agents - Delegation Storage
 *
 * In-memory storage for ERC-7710 signed delegations.
 * Allows Fund Manager to store delegations for Specialists to retrieve.
 *
 * In production, this should be replaced with a persistent storage
 * solution (database, Redis, IPFS, etc.)
 */

import type { Delegation } from '@metamask/smart-accounts-kit';
import type { Address, Hex } from 'viem';
import { createLogger } from './logger.js';
import { nowSeconds, isExpired } from './helpers.js';

const logger = createLogger('DelegationStorage');

// ============================================
// TYPES
// ============================================

export interface StoredDelegation {
  /** The signed delegation object */
  delegation: Delegation;
  /** The delegation hash (computed offchain) */
  hash: Hex;
  /** The delegator (Fund Manager) agent ID */
  delegatorAgentId: string;
  /** The delegate (Specialist) agent ID */
  delegateAgentId: string;
  /** The original user address who granted permission */
  userAddress: Address;
  /** Amount delegated (in wei) */
  amount: bigint;
  /** Unix timestamp when stored */
  storedAt: number;
  /** Unix timestamp when delegation expires */
  expiresAt: number;
  /** Whether this delegation has been redeemed */
  redeemed: boolean;
  /** Transaction hash if redeemed */
  redemptionTxHash?: string;
}

// ============================================
// IN-MEMORY STORE
// ============================================

/**
 * In-memory delegation store
 * Key: delegate agent ID
 * Value: Array of delegations for that agent
 */
const delegationStore = new Map<string, StoredDelegation[]>();

/**
 * Index by delegation hash for quick lookup
 */
const delegationIndex = new Map<string, StoredDelegation>();

// ============================================
// STORAGE FUNCTIONS
// ============================================

/**
 * Store a signed delegation for a specialist agent to retrieve
 */
export function storeDelegation(
  delegation: Delegation,
  delegationHash: Hex,
  delegatorAgentId: string,
  delegateAgentId: string,
  userAddress: Address,
  amount: bigint,
  durationSeconds: number
): void {
  const storedAt = nowSeconds();
  const expiresAt = storedAt + durationSeconds;

  const stored: StoredDelegation = {
    delegation,
    hash: delegationHash,
    delegatorAgentId,
    delegateAgentId,
    userAddress,
    amount,
    storedAt,
    expiresAt,
    redeemed: false,
  };

  // Store by delegate agent ID
  const existing = delegationStore.get(delegateAgentId) || [];
  delegationStore.set(delegateAgentId, [...existing, stored]);

  // Index by delegation hash
  delegationIndex.set(delegationHash, stored);

  logger.info('Delegation stored', {
    delegationHash,
    delegatorAgentId,
    delegateAgentId,
    amount: amount.toString(),
    expiresAt,
  });
}

/**
 * Get all active (non-expired, non-redeemed) delegations for an agent
 */
export function getDelegationsForAgent(agentId: string): StoredDelegation[] {
  const delegations = delegationStore.get(agentId) || [];

  // Filter to active delegations only
  return delegations.filter((d) => !d.redeemed && !isExpired(d.expiresAt));
}

/**
 * Get all delegations for an agent (including expired/redeemed)
 */
export function getAllDelegationsForAgent(agentId: string): StoredDelegation[] {
  return delegationStore.get(agentId) || [];
}

/**
 * Get a specific delegation by hash
 */
export function getDelegationByHash(hash: string): StoredDelegation | undefined {
  return delegationIndex.get(hash);
}

/**
 * Mark a delegation as redeemed
 */
export function markDelegationRedeemed(
  delegationHash: string,
  txHash: string
): boolean {
  const stored = delegationIndex.get(delegationHash);

  if (!stored) {
    logger.warn('Delegation not found for redemption', { delegationHash });
    return false;
  }

  if (stored.redeemed) {
    logger.warn('Delegation already redeemed', { delegationHash });
    return false;
  }

  stored.redeemed = true;
  stored.redemptionTxHash = txHash;

  logger.info('Delegation marked as redeemed', {
    delegationHash,
    txHash,
  });

  return true;
}

/**
 * Remove expired delegations (cleanup)
 */
export function cleanupExpiredDelegations(): number {
  let removed = 0;
  const now = nowSeconds();

  for (const [agentId, delegations] of delegationStore.entries()) {
    const active = delegations.filter((d) => {
      if (d.expiresAt < now && !d.redeemed) {
        delegationIndex.delete(d.hash);
        removed++;
        return false;
      }
      return true;
    });

    if (active.length !== delegations.length) {
      delegationStore.set(agentId, active);
    }
  }

  if (removed > 0) {
    logger.info('Cleaned up expired delegations', { count: removed });
  }

  return removed;
}

/**
 * Get delegation statistics
 */
export function getDelegationStats(): {
  totalStored: number;
  totalActive: number;
  totalRedeemed: number;
  totalExpired: number;
  byAgent: Record<string, number>;
} {
  let totalStored = 0;
  let totalActive = 0;
  let totalRedeemed = 0;
  let totalExpired = 0;
  const byAgent: Record<string, number> = {};
  const now = nowSeconds();

  for (const [agentId, delegations] of delegationStore.entries()) {
    totalStored += delegations.length;
    byAgent[agentId] = delegations.length;

    for (const d of delegations) {
      if (d.redeemed) {
        totalRedeemed++;
      } else if (d.expiresAt < now) {
        totalExpired++;
      } else {
        totalActive++;
      }
    }
  }

  return {
    totalStored,
    totalActive,
    totalRedeemed,
    totalExpired,
    byAgent,
  };
}

/**
 * Clear all delegations (for testing)
 */
export function clearAllDelegations(): void {
  delegationStore.clear();
  delegationIndex.clear();
  logger.info('All delegations cleared');
}

// ============================================
// PERIODIC CLEANUP
// ============================================

/**
 * Start periodic cleanup of expired delegations
 * @param intervalMs - Cleanup interval in milliseconds (default: 5 minutes)
 */
export function startPeriodicCleanup(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  return setInterval(() => {
    cleanupExpiredDelegations();
  }, intervalMs);
}
