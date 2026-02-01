/**
 * Protocol-Specific Handlers
 * Direct Solana Actions integration for DeFi protocols
 * 
 * Uses direct protocol action endpoints per the Solana Actions spec:
 * - GET to action URL → metadata + available actions
 * - POST with account → transaction to sign
 */

import type { Market, Position, ProtocolId, MarketType } from '../types/index.js';
import { ActionsClient, PROTOCOL_ACTIONS, TRUSTED_HOSTS } from './actions.js';
import { BlinksExecutor } from './blinks.js';
import type { Connection } from '@solana/web3.js';

/**
 * Known action endpoints for major DeFi protocols
 * These are direct URLs that implement the Solana Actions specification
 * 
 * Status: ✅ = Tested working, ⚠️ = Partial/untested, 🔒 = Cloudflare blocked, ❌ = Not working
 */
export const PROTOCOL_ACTION_ENDPOINTS: Record<string, {
  displayName: string;
  category: string;
  website: string;
  status: 'working' | 'partial' | 'blocked' | 'unknown' | 'broken';
  actions: Record<string, string>;
  trustedHosts: string[];
  notes?: string;
}> = {
  // ✅ CONFIRMED WORKING
  kamino: {
    displayName: 'Kamino Finance',
    category: 'lending-yield',
    website: 'https://kamino.finance',
    status: 'working',
    actions: {
      // Kamino Lend (yield vaults) - CONFIRMED WORKING
      'lend-deposit': 'https://kamino.dial.to/api/v0/lend/{vault}/deposit',
      'lend-withdraw': 'https://kamino.dial.to/api/v0/lend/{vault}/withdraw',
      // Kamino Lending (borrow) - untested
      'lending-deposit': 'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/deposit',
      'lending-withdraw': 'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/withdraw',
      'lending-borrow': 'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/borrow',
      'lending-repay': 'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/repay',
      // Kamino Multiply (loop) - untested
      'multiply-deposit': 'https://kamino.dial.to/api/v0/multiply/{market}/deposit',
      'multiply-withdraw': 'https://kamino.dial.to/api/v0/multiply/{market}/withdraw',
    },
    trustedHosts: ['kamino.dial.to', 'app.kamino.finance'],
    notes: 'Vaults: usdg-prime, usdc-main, sol-main, etc.',
  },
  
  tensor: {
    displayName: 'Tensor',
    category: 'nft',
    website: 'https://tensor.trade',
    status: 'working',
    actions: {
      'buy-floor': 'https://tensor.dial.to/buy-floor/{collection}',
      'bid': 'https://tensor.dial.to/bid/{item}',
    },
    trustedHosts: ['tensor.dial.to', 'tensor.trade'],
    notes: 'Routes via tensor.trade/actions.json. Needs collection/item params.',
  },
  
  // 🔒 CLOUDFLARE BLOCKED (works in browser)
  jito: {
    displayName: 'Jito',
    category: 'staking',
    website: 'https://jito.network',
    status: 'blocked',
    actions: {
      stake: 'https://jito.dial.to/stake',
    },
    trustedHosts: ['jito.dial.to', 'jito.network'],
    notes: 'Cloudflare blocks server IPs. Works in browser.',
  },
  
  sanctum: {
    displayName: 'Sanctum',
    category: 'staking',
    website: 'https://sanctum.so',
    status: 'blocked',
    actions: {
      stake: 'https://sanctum.dial.to/stake',
      unstake: 'https://sanctum.dial.to/unstake',
    },
    trustedHosts: ['sanctum.dial.to', 'sanctum.so'],
    notes: 'Cloudflare blocks server IPs. Works in browser.',
  },
  
  // ⚠️ PARTIAL - has actions.json but endpoints need discovery
  meteora: {
    displayName: 'Meteora',
    category: 'amm',
    website: 'https://meteora.ag',
    status: 'partial',
    actions: {
      // Paths based on actions.json, may need specific pool IDs
      'dlmm-add': 'https://meteora.dial.to/api/dlmm/{pool}/add-liquidity',
      'dlmm-remove': 'https://meteora.dial.to/api/dlmm/{pool}/remove-liquidity',
      'bonding-curve': 'https://meteora.dial.to/api/bonding-curve/{action}',
    },
    trustedHosts: ['meteora.dial.to', 'app.meteora.ag'],
    notes: 'Has actions.json. Endpoints likely need pool addresses.',
  },
  
  drift: {
    displayName: 'Drift Protocol',
    category: 'perps',
    website: 'https://drift.trade',
    status: 'partial',
    actions: {
      deposit: 'https://app.drift.trade/api/blinks/deposit',
      elections: 'https://app.drift.trade/api/blinks/elections',
    },
    trustedHosts: ['app.drift.trade', 'drift.dial.to'],
    notes: 'Has actions.json. Deposit endpoint returns 500.',
  },
  
  // ❌ UNKNOWN - endpoint paths not discovered
  marginfi: {
    displayName: 'MarginFi',
    category: 'lending',
    website: 'https://marginfi.com',
    status: 'unknown',
    actions: {
      // Paths untested - all return 404
      deposit: 'https://marginfi.dial.to/deposit',
      withdraw: 'https://marginfi.dial.to/withdraw',
    },
    trustedHosts: ['marginfi.dial.to', 'app.marginfi.com'],
    notes: 'Endpoint paths unknown. All tested paths return 404.',
  },
  
  jupiter: {
    displayName: 'Jupiter',
    category: 'swap-lending',
    website: 'https://jup.ag',
    status: 'unknown',
    actions: {
      // Paths untested - all return 404
      swap: 'https://jupiter.dial.to/swap',
    },
    trustedHosts: ['jupiter.dial.to', 'jup.ag'],
    notes: 'Endpoint paths unknown. All tested paths return 404.',
  },
  
  raydium: {
    displayName: 'Raydium',
    category: 'amm',
    website: 'https://raydium.io',
    status: 'unknown',
    actions: {
      swap: 'https://share.raydium.io/swap',
    },
    trustedHosts: ['share.raydium.io', 'raydium.dial.to'],
    notes: 'No actions.json. Endpoint paths unknown.',
  },
  
  orca: {
    displayName: 'Orca',
    category: 'amm',
    website: 'https://orca.so',
    status: 'unknown',
    actions: {
      swap: 'https://orca.dial.to/swap',
    },
    trustedHosts: ['orca.dial.to', 'orca.so'],
    notes: 'Endpoint paths unknown. All tested paths return 404.',
  },
  
  lulo: {
    displayName: 'Lulo',
    category: 'yield',
    website: 'https://lulo.fi',
    status: 'broken',
    actions: {
      deposit: 'https://lulo.dial.to/deposit',
    },
    trustedHosts: ['blink.lulo.fi', 'lulo.dial.to'],
    notes: 'lulo.dial.to returns 404. blink.lulo.fi has SSL errors.',
  },
  
  helius: {
    displayName: 'Helius',
    category: 'staking',
    website: 'https://helius.dev',
    status: 'blocked',
    actions: {
      stake: 'https://helius.dial.to/stake',
    },
    trustedHosts: ['helius.dial.to'],
    notes: 'Returns 403 Forbidden.',
  },
  
  magiceden: {
    displayName: 'Magic Eden',
    category: 'nft',
    website: 'https://magiceden.io',
    status: 'partial',
    actions: {
      buy: 'https://api-mainnet.magiceden.dev/v2/actions/buy/{item}',
    },
    trustedHosts: ['api-mainnet.magiceden.dev', 'magiceden.dev'],
    notes: 'Returns 400. Needs specific item parameters.',
  },
};

