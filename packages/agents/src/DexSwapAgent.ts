/**
 * Echelon Agents - DEX Swap Agent
 *
 * Agent that identifies and executes arbitrage/swap opportunities
 * using Uniswap V3 on Sepolia testnet.
 */

import type { Address, Hash, Hex } from 'viem';
import { encodeFunctionData } from 'viem';

import { BaseAgent } from './BaseAgent.js';
import type {
  DexSwapAgentConfig,
  SwapOpportunity,
  SwapResult,
  Permission,
  StrategyType,
} from './types/index.js';
import { loadDexSwapConfig, getPoolFee, POOL_FEES } from './config/index.js';
import {
  getSwapQuote,
  executeSwap,
  getTokenBalance,
  getTokenAllowance,
  approveToken,
  UniswapV3RouterAbi,
} from './contracts/index.js';
import { calculateProfitPercent, formatWei, nowSeconds } from './utils/helpers.js';
import {
  getDelegationsForAgent,
  markDelegationRedeemed,
  type StoredDelegation,
} from './utils/delegation-storage.js';
import type { PendingDelegation } from './services/delegation-fetcher.js';
import {
  getA2ADelegationStore,
  type A2ADelegation,
  type A2ADelegationStore,
} from './services/a2a-delegation-store.js';

// ============================================
// CONSTANTS
// ============================================

/** Minimum profit percentage to execute a swap (0.5%) */
const MIN_PROFIT_THRESHOLD = 0.5;

/** Maximum amount to use per swap (in wei) */
const MAX_SWAP_AMOUNT = 100000000n; // 100 USDC (6 decimals)

/** Minimum swap amount (in wei) */
const MIN_SWAP_AMOUNT = 1000000n; // 1 USDC (6 decimals)

/** Maximum uint256 for unlimited approval */
const MAX_UINT256 = 2n ** 256n - 1n;

// ============================================
// DEX SWAP AGENT
// ============================================

/**
 * DEX Swap Agent
 *
 * Strategy:
 * 1. Get active permissions from users
 * 2. Fetch current prices from Uniswap V3 Quoter
 * 3. Identify profitable swap opportunities
 * 4. Log execution start on-chain
 * 5. Execute swap via Uniswap V3 Router
 * 6. Log execution result
 */
export class DexSwapAgent extends BaseAgent {
  private dexConfig: DexSwapAgentConfig;
  private a2aStore: A2ADelegationStore | null = null;
  private a2aSubscription: { unsubscribe: () => void } | null = null;
  private pendingA2ADelegations: A2ADelegation[] = [];

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(config?: DexSwapAgentConfig) {
    const dexConfig = config || loadDexSwapConfig();
    super(dexConfig);
    this.dexConfig = dexConfig;
  }

  // ============================================
  // IDENTITY
  // ============================================

  getName(): string {
    return 'DexSwap';
  }

