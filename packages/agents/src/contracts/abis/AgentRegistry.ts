/**
 * AgentRegistry Contract ABI
 *
 * Minimal ABI for agent registry interactions.
 * Based on packages/contracts/src/interfaces/IAgentRegistry.sol
 */

export const AgentRegistryAbi = [
  // ============================================
  // FUNCTIONS
  // ============================================

  {
    name: 'isRegisteredAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'walletAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getAgentByWallet',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'walletAddress', type: 'address' }],
    outputs: [
      { name: 'agentId', type: 'uint256' },
      {
        name: 'metadata',
        type: 'tuple',
        components: [
          { name: 'walletAddress', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'strategyType', type: 'string' },
          { name: 'riskLevel', type: 'uint8' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'walletToAgentId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'agents',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'walletAddress', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'strategyType', type: 'string' },
          { name: 'riskLevel', type: 'uint8' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'totalAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },

  // ============================================
  // EVENTS
  // ============================================

  {
    name: 'AgentRegistered',
    type: 'event',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'walletAddress', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'strategyType', type: 'string', indexed: false },
      { name: 'riskLevel', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'AgentUpdated',
    type: 'event',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'metadataUri', type: 'string', indexed: false },
    ],
  },
  {
    name: 'AgentDeactivated',
    type: 'event',
    inputs: [{ name: 'agentId', type: 'uint256', indexed: true }],
  },
  {
    name: 'AgentReactivated',
    type: 'event',
    inputs: [{ name: 'agentId', type: 'uint256', indexed: true }],
  },
] as const;

export type AgentRegistryAbi = typeof AgentRegistryAbi;
