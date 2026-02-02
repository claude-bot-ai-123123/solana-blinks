---
name: solana-defi-agent
description: DeFi toolkit for AI agents on Solana — swaps, lending, staking via Solana Actions/Blinks
---

# Solana DeFi Agent Skill

> DeFi toolkit for AI agents on Solana — swaps, lending, staking, and more

**New here?** → Start with [QUICKSTART.md](./QUICKSTART.md) for a 10-minute setup guide.

---

## What This Does

Solana Blinks (Blockchain Links) let you execute DeFi operations—swaps, deposits, staking—through simple URLs. This skill gives you:

- **CLI** for quick operations: `blinks execute <url> --amount=100`
- **SDK** for building automations
- **Registry access** to 900+ trusted protocol endpoints

```bash
# Example: Deposit USDC to Kamino yield vault
blinks execute "https://kamino.dial.to/api/v0/lend/usdc-prime/deposit" --amount=100
```

---

## ⚠️ Before You Start

### Required
- [ ] Solana wallet keypair file (see [QUICKSTART.md](./QUICKSTART.md#step-1-create-a-solana-wallet))
- [ ] SOL for transaction fees (~0.01 SOL / $2 minimum)
- [ ] Node.js 18+

### Environment Variables
```bash
# .env file
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_PATH=~/.config/solana/my-wallet.json
```

### 🔒 Security
- **Never commit keypairs to git** - use `.env` and `.gitignore`
- **Test with small amounts first** - mistakes happen
- **Verify hosts are trusted** - CLI warns about untrusted hosts
- **Use a dedicated wallet** - not your main holdings

---

## Protocol Status (Updated 2026-02-02)

### ✅ Working (7 protocols)

| Protocol | Actions | Endpoint | Token Flexibility |
|----------|---------|----------|-------------------|
| **Jupiter** | Swap any tokens | `worker.jup.ag` | ✅ Any verified token |
| **Raydium** | Swap, LP | `share.raydium.io` | ✅ Any token by mint |
| **Kamino** | Deposit, withdraw, borrow | `kamino.dial.to` | 10 vaults available |
| **Jito** | Stake SOL → jitoSOL | `jito.network` | SOL only |
| **Tensor** | Buy floor, bid NFTs | `tensor.dial.to` | Any collection |
| **Drift** | Vault deposit/withdraw | `app.drift.trade` | Multiple vaults |
| **Magic Eden** | Buy NFTs, launchpad mint | `api-mainnet.magiceden.dev` | Any listed NFT |

### 🔑 Needs API Key

| Protocol | Get Key | Notes |
|----------|---------|-------|
| **Lulo** | [dev.lulo.fi](https://dev.lulo.fi) | 24hr withdrawal cooldown |

### ⚠️ Web-Only (Cloudflare blocked)

| Protocol | Issue | Workaround |
|----------|-------|------------|
| **Meteora** | API returns 404 from servers | Use browser / dial.to |
| **MarginFi** | No public API found | Use their web UI |
| **Sanctum** | Cloudflare blocks datacenter IPs | Use their web UI |
| **Orca** | No public blink API | Use Jupiter or Raydium |

---

## Token & Market Discovery (NEW)

### Find Any Token

```bash
# List 25+ common tokens with mint addresses
blinks tokens list

# Resolve symbol to mint
blinks tokens resolve BONK
# → DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263

# Search all verified tokens (network call)
blinks tokens search "dog"
# → WIF, MYRO, etc.
```

### Available Vaults

```bash
# Kamino lending vaults
blinks vaults kamino
# → usdc-prime, sol-main, jitosol-main, etc.
```

### Build URLs for Any Token

```bash
# Swap SOL → any token (Jupiter)
blinks build swap --from SOL --to WIF
blinks build swap --from SOL --to BONK --amount 1

# Swap with Raydium (requires amount)
blinks build swap --from SOL --to JUP --amount 0.5 --protocol raydium

# Kamino deposit/withdraw
blinks build deposit --vault usdc-prime --amount 100
blinks build withdraw --vault sol-main

# Jito staking
blinks build stake --amount 2

# NFT purchases
blinks build nft-buy --mint <nft-mint-address>
blinks build nft-buy --mint madlads --protocol tensor
```

### Common Token Mints

| Symbol | Mint Address |
|--------|--------------|
| SOL | `So11111111111111111111111111111111111111112` |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |
| jitoSOL | `J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn` |
| JUP | `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN` |
| BONK | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` |
| WIF | `EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm` |

Use `blinks tokens list` for the full list of 25+ tokens.

---

## Quick Reference

### Inspect Before Executing

Always preview what a blink does:

```bash
blinks inspect <url>
```

Shows metadata, available actions, and trust status.

### Execute Transactions

```bash
# Dry run first (simulates without sending)
blinks execute <url> --amount=100 --dry-run

# Execute for real
blinks execute <url> --amount=100
```

### Protocol-Specific Commands

```bash
# Kamino
blinks kamino deposit --vault=usdc-prime --amount=100
blinks kamino withdraw --vault=usdc-prime --amount=50

# Jito
blinks jito stake --amount=1

# Generic (any blink URL)
blinks execute "https://..." --amount=X
```

---

## SDK Usage

### Basic Execution

```typescript
import {
  ActionsClient,
  BlinksExecutor,
  Wallet,
  getConnection,
  isHostTrusted,
} from '@openclaw/solana-defi-agent-skill';

// Initialize
const connection = getConnection();
const wallet = Wallet.fromEnv();
const actions = new ActionsClient();
const executor = new BlinksExecutor(connection);

// 1. Check if host is trusted
const trusted = await isHostTrusted('https://kamino.dial.to');
if (!trusted) throw new Error('Untrusted host!');

// 2. Get action metadata
const metadata = await actions.getAction(
  'https://kamino.dial.to/api/v0/lend/usdc-prime/deposit'
);
console.log('Available actions:', metadata.links.actions);

// 3. Get transaction
const tx = await actions.postAction(
  'https://kamino.dial.to/api/v0/lend/usdc-prime/deposit?amount=100',
  wallet.address
);

// 4. Simulate first
const sim = await executor.simulate(tx);
if (!sim.success) {
  throw new Error(`Simulation failed: ${sim.error}`);
}

// 5. Execute
const signature = await executor.signAndSend(tx, wallet.getSigner());
console.log('Success:', `https://solscan.io/tx/${signature}`);
```

### Token Discovery & URL Building

```typescript
import {
  // Token discovery
  COMMON_TOKENS,
  resolveTokenMint,
  searchToken,
  getJupiterTokenList,
  
  // Vault discovery
  getKaminoLendVaults,
  
  // URL builders (any token support)
  buildJupiterSwapUrl,
  buildRaydiumSwapUrl,
  buildKaminoDepositUrl,
  buildMagicEdenBuyUrl,
} from '@openclaw/solana-defi-agent-skill';

// Get mint address for any token
const bonkMint = COMMON_TOKENS.BONK;  // Known tokens
const anyMint = resolveTokenMint('JUP');  // Resolve symbol → mint

// Search for tokens
const dogTokens = await searchToken('dog');  // WIF, MYRO, etc.

// Build swap URL for any token pair
const swapUrl = buildJupiterSwapUrl('SOL', 'BONK', 1);
// → https://worker.jup.ag/blinks/swap/So111.../DezXA.../1

// Works with symbols OR mint addresses
const swapUrl2 = buildJupiterSwapUrl(
  'So11111111111111111111111111111111111111112',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  0.5
);

// Get available vaults
const vaults = getKaminoLendVaults();
// → [{ slug: 'usdc-prime', name: 'USDC Prime', token: 'USDC' }, ...]

// Build NFT buy URL
const nftUrl = buildMagicEdenBuyUrl('GtQJmmYe...');
```

---

## How Blinks Work

1. **GET** request to action URL → Returns metadata + available actions
2. **POST** request with wallet address → Returns transaction to sign
3. Sign transaction locally and submit to Solana

```
User → GET blink URL → Protocol returns actions
User → POST with wallet → Protocol returns transaction
User → Sign & submit → Transaction confirmed
```

The skill handles all of this. You just provide the URL and amount.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `422 Unprocessable Entity` | Missing required tokens | Check token balance before deposit |
| `403 Forbidden` | Cloudflare blocking | Try protocol's self-hosted endpoint |
| `Transaction simulation failed` | Insufficient SOL or stale tx | Check balance, retry quickly |
| `Rate limit exceeded` | Public RPC overloaded | Use Helius/QuickNode free tier |
| `Untrusted host warning` | Host not in Dialect registry | Verify URL is correct |

---

## Blink URL Formats

The CLI accepts multiple formats:

```bash
# Direct URL (recommended)
blinks inspect "https://kamino.dial.to/api/v0/lend/usdc/deposit"

# Solana Action protocol
blinks inspect "solana-action:https://kamino.dial.to/..."

# dial.to interstitial
blinks inspect "https://dial.to/?action=solana-action:https://..."
```

---

## RPC Recommendations

| Provider | Free Tier | Link |
|----------|-----------|------|
| **Helius** | 100k req/day | [helius.dev](https://helius.dev) |
| **QuickNode** | 10M credits | [quicknode.com](https://quicknode.com) |
| **Alchemy** | 300M CU | [alchemy.com](https://alchemy.com) |
| **Public** | Rate limited | `api.mainnet-beta.solana.com` |

Public works for testing but will hit rate limits in production.

---

## Files

```
solana-defi-agent-skill/
├── SKILL.md           # This file
├── QUICKSTART.md      # Beginner setup guide
├── README.md          # Package readme
├── .env.example       # Environment template
├── src/               # Source code
├── dist/              # Built CLI + SDK
├── docs/              # Protocol status, specs
└── tests/             # Protocol endpoint tests
```

---

## Links

- [QUICKSTART.md](./QUICKSTART.md) - Get started in 10 minutes
- [Solana Actions Spec](https://solana.com/developers/guides/advanced/actions)
- [Dialect Registry](https://actions-registry.dial.to/all) - 900+ trusted hosts
- [Blinks Inspector](https://www.blinks.xyz/inspector) - Visual blink tester
