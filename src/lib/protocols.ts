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
 */
export const PROTOCOL_ACTION_ENDPOINTS: Record<string, {
  displayName: string;
  category: string;
  website: string;
  actions: Record<string, string>;
  trustedHosts: string[];
}> = {
  kamino: {
    displayName: 'Kamino Finance',
    category: 'lending-yield',
    website: 'https://kamino.finance',
    actions: {
      // Kamino Lend (yield vaults)
      'lend-deposit': 'https://kamino.dial.to/api/v0/lend/{vault}/deposit',
      'lend-withdraw': 'https://kamino.dial.to/api/v0/lend/{vault}/withdraw',
      // Kamino Lending (borrow)
      'lending-deposit': 'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/deposit',
      'lending-withdraw': 'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/withdraw',
      'lending-borrow': 'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/borrow',
      'lending-repay': 'https://kamino.dial.to/api/v0/lending/reserve/{market}/{reserve}/repay',
      // Kamino Multiply (loop)
      'multiply-deposit': 'https://kamino.dial.to/api/v0/multiply/{market}/deposit',
      'multiply-withdraw': 'https://kamino.dial.to/api/v0/multiply/{market}/withdraw',
    },
    trustedHosts: ['kamino.dial.to', 'app.kamino.finance'],
  },
  
  marginfi: {
    displayName: 'MarginFi',
    category: 'lending',
    website: 'https://marginfi.com',
    actions: {
      deposit: 'https://marginfi.dial.to/api/v0/deposit',
      withdraw: 'https://marginfi.dial.to/api/v0/withdraw',
      borrow: 'https://marginfi.dial.to/api/v0/borrow',
      repay: 'https://marginfi.dial.to/api/v0/repay',
    },
    trustedHosts: ['marginfi.dial.to', 'app.marginfi.com'],
  },
  
  jupiter: {
    displayName: 'Jupiter',
    category: 'swap-lending',
    website: 'https://jup.ag',
    actions: {
      swap: 'https://jupiter.dial.to/api/v0/swap',
      'lend-deposit': 'https://jupiter.dial.to/api/v0/perps/earn/deposit',
      'lend-withdraw': 'https://jupiter.dial.to/api/v0/perps/earn/withdraw',
    },
    trustedHosts: ['jupiter.dial.to', 'jup.ag'],
  },
  
  raydium: {
    displayName: 'Raydium',
    category: 'amm',
    website: 'https://raydium.io',
    actions: {
      'swap': 'https://share.raydium.io/swap',
      'add-liquidity': 'https://share.raydium.io/liquidity/add',
      'remove-liquidity': 'https://share.raydium.io/liquidity/remove',
    },
    trustedHosts: ['share.raydium.io', 'raydium.dial.to'],
  },
  
  orca: {
    displayName: 'Orca',
    category: 'amm',
    website: 'https://orca.so',
    actions: {
      swap: 'https://orca.dial.to/api/v0/swap',
      'add-liquidity': 'https://orca.dial.to/api/v0/liquidity/add',
      'remove-liquidity': 'https://orca.dial.to/api/v0/liquidity/remove',
    },
    trustedHosts: ['orca.dial.to', 'orca.so'],
  },
  
  meteora: {
    displayName: 'Meteora',
    category: 'amm',
    website: 'https://meteora.ag',
    actions: {
      'add-liquidity': 'https://meteora.dial.to/api/v0/dlmm/add',
      'remove-liquidity': 'https://meteora.dial.to/api/v0/dlmm/remove',
    },
    trustedHosts: ['meteora.dial.to', 'app.meteora.ag'],
  },
  
  drift: {
    displayName: 'Drift Protocol',
    category: 'perps',
    website: 'https://drift.trade',
    actions: {
      'vault-deposit': 'https://app.drift.trade/api/actions/vault/deposit',
      'vault-withdraw': 'https://app.drift.trade/api/actions/vault/withdraw',
    },
    trustedHosts: ['app.drift.trade', 'drift.dial.to'],
  },
  
  lulo: {
    displayName: 'Lulo',
    category: 'yield',
    website: 'https://lulo.fi',
    actions: {
      deposit: 'https://blink.lulo.fi/api/actions/deposit',
      withdraw: 'https://blink.lulo.fi/api/actions/withdraw',
    },
    trustedHosts: ['blink.lulo.fi', 'lulo.dial.to'],
  },
  
  sanctum: {
    displayName: 'Sanctum',
    category: 'staking',
    website: 'https://sanctum.so',
    actions: {
      stake: 'https://sanctum.dial.to/api/v0/stake',
      unstake: 'https://sanctum.dial.to/api/v0/unstake',
    },
    trustedHosts: ['sanctum.dial.to', 'sanctum.so'],
  },
  
  jito: {
    displayName: 'Jito',
    category: 'staking',
    website: 'https://jito.network',
    actions: {
      stake: 'https://jito.dial.to/stake',
    },
    trustedHosts: ['jito.dial.to', 'jito.network'],
  },
  
  tensor: {
    displayName: 'Tensor',
    category: 'nft',
    website: 'https://tensor.trade',
    actions: {
      buy: 'https://tensor.dial.to/api/v0/buy',
      list: 'https://tensor.dial.to/api/v0/list',
    },
    trustedHosts: ['tensor.dial.to', 'tensor.trade'],
  },
  
  magiceden: {
    displayName: 'Magic Eden',
    category: 'nft',
    website: 'https://magiceden.io',
    actions: {
      buy: 'https://api-mainnet.magiceden.dev/v2/actions/buy',
    },
    trustedHosts: ['api-mainnet.magiceden.dev', 'magiceden.dev'],
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
