/**
 * Markets & Token Discovery
 * 
 * Two main parts:
 * 1. Dialect Markets API Client - fetch market data and blink URLs
 * 2. Token Discovery - find tokens, vaults, and build swap URLs
 */

import type { Market, Position, ProtocolId, MarketType, YieldMarket } from '../types/index.js';

// ============================================
// Part 1: Dialect Markets API Client
// ============================================

const MARKETS_API_BASE = 'https://api.dialect.to/v1';

/**
 * Market data from the Dialect API
 */
export interface DialectMarket {
  id: string;
  type: MarketType;
  productName?: string;
  provider: {
    id: string;
    name: string;
    icon: string;
  };
  token: {
    address: string;
    symbol: string;
    decimals: number;
    icon: string;
  };
  borrowToken?: {
    address: string;
    symbol: string;
    decimals: number;
    icon: string;
  };
  websiteUrl: string;
  depositApy: number;
  baseDepositApy: number;
  baseDepositApy30d?: number;
  baseDepositApy90d?: number;
  baseDepositApy180d?: number;
  borrowApy?: number;
  baseBorrowApy?: number;
  totalDeposit: number;
  totalDepositUsd: number;
  totalBorrow?: number;
  totalBorrowUsd?: number;
  maxDeposit?: number;
  maxBorrow?: number;
  rewards?: Array<{
    type: string;
    apy: number;
    token: {
      address: string;
      symbol: string;
      decimals: number;
      icon: string;
    };
    marketAction: string;
  }>;
  maxLtv?: number;
  liquidationLtv?: number;
  liquidationPenalty?: number;
  additionalData?: Record<string, unknown>;
  actions: {
    deposit?: { blinkUrl: string };
    withdraw?: { blinkUrl: string };
    borrow?: { blinkUrl: string };
    repay?: { blinkUrl: string };
    claimRewards?: { blinkUrl: string };
  };
}

/**
 * Position data from the Dialect API
 */
export interface DialectPosition {
  id: string;
  marketId: string;
  market: DialectMarket;
  walletAddress: string;
  depositedAmount: number;
  depositedAmountUsd: number;
  borrowedAmount?: number;
  borrowedAmountUsd?: number;
  healthFactor?: number;
  accumulatedYield?: number;
  accumulatedYieldUsd?: number;
  rewards?: Array<{
    token: {
      address: string;
      symbol: string;
    };
    amount: number;
    amountUsd: number;
  }>;
}

export interface MarketsResponse {
  markets: DialectMarket[];
}

export interface PositionsResponse {
  positions: DialectPosition[];
}

/**
 * Markets API Client
 */
export class MarketsClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options?: { baseUrl?: string; timeout?: number }) {
    this.baseUrl = options?.baseUrl || MARKETS_API_BASE;
    this.timeout = options?.timeout || 30000;
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SolanaBlinksSDK/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Markets API error: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async listMarkets(options?: {
    provider?: ProtocolId;
    type?: MarketType;
    token?: string;
    limit?: number;
  }): Promise<DialectMarket[]> {
    const params: Record<string, string> = {};
    if (options?.provider) params.provider = options.provider;
    if (options?.type) params.type = options.type;
    if (options?.token) params.token = options.token;
    if (options?.limit) params.limit = String(options.limit);

    const response = await this.fetch<MarketsResponse>('/markets', params);
    return response.markets;
  }

  async getPositions(walletAddress: string, options?: {
    provider?: ProtocolId;
    type?: MarketType;
  }): Promise<DialectPosition[]> {
    const params: Record<string, string> = { wallet: walletAddress };
    if (options?.provider) params.provider = options.provider;
    if (options?.type) params.type = options.type;

    const response = await this.fetch<PositionsResponse>('/positions', params);
    return response.positions;
  }

  async findBestYield(tokenSymbol: string, options?: {
    minApy?: number;
    minTvl?: number;
    providers?: ProtocolId[];
  }): Promise<DialectMarket[]> {
    const markets = await this.listMarkets({
      token: tokenSymbol,
      type: 'yield',
    });

    return markets
      .filter(m => {
        if (options?.minApy && m.depositApy < options.minApy) return false;
        if (options?.minTvl && m.totalDepositUsd < options.minTvl) return false;
        if (options?.providers && !options.providers.includes(m.provider.id as ProtocolId)) return false;
        return true;
      })
      .sort((a, b) => b.depositApy - a.depositApy);
  }

