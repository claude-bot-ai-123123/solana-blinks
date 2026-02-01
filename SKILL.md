# Solana Blinks Skill

> Production-ready CLI for Solana Actions with direct protocol integration

## Overview

Execute Solana DeFi operations through the native Solana Actions specification. Communicates directly with protocol action endpoints via the Dialect Standard Blinks Library.

## Architecture

This skill implements the **Solana Actions specification** directly:
1. **GET** request to action URL → returns metadata + available actions
2. **POST** request with `{ account: walletAddress, type: "transaction" }` → returns transaction to sign
3. Sign transaction with wallet and submit to Solana

**Data Sources:**
- **Actions Registry**: `https://actions-registry.dial.to/all` - 964+ trusted action hosts
- **Protocol Endpoints**: Direct `*.dial.to` subdomains for major protocols
- **Markets API**: Dialect's Standard Blinks Library for market data + blink URLs

## Quick Reference

```bash
# Inspect any blink/action URL
blinks inspect <url>                           # Preview metadata and actions
blinks inspect "https://kamino.dial.to/api/v0/lend/usdg-prime/deposit"

# Execute actions
blinks execute <url> --amount=100              # Execute with amount
blinks execute <url> --dry-run                 # Simulate first

# Protocol-specific commands
blinks kamino deposit --vault=usdc-prime --amount=100
blinks jupiter swap --input=SOL --output=USDC --amount=1
```

## Environment Setup

```bash
# Required
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
export SOLANA_PRIVATE_KEY="your-base58-key"  # Or JSON array
```

---

## Supported Protocols (via Dialect Blinks)

### Confirmed Working ✅

| Protocol | Host | Actions | Example |
|----------|------|---------|---------|
| **Kamino** | `kamino.dial.to` | lend, borrow, multiply | `/api/v0/lend/{vault}/deposit` |
| **Drift** | `app.drift.trade` | vault deposit/withdraw | `/api/blinks/deposit` |
| **Jito** | `jito.dial.to`, `jito.network` | stake | `/stake` |
| **Tensor** | `tensor.dial.to`, `tensor.trade` | buy-floor, bid | `/buy-floor/**` |

### Available (paths may vary)

| Protocol | Host(s) | Notes |
|----------|---------|-------|
| Jupiter | `jupiter.dial.to` | Swap, lend |
| Raydium | `share.raydium.io` | AMM swap/LP |
| Orca | `orca.dial.to` | Whirlpools |
| Meteora | `meteora.dial.to` | DLMM, bonding curves |
| MarginFi | `marginfi.dial.to` | Lending |
| Sanctum | `sanctum.dial.to` | LST staking |
| Lulo | `lulo.dial.to` | Yield aggregator |
| Helius | `helius.dial.to` | Staking |

### Registry Stats
- **964 trusted hosts** in the Dialect registry
- **10 known malicious hosts** (blocked)
- Many protocols have multiple entry points (dial.to + self-hosted)

---

## Blink URL Formats

The CLI supports multiple URL formats:

```bash
# Solana Action protocol
blinks inspect "solana-action:https://kamino.dial.to/api/v0/lend/usdc/deposit"

# Blink protocol (internal)
blinks inspect "blink:https://kamino.dial.to/api/v0/lend/usdc/deposit"

# dial.to interstitial
blinks inspect "https://dial.to/?action=solana-action:https://kamino.dial.to/..."

# Direct URL
blinks inspect "https://kamino.dial.to/api/v0/lend/usdc/deposit"
```

---

## Commands

### Inspect Action URL

Preview any blink URL before execution:

```bash
blinks inspect <url>
```

Returns:
```json
{
  "url": "https://kamino.dial.to/api/v0/lend/usdg-prime/deposit",
  "trusted": true,
  "metadata": {
    "title": "Deposit USDG in the USDG Prime on Kamino",
    "description": "Deposit USDG into the USDG Prime vault",
    "icon": "https://...",
    "label": "Deposit"
  },
  "actions": [
    { "label": "25%", "href": "/api/v0/lend/.../deposit?percentage=25" },
    { "label": "50%", "href": "/api/v0/lend/.../deposit?percentage=50" },
    { "label": "100%", "href": "/api/v0/lend/.../deposit?percentage=100" },
    { 
      "label": "Deposit", 
      "href": "/api/v0/lend/.../deposit?amount={amount}",
      "parameters": [{"name": "amount", "type": "number"}]
    }
  ]
}
```

### Execute Action

```bash
# Basic execution
blinks execute <url> --amount=100

# With custom params
blinks execute <url> -p '{"inputMint":"...", "outputMint":"...", "amount":"100"}'

# Dry run (simulation)
blinks execute <url> --amount=100 --dry-run
```

### Protocol Commands

