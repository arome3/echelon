/**
 * Echelon Agents - Logger Utility
 *
 * Structured logging with agent context, timestamps, and log levels.
 */

import type { LogLevel } from '../types/index.js';
import { formatAddress, formatWei, formatTimestamp } from './helpers.js';

// ============================================
// LOG LEVEL CONFIGURATION
// ============================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.gray,
  info: COLORS.cyan,
  warn: COLORS.yellow,
  error: COLORS.red,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
};

// ============================================
// AGENT LOGGER CLASS
// ============================================

/**
 * Structured logger with agent context
 */
export class AgentLogger {
  private agentName: string;
  private minLevel: LogLevel;
  private useColors: boolean;

  constructor(
    agentName: string,
    options: {
      minLevel?: LogLevel;
      useColors?: boolean;
    } = {}
  ) {
    this.agentName = agentName;
    this.minLevel = options.minLevel ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info';
    this.useColors = options.useColors ?? process.stdout.isTTY ?? true;
  }

  // ============================================
  // CORE LOG METHODS
  // ============================================

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    const errorData: Record<string, unknown> = { ...data };

    if (error) {
      errorData.errorMessage = error.message;
      errorData.errorName = error.name;
      if (error.stack) {
        errorData.errorStack = error.stack.split('\n').slice(0, 5).join('\n');
      }
    }

    this.log('error', message, errorData);
  }

  // ============================================
  // SPECIALIZED LOG METHODS
  // ============================================

  /**
   * Log execution start event
   */
  logExecutionStart(
    executionId: bigint,
    userAddress: string,
    amountIn: bigint,
    tokenIn: string,
    tokenOut: string
  ): void {
    this.info('Execution started', {
      executionId: executionId.toString(),
      user: formatAddress(userAddress),
      amountIn: formatWei(amountIn),
      tokenIn: formatAddress(tokenIn),
      tokenOut: formatAddress(tokenOut),
    });
  }

  /**
   * Log execution completion event
   */
  logExecutionComplete(
    executionId: bigint,
    success: boolean,
    amountIn: bigint,
    amountOut: bigint,
    profitLoss?: bigint
  ): void {
    const level: LogLevel = success ? 'info' : 'warn';
    const message = success ? 'Execution completed successfully' : 'Execution failed';

    this.log(level, message, {
      executionId: executionId.toString(),
      success,
      amountIn: formatWei(amountIn),
      amountOut: formatWei(amountOut),
      profitLoss: profitLoss ? formatWei(profitLoss) : undefined,
    });
  }

  /**
   * Log redelegation event
   */
  logRedelegation(
    childAgentId: bigint,
    userAddress: string,
    amount: bigint,
    duration: bigint
  ): void {
    this.info('Redelegation created', {
      childAgentId: childAgentId.toString(),
      user: formatAddress(userAddress),
      amount: formatWei(amount),
      durationSeconds: duration.toString(),
    });
  }

  /**
   * Log strategy execution cycle
   */
  logStrategyCycle(
    cycleNumber: number,
    startTime: number,
    endTime: number,
    result: 'success' | 'skipped' | 'error'
  ): void {
    const duration = endTime - startTime;
    this.debug('Strategy cycle completed', {
      cycle: cycleNumber,
      durationMs: duration,
      result,
    });
  }

  /**
   * Log market analysis results
   */
  logMarketAnalysis(
    volatility: number,
    trend: string,
    recommendedStrategy: string
  ): void {
    this.debug('Market analysis completed', {
      volatility: volatility.toFixed(4),
      trend,
      recommendedStrategy,
    });
  }

  /**
   * Log specialist selection
   */
  logSpecialistSelected(
    specialistId: string,
    specialistName: string,
    reputationScore: number,
    strategy: string
  ): void {
    this.info('Specialist selected', {
      specialistId,
      name: specialistName,
      reputationScore,
      strategy,
    });
  }

  /**
   * Log swap opportunity found
   */
  logSwapOpportunity(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    expectedOut: bigint,
    profitPercent: number
  ): void {
    this.info('Swap opportunity identified', {
      tokenIn: formatAddress(tokenIn),
      tokenOut: formatAddress(tokenOut),
      amountIn: formatWei(amountIn),
      expectedOut: formatWei(expectedOut),
      profitPercent: `${profitPercent.toFixed(2)}%`,
    });
  }

  /**
   * Log agent lifecycle event
   */
  logLifecycle(event: 'starting' | 'started' | 'stopping' | 'stopped'): void {
    const messages: Record<string, string> = {
      starting: 'Agent starting...',
      started: 'Agent started successfully',
      stopping: 'Agent stopping...',
      stopped: 'Agent stopped',
    };
    this.info(messages[event]);
  }

  // ============================================
  // INTERNAL METHODS
  // ============================================

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    // Check if this level should be logged
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = this.formatMessage(level, timestamp, message, data);

    // Output to appropriate stream
    if (level === 'error') {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  /**
   * Format log message for output
   */
  private formatMessage(
    level: LogLevel,
    timestamp: string,
    message: string,
    data?: Record<string, unknown>
  ): string {
    if (this.useColors) {
      return this.formatColoredMessage(level, timestamp, message, data);
    }
    return this.formatPlainMessage(level, timestamp, message, data);
  }

  /**
   * Format message with ANSI colors
   */
  private formatColoredMessage(
    level: LogLevel,
    timestamp: string,
    message: string,
    data?: Record<string, unknown>
  ): string {
    const levelColor = LEVEL_COLORS[level];
    const levelLabel = LEVEL_LABELS[level];

    let output = `${COLORS.gray}${timestamp}${COLORS.reset} `;
    output += `${levelColor}${levelLabel}${COLORS.reset} `;
    output += `${COLORS.magenta}[${this.agentName}]${COLORS.reset} `;
    output += message;

    if (data && Object.keys(data).length > 0) {
      output += ` ${COLORS.dim}${JSON.stringify(data, this.bigIntReplacer)}${COLORS.reset}`;
    }

    return output;
  }

  /**
   * JSON replacer function to handle BigInt serialization
   */
  private bigIntReplacer(_key: string, value: unknown): unknown {
    return typeof value === 'bigint' ? value.toString() : value;
  }

  /**
   * Format message without colors (for file output, CI, etc.)
   */
  private formatPlainMessage(
    level: LogLevel,
    timestamp: string,
    message: string,
    data?: Record<string, unknown>
  ): string {
    const levelLabel = LEVEL_LABELS[level];

    let output = `${timestamp} ${levelLabel} [${this.agentName}] ${message}`;

    if (data && Object.keys(data).length > 0) {
      output += ` ${JSON.stringify(data, this.bigIntReplacer)}`;
    }

    return output;
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a logger for an agent
 */
export function createLogger(
  agentName: string,
  options?: {
    minLevel?: LogLevel;
    useColors?: boolean;
  }
): AgentLogger {
  return new AgentLogger(agentName, options);
}
