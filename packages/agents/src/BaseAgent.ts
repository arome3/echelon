/**
 * Echelon Agents - Base Agent
 *
 * Abstract base class providing core agent functionality.
 * All agent implementations extend this class.
 *
 * Supports both traditional EOA transactions and Smart Account operations
 * for ERC-7710 delegation redemption via the MetaMask Smart Accounts Kit.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type PublicClient,
  type Address,
  type Hash,
  encodeAbiParameters,
  type Hex,
} from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { createBundlerClient, type BundlerClient } from 'viem/account-abstraction';

// Smart Accounts Kit imports
import {
  toMetaMaskSmartAccount,
  Implementation,
  redeemDelegations,
  ExecutionMode,
  ROOT_AUTHORITY,
  getSmartAccountsEnvironment,
  createCaveat,
  type MetaMaskSmartAccount,
  type Delegation,
  type Caveat,
  type ExecutionStruct,
  type SmartAccountsEnvironment,
} from '@metamask/smart-accounts-kit';
// Import getDelegationHashOffchain from delegation utils submodule
import { getDelegationHashOffchain } from '@metamask/smart-accounts-kit/utils';

import type {
  AgentConfig,
  Permission,
  ExecutionResult,
  StrategyType,
} from './types/index.js';
import { ExecutionResult as ExecutionResultEnum } from './types/index.js';
import { getChainConfig } from './config/chains.js';
import { getBundlerRpcUrl, ENTRY_POINT_ADDRESS } from './config/delegation.js';
import { EnvioClient, createEnvioClient } from './utils/envio-client.js';
import { AgentLogger, createLogger } from './utils/logger.js';
import { sleep, generateRandomSalt } from './utils/helpers.js';
import {
  verifyAgentRegistration,
  logExecutionStart,
  logExecutionComplete,
  logRedelegation as logRedelegationContract,
} from './contracts/index.js';
import {
  DelegationFetcher,
  createDelegationFetcher,
  type PendingDelegation,
} from './services/delegation-fetcher.js';

// ============================================
// BASE AGENT ABSTRACT CLASS
// ============================================

/**
 * Abstract base class for all Echelon agents.
 *
 * Provides:
 * - Wallet and public client setup (viem)
 * - Envio GraphQL client for data queries
 * - Execution logging to AgentExecution contract
 * - Start/stop lifecycle management
 *
 * Subclasses must implement:
 * - getName(): Agent's display name
 * - getStrategyType(): Strategy type for indexing
 * - executeStrategy(): Main strategy logic
 */
export abstract class BaseAgent {
  // ============================================
  // PROPERTIES
  // ============================================

  /** On-chain agent ID */
  protected agentId: string;

  /** Agent configuration */
  protected config: AgentConfig;

  /** EOA account for signing */
  protected account: PrivateKeyAccount;

  /** viem wallet client for transactions (EOA) */
  protected walletClient: WalletClient;

  /** viem public client for reads */
  protected publicClient: PublicClient;

  /** MetaMask Smart Account for delegation operations */
  protected smartAccount: MetaMaskSmartAccount | null = null;

  /** Pimlico bundler client for UserOperation submission */
  protected bundlerClient: BundlerClient | null = null;

  /** Smart Account address (may differ from EOA) */
  protected smartAccountAddress: Address | null = null;

  /** Envio GraphQL client */
  protected envio: EnvioClient;

  /** Structured logger */
  protected logger: AgentLogger;

  /** Whether agent is currently running */
  protected isRunning: boolean = false;

  /** Current execution cycle number */
  protected cycleCount: number = 0;

  /** Agent wallet address (EOA) */
  protected walletAddress: Address;

  /** Whether Smart Account is enabled for this agent */
  protected smartAccountEnabled: boolean = false;

  /** Smart Accounts environment (contract addresses) */
  protected smartAccountsEnvironment: SmartAccountsEnvironment | null = null;

  /** Delegation fetcher for receiving ERC-7715 permissions from users */
  protected delegationFetcher: DelegationFetcher | null = null;

