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

// Legacy export for backward compatibility (deprecated)
export { ActionsClient as DialectClient } from './lib/actions.js';
