/**
 * Echelon Agents - Delegation Framework Configuration
 *
 * Configuration for MetaMask Smart Accounts Kit integration
 * including bundler (Pimlico) and delegation framework settings.
 */

import type { Address } from 'viem';
import { sepolia } from 'viem/chains';

// ============================================
// ENVIRONMENT VARIABLE NAMES
// ============================================

const DELEGATION_ENV_KEYS = {
  PIMLICO_API_KEY: 'PIMLICO_API_KEY',
  BUNDLER_RPC_URL: 'BUNDLER_RPC_URL',
} as const;

// ============================================
// ERC-4337 CONSTANTS
// ============================================

/**
 * ERC-4337 Entry Point v0.7 (same across all chains)
 * @see https://github.com/eth-infinitism/account-abstraction
 */
export const ENTRY_POINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

// ============================================
// BUNDLER CONFIGURATION
// ============================================

export interface BundlerConfig {
  apiKey: string;
  rpcUrl: string;
  chainId: number;
}

/**
 * Get Pimlico API key from environment
 */
export function getPimlicoApiKey(): string {
  const apiKey = process.env[DELEGATION_ENV_KEYS.PIMLICO_API_KEY];
  if (!apiKey) {
    throw new Error(
      `Missing ${DELEGATION_ENV_KEYS.PIMLICO_API_KEY} environment variable. ` +
      'Get an API key from https://dashboard.pimlico.io/apikeys'
    );
  }
  return apiKey;
}

/**
 * Get bundler RPC URL for a specific chain
 * Uses Pimlico's bundler service by default
 */