  /** Queue of pending delegations to process */
  protected pendingDelegationQueue: PendingDelegation[] = [];

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(config: AgentConfig) {
    this.config = config;
    this.agentId = config.agentId;

    // Create account from private key
    this.account = privateKeyToAccount(config.privateKey);
    this.walletAddress = this.account.address;

    // Get chain configuration
    const chainConfig = getChainConfig(config.chainId);

    // Create viem clients
    this.walletClient = createWalletClient({
      account: this.account,
      chain: chainConfig.viemChain,
      transport: http(config.rpcUrl),
    });

    this.publicClient = createPublicClient({
      chain: chainConfig.viemChain,
      transport: http(config.rpcUrl),
    });

    // Create Envio client
    this.envio = createEnvioClient(config.envioUrl);

    // Create logger (will be updated with actual name after getName() is available)
    this.logger = createLogger('Agent');
  }

  // ============================================
  // ABSTRACT METHODS
  // ============================================

  /**
   * Get the agent's display name
   */
  abstract getName(): string;

  /**
   * Get the agent's strategy type
   */
  abstract getStrategyType(): StrategyType;

  /**
   * Execute the agent's main strategy logic.
   * Called on each polling cycle.
   */
  abstract executeStrategy(): Promise<void>;

  // ============================================
  // LIFECYCLE METHODS
  // ============================================

  /**
   * Start the agent's execution loop
   */
  async start(): Promise<void> {
    // Update logger with actual agent name
    this.logger = createLogger(this.getName());

    this.logger.logLifecycle('starting');

    // Verify agent is registered on-chain
    const registered = await this.verifyRegistration();
    if (!registered) {
      throw new Error(
        `Agent wallet ${this.walletAddress} is not registered on AgentRegistry`
      );
    }

    // Initialize Smart Account and Bundler (optional, for delegation operations)
    await this.initializeSmartAccount();

    // Initialize Delegation Fetcher (optional, for receiving ERC-7715 permissions)
    await this.initializeDelegationFetcher();

    this.isRunning = true;
    this.logger.logLifecycle('started');

    // Main execution loop
    while (this.isRunning) {
      this.cycleCount++;
      const cycleStart = Date.now();

      try {
        await this.executeStrategy();
        this.logger.logStrategyCycle(
          this.cycleCount,
          cycleStart,
          Date.now(),
          'success'
        );
      } catch (error) {
        this.logger.error(
          'Strategy execution error',
          error instanceof Error ? error : new Error(String(error))
        );
        this.logger.logStrategyCycle(
          this.cycleCount,
          cycleStart,
          Date.now(),
          'error'
        );
      }

      // Wait for next polling interval
      if (this.isRunning) {
        await sleep(this.config.pollingIntervalMs);
      }
    }

    this.logger.logLifecycle('stopped');
  }

  /**
   * Initialize MetaMask Smart Account and Pimlico bundler client.
   * This enables ERC-7710 delegation creation and redemption.
   *
   * @throws If bundler configuration is missing and Smart Account is required
   */
  protected async initializeSmartAccount(): Promise<void> {
    try {
      // Get bundler RPC URL (will throw if PIMLICO_API_KEY not set)
      const bundlerRpcUrl = getBundlerRpcUrl(this.config.chainId);

      this.logger.info('Initializing Smart Account...', {
        eoaAddress: this.walletAddress,
        chainId: this.config.chainId,
      });

      // Create MetaMask Smart Account (Hybrid implementation)
      // Hybrid supports both EOA owner and passkey signers
      this.smartAccount = await toMetaMaskSmartAccount({
        client: this.publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [this.walletAddress, [], [], []], // owner, signers, weights, threshold
        deploySalt: '0x', // Use default salt for deterministic address
        signer: {
          account: this.account,
        },
      });

      this.smartAccountAddress = this.smartAccount.address;

      // Create Bundler Client with Pimlico
      this.bundlerClient = createBundlerClient({
        client: this.publicClient,
        transport: http(bundlerRpcUrl),
      });

      // Get Smart Accounts environment (contract addresses)
      this.smartAccountsEnvironment = getSmartAccountsEnvironment(this.config.chainId);

      this.smartAccountEnabled = true;

      this.logger.info('Smart Account initialized', {
        eoaAddress: this.walletAddress,
        smartAccountAddress: this.smartAccountAddress,
        bundlerConfigured: true,
        delegationManager: this.smartAccountsEnvironment.DelegationManager,
      });
    } catch (error) {
      // Smart Account initialization is optional - agent can still function
      // with traditional EOA transactions for logging
      this.logger.warn('Smart Account initialization skipped', {
        reason: error instanceof Error ? error.message : String(error),
        note: 'Agent will use EOA for all transactions. Delegation features disabled.',
      });
      this.smartAccountEnabled = false;
    }
  }

