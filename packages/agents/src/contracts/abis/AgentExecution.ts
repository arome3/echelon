/**
 * AgentExecution Contract ABI
 *
 * Minimal ABI for agent execution logging.
 * Based on packages/contracts/src/interfaces/IAgentExecution.sol
 */

export const AgentExecutionAbi = [
  // ============================================
  // FUNCTIONS
  // ============================================

  {
    name: 'logExecutionStart',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'userAddress', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
    ],
    outputs: [{ name: 'executionId', type: 'uint256' }],
  },
  {
    name: 'logExecutionComplete',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'executionId', type: 'uint256' },
      { name: 'userAddress', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOut', type: 'uint256' },
      { name: 'result', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'logRedelegation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'childAgentId', type: 'uint256' },
      { name: 'userAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'isExecutionPending',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'executionId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'totalExecutions',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getExecutionAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'executionId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'registry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },

  // ============================================
  // EVENTS
  // ============================================

  {
    name: 'ExecutionStarted',
    type: 'event',
    inputs: [
      { name: 'executionId', type: 'uint256', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'userAddress', type: 'address', indexed: true },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'tokenIn', type: 'address', indexed: false },
      { name: 'tokenOut', type: 'address', indexed: false },
    ],
  },
  {
    name: 'ExecutionCompleted',
    type: 'event',
    inputs: [
      { name: 'executionId', type: 'uint256', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'userAddress', type: 'address', indexed: true },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'amountOut', type: 'uint256', indexed: false },
      { name: 'profitLoss', type: 'int256', indexed: false },
      { name: 'result', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'RedelegationCreated',
    type: 'event',
    inputs: [
      { name: 'parentAgentId', type: 'uint256', indexed: true },
      { name: 'childAgentId', type: 'uint256', indexed: true },
      { name: 'userAddress', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'duration', type: 'uint256', indexed: false },
    ],
  },
] as const;

export type AgentExecutionAbi = typeof AgentExecutionAbi;