  getStrategyType(): StrategyType {
    return 'Arbitrage';
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async start(): Promise<void> {
    // Initialize A2A delegation store and subscription
    try {
      this.a2aStore = getA2ADelegationStore();
      this.logger.info('A2A delegation store initialized');

      // Subscribe to incoming A2A delegations from FundManager
      this.a2aSubscription = this.a2aStore.subscribe(
        this.walletAddress,
        (delegation) => this.handleNewA2ADelegation(delegation)
      );
      this.logger.info('Subscribed to A2A delegations');

      // Fetch any pending A2A delegations
      await this.fetchPendingA2ADelegations();
    } catch (error) {
      this.logger.warn('Failed to initialize A2A delegation store', {
        error: String(error),
      });
    }

    // Call parent start (initializes ERC-7715 delegation fetcher)
    await super.start();
  }

  async stop(): Promise<void> {
    // Cleanup A2A subscription
    if (this.a2aSubscription) {
      this.a2aSubscription.unsubscribe();
      this.a2aSubscription = null;
    }

    if (this.a2aStore) {
      this.a2aStore.cleanup();
    }

    await super.stop();
  }

  // ============================================
  // A2A DELEGATION HANDLING
  // ============================================

  /**
   * Handle a new A2A delegation from FundManager
   */
  private handleNewA2ADelegation(delegation: A2ADelegation): void {
    this.logger.info('Received new A2A delegation from FundManager', {
      delegationHash: delegation.delegation_hash,
      fromAgentId: delegation.from_agent_id,
      amount: delegation.amount,
      strategyType: delegation.strategy_type,
    });

    // Add to queue for processing
    this.pendingA2ADelegations.push(delegation);
  }

  /**
   * Fetch pending A2A delegations from Supabase
   */
  private async fetchPendingA2ADelegations(): Promise<void> {
    if (!this.a2aStore) return;

    const delegations = await this.a2aStore.getPendingDelegations(this.walletAddress);

    if (delegations.length > 0) {
      this.logger.info('Found pending A2A delegations', {
        count: delegations.length,
      });
      this.pendingA2ADelegations.push(...delegations);
    }
  }

  /**
   * Process an A2A delegation from FundManager via Supabase.
   *
   * This is the new A2A flow:
   * 1. FundManager analyzed market and created ERC-7710 delegation
   * 2. Delegation is stored in Supabase a2a_delegations table
   * 3. We receive it here and redeem via our Smart Account
   */
  private async processA2ADelegation(a2aDelegation: A2ADelegation): Promise<void> {
    this.logger.info('Processing A2A delegation', {
      delegationHash: a2aDelegation.delegation_hash,
      fromAgentId: a2aDelegation.from_agent_id,
      userAddress: a2aDelegation.user_address,
      amount: a2aDelegation.amount,
      strategyType: a2aDelegation.strategy_type,
    });

    // Check if Smart Account is ready
    if (!this.isSmartAccountReady()) {
      this.logger.warn('Smart Account not initialized, cannot process A2A delegation');
      // Put it back in the queue for retry
      this.pendingA2ADelegations.push(a2aDelegation);
      return;
    }

    try {
      const amount = BigInt(a2aDelegation.amount);
      const { wethAddress, usdcAddress } = this.dexConfig;
      const userAddress = a2aDelegation.user_address as Address;
      const tokenAddress = a2aDelegation.token_address as Address;

      // Determine swap direction based on token
      const tokenIn = tokenAddress;
      const tokenOut = tokenIn.toLowerCase() === usdcAddress.toLowerCase() ? wethAddress : usdcAddress;

      // Cap amount for safety
      const swapAmount = amount > MAX_SWAP_AMOUNT ? MAX_SWAP_AMOUNT : amount;

      if (swapAmount < MIN_SWAP_AMOUNT) {
        this.logger.info('A2A delegation amount too small', {
          amount: swapAmount.toString(),
          minimum: MIN_SWAP_AMOUNT.toString(),
        });
        return;
      }

      // Get quote
      const poolFee = getPoolFee(
        tokenIn.toLowerCase() === usdcAddress.toLowerCase() ? 'USDC' : 'WETH',
        tokenOut.toLowerCase() === usdcAddress.toLowerCase() ? 'USDC' : 'WETH'
      );

      const { amountOut } = await getSwapQuote(
        this.publicClient,
        this.dexConfig.uniswapQuoterAddress,
        tokenIn,
        tokenOut,
        swapAmount,
        poolFee
      );

      // Calculate minimum with slippage
      const slippageMultiplier = BigInt(
        Math.floor((1 - this.dexConfig.slippageTolerance) * 10000)
      );
      const minAmountOut = (amountOut * slippageMultiplier) / 10000n;

      this.logger.info('A2A swap quote obtained', {
        tokenIn,
        tokenOut,
        amountIn: swapAmount.toString(),
        expectedOut: amountOut.toString(),
        minOut: minAmountOut.toString(),
      });

      // Build swap calldata
      const swapCalldata = this.buildSwapCalldata(
        tokenIn,
        tokenOut,
        swapAmount,
        minAmountOut,
        userAddress, // Send to original user
        poolFee
      );

      // Redeem the ERC-7710 delegation via bundler
      const txHash = await this.redeemDelegation(a2aDelegation.signed_delegation, {
        target: this.dexConfig.uniswapRouterAddress,
        value: 0n,
        callData: swapCalldata,
      });

      // Mark as redeemed in Supabase
      if (this.a2aStore) {
        await this.a2aStore.markRedeemed(a2aDelegation.delegation_hash, txHash);
      }

      this.logger.info('A2A delegation redeemed successfully', {
        delegationHash: a2aDelegation.delegation_hash,
        txHash,
        amountIn: swapAmount.toString(),
        expectedOut: amountOut.toString(),
        userAddress,
      });
    } catch (error) {
      this.logger.error(
        'Failed to process A2A delegation',
        error instanceof Error ? error : new Error(String(error)),
        {
          delegationHash: a2aDelegation.delegation_hash,
          fromAgentId: a2aDelegation.from_agent_id,
        }
      );
    }
  }

  // ============================================
  // MAIN STRATEGY
  // ============================================

  async executeStrategy(): Promise<void> {
    this.logger.info('Checking for swap opportunities...');

    // 1. Process A2A delegations from Supabase (new flow)
    if (this.pendingA2ADelegations.length > 0) {
      this.logger.info('Processing A2A delegations from FundManager', {
        count: this.pendingA2ADelegations.length,
      });

      // Process delegations (take a copy to avoid mutation during iteration)
      const delegationsToProcess = [...this.pendingA2ADelegations];
      this.pendingA2ADelegations = [];

      for (const a2aDelegation of delegationsToProcess) {
        await this.processA2ADelegation(a2aDelegation);
      }
    }

    // 2. Check for legacy ERC-7710 delegations (from local storage)
    const legacyDelegations = this.getActiveDelegations();
    if (legacyDelegations.length > 0) {
      this.logger.info('Found legacy delegations from Fund Manager', {
        count: legacyDelegations.length,
      });

      for (const storedDelegation of legacyDelegations) {
        await this.executeSwapViaDelegation(storedDelegation);
      }
    }

    // 3. Get active direct permissions (ERC-7715)
    const permissions = await this.getActivePermissions();
    const hadDelegations = this.pendingA2ADelegations.length > 0 || legacyDelegations.length > 0;

    if (permissions.length === 0 && !hadDelegations) {
      this.logger.info('No active permissions or delegations, skipping cycle');
      return;
    }

    if (permissions.length === 0) {
      // Already processed delegations above
      return;
    }

    // 4. Find arbitrage opportunities from direct permissions
    const opportunity = await this.findSwapOpportunity(permissions);

    if (!opportunity) {
      this.logger.debug('No profitable opportunity found');
      return;
    }

    this.logger.logSwapOpportunity(
      opportunity.tokenIn,
      opportunity.tokenOut,
      opportunity.amountIn,
      opportunity.expectedOut,
      opportunity.profitPercent
    );

    // 4. Execute swap if profitable enough
    if (opportunity.profitPercent >= MIN_PROFIT_THRESHOLD) {
      await this.executeSwapWithLogging(opportunity);
    } else {
      this.logger.debug('Opportunity below profit threshold', {
        profitPercent: opportunity.profitPercent,
        threshold: MIN_PROFIT_THRESHOLD,
      });
    }
  }

  // ============================================
  // ERC-7715 DELEGATION PROCESSING (FROM SUPABASE)
  // ============================================

  /**
   * Process a pending ERC-7715 delegation from Supabase.
   * This is called automatically when a user grants permission to this agent.
   *
   * @param delegation - The pending delegation from Supabase
   * @returns True if successfully processed
   */
  protected async processPendingDelegation(delegation: PendingDelegation): Promise<boolean> {
    this.logger.info('Processing ERC-7715 delegation for swap...', {
      permissionId: delegation.permission_id,
      userAddress: delegation.user_address,
      tokenAddress: delegation.token_address,
      amountPerPeriod: delegation.amount_per_period,
    });

    // Check if Smart Account is ready
    if (!this.isSmartAccountReady()) {
      this.logger.warn('Smart Account not initialized, cannot process delegation', {
        permissionId: delegation.permission_id,
      });
      return false;
    }

    try {
      // Parse the ERC-7715 permission data
      const permissionData = JSON.parse(delegation.delegation_data);

      if (!permissionData) {
        this.logger.error('Invalid permission data', new Error('Failed to parse delegation_data'));
        return false;
      }

      // Determine swap parameters based on the permission
      const { wethAddress, usdcAddress } = this.dexConfig;
      const tokenIn = delegation.token_address.toLowerCase() as Address;
      const tokenOut = tokenIn === usdcAddress.toLowerCase() ? wethAddress : usdcAddress;

      // Use the amount from the permission (converted to bigint)
      const swapAmount = BigInt(delegation.amount_per_period);

      // Cap at MAX_SWAP_AMOUNT for safety
      const actualSwapAmount = swapAmount > MAX_SWAP_AMOUNT ? MAX_SWAP_AMOUNT : swapAmount;

      if (actualSwapAmount < MIN_SWAP_AMOUNT) {
        this.logger.info('Swap amount too small, skipping', {
          amount: actualSwapAmount.toString(),
          minimum: MIN_SWAP_AMOUNT.toString(),
        });
        return false;
      }

      // Get quote from Uniswap
      const poolFee = getPoolFee(
        tokenIn === usdcAddress ? 'USDC' : 'WETH',
        tokenOut === usdcAddress ? 'USDC' : 'WETH'
      );

      const { amountOut } = await getSwapQuote(
        this.publicClient,
        this.dexConfig.uniswapQuoterAddress,
        tokenIn,
        tokenOut,
        actualSwapAmount,
        poolFee
      );

      // Calculate minimum output with slippage
      const slippageMultiplier = BigInt(
        Math.floor((1 - this.dexConfig.slippageTolerance) * 10000)
      );
      const minAmountOut = (amountOut * slippageMultiplier) / 10000n;

      this.logger.info('Swap quote obtained', {
        tokenIn,
        tokenOut,
        amountIn: actualSwapAmount.toString(),
        expectedOut: amountOut.toString(),
        minOut: minAmountOut.toString(),
      });

      // Build swap calldata
      const swapCalldata = this.buildSwapCalldata(
        tokenIn,
        tokenOut,
        actualSwapAmount,
        minAmountOut,
        delegation.user_address as Address, // Send output back to user
        poolFee
      );

      // Log execution start
      const executionId = await this.logExecutionStart(
        delegation.user_address as Address,
        actualSwapAmount,
        tokenIn,
        tokenOut
      );

      // Execute the swap via delegation redemption
      // Note: For ERC-7715 periodic permissions, the user's smart account
      // has pre-approved the agent to spend tokens on their behalf
      this.logger.info('Executing swap via ERC-7715 permission...', {
        executionId: executionId.toString(),
        permissionId: delegation.permission_id,
      });

      // For demo purposes, we'll execute a direct swap from our wallet
      // In production with full ERC-7715, this would use redeemDelegations
      const swapResult = await this.executeUniswapSwap(
        tokenIn,
        tokenOut,
        actualSwapAmount,
        minAmountOut,
        poolFee
      );

      // Log execution complete
      await this.logExecutionComplete(
        executionId,
        delegation.user_address as Address,
        actualSwapAmount,
        swapResult.amountOut,
        swapResult.success
      );

      if (swapResult.success) {
        // Mark the delegation as claimed in Supabase
        await this.markDelegationClaimed(delegation.permission_id, swapResult.txHash);

        this.logger.info('ERC-7715 delegation processed successfully!', {
          permissionId: delegation.permission_id,
          executionId: executionId.toString(),
          txHash: swapResult.txHash,
          amountIn: actualSwapAmount.toString(),
          amountOut: swapResult.amountOut.toString(),
        });

        return true;
      } else {
        this.logger.error('Swap execution failed', new Error(swapResult.error || 'Unknown error'));
        return false;
      }
    } catch (error) {
      this.logger.error(
        'Failed to process ERC-7715 delegation',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  // ============================================
  // DELEGATION REDEMPTION (A2A FLOW - LEGACY)
  // ============================================

  /**
   * Get active ERC-7710 delegations for this agent (from local storage)
   * @deprecated Use Supabase-based DelegationFetcher instead
   */
  private getActiveDelegations(): StoredDelegation[] {
    return getDelegationsForAgent(this.agentId);
  }

  /**
   * Execute swap via ERC-7710 delegation redemption.
   *
   * This is the A2A (Agent-to-Agent) flow:
   * 1. Fund Manager created and stored a delegation for us
   * 2. We build the swap execution calldata
   * 3. We redeem the delegation via bundler
   * 4. Caveats are enforced on-chain during redemption
   */
  private async executeSwapViaDelegation(
    storedDelegation: StoredDelegation
  ): Promise<void> {
    const { delegation, hash: delegationHash, amount, userAddress, delegatorAgentId } = storedDelegation;

    this.logger.info('Executing swap via delegation redemption', {
      delegationHash,
      delegatorAgentId,
      amount: amount.toString(),
      userAddress,
    });

    // Check if Smart Account is ready for delegation redemption
    if (!this.isSmartAccountReady()) {
      this.logger.warn('Smart Account not initialized, cannot redeem delegation');
      return;
    }

    try {
      // 1. Get quote for the delegated amount
      const { wethAddress, usdcAddress } = this.dexConfig;
      const swapAmount = amount > MAX_SWAP_AMOUNT ? MAX_SWAP_AMOUNT : amount;
      const poolFee = getPoolFee('USDC', 'WETH');

      const { amountOut } = await getSwapQuote(
        this.publicClient,
        this.dexConfig.uniswapQuoterAddress,
        usdcAddress,
        wethAddress,
        swapAmount,
        poolFee
      );

      // 2. Calculate minimum output with slippage
      const slippageMultiplier = BigInt(
        Math.floor((1 - this.dexConfig.slippageTolerance) * 10000)
      );
      const minAmountOut = (amountOut * slippageMultiplier) / 10000n;

      // 3. Build swap calldata for Uniswap Router
      const swapCalldata = this.buildSwapCalldata(
        usdcAddress,
        wethAddress,
        swapAmount,
        minAmountOut,
        userAddress, // Recipient is the original user
        poolFee
      );

      // 4. Redeem delegation via bundler
      const txHash = await this.redeemDelegation(delegation, {
        target: this.dexConfig.uniswapRouterAddress,
        value: 0n,
        callData: swapCalldata,
      });

      // 5. Mark delegation as redeemed
      markDelegationRedeemed(delegationHash, txHash);

      this.logger.info('Delegation redeemed successfully', {
        delegationHash,
        txHash,
        amountIn: swapAmount.toString(),
        expectedOut: amountOut.toString(),
      });
    } catch (error) {
      this.logger.error(
        'Failed to redeem delegation',
        error instanceof Error ? error : new Error(String(error)),
        {
          delegationHash,
          delegatorAgentId,
        }
      );
    }
  }

  /**
   * Build calldata for Uniswap V3 exactInputSingle swap
   */
  private buildSwapCalldata(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    amountOutMinimum: bigint,
    recipient: Address,
    fee: number
  ): Hex {
    return encodeFunctionData({
      abi: UniswapV3RouterAbi,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn,
          tokenOut,
          fee,
          recipient,
          amountIn,
          amountOutMinimum,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });
  }

  // ============================================
  // OPPORTUNITY DETECTION
  // ============================================

  /**
   * Find a swap opportunity from available permissions
   */
  private async findSwapOpportunity(
    permissions: Permission[]
  ): Promise<SwapOpportunity | null> {
    // Get WETH/USDC pair prices
    const { wethAddress, usdcAddress } = this.dexConfig;

    for (const permission of permissions) {
      if (!permission.isActive) continue;

      const userAddress = permission.user.id as Address;
      const remainingAmount = BigInt(
        Math.floor(parseFloat(permission.amountRemaining))
      );

      // Skip if insufficient remaining amount
      if (remainingAmount < MIN_SWAP_AMOUNT) continue;

      // Calculate swap amount (capped at max)
      const swapAmount =
        remainingAmount > MAX_SWAP_AMOUNT ? MAX_SWAP_AMOUNT : remainingAmount;

      try {
        // Get quote for USDC -> WETH swap
        const opportunity = await this.evaluateSwap(
          usdcAddress,
          wethAddress,
          swapAmount,
          userAddress
        );

        if (opportunity && opportunity.profitPercent >= MIN_PROFIT_THRESHOLD) {
          return opportunity;
        }

        // Also check WETH -> USDC direction
        const reverseOpportunity = await this.evaluateSwap(
          wethAddress,
          usdcAddress,
          swapAmount,
          userAddress
        );

        if (
          reverseOpportunity &&
          reverseOpportunity.profitPercent >= MIN_PROFIT_THRESHOLD
        ) {
          return reverseOpportunity;
        }
      } catch (error) {
        this.logger.debug('Error evaluating swap for permission', {
          permissionId: permission.id,
          error: String(error),
        });
      }
    }

    return null;
  }

  /**
   * Evaluate a potential swap opportunity
   */
  private async evaluateSwap(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    userAddress: Address
  ): Promise<SwapOpportunity | null> {
    try {
      const poolFee = getPoolFee(
        tokenIn === this.dexConfig.wethAddress ? 'WETH' : 'USDC',
        tokenOut === this.dexConfig.wethAddress ? 'WETH' : 'USDC'
      );

      // Get quote from Uniswap V3 Quoter
      const { amountOut } = await getSwapQuote(
        this.publicClient,
        this.dexConfig.uniswapQuoterAddress,
        tokenIn,
        tokenOut,
        amountIn,
        poolFee
      );

      // Calculate profit (comparing output value to input value)
      // Note: In real implementation, need price oracles for accurate comparison
      const profitPercent = this.estimateProfitPercent(
        tokenIn,
        tokenOut,
        amountIn,
        amountOut
      );

      // Calculate minimum output with slippage
      const slippageMultiplier = BigInt(
        Math.floor((1 - this.dexConfig.slippageTolerance) * 10000)
      );
      const minAmountOut = (amountOut * slippageMultiplier) / 10000n;

      return {
        tokenIn,
        tokenOut,
        amountIn,
        expectedOut: amountOut,
        minAmountOut,
        profitPercent,
        userAddress,
        poolFee,
      };
    } catch (error) {
      this.logger.debug('Failed to get swap quote', {
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Estimate profit percentage for a swap
   * In production, use price oracles for accurate valuation
   */
  private estimateProfitPercent(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    amountOut: bigint
  ): number {
    // Simplified profit estimation
    // Assumes the swap is profitable if we get more out than current market rate
    // In production, compare against multiple DEX prices or oracle prices

    // For testnet demo, use a simple heuristic:
    // If USDC -> WETH, assume 1 ETH = 2000 USDC
    // Calculate expected vs actual

    const { wethAddress, usdcAddress } = this.dexConfig;

    if (tokenIn === usdcAddress && tokenOut === wethAddress) {
      // USDC -> WETH: expect ~0.0005 WETH per USDC (at 2000 USDC/ETH)
      const expectedWethPer1USDC = 500000000000000n; // 0.0005 WETH in wei
      const actualWethPer1USDC = (amountOut * 1000000n) / amountIn;
      return Number((actualWethPer1USDC - expectedWethPer1USDC) * 10000n / expectedWethPer1USDC) / 100;
    } else if (tokenIn === wethAddress && tokenOut === usdcAddress) {
      // WETH -> USDC: expect ~2000 USDC per WETH
      const expectedUsdcPerWeth = 2000000000n; // 2000 USDC in 6 decimals
      const actualUsdcPerWeth = (amountOut * 1000000000000000000n) / amountIn;
      return Number((actualUsdcPerWeth - expectedUsdcPerWeth) * 10000n / expectedUsdcPerWeth) / 100;
    }

    // Default: compare raw amounts (not accurate but fallback)
    return calculateProfitPercent(amountIn, amountOut);
  }

  // ============================================
  // SWAP EXECUTION
  // ============================================

  /**
   * Execute swap with on-chain logging
   */
  private async executeSwapWithLogging(
    opportunity: SwapOpportunity
  ): Promise<void> {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      userAddress,
      poolFee,
    } = opportunity;

    let executionId: bigint | null = null;

    try {
      // 1. Log execution start
      executionId = await this.logExecutionStart(
        userAddress,
        amountIn,
        tokenIn,
        tokenOut
      );

      // 2. Check and approve token if needed
      await this.ensureTokenApproval(tokenIn, amountIn);

      // 3. Execute the swap
      const result = await this.executeUniswapSwap(
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
        poolFee
      );

      // 4. Log execution complete
      await this.logExecutionComplete(
        executionId,
        userAddress,
        amountIn,
        result.amountOut,
        result.success
      );

      this.logger.info('Swap executed successfully', {
        executionId: executionId.toString(),
        amountIn: formatWei(amountIn, 6),
        amountOut: formatWei(result.amountOut, 18),
        txHash: result.txHash,
      });
    } catch (error) {
      this.logger.error(
        'Swap execution failed',
        error instanceof Error ? error : new Error(String(error))
      );

      // Log failure if we started an execution
      if (executionId !== null) {
        try {
          await this.logExecutionComplete(
            executionId,
            userAddress,
            amountIn,
            0n,
            false
          );
        } catch (logError) {
          this.logger.error(
            'Failed to log execution failure',
            logError instanceof Error ? logError : new Error(String(logError))
          );
        }
      }

      throw error;
    }
  }

  /**
   * Ensure token approval for Uniswap Router
   */
  private async ensureTokenApproval(
    tokenAddress: Address,
    amount: bigint
  ): Promise<void> {
    const routerAddress = this.dexConfig.uniswapRouterAddress;
    const walletAddress = this.getWalletAddress();

    // Check current allowance
    const currentAllowance = await getTokenAllowance(
      this.publicClient,
      tokenAddress,
      walletAddress,
      routerAddress
    );

    if (currentAllowance >= amount) {
      this.logger.debug('Token already approved', {
        token: tokenAddress,
        allowance: currentAllowance.toString(),
      });
      return;
    }

    // Approve max amount for future swaps
    this.logger.info('Approving token for Uniswap Router', {
      token: tokenAddress,
      spender: routerAddress,
    });

    await approveToken(
      this.walletClient,
      this.publicClient,
      tokenAddress,
      routerAddress,
      MAX_UINT256
    );

    this.logger.info('Token approved');
  }

  /**
   * Execute swap on Uniswap V3
   */
  private async executeUniswapSwap(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    minAmountOut: bigint,
    poolFee: number
  ): Promise<SwapResult> {
    try {
      const { hash, amountOut } = await executeSwap(
        this.walletClient,
        this.publicClient,
        this.dexConfig.uniswapRouterAddress,
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
        this.getWalletAddress(),
        poolFee
      );

      return {
        success: true,
        amountOut,
        txHash: hash,
      };
    } catch (error) {
      return {
        success: false,
        amountOut: 0n,
        txHash: '0x' as Hash,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get current token balance for agent wallet
   */
  protected async getTokenBalance(tokenAddress: Address): Promise<bigint> {
    return getTokenBalance(
      this.publicClient,
      tokenAddress,
      this.getWalletAddress()
    );
  }
}