/**
 * Protocol metadata for all supported protocols
 */
export const PROTOCOLS: Record<ProtocolId, {
  name: string;
  displayName: string;
  category: string;
  website: string;
  marketTypes: MarketType[];
  actions: string[];
  blinksSupported: boolean;
  marketsApiSupported: boolean;
  positionsApiSupported: boolean;
  directActionsAvailable: boolean;
}> = {
  kamino: {
    name: 'kamino',
    displayName: 'Kamino Finance',
    category: 'lending-yield',
    website: 'https://kamino.finance',
    marketTypes: ['yield', 'lending', 'loop'],
    actions: ['deposit', 'withdraw', 'borrow', 'repay', 'multiply', 'leverage'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: true,
    directActionsAvailable: true,
  },
  marginfi: {
    name: 'marginfi',
    displayName: 'MarginFi',
    category: 'lending',
    website: 'https://marginfi.com',
    marketTypes: ['lending'],
    actions: ['deposit', 'withdraw', 'borrow', 'repay'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  jupiter: {
    name: 'jupiter',
    displayName: 'Jupiter',
    category: 'swap-lending',
    website: 'https://jup.ag',
    marketTypes: ['yield', 'lending'],
    actions: ['deposit', 'withdraw', 'borrow', 'repay', 'swap'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: true,
    directActionsAvailable: true,
  },
  raydium: {
    name: 'raydium',
    displayName: 'Raydium',
    category: 'amm',
    website: 'https://raydium.io',
    marketTypes: [],
    actions: ['swap', 'add-liquidity', 'remove-liquidity'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  orca: {
    name: 'orca',
    displayName: 'Orca',
    category: 'amm',
    website: 'https://orca.so',
    marketTypes: [],
    actions: ['swap', 'add-liquidity', 'remove-liquidity'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  meteora: {
    name: 'meteora',
    displayName: 'Meteora',
    category: 'amm',
    website: 'https://meteora.ag',
    marketTypes: [],
    actions: ['add-liquidity', 'remove-liquidity'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  drift: {
    name: 'drift',
    displayName: 'Drift Protocol',
    category: 'perps',
    website: 'https://drift.trade',
    marketTypes: ['perpetual'],
    actions: ['vault-deposit', 'vault-withdraw'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  lulo: {
    name: 'lulo',
    displayName: 'Lulo',
    category: 'yield',
    website: 'https://lulo.fi',
    marketTypes: ['yield'],
    actions: ['deposit', 'withdraw'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: true,
    directActionsAvailable: true,
  },
  save: {
    name: 'save',
    displayName: 'Save Protocol',
    category: 'yield',
    website: 'https://save.finance',
    marketTypes: ['yield'],
    actions: ['deposit', 'withdraw'],
    blinksSupported: true,
    marketsApiSupported: false,
    positionsApiSupported: false,
    directActionsAvailable: false,
  },
  defituna: {
    name: 'defituna',
    displayName: 'DeFiTuna',
    category: 'lending',
    website: 'https://defituna.com',
    marketTypes: ['yield'],
    actions: ['deposit', 'withdraw'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  deficarrot: {
    name: 'deficarrot',
    displayName: 'DeFiCarrot',
    category: 'yield',
    website: 'https://deficarrot.com',
    marketTypes: ['yield'],
    actions: ['deposit', 'withdraw'],
    blinksSupported: true,
    marketsApiSupported: true,
    positionsApiSupported: false,
    directActionsAvailable: true,
  },
  dflow: {
    name: 'dflow',
    displayName: 'DFlow',
    category: 'prediction',
    website: 'https://dflow.net',
    marketTypes: ['prediction'],
    actions: ['bet', 'claim'],
    blinksSupported: false,
    marketsApiSupported: true,
    positionsApiSupported: true,
    directActionsAvailable: false,
  },
};

/**
 * Protocol handler base class
 */
export class ProtocolHandler {
  protected actionsClient: ActionsClient;
  protected blinks: BlinksExecutor;
  protected protocolId: ProtocolId;

  constructor(
    protocolId: ProtocolId,
    actionsClient: ActionsClient,
    blinks: BlinksExecutor
  ) {
    this.protocolId = protocolId;
    this.actionsClient = actionsClient;
    this.blinks = blinks;
  }

  /**
   * Get protocol metadata
   */
  getMetadata() {
    return PROTOCOLS[this.protocolId];
  }

  /**
   * Get direct action endpoints for this protocol
   */
  getActionEndpoints(): Record<string, string> | undefined {
    const endpoints = PROTOCOL_ACTION_ENDPOINTS[this.protocolId];
    return endpoints?.actions;
  }

  /**
   * Build an action URL with parameters
   */
  buildActionUrl(actionKey: string, params: Record<string, string>): string | undefined {
    const endpoints = this.getActionEndpoints();
    if (!endpoints || !endpoints[actionKey]) return undefined;
    
    let url = endpoints[actionKey];
    
    // Replace template parameters like {vault}, {market}, {reserve}
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`{${key}}`, value);
    }
    
    return url;
  }

  /**
   * Get transaction for an action
   */
  async getActionTransaction(
    actionKey: string,
    walletAddress: string,
    templateParams: Record<string, string>,
    queryParams?: Record<string, string | number>
  ): Promise<{ transaction: string; message?: string }> {
    const url = this.buildActionUrl(actionKey, templateParams);
    if (!url) {
      throw new Error(`Action '${actionKey}' not found for protocol '${this.protocolId}'`);
    }
    
    return this.actionsClient.postAction(url, walletAddress, queryParams);
  }
}

// ============================================
// Protocol-Specific Handlers
// ============================================

/**
 * Kamino Handler - Lend, Borrow, Multiply, Leverage
 */
export class KaminoHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('kamino', actionsClient, blinks);
  }

  async getDepositTransaction(vault: string, walletAddress: string, amount: string) {
    return this.getActionTransaction(
      'lend-deposit',
      walletAddress,
      { vault },
      { amount }
    );
  }

  async getWithdrawTransaction(vault: string, walletAddress: string, amount: string) {
    return this.getActionTransaction(
      'lend-withdraw',
      walletAddress,
      { vault },
      { amount }
    );
  }

  async getBorrowTransaction(
    market: string,
    reserve: string,
    walletAddress: string,
    amount: string
  ) {
    return this.getActionTransaction(
      'lending-borrow',
      walletAddress,
      { market, reserve },
      { amount }
    );
  }

  async getRepayTransaction(
    market: string,
    reserve: string,
    walletAddress: string,
    amount: string
  ) {
    return this.getActionTransaction(
      'lending-repay',
      walletAddress,
      { market, reserve },
      { amount }
    );
  }
}

/**
 * MarginFi Handler
 */
export class MarginFiHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('marginfi', actionsClient, blinks);
  }
}

/**
 * Jupiter Handler - Swap + Earn
 */
export class JupiterHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('jupiter', actionsClient, blinks);
  }

  async getSwapTransaction(
    walletAddress: string,
    inputMint: string,
    outputMint: string,
    amount: string
  ) {
    const url = this.buildActionUrl('swap', {});
    if (!url) throw new Error('Swap action not found');
    
    return this.actionsClient.postAction(url, walletAddress, {
      inputMint,
      outputMint,
      amount,
    });
  }
}

/**
 * Lulo Handler - Protected + Boosted Deposits
 */
export class LuloHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('lulo', actionsClient, blinks);
  }

  async getDepositTransaction(walletAddress: string, token: string, amount: string) {
    return this.getActionTransaction(
      'deposit',
      walletAddress,
      {},
      { token, amount }
    );
  }

  async getWithdrawTransaction(walletAddress: string, token: string, amount: string) {
    return this.getActionTransaction(
      'withdraw',
      walletAddress,
      {},
      { token, amount }
    );
  }
}

/**
 * Drift Handler - Strategy Vaults
 */
export class DriftHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('drift', actionsClient, blinks);
  }
}

/**
 * Sanctum Handler - LST Staking
 */
export class SanctumHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('lulo', actionsClient, blinks); // Using lulo as placeholder ProtocolId
  }

  async getStakeTransaction(
    walletAddress: string,
    inputMint: string,
    outputMint: string,
    amount: string
  ) {
    const endpoints = PROTOCOL_ACTION_ENDPOINTS['sanctum'];
    if (!endpoints) throw new Error('Sanctum endpoints not found');
    
    return this.actionsClient.postAction(endpoints.actions.stake, walletAddress, {
      inputMint,
      outputMint,
      amount,
    });
  }
}

/**
 * Jito Handler - JitoSOL Staking
 */
export class JitoHandler extends ProtocolHandler {
  constructor(actionsClient: ActionsClient, blinks: BlinksExecutor) {
    super('lulo', actionsClient, blinks); // Using lulo as placeholder ProtocolId
  }

  async getStakeTransaction(walletAddress: string, amount: string) {
    const endpoints = PROTOCOL_ACTION_ENDPOINTS['jito'];
    if (!endpoints) throw new Error('Jito endpoints not found');
    
    return this.actionsClient.postAction(endpoints.actions.stake, walletAddress, {
      amount,
    });
  }
}

/**
 * Create all protocol handlers
 */
export function createProtocolHandlers(
  connection: Connection
): Record<string, ProtocolHandler> {
  const actionsClient = new ActionsClient();
  const blinks = new BlinksExecutor(connection);
  
  return {
    kamino: new KaminoHandler(actionsClient, blinks),
    marginfi: new MarginFiHandler(actionsClient, blinks),
    jupiter: new JupiterHandler(actionsClient, blinks),
    raydium: new ProtocolHandler('raydium', actionsClient, blinks),
    orca: new ProtocolHandler('orca', actionsClient, blinks),
    meteora: new ProtocolHandler('meteora', actionsClient, blinks),
    drift: new DriftHandler(actionsClient, blinks),
    lulo: new LuloHandler(actionsClient, blinks),
    save: new ProtocolHandler('save', actionsClient, blinks),
    defituna: new ProtocolHandler('defituna', actionsClient, blinks),
    deficarrot: new ProtocolHandler('deficarrot', actionsClient, blinks),
    dflow: new ProtocolHandler('dflow', actionsClient, blinks),
  };
}

export default PROTOCOLS;
