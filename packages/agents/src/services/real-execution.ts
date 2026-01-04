/**
 * Real Execution Service
 *
 * Executes real token transfers using ERC-7715 delegations and settles
 * profit/loss with the treasury (Fund Manager wallet).
 *
 * Flow:
 * 1. Fetch delegation data from Supabase
 * 2. Use delegation to transfer tokens from user → agent
 * 3. Simulate trade and calculate profit/loss
 * 4. Settlement:
 *    - PROFIT: Return original to user, then treasury → user (profit amount)
 *    - LOSS: Return (original - loss) to user, agent → treasury (loss amount)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeFunctionData,
  type Address,
  type Hex,
} from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions';

// ===========================================
// Configuration
// ===========================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Use PublicNode for transactions (no rate limit), fallback to env RPC
const RPC_URL = process.env.TX_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

// Treasury wallet (Fund Manager) - pays out profits, receives losses
const TREASURY_PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const TREASURY_ADDRESS = process.env.FUND_MANAGER_WALLET as Address || '' as Address;

// Default token address (can be overridden by delegation)
const DEFAULT_USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address;

// ERC20 ABI for transfer
const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

// ===========================================
// Types
// ===========================================

interface PendingDelegation {
  permission_id: string;
  user_address: string;
  agent_address: string;
  token_address: string;
  amount_per_period: string;
  delegation_data: string;
  status: string;
}

interface ERC7715Permission {
  chainId: string;
  address: string;
  signer: {
    type: string;
    data: {
      address: string;
    };
  };
  permission: {
    type: string;
    isAdjustmentAllowed: boolean;
    data: {
      periodAmount: string;
      periodDuration: number;
      startTime: number;
      justification: string;
      tokenAddress: string;
    };
  };
  rules: Array<{
    type: string;
    isAdjustmentAllowed: boolean;
    data: {
      timestamp?: number;
    };
  }>;
  context: Hex;
  dependencyInfo: any[];
  signerMeta: {
    delegationManager: Address;
  };
}

export interface RealExecutionResult {
  success: boolean;
  transferTxHash?: string;
  returnTxHash?: string;
  settlementTxHash?: string;
  amountTransferred?: bigint;
  amountReturned?: bigint;
  profitOrLoss?: bigint;
  profitPercent?: number;
  userAddress?: string;
  error?: string;
}

// ===========================================
// Supabase Client
// ===========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===========================================
// Helper Functions
// ===========================================

async function fetchPendingDelegation(
  agentAddress: string,
  userAddress: string
): Promise<PendingDelegation | null> {
  try {
    const { data, error } = await supabase
      .from('pending_delegations')
      .select('*')
      .eq('agent_address', agentAddress.toLowerCase())
      .eq('user_address', userAddress.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching delegation:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch delegation:', err);
    return null;
  }
}

async function fetchAllPendingDelegations(
  agentAddress: string
): Promise<PendingDelegation[]> {
  try {
    const { data, error } = await supabase
      .from('pending_delegations')
      .select('*')
      .eq('agent_address', agentAddress.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching delegations:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch delegations:', err);
    return [];
  }
}

function parseERC7715Permission(delegationData: string): ERC7715Permission | null {
  try {
    const parsed = JSON.parse(delegationData);
    // It's stored as an array, get the first element
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0] as ERC7715Permission;
    }
    return parsed as ERC7715Permission;
  } catch {
    return null;
  }
}

// ===========================================
// Real Execution Function
// ===========================================

/**
 * Execute a real token transfer using the user's ERC-7715 delegation.
 * Handles profit/loss settlement with the treasury.
 *
 * @param agentPrivateKey - The agent's private key (must match the signer in delegation)
 * @param userAddress - The user who granted the delegation
 * @param amount - Amount to transfer (in token smallest unit, e.g., 10000 = 0.01 USDC)
 * @param profitPercent - Profit/loss percentage (e.g., 5 = +5% profit, -3 = -3% loss)
 */
