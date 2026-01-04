/**
 * Fund Manager Auto-Redelegation Service (Production)
 *
 * Monitors for new permissions granted to the Fund Manager and automatically
 * triggers redelegation to specialist agents based on allocation strategy.
 *
 * Features:
 * - Environment validation
 * - Retry logic with exponential backoff
 * - Health check endpoint
 * - Graceful shutdown handling
 * - Structured logging
 * - Rate limiting
 *
 * Run with: npm run start:fund-manager-redelegation
 */

import { createPublicClient, createWalletClient, http, parseAbi, type Hash } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createServer, type Server } from 'http';

// ===========================================
// Configuration
// ===========================================

interface Config {
  // Fund Manager settings
  fundManagerId: number;
  fundManagerPrivateKey: `0x${string}`;

  // Contract addresses
  executionAddress: `0x${string}`;

  // Network
  rpcUrl: string;
  chainId: number;

  // Indexer
  envioUrl: string;

  // Polling
  pollIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;

  // Health check
  healthPort: number;

  // Specialist allocations
  specialistAllocations: SpecialistAllocation[];

  // Delegation duration (seconds)
  delegationDuration: number;
}

interface SpecialistAllocation {
  id: number;
  name: string;
  percentage: number;
}

function loadConfig(): Config {
  const requiredEnvVars = ['PRIVATE_KEY', 'EXECUTION_ADDRESS'];
  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    fundManagerId: parseInt(process.env.FUND_MANAGER_ID || '1', 10),
    fundManagerPrivateKey: process.env.PRIVATE_KEY as `0x${string}`,

    executionAddress: process.env.EXECUTION_ADDRESS as `0x${string}`,

    rpcUrl: process.env.RPC_URL || 'https://gateway.tenderly.co/public/sepolia',
    chainId: parseInt(process.env.CHAIN_ID || '11155111', 10),

    envioUrl: process.env.ENVIO_URL || 'http://localhost:8080/v1/graphql',

    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '10000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),

    healthPort: parseInt(process.env.HEALTH_PORT || '3100', 10),

    specialistAllocations: [
      { id: 2, name: 'AlphaYield', percentage: 35 },
      { id: 3, name: 'ArbitrageKing', percentage: 25 },
      { id: 4, name: 'DCAWizard', percentage: 25 },
      { id: 5, name: 'MomentumMaster', percentage: 15 },
    ],

    delegationDuration: parseInt(process.env.DELEGATION_DURATION || String(7 * 24 * 60 * 60), 10),
  };
}

// ===========================================
// Logger
// ===========================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...meta,
    };
    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }
}

// ===========================================
// ABI
// ===========================================

const executionAbi = parseAbi([
  'function logRedelegation(uint256 childAgentId, address userAddress, uint256 amount, uint256 duration) external',
]);

// ===========================================
// Types
// ===========================================

interface Permission {
  id: string;
  user: { id: string };
  amountPerPeriod: string;
  grantedAt: string;
}

interface ServiceStats {
  startedAt: Date;
  permissionsProcessed: number;
  redelegationsCreated: number;
  lastPollAt: Date | null;
  lastPermissionId: string | null;
  errors: number;
  isHealthy: boolean;
}

// ===========================================
// Fund Manager Redelegation Service
// ===========================================

class FundManagerRedelegationService {
  private config: Config;
  private logger: Logger;
  private stats: ServiceStats;
  private isRunning: boolean = false;
  private healthServer: Server | null = null;
  private lastProcessedPermissionId: string | null = null;
  private lastProcessedTimestamp: string | null = null;

  constructor(config: Config) {
    this.config = config;
    this.logger = new Logger('fund-manager-redelegation');
    this.stats = {
      startedAt: new Date(),
      permissionsProcessed: 0,
      redelegationsCreated: 0,
      lastPollAt: null,
      lastPermissionId: null,
      errors: 0,
      isHealthy: true,
    };
  }

  // -------------------------------------------
  // GraphQL Queries
  // -------------------------------------------

