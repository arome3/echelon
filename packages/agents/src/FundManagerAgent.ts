/**
 * Echelon Agents - Fund Manager Agent
 *
 * Manager agent that analyzes market conditions and delegates to specialist agents.
 * Implements A2A (Agent-to-Agent) redelegation flow using ERC-7710 delegations.
 *
 * Flow:
 * 1. User grants ERC-7715 permission to Fund Manager
 * 2. Fund Manager analyzes market conditions
 * 3. Fund Manager creates ERC-7710 delegation to Specialist
 * 4. Specialist redeems delegation via bundler to execute trades
 */

import { type Address, type Hex, encodeAbiParameters } from 'viem';
import type { Caveat, Delegation } from '@metamask/smart-accounts-kit';
import { getDelegationHashOffchain } from '@metamask/smart-accounts-kit/utils';

import { BaseAgent } from './BaseAgent.js';
import type { PendingDelegation } from './services/delegation-fetcher.js';
import {
  getA2ADelegationStore,
  createA2ADelegationRecord,
  type A2ADelegationStore,
} from './services/a2a-delegation-store.js';
import type {
  AgentConfig,
  MarketConditions,
  SpecialistAgent,
  AllocationDecision,
  Permission,
  StrategyType,
} from './types/index.js';
import {
  calculateVolatility,
  determineTrend,
  clamp,
  nowSeconds,
} from './utils/helpers.js';
import { getDelegationFrameworkAddresses } from './config/delegation.js';
import { getUniswapAddresses, getTokenAddresses } from './config/chains.js';

// ============================================
// CONSTANTS
// ============================================

/** Minimum reputation score for specialist selection */
const MIN_REPUTATION_SCORE = 60;

/** Default redelegation duration in seconds (1 hour) */
const DEFAULT_DELEGATION_DURATION = 3600n;

/** Minimum amount to delegate (in wei) */
const MIN_DELEGATION_AMOUNT = 1000000n; // 1 USDC (6 decimals)

/** Volatility threshold for strategy selection */
const HIGH_VOLATILITY_THRESHOLD = 0.1;

/** Yield APY threshold for yield strategy */
const HIGH_YIELD_THRESHOLD = 8.0;

// ============================================
// FUND MANAGER AGENT
// ============================================

/**
 * Fund Manager Agent
 *
 * Strategy:
 * 1. Analyze current market conditions (volatility, trend, yields)
 * 2. Query Envio for best specialist matching conditions
 * 3. Calculate optimal allocation based on risk
 * 4. Execute redelegation to specialist
 */
export class FundManagerAgent extends BaseAgent {
  // ============================================
  // PROPERTIES
  // ============================================

  private a2aStore!: A2ADelegationStore;

  // ============================================
  // IDENTITY
  // ============================================

  getName(): string {
    return 'FundManager';
  }

