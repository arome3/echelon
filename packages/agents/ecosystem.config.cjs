/**
 * Echelon Agents - PM2 Ecosystem Configuration
 *
 * PM2 is a production process manager for Node.js that ensures
 * your services stay running 24/7 with automatic restarts.
 *
 * Installation:
 *   npm install -g pm2
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs          # Start all services
 *   pm2 start ecosystem.config.cjs --only oracle-sync  # Start oracle sync only
 *   pm2 logs oracle-sync                    # View logs
 *   pm2 status                              # Check status
 *   pm2 stop all                            # Stop all
 *   pm2 restart oracle-sync                 # Restart service
 *   pm2 monit                               # Live monitoring dashboard
 *
 * Auto-startup (survives reboots):
 *   pm2 startup                             # Generate startup script
 *   pm2 save                                # Save current process list
 */

module.exports = {
  apps: [
    // ============================================
    // Oracle Sync Service
    // ============================================
    // Syncs reputation scores from Envio indexer to on-chain oracle
    {
      name: 'oracle-sync',
      script: 'npx',
      args: 'tsx src/services/oracle-sync.ts',
      cwd: __dirname,

      // Environment variables
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Restart policy
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,  // 5 seconds between restarts

      // Exponential backoff on repeated failures
      exp_backoff_restart_delay: 100,

      // Watch for file changes (dev only)
      watch: false,

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/oracle-sync-error.log',
      out_file: 'logs/oracle-sync-out.log',
      merge_logs: true,

      // Resource limits
      max_memory_restart: '500M',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // ============================================
    // Fund Manager Agent (Optional)
    // ============================================
    // Uncomment to run the Fund Manager agent
    // {
    //   name: 'fund-manager',
    //   script: 'npx',
    //   args: 'tsx src/index.ts',
    //   cwd: __dirname,
    //   env: {
    //     NODE_ENV: 'development',
    //     AGENT_TYPE: 'FundManager',
    //   },
    //   autorestart: true,
    //   max_restarts: 10,
    //   restart_delay: 5000,
    //   log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    //   error_file: 'logs/fund-manager-error.log',
    //   out_file: 'logs/fund-manager-out.log',
    //   merge_logs: true,
    //   max_memory_restart: '500M',
    // },

    // ============================================
    // DexSwap Agent (Optional)
    // ============================================
    // Uncomment to run the DexSwap agent
    // {
    //   name: 'dex-swap',
    //   script: 'npx',
    //   args: 'tsx src/index.ts',
    //   cwd: __dirname,
    //   env: {
    //     NODE_ENV: 'development',
    //     AGENT_TYPE: 'DexSwap',
    //   },
    //   autorestart: true,
    //   max_restarts: 10,
    //   restart_delay: 5000,
    //   log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    //   error_file: 'logs/dex-swap-error.log',
    //   out_file: 'logs/dex-swap-out.log',
    //   merge_logs: true,
    //   max_memory_restart: '500M',
    // },
  ],
};
