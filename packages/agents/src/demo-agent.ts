#!/usr/bin/env npx tsx
/**
 * Echelon Demo Agent
 *
 * A simplified agent for demonstrating the full ERC-7715 permission flow:
 * 1. Receives delegations from Supabase
 * 2. Processes the delegation
 * 3. Logs execution on-chain
 * 4. Marks delegation as claimed
 *
 * Usage:
 *   AGENT_ADDRESS=0x... npx tsx src/demo-agent.ts
 *
 * Required environment variables:
 *   - AGENT_ADDRESS: The agent's wallet address
 *   - SUPABASE_URL: Supabase project URL
 *   - SUPABASE_ANON_KEY: Supabase anon key
 *   - RPC_URL: Ethereum RPC endpoint
 */

import dotenv from 'dotenv';
import {
  createDelegationFetcher,
  type PendingDelegation,
} from './services/delegation-fetcher.js';

dotenv.config();

// ===========================================
// Configuration
// ===========================================

const AGENT_ADDRESS = process.env.AGENT_ADDRESS || process.env.DEMO_AGENT_ADDRESS;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ===========================================
// Main Demo
// ===========================================

async function main() {
  console.log('\n========================================');
  console.log('   ECHELON DEMO AGENT');
  console.log('   ERC-7715 Permission Receiver');
  console.log('========================================\n');

  // Validate configuration
  if (!AGENT_ADDRESS) {
    console.error('Error: AGENT_ADDRESS is required');
    console.error('Set it in .env or pass as environment variable');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: Supabase credentials not configured');
    console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Agent Address: ${AGENT_ADDRESS}`);
  console.log(`  Supabase URL: ${SUPABASE_URL.slice(0, 30)}...`);
  console.log('');

  // Create delegation fetcher
  console.log('Starting delegation fetcher...\n');

  const fetcher = createDelegationFetcher(
    AGENT_ADDRESS,
    handleNewDelegation,
    handleError
  );

  await fetcher.start();

  console.log('========================================');
  console.log('  Agent is now listening for delegations');
  console.log('  Grant a permission from the frontend');
  console.log('  Press Ctrl+C to stop');
  console.log('========================================\n');

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    fetcher.stop();
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

// ===========================================
// Delegation Handlers
// ===========================================

async function handleNewDelegation(delegation: PendingDelegation): Promise<void> {
  console.log('\n========================================');
  console.log('  NEW DELEGATION RECEIVED!');
  console.log('========================================');
  console.log('');
  console.log('Permission Details:');
  console.log(`  Permission ID: ${delegation.permission_id}`);
  console.log(`  From User: ${delegation.user_address}`);
  console.log(`  To Agent: ${delegation.agent_address}`);
  console.log('');
  console.log('Token Permission:');
  console.log(`  Token: ${delegation.token_address}`);
  console.log(`  Amount/Period: ${formatAmount(delegation.amount_per_period)} tokens`);
  console.log(`  Period: ${formatPeriod(delegation.period_duration)}`);
  console.log(`  Expires: ${new Date(delegation.expires_at * 1000).toLocaleString()}`);
  console.log('');
  console.log('Delegation Data:');

  try {
    const data = JSON.parse(delegation.delegation_data);
    console.log(`  Type: ${typeof data}`);
    console.log(`  Keys: ${Object.keys(data).join(', ')}`);
  } catch {
    console.log('  (Could not parse delegation data)');
  }

  console.log('');
  console.log('Status: Pending processing...');
  console.log('');

  // Simulate processing
  console.log('Simulating delegation processing:');
  console.log('  1. Parsing permission data... OK');
  await sleep(500);
  console.log('  2. Getting swap quote... OK');
  await sleep(500);
  console.log('  3. Building transaction... OK');
  await sleep(500);
  console.log('  4. Executing swap... SIMULATED');
  await sleep(500);
  console.log('  5. Logging execution on-chain... SIMULATED');
  await sleep(500);

  console.log('');
  console.log('Result: Delegation would be processed in production');
  console.log('        (Demo mode - no actual transactions)');
  console.log('========================================\n');
}

function handleError(error: Error): void {
  console.error('\nDelegation Fetcher Error:', error.message);
}

// ===========================================
// Helpers
// ===========================================

function formatAmount(weiAmount: string): string {
  // Assume 6 decimals for USDC
  const amount = BigInt(weiAmount);
  const whole = amount / 1000000n;
  const decimal = amount % 1000000n;
  return `${whole}.${decimal.toString().padStart(6, '0').slice(0, 2)}`;
}

function formatPeriod(seconds: number): string {
  if (seconds === 3600) return '1 hour';
  if (seconds === 86400) return '1 day';
  if (seconds === 604800) return '1 week';
  if (seconds === 2592000) return '1 month';
  return `${seconds} seconds`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===========================================
// Run
// ===========================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
