/**
 * @openclaw/solana-blinks
 * Production-ready Solana Blinks SDK
 * 
 * Uses direct Solana Actions specification:
 * - GET to action URL → metadata + available actions
 * - POST with account → transaction to sign
 */

// Types
export * from './types/index.js';

// Core Libraries - Actions (NEW - direct Solana Actions integration)
export {
  ActionsClient,
  ActionError,
  createActionsClient,
  getAction,
  postAction,
  PROTOCOL_ACTIONS,
  TRUSTED_HOSTS,
} from './lib/actions.js';

// Core Libraries - Blinks Executor
export {
  BlinksExecutor,
  createBlinksExecutor,
  parseBlinkUrl,
} from './lib/blinks.js';

// Core Libraries - Wallet
export {
  Wallet,
  getWalletBalance,
  getWalletTokenBalances,
} from './lib/wallet.js';

// Core Libraries - Connection
export {
  getConnection,
  createConnection,
  getNetworkConnection,
  checkConnection,
  getCurrentSlot,
  getRecentBlockhash,
} from './lib/connection.js';

// Protocol Handlers
export {
  PROTOCOLS,
  PROTOCOL_ACTION_ENDPOINTS,
  ProtocolHandler,
  KaminoHandler,
  MarginFiHandler,
  JupiterHandler,
  LuloHandler,
  DriftHandler,
  SanctumHandler,
  JitoHandler,
  createProtocolHandlers,
} from './lib/protocols.js';

// Output Utilities
export {
  formatOutput,
  formatPercent,
  formatNumber,
  formatUsd,
  formatTokenAmount,
  formatSignature,
  formatAddress,
  success,
  error,
  info,
  warn,
} from './lib/output.js';

// Convenience re-exports
export { Connection, PublicKey, Keypair } from '@solana/web3.js';

// Registry - Fetch trusted hosts from Dialect registry
export {
  fetchRegistry,
  getTrustedHosts,
  getMaliciousHosts,
  isHostTrusted,
  isHostMalicious,
  getProtocolHosts,
  getRegistryStats,
  clearRegistryCache,
} from './lib/registry.js';

// Markets API - Dialect Standard Blinks Library + Token Discovery
export {
  // Dialect Markets API
  MarketsClient,
  createMarketsClient,
  getMarkets,
  getPositions,
  findBestYield,
  type DialectMarket,
  type DialectPosition,
  // Token Discovery
  COMMON_TOKENS,
  resolveTokenMint,
  getJupiterTokenList,
  searchToken,
  // Vault Discovery
  KAMINO_LEND_VAULTS,
  getKaminoLendVaults,
  // URL Builders (any token support)
  buildJupiterSwapUrl,
  buildRaydiumSwapUrl,
  buildKaminoDepositUrl,
  buildKaminoWithdrawUrl,
  buildJitoStakeUrl,
  buildMagicEdenBuyUrl,
  buildTensorBuyFloorUrl,
} from './lib/markets.js';

// Legacy export for backward compatibility (deprecated)
export { ActionsClient as DialectClient } from './lib/actions.js';