export async function executeRealTransfer(
  agentPrivateKey: string,
  userAddress: string,
  amount: bigint = 10000n, // 0.01 USDC by default
  profitPercent: number = 0 // Default: no profit/loss (just round-trip)
): Promise<RealExecutionResult> {
  const isProfit = profitPercent > 0;
  const isLoss = profitPercent < 0;
  const profitOrLossAmount = (amount * BigInt(Math.abs(Math.round(profitPercent * 100)))) / 10000n;

  console.log('\n💫 Executing REAL token transfer via ERC-7715 delegation...');
  console.log(`   User: ${userAddress}`);
  console.log(`   Amount: ${Number(amount) / 1e6} USDC`);
  if (profitPercent !== 0) {
    console.log(`   ${isProfit ? '📈 Profit' : '📉 Loss'}: ${profitPercent}% (${Number(profitOrLossAmount) / 1e6} USDC)`);
  }

  try {
    // Create agent account
    const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);
    const agentAddress = agentAccount.address;
    console.log(`   Agent EOA: ${agentAddress}`);

    // Fetch the delegation from Supabase
    console.log('   📥 Fetching delegation from Supabase...');
    const delegation = await fetchPendingDelegation(agentAddress, userAddress);

    if (!delegation) {
      return {
        success: false,
        error: 'No pending delegation found for this user',
      };
    }

    console.log(`   ✅ Found delegation: ${delegation.permission_id.slice(0, 20)}...`);

    // Parse the ERC-7715 permission data
    const permission = parseERC7715Permission(delegation.delegation_data);
    if (!permission) {
      return {
        success: false,
        error: 'Failed to parse ERC-7715 permission data',
      };
    }

    // Get the token address from the permission
    const tokenAddress = (permission.permission.data.tokenAddress || DEFAULT_USDC_ADDRESS) as Address;

    console.log('   📋 Permission type:', permission.permission.type);
    console.log('   📋 Token:', tokenAddress);
    console.log('   📋 Delegation Manager:', permission.signerMeta.delegationManager);

    // Verify the agent is the authorized signer
    if (permission.signer.data.address.toLowerCase() !== agentAddress.toLowerCase()) {
      return {
        success: false,
        error: `Agent mismatch. Expected: ${permission.signer.data.address}, Got: ${agentAddress}`,
      };
    }

    // Create public client
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL, { timeout: 60000 }),
    });

    // Create wallet client with ERC-7710 actions for delegation redemption
    const walletClient = createWalletClient({
      account: agentAccount,
      chain: sepolia,
      transport: http(RPC_URL, { timeout: 60000 }),
    }).extend(erc7710WalletActions());

    // Get the user's smart account address from the permission
    // The 'address' field in ERC-7715 is the user's EOA, but the delegation
    // is FROM the user's smart account. We need to check both.
    const userEoaAddress = permission.address as Address;

    // Check user's Smart Account token balance
    const userBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userEoaAddress],
    });

    console.log(`   User Smart Account (${userEoaAddress}) balance: ${Number(userBalance) / 1e6} USDC`);

    // The transfer will be FROM the user's smart account (the delegator)
    // We need to call transfer on USDC via the delegation

    // Encode the ERC20 transfer call
    const transferData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [agentAddress, amount],
    });

    console.log('   📤 Redeeming delegation to transfer tokens...');
    console.log('   Context length:', permission.context.length);

    // Use sendTransactionWithDelegation to redeem the delegation
    // The context is already the encoded calldata for the delegation chain
    const txHash = await walletClient.sendTransactionWithDelegation({
      account: agentAccount,
      chain: sepolia,
      to: tokenAddress,
      data: transferData,
      value: 0n,
      permissionsContext: permission.context,
      delegationManager: permission.signerMeta.delegationManager,
    });

    console.log(`   📨 Transaction submitted: ${txHash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 120000
    });

    console.log(`   ✅ Transaction confirmed in block: ${receipt.blockNumber}`);

    // Check agent's balance after transfer
    const agentBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [agentAddress],
    });

    console.log(`   Agent balance after: ${Number(agentBalance) / 1e6} USDC`);

    // ===========================================
    // Settlement: Handle profit/loss
    // ===========================================

    let returnTxHash: `0x${string}`;
    let settlementTxHash: `0x${string}` | undefined;
    let amountReturned: bigint;

    if (isProfit) {
      // PROFIT: Return original to user, then treasury → user (profit)
      console.log('\n   📈 PROFIT Settlement:');
      console.log(`      1. Agent → User: ${Number(amount) / 1e6} USDC (original)`);
      console.log(`      2. Treasury → User: ${Number(profitOrLossAmount) / 1e6} USDC (profit)`);

      // Step 1: Return original amount to user
      returnTxHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [userEoaAddress, amount],
      });
      console.log(`   📨 Return TX: ${returnTxHash}`);
      await publicClient.waitForTransactionReceipt({ hash: returnTxHash, timeout: 60000 });
      console.log('   ✅ Original amount returned!');

      // Step 2: Treasury pays profit to user
      if (profitOrLossAmount > 0n && TREASURY_PRIVATE_KEY) {
        const treasuryAccount = privateKeyToAccount(TREASURY_PRIVATE_KEY as `0x${string}`);
        const treasuryWallet = createWalletClient({
          account: treasuryAccount,
          chain: sepolia,
          transport: http(RPC_URL, { timeout: 60000 }),
        });

        settlementTxHash = await treasuryWallet.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [userEoaAddress, profitOrLossAmount],
        });
        console.log(`   📨 Profit payout TX: ${settlementTxHash}`);
        await publicClient.waitForTransactionReceipt({ hash: settlementTxHash, timeout: 60000 });
        console.log('   ✅ Profit paid to user from treasury!');
      }

      amountReturned = amount + profitOrLossAmount;

    } else if (isLoss) {
      // LOSS: Return (original - loss) to user, agent → treasury (loss)
      const amountAfterLoss = amount - profitOrLossAmount;
      console.log('\n   📉 LOSS Settlement:');
      console.log(`      1. Agent → User: ${Number(amountAfterLoss) / 1e6} USDC (after loss)`);
      console.log(`      2. Agent → Treasury: ${Number(profitOrLossAmount) / 1e6} USDC (loss)`);

      // Step 1: Return remaining amount to user
      returnTxHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [userEoaAddress, amountAfterLoss],
      });
      console.log(`   📨 Return TX: ${returnTxHash}`);
      await publicClient.waitForTransactionReceipt({ hash: returnTxHash, timeout: 60000 });
      console.log('   ✅ Remaining amount returned!');

      // Step 2: Send loss to treasury
      if (profitOrLossAmount > 0n && TREASURY_ADDRESS) {
        settlementTxHash = await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [TREASURY_ADDRESS, profitOrLossAmount],
        });
        console.log(`   📨 Loss to treasury TX: ${settlementTxHash}`);
        await publicClient.waitForTransactionReceipt({ hash: settlementTxHash, timeout: 60000 });
        console.log('   ✅ Loss transferred to treasury!');
      }

      amountReturned = amountAfterLoss;

    } else {
      // NO PROFIT/LOSS: Simple round-trip
      console.log('\n   🔄 Round-trip transfer (no profit/loss)...');

      returnTxHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [userEoaAddress, amount],
      });
      console.log(`   📨 Return TX: ${returnTxHash}`);
      await publicClient.waitForTransactionReceipt({ hash: returnTxHash, timeout: 60000 });
      console.log('   ✅ Return transfer confirmed!');

      amountReturned = amount;
    }

    console.log('\n   🎉 Execution complete!');
    console.log(`      Original: ${Number(amount) / 1e6} USDC`);
    console.log(`      Returned: ${Number(amountReturned) / 1e6} USDC`);
    if (profitPercent !== 0) {
      console.log(`      ${isProfit ? 'Profit' : 'Loss'}: ${Math.abs(profitPercent)}%`);
    }

    return {
      success: true,
      transferTxHash: txHash,
      returnTxHash: returnTxHash,
      settlementTxHash,
      amountTransferred: amount,
      amountReturned,
      profitOrLoss: isProfit ? profitOrLossAmount : -profitOrLossAmount,
      profitPercent,
      userAddress: userEoaAddress,
    };
  } catch (error: any) {
    console.error('   ❌ Real execution failed:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * List all pending delegations for an agent
 */
export async function listPendingDelegations(agentAddress: string): Promise<void> {
  console.log(`\n📋 Pending delegations for agent: ${agentAddress}`);

  const delegations = await fetchAllPendingDelegations(agentAddress);

  if (delegations.length === 0) {
    console.log('   No pending delegations found.');
    return;
  }

  console.log(`   Found ${delegations.length} delegation(s):\n`);

  for (const d of delegations) {
    const permission = parseERC7715Permission(d.delegation_data);
    console.log(`   Permission ID: ${d.permission_id.slice(0, 20)}...`);
    console.log(`   User: ${d.user_address}`);
    console.log(`   Token: ${d.token_address}`);
    console.log(`   Amount/Period: ${Number(d.amount_per_period) / 1e6} USDC`);
    if (permission) {
      console.log(`   Type: ${permission.permission.type}`);
      console.log(`   Has Context: ${permission.context ? 'Yes' : 'No'}`);
    }
    console.log('   ---');
  }
}

/**
 * Check if real execution is available (all required configs present)
 */
export function isRealExecutionAvailable(): boolean {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

// ===========================================
// CLI Entry Point
// ===========================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npx tsx src/services/real-execution.ts list');
    console.log('  npx tsx src/services/real-execution.ts execute <user_address> [amount_usdc] [profit_percent]');
    console.log('');
    console.log('Examples:');
    console.log('  execute 0x... 100       # Transfer 100 USDC, no profit/loss');
    console.log('  execute 0x... 100 5     # Transfer 100 USDC, +5% profit (user gets 105)');
    console.log('  execute 0x... 100 -3    # Transfer 100 USDC, -3% loss (user gets 97)');
    return;
  }

  const command = args[0];

  // Get agent private key from env
  const agentPrivateKey = process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
  if (!agentPrivateKey) {
    console.error('Error: PRIVATE_KEY or AGENT_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);

  if (command === 'list') {
    await listPendingDelegations(agentAccount.address);
  } else if (command === 'execute') {
    const userAddress = args[1];
    if (!userAddress) {
      console.error('Error: user_address required');
      console.log('Usage: npx tsx src/services/real-execution.ts execute <user_address> [amount_usdc] [profit_percent]');
      process.exit(1);
    }

    const amountUsdc = args[2] ? parseFloat(args[2]) : 0.01;
    const amount = BigInt(Math.floor(amountUsdc * 1e6));
    const profitPercent = args[3] ? parseFloat(args[3]) : 0;

    const result = await executeRealTransfer(agentPrivateKey, userAddress, amount, profitPercent);

    console.log('\n📊 Result:', result);
  } else {
    console.error(`Unknown command: ${command}`);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