  /**
   * Initialize Delegation Fetcher to receive ERC-7715 permissions from Supabase.
   * This allows the agent to automatically receive and process user delegations.
   */
  protected async initializeDelegationFetcher(): Promise<void> {
    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        this.logger.warn('Delegation Fetcher not initialized', {
          reason: 'SUPABASE_URL and SUPABASE_ANON_KEY not configured',
          note: 'Agent will not receive user delegations automatically.',
        });
        return;
      }

      this.logger.info('Initializing Delegation Fetcher...', {
        agentAddress: this.walletAddress,
      });

      // Create the delegation fetcher
      this.delegationFetcher = createDelegationFetcher(
        this.walletAddress,
        // Callback when new delegation arrives
        async (delegation: PendingDelegation) => {
          await this.handleNewDelegation(delegation);
        },
        // Error callback
        (error: Error) => {
          this.logger.error('Delegation Fetcher error', error);
        }
      );

      // Start fetching delegations
      await this.delegationFetcher.start();

      this.logger.info('Delegation Fetcher initialized', {
        agentAddress: this.walletAddress,
        realtimeEnabled: true,
      });
    } catch (error) {
      this.logger.warn('Delegation Fetcher initialization failed', {
        reason: error instanceof Error ? error.message : String(error),
        note: 'Agent will not receive user delegations automatically.',
      });
    }
  }

  /**
   * Handle a new delegation received from Supabase.
   * This is called automatically when a user grants a permission to this agent.
   *
   * Subclasses can override this to customize delegation handling.
   *
   * @param delegation - The pending delegation from Supabase
   */
  protected async handleNewDelegation(delegation: PendingDelegation): Promise<void> {
    this.logger.info('New delegation received!', {
      permissionId: delegation.permission_id,
      userAddress: delegation.user_address,
      tokenAddress: delegation.token_address,
      amountPerPeriod: delegation.amount_per_period,
      expiresAt: new Date(delegation.expires_at * 1000).toISOString(),
    });

    // Add to the processing queue
    this.pendingDelegationQueue.push(delegation);

    // Optionally process immediately (subclasses can override this behavior)
    await this.processPendingDelegation(delegation);
  }

  /**
   * Process a pending delegation.
   * This method attempts to redeem the delegation and mark it as claimed.
   *
   * Subclasses should override this to implement their specific redemption logic.
   *
   * @param delegation - The pending delegation to process
   * @returns True if successfully processed, false otherwise
   */
  protected async processPendingDelegation(delegation: PendingDelegation): Promise<boolean> {
    if (!this.smartAccountEnabled) {
      this.logger.warn('Cannot process delegation - Smart Account not enabled', {
        permissionId: delegation.permission_id,
      });
      return false;
    }

    try {
      this.logger.info('Processing delegation...', {
        permissionId: delegation.permission_id,
        userAddress: delegation.user_address,
      });

      // Parse the delegation data
      const delegationData = this.delegationFetcher?.parseDelegationData(delegation);

      if (!delegationData) {
        this.logger.error('Failed to parse delegation data', new Error('Invalid delegation data'));
        return false;
      }

      // The delegationData contains the ERC-7715 permission response from Flask
      // Subclasses should implement the actual redemption logic based on their strategy
      this.logger.info('Delegation data parsed successfully', {
        permissionId: delegation.permission_id,
        dataType: typeof delegationData,
      });

      // Remove from queue after processing
      this.pendingDelegationQueue = this.pendingDelegationQueue.filter(
        (d) => d.permission_id !== delegation.permission_id
      );

      // Note: Actual redemption should be implemented by subclasses
      // They should call redeemDelegation() with the appropriate execution struct
      // and then mark the delegation as claimed:
      // await this.delegationFetcher?.markClaimed(delegation.permission_id, txHash);

      return true;
    } catch (error) {
      this.logger.error(
        'Failed to process delegation',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Get the count of pending delegations in the queue
   */
  protected getPendingDelegationCount(): number {
    return this.pendingDelegationQueue.length;
  }

  /**
   * Get all pending delegations in the queue
   */
  protected getPendingDelegations(): PendingDelegation[] {
    return [...this.pendingDelegationQueue];
  }

  /**
   * Mark a delegation as claimed in Supabase after successful redemption
   */
  protected async markDelegationClaimed(permissionId: string, txHash: string): Promise<boolean> {
    if (!this.delegationFetcher) {
      this.logger.warn('Cannot mark delegation claimed - fetcher not initialized');
      return false;
    }

    const success = await this.delegationFetcher.markClaimed(permissionId, txHash);

    if (success) {
      this.logger.info('Delegation marked as claimed', {
        permissionId,
        txHash,
      });
    }

    return success;
  }

  /**
   * Stop the agent gracefully
   */
  stop(): void {
    this.logger.logLifecycle('stopping');
    this.isRunning = false;

    // Stop the delegation fetcher
    if (this.delegationFetcher) {
      this.delegationFetcher.stop();
      this.delegationFetcher = null;
    }
  }

  // ============================================
  // CONTRACT INTERACTION METHODS
  // ============================================

  /**
   * Log execution start to AgentExecution contract
   */
  protected async logExecutionStart(
    userAddress: Address,
    amountIn: bigint,
    tokenIn: Address,
    tokenOut: Address
  ): Promise<bigint> {
    this.logger.logExecutionStart(0n, userAddress, amountIn, tokenIn, tokenOut);

    const { executionId } = await logExecutionStart(
      this.walletClient,
      this.publicClient,
      this.config.executionAddress,
      userAddress,
      amountIn,
      tokenIn,
      tokenOut
    );

    this.logger.info('Execution logged on-chain', {
      executionId: executionId.toString(),
    });

    return executionId;
  }

  /**
   * Log execution completion to AgentExecution contract
   */
  protected async logExecutionComplete(
    executionId: bigint,
    userAddress: Address,
    amountIn: bigint,
    amountOut: bigint,
    success: boolean
  ): Promise<Hash> {
    const result = success
      ? ExecutionResultEnum.SUCCESS
      : ExecutionResultEnum.FAILURE;

    const profitLoss = amountOut - amountIn;

    this.logger.logExecutionComplete(
      executionId,
      success,
      amountIn,
      amountOut,
      profitLoss
    );

    const hash = await logExecutionComplete(
      this.walletClient,
      this.publicClient,
      this.config.executionAddress,
      executionId,
      userAddress,
      amountIn,
      amountOut,
      result
    );

    return hash;
  }

  /**
   * Log redelegation to another agent
   */
  protected async logRedelegation(
    childAgentId: bigint,
    userAddress: Address,
    amount: bigint,
    duration: bigint
  ): Promise<Hash> {
    this.logger.logRedelegation(childAgentId, userAddress, amount, duration);

    const hash = await logRedelegationContract(
      this.walletClient,
      this.publicClient,
      this.config.executionAddress,
      childAgentId,
      userAddress,
      amount,
      duration
    );

    return hash;
  }

  // ============================================
  // ERC-7710 DELEGATION METHODS
  // ============================================

  /**
   * Create an ERC-7710 delegation to another account (agent).
   * This allows the delegate to perform actions on behalf of this agent's Smart Account.
   *
   * @param delegateAddress - The address receiving the delegation
   * @param caveats - Array of caveats (restrictions) for the delegation
   * @returns The signed delegation object with computed hash
   * @throws If Smart Account is not initialized
   */
  protected async createDelegationTo(
    delegateAddress: Address,
    caveats: Caveat[]
  ): Promise<Delegation & { hash: Hex }> {
    if (!this.smartAccount || !this.smartAccountEnabled) {
      throw new Error(
        'Smart Account not initialized. Cannot create delegation. ' +
        'Ensure PIMLICO_API_KEY is set in environment.'
      );
    }

    this.logger.info('Creating delegation...', {
      from: this.smartAccountAddress,
      to: delegateAddress,
      caveatCount: caveats.length,
    });

    // Create the unsigned delegation object
    const unsignedDelegation: Omit<Delegation, 'signature'> = {
      delegate: delegateAddress as Hex,
      delegator: this.smartAccountAddress! as Hex,
      authority: ROOT_AUTHORITY,
      caveats,
      salt: generateRandomSalt(),
    };

    // Sign the delegation with the Smart Account
    const signature = await this.smartAccount.signDelegation({
      delegation: unsignedDelegation,
    });

    // Create the full signed delegation
    const signedDelegation: Delegation = {
      ...unsignedDelegation,
      signature,
    };

    // Compute hash for reference
    const delegationHash = getDelegationHashOffchain(signedDelegation);

    this.logger.info('Delegation created and signed', {
      delegationHash,
      delegate: delegateAddress,
    });

    return { ...signedDelegation, hash: delegationHash };
  }

  /**
   * Redeem an ERC-7710 delegation to execute an action.
   * Sends a transaction to the DelegationManager contract.
   *
   * @param delegation - The signed delegation to redeem
   * @param execution - The execution to perform (target, value, callData)
   * @returns The transaction hash
   * @throws If Smart Account or environment is not initialized
   */
  protected async redeemDelegation(
    delegation: Delegation,
    execution: ExecutionStruct
  ): Promise<Hash> {
    if (!this.smartAccountsEnvironment || !this.smartAccountEnabled) {
      throw new Error(
        'Smart Account environment not initialized. Cannot redeem delegation. ' +
        'Ensure PIMLICO_API_KEY is set in environment.'
      );
    }

    // Compute hash for logging
    const delegationHash = getDelegationHashOffchain(delegation);

    this.logger.info('Redeeming delegation...', {
      delegationHash,
      target: execution.target,
      value: execution.value?.toString(),
    });

    try {
      // Redeem the delegation via DelegationManager contract
      const txHash = await redeemDelegations(
        this.walletClient as any, // WalletClient type compatibility
        this.publicClient as any, // PublicClient type compatibility
        this.smartAccountsEnvironment.DelegationManager as Address,
        [
          {
            permissionContext: [delegation], // Single delegation chain
            executions: [execution],
            mode: ExecutionMode.SingleDefault,
          },
        ]
      );

      this.logger.info('Delegation redeemed successfully', {
        txHash,
        delegationHash,
      });

      return txHash;
    } catch (error) {
      this.logger.error(
        'Failed to redeem delegation',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Check if Smart Account is enabled and ready for delegation operations
   */
  protected isSmartAccountReady(): boolean {
    return this.smartAccountEnabled && !!this.smartAccount && !!this.bundlerClient;
  }

  /**
   * Get the Smart Account address (may differ from EOA address)
   */
  protected getSmartAccountAddress(): Address | null {
    return this.smartAccountAddress;
  }

  // ============================================
  // DATA QUERY METHODS
  // ============================================

  /**
   * Get active permissions for this agent from Envio
   */
  protected async getActivePermissions(): Promise<Permission[]> {
    try {
      const permissions = await this.envio.getAgentPermissions(this.agentId);
      return permissions.filter((p) => p.isActive);
    } catch (error) {
      this.logger.warn('Failed to fetch permissions from Envio', {
        error: String(error),
      });
      return [];
    }
  }

  /**
   * Verify this agent is registered on-chain
   */
  protected async verifyRegistration(): Promise<boolean> {
    try {
      const result = await verifyAgentRegistration(
        this.publicClient,
        this.config.registryAddress,
        this.walletAddress
      );

      if (result.isRegistered && result.metadata) {
        this.logger.info('Agent registration verified', {
          agentId: result.agentId?.toString(),
          name: result.metadata.name,
          strategyType: result.metadata.strategyType,
          isActive: result.metadata.isActive,
        });
      }

      return result.isRegistered && (result.metadata?.isActive ?? false);
    } catch (error) {
      this.logger.error(
        'Failed to verify registration',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Get available delegation amount from all active permissions
   */
  protected async getAvailableAmount(): Promise<bigint> {
    const permissions = await this.getActivePermissions();

    return permissions.reduce((sum, p) => {
      const remaining = BigInt(Math.floor(parseFloat(p.amountRemaining)));
      return sum + remaining;
    }, 0n);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return sleep(ms);
  }

  /**
   * Get the agent's wallet address
   */
  protected getWalletAddress(): Address {
    return this.walletAddress;
  }

  /**
   * Check if agent is still running
   */
  protected isAgentRunning(): boolean {
    return this.isRunning;
  }
}