  getBlinkUrl(market: DialectMarket, action: 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'claimRewards'): string | null {
    const actionData = market.actions[action];
    if (!actionData) return null;
    const blinkUrl = actionData.blinkUrl;
    return blinkUrl.startsWith('blink:') ? blinkUrl.slice(6) : blinkUrl;
  }
}

export function createMarketsClient(options?: { baseUrl?: string; timeout?: number }): MarketsClient {
  return new MarketsClient(options);
}

export async function getMarkets(options?: {
  provider?: ProtocolId;
  type?: MarketType;
  token?: string;
}): Promise<DialectMarket[]> {
  const client = createMarketsClient();
  return client.listMarkets(options);
}

export async function getPositions(walletAddress: string): Promise<DialectPosition[]> {
  const client = createMarketsClient();
  return client.getPositions(walletAddress);
}

export async function findBestYield(tokenSymbol: string): Promise<DialectMarket[]> {
  const client = createMarketsClient();
  return client.findBestYield(tokenSymbol);
}

// ============================================
// Part 2: Token Discovery & URL Builders
// ============================================

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

/**
 * Common token mint addresses for quick reference
 */
export const COMMON_TOKENS: Record<string, string> = {
  // Native
  SOL: 'So11111111111111111111111111111111111111112',
  
  // Stablecoins
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  PYUSD: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
  UXD: '7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT',
  
  // LSTs
  jitoSOL: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  mSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  bSOL: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
  INF: '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm',
  
  // DeFi
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  MNDE: 'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey',
  JLP: '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4',
  
  // Meme
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  POPCAT: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  MYRO: 'HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4',
  
  // Infrastructure  
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  HNT: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux',
  RENDER: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
  W: '85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ',
};

/**
 * Resolve a token symbol or mint to a mint address
 */
export function resolveTokenMint(tokenOrMint: string): string {
  // If it's a known symbol, return the mint
  const upper = tokenOrMint.toUpperCase();
  if (COMMON_TOKENS[upper]) {
    return COMMON_TOKENS[upper];
  }
  // Otherwise assume it's already a mint address
  return tokenOrMint;
}

/**
 * Get Jupiter token list (verified tokens)
 */
