/**
 * Echelon Agents - Oracle Sync Service
 *
 * This service syncs reputation scores from the Envio indexer to the on-chain
 * EnvioReputationOracle contract. It bridges the off-chain indexed data with
 * the on-chain oracle that the ReputationGateEnforcer uses for permission gating.
 *
 * Architecture:
 *   Envio Indexer --> Oracle Sync Service --> EnvioReputationOracle (on-chain)
 *                                                      |
 *                                            ReputationGateEnforcer
 *                                                      |
 *                                            MetaMask Permission Check
 */

import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import { EnvioClient } from '../utils/envio-client.js';
import { withRetry, sleep, chunk, formatAddress, nowSeconds } from '../utils/helpers.js';
import { AgentLogger } from '../utils/logger.js';

// ============================================
// TYPES
// ============================================

/**
 * Agent data needed for oracle sync
 */
interface AgentReputationData {
  walletAddress: Address;
  reputationScore: number;
  name: string;
}

/**
 * Sync state persisted to disk
 */
interface SyncState {
  lastSyncTime: number;
  lastSyncBlock: number;
  agentsSynced: number;
  errors: number;
}

/**
 * Oracle sync configuration
 */
interface OracleSyncConfig {
  /** Envio GraphQL endpoint */
  envioUrl: string;
  /** Ethereum RPC endpoint */
  rpcUrl: string;
  /** Private key for signing transactions */
  privateKey: `0x${string}`;
  /** EnvioReputationOracle contract address */
  oracleAddress: Address;
  /** Sync interval in milliseconds (default: 5 minutes) */
  syncIntervalMs?: number;
  /** Maximum agents per batch update (default: 50) */
  batchSize?: number;
  /** Path to state file (default: .oracle-sync-state.json) */
  stateFilePath?: string;
  /** Chain ID (default: 11155111 for Sepolia) */
  chainId?: number;
}

// ============================================
// ENVIO REPUTATION ORACLE ABI (subset)
// ============================================