export function getBundlerRpcUrl(chainId: number): string {
  // Check for custom bundler URL first
  const customUrl = process.env[DELEGATION_ENV_KEYS.BUNDLER_RPC_URL];
  if (customUrl) {
    return customUrl;
  }

  // Build Pimlico bundler URL
  const apiKey = getPimlicoApiKey();
  return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${apiKey}`;
}

/**
 * Load bundler configuration
 */
export function loadBundlerConfig(chainId: number): BundlerConfig {
  const apiKey = getPimlicoApiKey();
  const rpcUrl = getBundlerRpcUrl(chainId);

  return {
    apiKey,
    rpcUrl,
    chainId,
  };
}

// ============================================
// DELEGATION FRAMEWORK ADDRESSES
// ============================================

/**
 * Delegation Framework deployment addresses
 * These are fetched dynamically via getDeleGatorEnvironment in the SDK
 * but we provide fallbacks for Sepolia here.
 *
 * @see https://github.com/MetaMask/delegation-framework
 */
export interface DelegationFrameworkAddresses {
  delegationManager: Address;
  hybridDeleGator: Address;
  multiSigDeleGator: Address;
  eip7702StatelessDeleGator: Address;
  simpleFactory: Address;
  entryPoint: Address;
  enforcers: {
    allowedCalldata: Address;
    allowedMethods: Address;
    allowedTargets: Address;
    argsEqualityCheck: Address;
    blockNumber: Address;
    deployedEnforcer: Address;
    erc20BalanceGte: Address;
    erc20TransferAmount: Address;
    erc721BalanceGte: Address;
    erc721TransferEnforcer: Address;
    erc1155BalanceGte: Address;
    idEnforcer: Address;
    limitedCalls: Address;
    nativeBalanceGte: Address;
    nativeTokenPayment: Address;
    nativeTokenTransferAmount: Address;
    nonce: Address;
    ownershipTransfer: Address;
    redeemerEnforcer: Address;
    timestamp: Address;
    valueLte: Address;
  };
}

/**
 * Known Delegation Framework addresses for supported chains
 * v1.3.0 deployment addresses (deterministic via CREATE2)
 *
 * These addresses are identical across ALL supported EVM chains because they're
 * deployed using CREATE2 with the salt "GATOR".
 *
 * @see https://github.com/MetaMask/delegation-framework/blob/main/documents/Deployments.md
 * @see https://docs.metamask.io/delegation-toolkit/reference/delegation/caveats/
 */

/**
 * Core Delegation Framework v1.3.0 addresses (same across all chains)
 */
export const DELEGATION_FRAMEWORK_CORE = {
  simpleFactory: '0x69Aa2f9fe1572F1B640E1bbc512f5c3a734fc77c' as Address,
  delegationManager: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3' as Address,
  multiSigDeleGatorImpl: '0x56a9EdB16a0105eb5a4C54f4C062e2868844f3A7' as Address,
  hybridDeleGatorImpl: '0x48dBe696A4D990079e039489bA2053B36E8FFEC4' as Address,
  eip7702StatelessDeleGatorImpl: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B' as Address,
} as const;

/**
 * Caveat Enforcer v1.3.0 addresses (deterministic via CREATE2, same across all chains)
 * @see https://github.com/MetaMask/delegation-framework/blob/main/documents/Deployments.md
 */
export const DELEGATION_ENFORCERS = {
  // Core enforcers used by Echelon agents
  timestamp: '0x1046bb45C8d673d4ea75321280DB34899413c069' as Address,
  limitedCalls: '0x04658B29F6b82ed55274221a06Fc97D318E25416' as Address,
  erc20TransferAmount: '0xf100b0819427117EcF76Ed94B358B1A5b5C6D2Fc' as Address,
  allowedTargets: '0x7F20f61b1f09b08D970938F6fa563634d65c4EeB' as Address,

  // Calldata & Methods enforcers
  allowedCalldata: '0xc2b0d624c1c4319760C96503BA27C347F3260f55' as Address,
  allowedMethods: '0x2c21fD0Cb9DC8445CB3fb0DC5E7Bb0Aca01842B5' as Address,
  argsEqualityCheck: '0x44B8C6ae3C304213c3e298495e12497Ed3E56E41' as Address,

  // Block & Time enforcers
  blockNumber: '0x5d9818dF0AE3f66e9c3D0c5029DAF99d1823ca6c' as Address,
  nonce: '0xDE4f2FAC4B3D87A1d9953Ca5FC09FCa7F366254f' as Address,

  // ERC20 enforcers
  erc20BalanceGte: '0xcdF6aB796408598Cea671d79506d7D48E97a5437' as Address, // ERC20BalanceChangeEnforcer
  erc20PeriodTransfer: '0x474e3Ae7E169e940607cC624Da8A15Eb120139aB' as Address,
  erc20Streaming: '0x56c97aE02f233B29fa03502Ecc0457266d9be00e' as Address,

  // ERC721 enforcers
  erc721BalanceGte: '0x8aFdf96eDBbe7e1eD3f5Cd89C7E084841e12A09e' as Address, // ERC721BalanceChangeEnforcer
  erc721TransferEnforcer: '0x3790e6B7233f779b09DA74C72b6e94813925b9aF' as Address,

  // ERC1155 enforcers
  erc1155BalanceGte: '0x63c322732695cAFbbD488Fc6937A0A7B66fC001A' as Address, // ERC1155BalanceChangeEnforcer

  // Native token enforcers
  nativeBalanceGte: '0xbD7B277507723490Cd50b12EaaFe87C616be6880' as Address, // NativeBalanceChangeEnforcer
  nativeTokenPayment: '0x4803a326ddED6dDBc60e659e5ed12d85c7582811' as Address,
  nativeTokenTransferAmount: '0xF71af580b9c3078fbc2BBF16FbB8EEd82b330320' as Address,
  nativeTokenStreaming: '0xD10b97905a320b13a0608f7E9cC506b56747df19' as Address,
  nativeTokenPeriodTransfer: '0x9BC0FAf4Aca5AE429F4c06aEEaC517520CB16BD9' as Address,

  // Other enforcers
  deployedEnforcer: '0x24ff2AA430D53a8CD6788018E902E098083dcCd2' as Address,
  idEnforcer: '0xC8B5D93463c893401094cc70e66A206fb5987997' as Address,
  ownershipTransfer: '0x7EEf9734E7092032B5C56310Eb9BbD1f4A524681' as Address,
  redeemerEnforcer: '0xE144b0b2618071B4E56f746313528a669c7E65c5' as Address,
  valueLte: '0x92Bf12322527cAA612fd31a0e810472BBB106A8F' as Address,
  logicalOrWrapper: '0xE1302607a3251AF54c3a6e69318d6aa07F5eB46c' as Address,

  // Exact execution enforcers
  exactCalldata: '0x99F2e9bF15ce5eC84685604836F71aB835DBBdED' as Address,
  exactCalldataBatch: '0x982FD5C86BBF425d7d1451f974192d4525113DfD' as Address,
  exactExecution: '0x146713078D39eCC1F5338309c28405ccf85Abfbb' as Address,
  exactExecutionBatch: '0x1e141e455d08721Dd5BCDA1BaA6Ea5633Afd5017' as Address,

  // Multi-token period enforcer
  multiTokenPeriod: '0xFB2f1a9BD76d3701B730E5d69C3219D42D80eBb7' as Address,

  // Multi-operation increase balance enforcers
  erc20MultiOpIncreaseBalance: '0xeaA1bE91F0ea417820a765df9C5BE542286BFfDC' as Address,
  erc721MultiOpIncreaseBalance: '0x44877cDAFC0d529ab144bb6B0e202eE377C90229' as Address,
  erc1155MultiOpIncreaseBalance: '0x9eB86bbdaA71D4D8d5Fb1B8A9457F04D3344797b' as Address,
  nativeTokenMultiOpIncreaseBalance: '0xaD551E9b971C1b0c02c577bFfCFAA20b81777276' as Address,
} as const;

export const DELEGATION_FRAMEWORK_ADDRESSES: Record<number, Partial<DelegationFrameworkAddresses>> = {
  // Sepolia Testnet (11155111)
  // MetaMask Delegation Framework v1.3.0 deterministic deployment addresses
  [sepolia.id]: {
    delegationManager: DELEGATION_FRAMEWORK_CORE.delegationManager,
    hybridDeleGator: DELEGATION_FRAMEWORK_CORE.hybridDeleGatorImpl,
    multiSigDeleGator: DELEGATION_FRAMEWORK_CORE.multiSigDeleGatorImpl,
    eip7702StatelessDeleGator: DELEGATION_FRAMEWORK_CORE.eip7702StatelessDeleGatorImpl,
    simpleFactory: DELEGATION_FRAMEWORK_CORE.simpleFactory,
    entryPoint: ENTRY_POINT_ADDRESS,
    enforcers: {
      timestamp: DELEGATION_ENFORCERS.timestamp,
      limitedCalls: DELEGATION_ENFORCERS.limitedCalls,
      erc20TransferAmount: DELEGATION_ENFORCERS.erc20TransferAmount,
      allowedTargets: DELEGATION_ENFORCERS.allowedTargets,
      allowedCalldata: DELEGATION_ENFORCERS.allowedCalldata,
      allowedMethods: DELEGATION_ENFORCERS.allowedMethods,
      argsEqualityCheck: DELEGATION_ENFORCERS.argsEqualityCheck,
      blockNumber: DELEGATION_ENFORCERS.blockNumber,
      deployedEnforcer: DELEGATION_ENFORCERS.deployedEnforcer,
      erc20BalanceGte: DELEGATION_ENFORCERS.erc20BalanceGte,
      erc721BalanceGte: DELEGATION_ENFORCERS.erc721BalanceGte,
      erc721TransferEnforcer: DELEGATION_ENFORCERS.erc721TransferEnforcer,
      erc1155BalanceGte: DELEGATION_ENFORCERS.erc1155BalanceGte,
      idEnforcer: DELEGATION_ENFORCERS.idEnforcer,
      nativeBalanceGte: DELEGATION_ENFORCERS.nativeBalanceGte,
      nativeTokenPayment: DELEGATION_ENFORCERS.nativeTokenPayment,
      nativeTokenTransferAmount: DELEGATION_ENFORCERS.nativeTokenTransferAmount,
      nonce: DELEGATION_ENFORCERS.nonce,
      ownershipTransfer: DELEGATION_ENFORCERS.ownershipTransfer,
      redeemerEnforcer: DELEGATION_ENFORCERS.redeemerEnforcer,
      valueLte: DELEGATION_ENFORCERS.valueLte,
    },
  },
};

/**
 * Get delegation framework addresses for a chain
 * Falls back to SDK's getDeleGatorEnvironment if available
 */
export function getDelegationFrameworkAddresses(chainId: number): Partial<DelegationFrameworkAddresses> {
  const addresses = DELEGATION_FRAMEWORK_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(
      `Delegation Framework not configured for chain ${chainId}. ` +
      'Use the SDK\'s getDeleGatorEnvironment() for dynamic resolution.'
    );
  }
  return addresses;
}

/**
 * Check if a chain is supported for delegation
 */
export function isDelegationSupportedChain(chainId: number): boolean {
  return chainId in DELEGATION_FRAMEWORK_ADDRESSES;
}