export async function getJupiterTokenList(type: 'strict' | 'all' = 'strict'): Promise<Token[]> {
  const url = type === 'strict' 
    ? 'https://token.jup.ag/strict'
    : 'https://token.jup.ag/all';
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Jupiter token list: ${response.status}`);
  }
  
  return response.json() as Promise<Token[]>;
}

/**
 * Search for a token by symbol or name
 */
export async function searchToken(query: string): Promise<Token[]> {
  const tokens = await getJupiterTokenList('strict');
  const q = query.toLowerCase();
  
  return tokens.filter(t => 
    t.symbol.toLowerCase().includes(q) ||
    t.name.toLowerCase().includes(q) ||
    t.address.toLowerCase() === q
  ).slice(0, 20);
}

// ============================================
// Kamino Vaults
// ============================================

export const KAMINO_LEND_VAULTS: Record<string, { name: string; token: string }> = {
  'usdc-prime': { name: 'USDC Prime', token: 'USDC' },
  'usdc-main': { name: 'USDC Main', token: 'USDC' },
  'sol-main': { name: 'SOL Main', token: 'SOL' },
  'sol-jlp': { name: 'SOL JLP', token: 'SOL' },
  'jlp-core': { name: 'JLP Core', token: 'JLP' },
  'usdt-main': { name: 'USDT Main', token: 'USDT' },
  'jitosol-main': { name: 'jitoSOL Main', token: 'jitoSOL' },
  'msol-main': { name: 'mSOL Main', token: 'mSOL' },
  'bsol-main': { name: 'bSOL Main', token: 'bSOL' },
  'pyusd-main': { name: 'PYUSD Main', token: 'PYUSD' },
};

export function getKaminoLendVaults(): Array<{ slug: string; name: string; token: string }> {
  return Object.entries(KAMINO_LEND_VAULTS).map(([slug, info]) => ({
    slug,
    ...info,
  }));
}

// ============================================
// URL Builders - Any Token Support
// ============================================

/**
 * Build a Jupiter swap URL - supports ANY verified token
 * @param inputToken - Symbol (SOL, USDC) or mint address
 * @param outputToken - Symbol or mint address
 * @param amount - Optional amount to swap
 */
export function buildJupiterSwapUrl(
  inputToken: string, 
  outputToken: string, 
  amount?: number
): string {
  const base = 'https://worker.jup.ag/blinks/swap';
  
  // Check if both are known symbols for cleaner URL
  const inputUpper = inputToken.toUpperCase();
  const outputUpper = outputToken.toUpperCase();
  
  if (COMMON_TOKENS[inputUpper] && COMMON_TOKENS[outputUpper]) {
    // Use symbol format: SOL-USDC
    if (amount) {
      const inputMint = COMMON_TOKENS[inputUpper];
      const outputMint = COMMON_TOKENS[outputUpper];
      return `${base}/${inputMint}/${outputMint}/${amount}`;
    }
    return `${base}/${inputUpper}-${outputUpper}`;
  }
  
  // Use mint addresses
  const inputMint = resolveTokenMint(inputToken);
  const outputMint = resolveTokenMint(outputToken);
  
  if (amount) {
    return `${base}/${inputMint}/${outputMint}/${amount}`;
  }
  return `${base}/${inputMint}-${outputMint}`;
}

/**
 * Build a Raydium swap URL - supports ANY token by mint
 * @param inputMint - Input token (symbol or mint)
 * @param outputMint - Output token (symbol or mint)
 * @param amount - Amount to swap
 */
export function buildRaydiumSwapUrl(
  inputMint: string,
  outputMint: string,
  amount: number
): string {
  const input = resolveTokenMint(inputMint);
  const output = resolveTokenMint(outputMint);
  return `https://share.raydium.io/dialect/actions/swap/tx?inputMint=${input}&outputMint=${output}&amount=${amount}`;
}

/**
 * Build a Kamino deposit URL
 */
export function buildKaminoDepositUrl(vaultSlug: string, amount?: number): string {
  const base = `https://kamino.dial.to/api/v0/lend/${vaultSlug}/deposit`;
  return amount ? `${base}?amount=${amount}` : base;
}

/**
 * Build a Kamino withdraw URL
 */
export function buildKaminoWithdrawUrl(vaultSlug: string, amount?: number): string {
  const base = `https://kamino.dial.to/api/v0/lend/${vaultSlug}/withdraw`;
  return amount ? `${base}?amount=${amount}` : base;
}

/**
 * Build a Jito stake URL
 */
export function buildJitoStakeUrl(amount?: number): string {
  if (amount) {
    return `https://jito.network/stake/amount/${amount}`;
  }
  return 'https://jito.network/stake';
}

/**
 * Build a Magic Eden buy URL
 */
export function buildMagicEdenBuyUrl(nftMint: string): string {
  return `https://api-mainnet.magiceden.dev/actions/buyNow/${nftMint}`;
}

/**
 * Build a Tensor floor buy URL
 */
export function buildTensorBuyFloorUrl(collection: string): string {
  return `https://tensor.dial.to/buy-floor/${collection}`;
}

// ============================================
// Exports
// ============================================

export default {
  // Dialect Markets API
  MarketsClient,
  createMarketsClient,
  getMarkets,
  getPositions,
  findBestYield,
  
  // Token discovery
  COMMON_TOKENS,
  resolveTokenMint,
  getJupiterTokenList,
  searchToken,
  
  // Vaults
  KAMINO_LEND_VAULTS,
  getKaminoLendVaults,
  
  // URL builders
  buildJupiterSwapUrl,
  buildRaydiumSwapUrl,
  buildKaminoDepositUrl,
  buildKaminoWithdrawUrl,
  buildJitoStakeUrl,
  buildMagicEdenBuyUrl,
  buildTensorBuyFloorUrl,
};