const ENVIO_REPUTATION_ORACLE_ABI = [
  {
    name: 'updateReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'score', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'batchUpdateReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agents', type: 'address[]' },
      { name: 'scores', type: 'uint8[]' },
    ],
    outputs: [],
  },
  {
    name: 'getAgentReputation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      { name: 'score', type: 'uint8' },
      { name: 'lastUpdated', type: 'uint256' },
    ],
  },
  {
    name: 'envioUpdater',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// ============================================
// GRAPHQL QUERY FOR ALL AGENTS
// ============================================

const ALL_AGENTS_QUERY = `
  query GetAllAgents($first: Int!, $skip: Int!) {
    Agent(
      limit: $first
      offset: $skip
      where: { isActive: { _eq: true } }
    ) {
      id
      walletAddress
      name
      reputationScore
    }
  }
`;

// ============================================
// ORACLE SYNC SERVICE CLASS
// ============================================

/**
 * Service that syncs reputation scores from Envio indexer to on-chain oracle
 */
export class OracleSyncService {
  private config: Required<OracleSyncConfig>;
  private envioClient: EnvioClient;
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private account: ReturnType<typeof privateKeyToAccount>;
  private logger: AgentLogger;
  private isRunning: boolean = false;
  private state: SyncState;

  constructor(config: OracleSyncConfig) {
    // Apply defaults
    this.config = {
      ...config,
      syncIntervalMs: config.syncIntervalMs ?? 5 * 60 * 1000, // 5 minutes
      batchSize: config.batchSize ?? 50,
      stateFilePath: config.stateFilePath ?? '.oracle-sync-state.json',
      chainId: config.chainId ?? 11155111, // Sepolia
    };

    // Initialize Envio client
    this.envioClient = new EnvioClient(this.config.envioUrl);

    // Initialize viem clients
    this.account = privateKeyToAccount(this.config.privateKey);

    const chain = this.config.chainId === 11155111 ? sepolia : sepolia; // Add more chains as needed

    this.publicClient = createPublicClient({
      chain,
      transport: http(this.config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(this.config.rpcUrl),
    });

    // Initialize logger
    this.logger = new AgentLogger('OracleSync', {
      minLevel: 'info',
    });

    // Load persisted state
    this.state = this.loadState();
  }

  // ============================================
  // STATE PERSISTENCE
  // ============================================

  /**
   * Load sync state from disk
   */
  private loadState(): SyncState {
    try {
      const statePath = this.getStatePath();
      if (fs.existsSync(statePath)) {
        const data = fs.readFileSync(statePath, 'utf-8');
        return JSON.parse(data) as SyncState;
      }
    } catch (err) {
      this.logger.warn(`Failed to load state file, starting fresh: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
      lastSyncTime: 0,
      lastSyncBlock: 0,
      agentsSynced: 0,
      errors: 0,
    };
  }

  /**
   * Save sync state to disk
   */
  private saveState(): void {
    try {
      const statePath = this.getStatePath();
      fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
    } catch (err) {
      this.logger.error('Failed to save state file', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Get the full path to the state file
   */
  private getStatePath(): string {
    return path.resolve(process.cwd(), this.config.stateFilePath);
  }

  /**
   * Get the last sync time in seconds
   */
  public getLastSyncTime(): number {
    return this.state.lastSyncTime;
  }

  // ============================================
  // ENVIO DATA FETCHING
  // ============================================

  /**
   * Fetch all active agents from Envio indexer
   */
  async fetchAllAgents(): Promise<AgentReputationData[]> {
    const agents: AgentReputationData[] = [];
    let skip = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await this.envioClient.query<{
        Agent: Array<{
          id: string;
          walletAddress: string;
          name: string;
          reputationScore: number;
        }>;
      }>(ALL_AGENTS_QUERY, {
        first: pageSize,
        skip,
      });

      if (response.Agent.length === 0) {
        hasMore = false;
      } else {
        for (const agent of response.Agent) {
          agents.push({
            walletAddress: agent.walletAddress as Address,
            reputationScore: Math.min(100, Math.max(0, Math.round(agent.reputationScore))),
            name: agent.name,
          });
        }
        skip += pageSize;

        // Safety limit to prevent infinite loops
        if (agents.length > 10000) {
          this.logger.warn('Agent limit reached, stopping pagination');
          hasMore = false;
        }
      }
    }

    return agents;
  }

  // ============================================
  // ON-CHAIN UPDATES
  // ============================================

  /**
   * Verify the service account is authorized to update the oracle
   */
  async verifyAuthorization(): Promise<boolean> {
    try {
      const updater = await this.publicClient.readContract({
        address: this.config.oracleAddress,
        abi: ENVIO_REPUTATION_ORACLE_ABI,
        functionName: 'envioUpdater',
      });

      const isAuthorized = updater.toLowerCase() === this.account.address.toLowerCase();

      if (!isAuthorized) {
        this.logger.error(
          `Service account ${this.account.address} is not authorized as updater (current: ${updater})`
        );
      }

      return isAuthorized;
    } catch (err) {
      this.logger.error('Failed to verify authorization', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Get current on-chain reputation for an agent
   */
  async getOnChainReputation(agentAddress: Address): Promise<{ score: number; lastUpdated: number }> {
    const [score, lastUpdated] = await this.publicClient.readContract({
      address: this.config.oracleAddress,
      abi: ENVIO_REPUTATION_ORACLE_ABI,
      functionName: 'getAgentReputation',
      args: [agentAddress],
    });

    return {
      score: Number(score),
      lastUpdated: Number(lastUpdated),
    };
  }

  /**
   * Update a single agent's reputation on-chain
   */
  async updateSingleReputation(agent: AgentReputationData): Promise<boolean> {
    try {
      const chain = this.config.chainId === 11155111 ? sepolia : sepolia;
      const hash = await this.walletClient.writeContract({
        address: this.config.oracleAddress,
        abi: ENVIO_REPUTATION_ORACLE_ABI,
        functionName: 'updateReputation',
        args: [agent.walletAddress, agent.reputationScore],
        chain,
        account: this.account,
      });

      // Wait for confirmation
      await this.publicClient.waitForTransactionReceipt({ hash });

      this.logger.info('Updated single agent reputation', {
        agent: formatAddress(agent.walletAddress),
        name: agent.name,
        score: agent.reputationScore,
        txHash: hash,
      });

      return true;
    } catch (err) {
      this.logger.error(
        `Failed to update reputation for ${agent.walletAddress}`,
        err instanceof Error ? err : new Error(String(err))
      );
      return false;
    }
  }

  /**
   * Batch update multiple agents' reputations on-chain
   */
  async batchUpdateReputations(agents: AgentReputationData[]): Promise<boolean> {
    if (agents.length === 0) return true;

    try {
      const chain = this.config.chainId === 11155111 ? sepolia : sepolia;
      const addresses = agents.map((a) => a.walletAddress);
      const scores = agents.map((a) => a.reputationScore);

      const hash = await this.walletClient.writeContract({
        address: this.config.oracleAddress,
        abi: ENVIO_REPUTATION_ORACLE_ABI,
        functionName: 'batchUpdateReputation',
        args: [addresses, scores],
        chain,
        account: this.account,
      });

      // Wait for confirmation
      await this.publicClient.waitForTransactionReceipt({ hash });

      this.logger.info('Batch updated agent reputations', {
        count: agents.length,
        txHash: hash,
      });

      return true;
    } catch (err) {
      this.logger.error('Failed to batch update reputations', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  // ============================================
  // SYNC LOGIC
  // ============================================

  /**
   * Determine which agents need updating (changed scores)
   */
  async filterChangedAgents(agents: AgentReputationData[]): Promise<AgentReputationData[]> {
    const changed: AgentReputationData[] = [];

    // Check each agent's current on-chain score
    for (const agent of agents) {
      try {
        const onChain = await this.getOnChainReputation(agent.walletAddress);

        // Only update if score has changed
        if (onChain.score !== agent.reputationScore) {
          changed.push(agent);
        }
      } catch (error) {
        // If we can't read the on-chain score, assume we need to update
        changed.push(agent);
      }
    }

    return changed;
  }

  /**
   * Perform a single sync cycle
   */
  async syncOnce(): Promise<{ success: boolean; agentsSynced: number }> {
    this.logger.info('Starting sync cycle...');

    try {
      // Fetch all agents from Envio
      const allAgents = await withRetry(() => this.fetchAllAgents(), {
        maxRetries: 3,
        baseDelayMs: 2000,
        onRetry: (err, attempt) => {
          this.logger.warn(`Fetch retry ${attempt}`, { error: err.message });
        },
      });

      this.logger.info(`Fetched ${allAgents.length} agents from Envio`);

      if (allAgents.length === 0) {
        this.logger.info('No agents to sync');
        return { success: true, agentsSynced: 0 };
      }

      // Filter to only agents with changed scores
      const changedAgents = await this.filterChangedAgents(allAgents);
      this.logger.info(`${changedAgents.length} agents have changed scores`);

      if (changedAgents.length === 0) {
        this.logger.info('All agents already up to date');
        return { success: true, agentsSynced: 0 };
      }

      // Batch update in chunks
      const batches = chunk(changedAgents, this.config.batchSize);
      let totalSynced = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} agents)`);

        const success = await withRetry(() => this.batchUpdateReputations(batch), {
          maxRetries: 2,
          baseDelayMs: 3000,
        });

        if (success) {
          totalSynced += batch.length;
        } else {
          this.state.errors++;
        }

        // Small delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await sleep(1000);
        }
      }

      // Update state
      const currentBlock = await this.publicClient.getBlockNumber();
      this.state.lastSyncTime = nowSeconds();
      this.state.lastSyncBlock = Number(currentBlock);
      this.state.agentsSynced += totalSynced;
      this.saveState();

      this.logger.info('Sync cycle complete', {
        agentsSynced: totalSynced,
        totalAgents: allAgents.length,
        block: currentBlock,
      });

      return { success: true, agentsSynced: totalSynced };
    } catch (err) {
      this.state.errors++;
      this.saveState();
      this.logger.error('Sync cycle failed', err instanceof Error ? err : new Error(String(err)));
      return { success: false, agentsSynced: 0 };
    }
  }

  // ============================================
  // SERVICE LIFECYCLE
  // ============================================

  /**
   * Start the sync service (runs continuously)
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Service already running');
      return;
    }

    this.logger.info('Starting Oracle Sync Service', {
      oracle: formatAddress(this.config.oracleAddress),
      syncInterval: `${this.config.syncIntervalMs / 1000}s`,
      batchSize: this.config.batchSize,
    });

    // Verify authorization before starting
    const isAuthorized = await this.verifyAuthorization();
    if (!isAuthorized) {
      throw new Error('Service account is not authorized to update the oracle');
    }

    this.isRunning = true;

    // Run sync loop
    while (this.isRunning) {
      await this.syncOnce();

      // Wait for next sync interval
      this.logger.debug(`Waiting ${this.config.syncIntervalMs / 1000}s until next sync...`);
      await sleep(this.config.syncIntervalMs);
    }
  }

  /**
   * Stop the sync service
   */
  stop(): void {
    this.logger.info('Stopping Oracle Sync Service...');
    this.isRunning = false;
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    lastSyncTime: number;
    lastSyncBlock: number;
    totalAgentsSynced: number;
    totalErrors: number;
  } {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.state.lastSyncTime,
      lastSyncBlock: this.state.lastSyncBlock,
      totalAgentsSynced: this.state.agentsSynced,
      totalErrors: this.state.errors,
    };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create an Oracle Sync Service instance from environment variables
 */
export function createOracleSyncService(): OracleSyncService {
  const privateKey = process.env.ORACLE_SYNC_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
  const oracleAddress = process.env.ENVIO_ORACLE_ADDRESS;
  const envioUrl = process.env.ENVIO_URL;
  const rpcUrl = process.env.RPC_URL;

  if (!privateKey) {
    throw new Error('Missing ORACLE_SYNC_PRIVATE_KEY or AGENT_PRIVATE_KEY');
  }
  if (!oracleAddress) {
    throw new Error('Missing ENVIO_ORACLE_ADDRESS');
  }
  if (!envioUrl) {
    throw new Error('Missing ENVIO_URL');
  }
  if (!rpcUrl) {
    throw new Error('Missing RPC_URL');
  }

  return new OracleSyncService({
    privateKey: privateKey as `0x${string}`,
    oracleAddress: oracleAddress as Address,
    envioUrl,
    rpcUrl,
    syncIntervalMs: parseInt(process.env.ORACLE_SYNC_INTERVAL_MS || '300000', 10),
    batchSize: parseInt(process.env.ORACLE_SYNC_BATCH_SIZE || '50', 10),
  });
}

// ============================================
// STANDALONE ENTRY POINT
// ============================================

/**
 * Run the oracle sync service as a standalone process
 */
async function main() {
  // Load environment variables
  const dotenv = await import('dotenv');
  dotenv.config();

  const service = createOracleSyncService();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down...');
    service.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down...');
    service.stop();
    process.exit(0);
  });

  // Start the service
  await service.start();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
