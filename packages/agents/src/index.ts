/**
 * Echelon Agents - Entry Point
 *
 * Main entry point for running Echelon agents.
 * Loads configuration, creates the appropriate agent, and starts execution.
 */

import 'dotenv/config';

import { loadConfig, loadDexSwapConfig, getAgentType } from './config/index.js';
import { BaseAgent } from './BaseAgent.js';
import { FundManagerAgent } from './FundManagerAgent.js';
import { DexSwapAgent } from './DexSwapAgent.js';

// ============================================
// AGENT FACTORY
// ============================================

/**
 * Create an agent instance based on type
 */
function createAgent(agentType: string): BaseAgent {
  switch (agentType.toLowerCase()) {
    case 'fundmanager':
    case 'fund-manager':
    case 'manager':
      console.log('Creating FundManager agent...');
      return new FundManagerAgent(loadConfig());

    case 'dexswap':
    case 'dex-swap':
    case 'swap':
    case 'arbitrage':
      console.log('Creating DexSwap agent...');
      return new DexSwapAgent(loadDexSwapConfig());

    default:
      throw new Error(
        `Unknown agent type: ${agentType}. ` +
          `Supported types: FundManager, DexSwap`
      );
  }
}

// ============================================
// MAIN FUNCTION
// ============================================

async function main(): Promise<void> {
  console.log('');
  console.log('=================================================');
  console.log('           ECHELON AGENT STARTING');
  console.log('=================================================');
  console.log('');

  // Get agent type from environment
  const agentType = getAgentType();
  console.log(`Agent type: ${agentType}`);

  // Create the agent
  const agent = createAgent(agentType);

  // Setup graceful shutdown handlers
  const shutdown = () => {
    console.log('\nShutdown signal received...');
    agent.stop();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    agent.stop();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
  });

  // Start the agent
  try {
    await agent.start();
    console.log('Agent stopped gracefully.');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// ============================================
// EXPORTS
// ============================================

// Export classes for programmatic use
export { BaseAgent } from './BaseAgent.js';
export { FundManagerAgent } from './FundManagerAgent.js';
export { DexSwapAgent } from './DexSwapAgent.js';

// Export types
export * from './types/index.js';

// Export utilities
export { EnvioClient, createEnvioClient } from './utils/envio-client.js';
export { AgentLogger, createLogger } from './utils/logger.js';
export * from './utils/helpers.js';

// Export config
export { loadConfig, loadDexSwapConfig, getAgentType } from './config/index.js';
export * from './config/chains.js';

// Export contract utilities
export * from './contracts/index.js';

// ============================================
// RUN IF MAIN MODULE
// ============================================

// Check if this is the main module
const isMainModule =
  typeof require !== 'undefined' &&
  require.main === module;

// For ESM, check import.meta.url
const isESMMain =
  typeof import.meta !== 'undefined' &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMainModule || isESMMain || process.argv[1]?.includes('index')) {
  main().catch(console.error);
}