#### Kamino Finance

```bash
# Yield vaults (Kamino Lend)
blinks kamino deposit --vault=usdg-prime --amount=100
blinks kamino withdraw --vault=usdg-prime --amount=50

# Lending (Kamino Borrow)
blinks kamino borrow --market=<addr> --reserve=<addr> --amount=100
blinks kamino repay --market=<addr> --reserve=<addr> --amount=50
```

#### Jito

```bash
blinks jito stake --amount=1
```

---

## SDK Usage

```typescript
import {
  ActionsClient,
  BlinksExecutor,
  Wallet,
  getConnection,
  getTrustedHosts,
  getRegistryStats,
  isHostTrusted,
  PROTOCOL_ACTION_ENDPOINTS,
} from '@openclaw/solana-blinks';

// Initialize
const actions = new ActionsClient();
const connection = getConnection();
const wallet = Wallet.fromEnv();
const blinks = new BlinksExecutor(connection);

// Check registry
const stats = await getRegistryStats();
console.log(`${stats.trustedCount} trusted hosts`);

// Validate a host
const trusted = await isHostTrusted('https://kamino.dial.to');

// Get action metadata (GET)
const metadata = await actions.getAction(
  'https://kamino.dial.to/api/v0/lend/usdg-prime/deposit'
);

// Get transaction (POST)
const tx = await actions.postAction(
  'https://kamino.dial.to/api/v0/lend/usdg-prime/deposit?amount=100',
  wallet.address
);

// Simulate
const sim = await blinks.simulate(tx);
if (!sim.success) {
  console.error('Simulation failed:', sim.error);
}

// Execute
const signature = await blinks.signAndSend(tx, wallet.getSigner());
console.log('Confirmed:', signature);
```

### Using Protocol Handlers

```typescript
import { KaminoHandler, ActionsClient, BlinksExecutor, getConnection } from '@openclaw/solana-blinks';

const connection = getConnection();
const actionsClient = new ActionsClient();
const blinks = new BlinksExecutor(connection);
const kamino = new KaminoHandler(actionsClient, blinks);

// Deposit to Kamino vault
const tx = await kamino.getDepositTransaction(
  'usdg-prime',
  walletAddress,
  '100'
);
```

---

## Registry API

Fetch trusted hosts from the Dialect registry:

```typescript
import { 
  getTrustedHosts, 
  isHostTrusted, 
  isHostMalicious,
  getProtocolHosts,
  getRegistryStats,
  clearRegistryCache 
} from '@openclaw/solana-blinks';

// Get all trusted hosts (cached for 1 hour)
const hosts = await getTrustedHosts();
console.log(`${hosts.size} trusted hosts`);

// Check specific URL
const isTrusted = await isHostTrusted('https://kamino.dial.to');
const isMalicious = await isHostMalicious('https://fake-site.com');

// Get hosts for a protocol
const kaminoHosts = await getProtocolHosts('kamino');
// ['kamino.dial.to']

const meteoraHosts = await getProtocolHosts('meteora');
// ['meteora.dial.to', 'meteorafarmer.shop']
```

---

## Action Endpoints Reference

### Kamino (Confirmed Working)

```
GET  https://kamino.dial.to/api/v0/lend/{vault}/deposit
GET  https://kamino.dial.to/api/v0/lend/{vault}/withdraw
POST https://kamino.dial.to/api/v0/lend/{vault}/deposit?amount={amount}
     Body: { "account": "...", "type": "transaction" }
```

Vault slugs: `usdg-prime`, `usdc-main`, `sol-main`, etc.

### Jito

```
GET  https://jito.dial.to/stake
POST https://jito.dial.to/stake
     Body: { "account": "...", "type": "transaction" }
```

### Drift

```
GET  https://app.drift.trade/api/blinks/deposit
POST https://app.drift.trade/api/blinks/deposit
```

### Tensor

```
https://tensor.dial.to/buy-floor/**
https://tensor.dial.to/bid/**
```

---

## Troubleshooting

### Cloudflare Blocking
Some dial.to endpoints block server IPs via Cloudflare. Affected:
- `sanctum.dial.to`
- `jito.dial.to` (sometimes)

**Workaround**: Use self-hosted endpoints when available (e.g., `jito.network`).

### 422 Unprocessable Content
Usually means the wallet doesn't have the required tokens. Check balances before executing.

### 400 Bad Request
Some endpoints require `type: "transaction"` in the POST body. The SDK includes this automatically.

---

## Links

- [Solana Actions Spec](https://solana.com/developers/guides/advanced/actions)
- [Dialect Registry](https://actions-registry.dial.to/all)
- [Dialect Docs](https://docs.dialect.to)
- [Blinks Inspector](https://www.blinks.xyz/inspector)