  private async fetchWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`${operationName} failed (attempt ${attempt}/${this.config.maxRetries})`, {
          error: lastError.message,
        });

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(`${operationName} failed after ${this.config.maxRetries} attempts`, {
      error: lastError?.message,
    });
    this.stats.errors++;
    return null;
  }

  private async getLatestFundManagerPermission(): Promise<Permission | null> {
    return this.fetchWithRetry(async () => {
      const query = `
        query GetLatestFundManagerPermission($agentId: String!) {
          Permission(
            limit: 1
            order_by: { grantedAt: desc }
            where: { agent_id: { _eq: $agentId }, isActive: { _eq: true } }
          ) {
            id
            user { id }
            amountPerPeriod
            grantedAt
          }
        }
      `;

      const response = await fetch(this.config.envioUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { agentId: String(this.config.fundManagerId) },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'GraphQL error');
      }

      return data.data?.Permission?.[0] || null;
    }, 'getLatestFundManagerPermission');
  }

  private async getExistingRedelegationCountForUser(userAddress: string): Promise<number> {
    const result = await this.fetchWithRetry(async () => {
      const query = `
        query GetUserRedelegations($agentId: String!, $userId: String!) {
          Redelegation(where: {
            parentAgent_id: { _eq: $agentId },
            user_id: { _eq: $userId },
            isActive: { _eq: true }
          }) {
            id
          }
        }
      `;

      const response = await fetch(this.config.envioUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: {
            agentId: String(this.config.fundManagerId),
            userId: userAddress.toLowerCase(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'GraphQL error');
      }

      return (data.data?.Redelegation || []).length;
    }, 'getExistingRedelegationCountForUser');

    return result ?? 0;
  }

  // -------------------------------------------
  // Redelegation Logic
  // -------------------------------------------

  private async executeRedelegations(userAddress: string, totalAmount: bigint): Promise<boolean> {
    this.logger.info('Starting auto-redelegation', {
      userAddress,
      totalAmount: totalAmount.toString(),
      totalAmountUsdc: Number(totalAmount) / 1e6,
    });

    const account = privateKeyToAccount(this.config.fundManagerPrivateKey);

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(this.config.rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(this.config.rpcUrl),
    });

    let successCount = 0;
    const txHashes: Hash[] = [];

    for (const specialist of this.config.specialistAllocations) {
      const allocationAmount = (totalAmount * BigInt(specialist.percentage)) / 100n;

      this.logger.info(`Delegating to ${specialist.name}`, {
        specialistId: specialist.id,
        amount: allocationAmount.toString(),
        amountUsdc: Number(allocationAmount) / 1e6,
        percentage: specialist.percentage,
      });

      try {
        const hash = await walletClient.writeContract({
          address: this.config.executionAddress,
          abi: executionAbi,
          functionName: 'logRedelegation',
          args: [
            BigInt(specialist.id),
            userAddress as `0x${string}`,
            allocationAmount,
            BigInt(this.config.delegationDuration),
          ],
        });

        txHashes.push(hash);
        this.logger.debug('Transaction submitted', { hash, specialist: specialist.name });

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          successCount++;
          this.stats.redelegationsCreated++;
          this.logger.info(`Redelegation confirmed`, {
            specialist: specialist.name,
            hash,
            blockNumber: receipt.blockNumber.toString(),
          });
        } else {
          this.logger.error(`Redelegation reverted`, { specialist: specialist.name, hash });
        }
      } catch (error) {
        this.logger.error(`Redelegation failed`, {
          specialist: specialist.name,
          error: (error as Error).message,
        });
        this.stats.errors++;
      }
    }

    const success = successCount === this.config.specialistAllocations.length;
    this.logger.info('Auto-redelegation complete', {
      success,
      successCount,
      totalSpecialists: this.config.specialistAllocations.length,
      txHashes,
    });

    return success;
  }

  // -------------------------------------------
  // Main Poll Loop
  // -------------------------------------------

  private async pollForNewPermissions(): Promise<void> {
    this.stats.lastPollAt = new Date();

    const latestPermission = await this.getLatestFundManagerPermission();

    if (!latestPermission) {
      this.logger.debug('No active permissions found');
      return;
    }

    const isNew =
      latestPermission.id !== this.lastProcessedPermissionId &&
      latestPermission.grantedAt !== this.lastProcessedTimestamp;

    if (!isNew) {
      this.logger.debug('No new permissions detected');
      return;
    }

    this.logger.info('New permission detected', {
      permissionId: latestPermission.id,
      user: latestPermission.user.id,
      amount: latestPermission.amountPerPeriod,
      amountUsdc: Number(latestPermission.amountPerPeriod) / 1e6,
    });

    // Check if redelegations already exist FOR THIS USER
    const existingCount = await this.getExistingRedelegationCountForUser(latestPermission.user.id);

    if (existingCount > 0) {
      this.logger.info('Skipping - user already has active redelegations', {
        existingCount,
        user: latestPermission.user.id,
      });
      this.lastProcessedPermissionId = latestPermission.id;
      this.lastProcessedTimestamp = latestPermission.grantedAt;
      return;
    }

    // Execute redelegations
    const success = await this.executeRedelegations(
      latestPermission.user.id,
      BigInt(latestPermission.amountPerPeriod)
    );

    if (success) {
      this.stats.permissionsProcessed++;
      this.stats.lastPermissionId = latestPermission.id;
    }

    this.lastProcessedPermissionId = latestPermission.id;
    this.lastProcessedTimestamp = latestPermission.grantedAt;
  }

  // -------------------------------------------
  // Health Check Server
  // -------------------------------------------

  private startHealthServer(): void {
    this.healthServer = createServer((req, res) => {
      if (req.url === '/health' || req.url === '/healthz') {
        const health = {
          status: this.stats.isHealthy ? 'healthy' : 'unhealthy',
          uptime: Math.floor((Date.now() - this.stats.startedAt.getTime()) / 1000),
          stats: {
            permissionsProcessed: this.stats.permissionsProcessed,
            redelegationsCreated: this.stats.redelegationsCreated,
            errors: this.stats.errors,
            lastPollAt: this.stats.lastPollAt?.toISOString() || null,
            lastPermissionId: this.stats.lastPermissionId,
          },
        };

        res.writeHead(this.stats.isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
      } else if (req.url === '/ready') {
        res.writeHead(this.isRunning ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ready: this.isRunning }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.healthServer.listen(this.config.healthPort, () => {
      this.logger.info('Health check server started', { port: this.config.healthPort });
    });
  }

  // -------------------------------------------
  // Lifecycle
  // -------------------------------------------

  async start(): Promise<void> {
    this.logger.info('Starting Fund Manager Redelegation Service', {
      fundManagerId: this.config.fundManagerId,
      executionAddress: this.config.executionAddress,
      pollInterval: this.config.pollIntervalMs,
      specialistCount: this.config.specialistAllocations.length,
    });

    // Start health check server
    this.startHealthServer();

    // Mark as running
    this.isRunning = true;

    // Signal ready to PM2
    if (process.send) {
      process.send('ready');
    }

    // Log startup info (actual redelegation check is done per-user in poll loop)
    this.logger.info('Service ready - will check for new permissions per-user');

    // Main polling loop
    while (this.isRunning) {
      try {
        await this.pollForNewPermissions();
      } catch (error) {
        this.logger.error('Error in poll loop', { error: (error as Error).message });
        this.stats.errors++;
      }

      await this.sleep(this.config.pollIntervalMs);
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Fund Manager Redelegation Service');
    this.isRunning = false;

    if (this.healthServer) {
      this.healthServer.close();
    }

    this.logger.info('Service stopped', {
      totalPermissionsProcessed: this.stats.permissionsProcessed,
      totalRedelegationsCreated: this.stats.redelegationsCreated,
      totalErrors: this.stats.errors,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ===========================================
// Entry Point
// ===========================================

async function main(): Promise<void> {
  const config = loadConfig();
  const service = new FundManagerRedelegationService(config);

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    await service.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
  });

  await service.start();
}

main().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});