  getStrategyType(): StrategyType {
    return 'Manager';
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async start(): Promise<void> {
    // Initialize A2A delegation store
    this.a2aStore = getA2ADelegationStore();
    this.logger.info('A2A delegation store initialized');

    // Call parent start (initializes delegation fetcher)
    await super.start();
  }

  // ============================================
  // INCOMING DELEGATION PROCESSING
  // ============================================

  /**
   * Process incoming ERC-7715 delegations from users.
   *
   * When a user grants permission to the FundManager:
   * 1. Analyze current market conditions
   * 2. Find the best specialist agent
   * 3. Create an ERC-7710 delegation to the specialist
   * 4. Store the A2A delegation in Supabase
   *
   * @param delegation - The incoming user delegation from Supabase
   * @returns true if processing was successful
   */
  protected async processPendingDelegation(delegation: PendingDelegation): Promise<boolean> {
    this.logger.info('Processing incoming user delegation', {
      permissionId: delegation.permission_id,
      user: delegation.user_address,
      amount: delegation.amount_per_period,
    });

    try {
      // 1. Analyze market conditions
      const conditions = await this.analyzeMarket();
      this.logger.logMarketAnalysis(
        conditions.ethVolatility,
        conditions.trendDirection,
        this.determineTargetStrategy(conditions)
      );

      // 2. Find best specialist
      const specialist = await this.findBestSpecialist(conditions);

      if (!specialist) {
        this.logger.warn('No suitable specialist found, will retry later');
        return false; // Don't mark as claimed, will retry
      }

      this.logger.logSpecialistSelected(
        specialist.id,
        specialist.name,
        specialist.reputationScore,
        specialist.strategyType
      );

      // 3. Calculate allocation from the delegation amount
      const availableAmount = BigInt(delegation.amount_per_period);
      const allocation = this.calculateAllocation(availableAmount, conditions);

      if (allocation.amount < MIN_DELEGATION_AMOUNT) {
        this.logger.info('Calculated allocation below minimum threshold');
        return false;
      }

      // 4. Create ERC-7710 delegation to specialist
      const userAddress = delegation.user_address as Address;

      if (this.isSmartAccountReady()) {
        const signedDelegation = await this.createERC7710Delegation(specialist, allocation);

        // 5. Store A2A delegation in Supabase
        const a2aRecord = createA2ADelegationRecord({
          signedDelegation,
          parentPermissionId: delegation.permission_id,
          fromAgentId: parseInt(this.agentId),
          fromAgentAddress: this.walletAddress,
          toAgentId: parseInt(specialist.id),
          toAgentAddress: specialist.walletAddress as Address,
          userAddress,
          tokenAddress: delegation.token_address as Address,
          amount: allocation.amount,
          expiresAt: nowSeconds() + Number(allocation.duration),
          strategyType: allocation.targetStrategy,
          caveats: this.buildDelegationCaveats(allocation).map((c) => ({
            enforcer: c.enforcer,
            terms: c.terms,
          })),
        });

        const storeResult = await this.a2aStore.storeDelegation(a2aRecord);

        if (!storeResult.success) {
          this.logger.error('Failed to store A2A delegation', new Error(storeResult.error || 'Unknown error'));
          return false;
        }

        this.logger.info('A2A delegation stored in Supabase', {
          delegationHash: signedDelegation.hash,
          specialistId: specialist.id,
          amount: allocation.amount.toString(),
        });
      } else {
        this.logger.warn('Smart Account not enabled, logging redelegation only');
      }

      // 6. Log redelegation on-chain for Envio indexing
      await this.logRedelegation(
        BigInt(specialist.id),
        userAddress,
        allocation.amount,
        allocation.duration
      );

      this.logger.info('Successfully processed user delegation', {
        permissionId: delegation.permission_id,
        specialistId: specialist.id,
      });

      return true;
    } catch (error) {
      this.logger.error(
        'Failed to process delegation',
        error instanceof Error ? error : new Error(String(error)),
        { permissionId: delegation.permission_id }
      );
      return false;
    }
  }

  // ============================================
  // MAIN STRATEGY (Legacy - for manual execution)
  // ============================================

  async executeStrategy(): Promise<void> {
    this.logger.info('Analyzing market conditions...');

    // 1. Analyze current market conditions
    const conditions = await this.analyzeMarket();
    this.logger.logMarketAnalysis(
      conditions.ethVolatility,
      conditions.trendDirection,
      this.determineTargetStrategy(conditions)
    );

    // 2. Find best specialist based on conditions
    const specialist = await this.findBestSpecialist(conditions);

    if (!specialist) {
      this.logger.info('No suitable specialist found for current conditions');
      return;
    }

    this.logger.logSpecialistSelected(
      specialist.id,
      specialist.name,
      specialist.reputationScore,
      specialist.strategyType
    );

    // 3. Check available amount to delegate
    const availableAmount = await this.getAvailableAmount();

    if (availableAmount < MIN_DELEGATION_AMOUNT) {
      this.logger.info('Insufficient available amount to delegate', {
        available: availableAmount.toString(),
        minimum: MIN_DELEGATION_AMOUNT.toString(),
      });
      return;
    }

    // 4. Calculate optimal allocation
    const allocation = this.calculateAllocation(availableAmount, conditions);

    if (allocation.amount < MIN_DELEGATION_AMOUNT) {
      this.logger.info('Calculated allocation below minimum threshold');
      return;
    }

    // 5. Get user address from active permissions
    const permissions = await this.getActivePermissions();
    if (permissions.length === 0) {
      this.logger.info('No active permissions found');
      return;
    }

    const userAddress = permissions[0].user.id as Address;

    // 6. Execute redelegation
    await this.redelegateToSpecialist(specialist, allocation, userAddress);
  }

  // ============================================
  // MARKET ANALYSIS
  // ============================================

  /**
   * Analyze current market conditions
   */
  private async analyzeMarket(): Promise<MarketConditions> {
    try {
      // Get recent profit/loss data from Envio
      const profitLosses = await this.envio.getRecentProfitLosses(100);

      const volatility = calculateVolatility(profitLosses);
      const trend = determineTrend(profitLosses);
      const avgRecentProfitLoss =
        profitLosses.length > 0
          ? profitLosses.reduce((a, b) => a + b, 0) / profitLosses.length
          : 0;

      return {
        ethVolatility: volatility,
        bestYieldApy: await this.estimateYieldApy(),
        trendDirection: trend,
        avgRecentProfitLoss,
        sampleSize: profitLosses.length,
      };
    } catch (error) {
      this.logger.warn('Failed to analyze market, using defaults', {
        error: String(error),
      });

      return {
        ethVolatility: 0.05,
        bestYieldApy: 5.0,
        trendDirection: 'neutral',
        avgRecentProfitLoss: 0,
        sampleSize: 0,
      };
    }
  }

  /**
   * Estimate best available yield APY
   * In production, this would query DeFi protocols
   */
  private async estimateYieldApy(): Promise<number> {
    // Mock implementation - in production, query Aave, Compound, etc.
    // Returns a reasonable testnet yield estimate
    return 5.0 + Math.random() * 3; // 5-8% APY
  }

  // ============================================
  // SPECIALIST SELECTION
  // ============================================

  /**
   * Find the best specialist agent for current conditions
   */
  private async findBestSpecialist(
    conditions: MarketConditions
  ): Promise<SpecialistAgent | null> {
    const targetStrategy = this.determineTargetStrategy(conditions);

    this.logger.debug('Searching for specialist', {
      targetStrategy,
      minReputationScore: MIN_REPUTATION_SCORE,
    });

    const specialist = await this.envio.findBestSpecialist(
      targetStrategy,
      MIN_REPUTATION_SCORE
    );

    if (!specialist) {
      // Try alternative strategies if primary not found
      const alternatives = this.getAlternativeStrategies(targetStrategy);

      for (const altStrategy of alternatives) {
        const altSpecialist = await this.envio.findBestSpecialist(
          altStrategy,
          MIN_REPUTATION_SCORE
        );
        if (altSpecialist) {
          this.logger.debug('Found specialist with alternative strategy', {
            originalStrategy: targetStrategy,
            actualStrategy: altStrategy,
          });
          return altSpecialist;
        }
      }
    }

    return specialist;
  }

  /**
   * Determine target strategy based on market conditions
   */
  private determineTargetStrategy(conditions: MarketConditions): string {
    // High volatility = arbitrage opportunities
    if (conditions.ethVolatility > HIGH_VOLATILITY_THRESHOLD) {
      return 'Arbitrage';
    }

    // Good yields available = yield optimization
    if (conditions.bestYieldApy > HIGH_YIELD_THRESHOLD) {
      return 'Yield';
    }

    // Upward trend = momentum trading
    if (conditions.trendDirection === 'up') {
      return 'Momentum';
    }

    // Downward trend = mean reversion
    if (conditions.trendDirection === 'down') {
      return 'MeanReversion';
    }

    // Default to safe DCA strategy
    return 'DCA';
  }

  /**
   * Get alternative strategy types to try
   */
  private getAlternativeStrategies(primary: string): string[] {
    const alternatives: Record<string, string[]> = {
      Arbitrage: ['Momentum', 'GridTrading'],
      Yield: ['DCA', 'GridTrading'],
      Momentum: ['Arbitrage', 'GridTrading'],
      MeanReversion: ['DCA', 'GridTrading'],
      DCA: ['Yield', 'GridTrading'],
      GridTrading: ['DCA', 'Yield'],
    };

    return alternatives[primary] || ['DCA'];
  }

  // ============================================
  // ALLOCATION
  // ============================================

  /**
   * Calculate optimal allocation for delegation
   */
  private calculateAllocation(
    availableAmount: bigint,
    conditions: MarketConditions
  ): AllocationDecision {
    // Higher volatility = smaller allocation (risk management)
    const riskFactor = clamp(1 - conditions.ethVolatility, 0.3, 1.0);

    // Reduce allocation in downtrends
    const trendMultiplier =
      conditions.trendDirection === 'down' ? 0.7 : 1.0;

    // Calculate final amount
    const allocationPercent = riskFactor * trendMultiplier;
    const amount = BigInt(
      Math.floor(Number(availableAmount) * allocationPercent)
    );

    // Determine delegation duration based on volatility
    // Higher volatility = shorter duration
    const durationMultiplier = conditions.ethVolatility > 0.1 ? 0.5 : 1.0;
    const duration = BigInt(
      Math.floor(Number(DEFAULT_DELEGATION_DURATION) * durationMultiplier)
    );

    return {
      amount,
      duration,
      targetStrategy: this.determineTargetStrategy(conditions),
      riskFactor,
    };
  }

  // ============================================
  // REDELEGATION (ERC-7710)
  // ============================================

  /**
   * Execute redelegation to specialist agent using ERC-7710 delegation.
   *
   * Creates a signed delegation with caveats and stores it for the specialist
   * to retrieve and redeem via their Smart Account.
   */
  private async redelegateToSpecialist(
    specialist: SpecialistAgent,
    allocation: AllocationDecision,
    userAddress: Address
  ): Promise<void> {
    this.logger.info('Executing redelegation', {
      specialist: specialist.name,
      specialistId: specialist.id,
      amount: allocation.amount.toString(),
      duration: allocation.duration.toString(),
      user: userAddress,
      smartAccountEnabled: this.isSmartAccountReady(),
    });

    try {
      const childAgentId = BigInt(specialist.id);

      // Create ERC-7710 delegation if Smart Account is enabled
      let signedDelegation: (Delegation & { hash: Hex }) | null = null;

      if (this.isSmartAccountReady()) {
        signedDelegation = await this.createERC7710Delegation(
          specialist,
          allocation
        );

        // Store the A2A delegation in Supabase for the specialist to retrieve
        const a2aRecord = createA2ADelegationRecord({
          signedDelegation,
          parentPermissionId: `manual-${Date.now()}`, // Manual execution doesn't have a parent permission
          fromAgentId: parseInt(this.agentId),
          fromAgentAddress: this.walletAddress,
          toAgentId: parseInt(specialist.id),
          toAgentAddress: specialist.walletAddress as Address,
          userAddress,
          tokenAddress: getTokenAddresses(this.config.chainId).USDC,
          amount: allocation.amount,
          expiresAt: nowSeconds() + Number(allocation.duration),
          strategyType: allocation.targetStrategy,
          caveats: this.buildDelegationCaveats(allocation).map((c) => ({
            enforcer: c.enforcer,
            terms: c.terms,
          })),
        });

        const storeResult = await this.a2aStore.storeDelegation(a2aRecord);

        if (!storeResult.success) {
          this.logger.error('Failed to store A2A delegation in Supabase', new Error(storeResult.error || 'Unknown error'));
        } else {
          this.logger.info('ERC-7710 delegation created and stored in Supabase', {
            delegationHash: signedDelegation.hash,
            delegate: specialist.walletAddress,
          });
        }
      } else {
        this.logger.warn('Smart Account not enabled, skipping ERC-7710 delegation');
      }

      // Log redelegation on-chain for Envio indexing
      // This is done regardless of ERC-7710 delegation status
      await this.logRedelegation(
        childAgentId,
        userAddress,
        allocation.amount,
        allocation.duration
      );

      this.logger.info('Redelegation successful', {
        specialistId: specialist.id,
        amount: allocation.amount.toString(),
        hasERC7710Delegation: !!signedDelegation,
      });
    } catch (error) {
      this.logger.error(
        'Redelegation failed',
        error instanceof Error ? error : new Error(String(error)),
        { specialistId: specialist.id }
      );
      throw error;
    }
  }

  /**
   * Create an ERC-7710 delegation with appropriate caveats for the specialist.
   *
   * Caveats applied:
   * - ERC20 Transfer Amount: Limits the amount that can be transferred
   * - Timestamp: Sets expiry time for the delegation
   */
  private async createERC7710Delegation(
    specialist: SpecialistAgent,
    allocation: AllocationDecision
  ): Promise<Delegation & { hash: Hex }> {
    // Build caveats for the delegation
    const caveats = this.buildDelegationCaveats(allocation);

    // Create and sign the delegation using BaseAgent method
    const signedDelegation = await this.createDelegationTo(
      specialist.walletAddress as Address,
      caveats
    );

    return signedDelegation;
  }

  /**
   * Build caveats (restrictions) for the delegation.
   *
   * These caveats are enforced on-chain when the specialist redeems the delegation.
   *
   * Caveats applied:
   * 1. Timestamp - Sets expiry time for the delegation
   * 2. LimitedCalls - Allows only one redemption
   * 3. ERC20TransferAmount - Limits the token amount that can be transferred
   * 4. AllowedTargets - Restricts which contracts can be called (Uniswap Router)
   */
  private buildDelegationCaveats(allocation: AllocationDecision): Caveat[] {
    const caveats: Caveat[] = [];
    const now = nowSeconds();

    try {
      // Get enforcer addresses for this chain
      const framework = getDelegationFrameworkAddresses(this.config.chainId);
      const enforcers = framework.enforcers;

      if (!enforcers) {
        this.logger.warn('Caveat enforcer addresses not configured, using minimal caveats');
        return caveats;
      }

      // Get chain-specific addresses for caveats
      const uniswap = getUniswapAddresses(this.config.chainId);
      const tokens = getTokenAddresses(this.config.chainId);

      // Helper to check if enforcer address is valid (not zero address)
      const isValidEnforcer = (addr: string | undefined): addr is string =>
        !!addr && addr !== '0x0000000000000000000000000000000000000000';

      // 1. Timestamp Enforcer - Set delegation expiry
      // The delegation can only be redeemed before the expiry time
      if (isValidEnforcer(enforcers.timestamp)) {
        const notBefore = BigInt(now);
        const notAfter = BigInt(now) + allocation.duration;

        caveats.push({
          enforcer: enforcers.timestamp as Hex,
          terms: encodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint256' }],
            [notBefore, notAfter]
          ),
          args: '0x' as Hex,
        });

        this.logger.debug('Added timestamp caveat', {
          notBefore: notBefore.toString(),
          notAfter: notAfter.toString(),
        });
      }

      // 2. Limited Calls Enforcer - Limit number of redemptions
      // Allows the delegation to be used only once
      if (isValidEnforcer(enforcers.limitedCalls)) {
        caveats.push({
          enforcer: enforcers.limitedCalls as Hex,
          terms: encodeAbiParameters(
            [{ type: 'uint256' }],
            [1n] // Allow only 1 call
          ),
          args: '0x' as Hex,
        });

        this.logger.debug('Added limited calls caveat', { maxCalls: 1 });
      }

      // 3. ERC20 Transfer Amount Enforcer - Limit the token amount
      // Restricts the maximum amount of ERC20 tokens that can be transferred
      if (isValidEnforcer(enforcers.erc20TransferAmount)) {
        // Use USDC as the default token for spending limits
        const tokenAddress = tokens.USDC;
        const maxAmount = allocation.amount;

        caveats.push({
          enforcer: enforcers.erc20TransferAmount as Hex,
          terms: encodeAbiParameters(
            [{ type: 'address' }, { type: 'uint256' }],
            [tokenAddress, maxAmount]
          ),
          args: '0x' as Hex,
        });

        this.logger.debug('Added ERC20 transfer amount caveat', {
          token: tokenAddress,
          maxAmount: maxAmount.toString(),
        });
      }

      // 4. Allowed Targets Enforcer - Restrict callable contracts
      // Only allow calls to the Uniswap router (and optionally quoter)
      if (isValidEnforcer(enforcers.allowedTargets)) {
        // Allow Uniswap SwapRouter and tokens for approvals
        const allowedTargets: Address[] = [
          uniswap.swapRouter,
          tokens.USDC,
          tokens.WETH,
        ];

        caveats.push({
          enforcer: enforcers.allowedTargets as Hex,
          terms: encodeAbiParameters(
            [{ type: 'address[]' }],
            [allowedTargets]
          ),
          args: '0x' as Hex,
        });

        this.logger.debug('Added allowed targets caveat', {
          targets: allowedTargets,
        });
      }

    } catch (error) {
      this.logger.warn('Failed to build all caveats', {
        error: String(error),
        note: 'Delegation will be created with available restrictions',
      });
    }

    this.logger.info(`Built ${caveats.length} caveats for delegation`);
    return caveats;
  }
}
