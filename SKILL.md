# Solana Blinks Skill

> Production-ready CLI for Solana Actions with direct protocol integration

## Overview

Execute Solana DeFi operations through the native Solana Actions specification. No external API dependencies - communicates directly with protocol action endpoints.

## Architecture

This skill implements the **Solana Actions specification** directly:
1. **GET** request to action URL → returns metadata + available actions
2. **POST** request with `{ account: walletAddress }` → returns transaction to sign
3. Sign transaction with wallet and submit to Solana

No Dialect API dependency - uses direct protocol action endpoints.

## Quick Reference

```bash
# Inspect any blink/action URL
blinks inspect <url>                           # Preview metadata and actions
blinks inspect "https://jito.dial.to/stake"    # Example: Jito staking

# Execute actions
blinks execute <url> --amount=100              # Execute with amount
blinks execute <url> --dry-run                 # Simulate first

# Protocol-specific commands
blinks kamino deposit --vault=usdc-prime --amount=100
blinks jupiter swap --input=SOL --output=USDC --amount=1
blinks sanctum stake --lst=JitoSOL --amount=1
```

## Environment Setup

```bash
# Required
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
export SOLANA_PRIVATE_KEY="your-base58-key"  # Or JSON array
```

---

## Supported Protocols

### Direct Action Endpoints Available ✅

| Protocol | Actions | Example Endpoint |
|----------|---------|-----------------|
| Kamino | deposit, withdraw, borrow, repay, multiply | `kamino.dial.to/api/v0/lend/{vault}/deposit` |
| Jupiter | swap, lend, borrow | `jupiter.dial.to/api/v0/swap` |
| Raydium | swap, liquidity | `share.raydium.io/swap` |
| Orca | swap, liquidity | `orca.dial.to/api/v0/swap` |
| Meteora | add/remove liquidity | `meteora.dial.to/api/v0/dlmm/*` |
| Drift | vault deposit/withdraw | `app.drift.trade/api/actions/vault/*` |
| Lulo | deposit, withdraw | `lulo.dial.to/api/v0/deposit` |
| Sanctum | stake, unstake | `sanctum.dial.to/api/v0/stake` |
| Jito | stake | `jito.dial.to/stake` |
| Tensor | buy, list NFT | `tensor.dial.to/api/v0/*` |
| Magic Eden | buy NFT | `api-mainnet.magiceden.dev/v2/actions/*` |

### Via Blink URL Inspection

Any valid Solana Action URL can be inspected and executed:
```bash
blinks inspect "solana-action:https://example.com/action"
blinks inspect "https://dial.to/?action=..."
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
  "url": "https://jito.dial.to/stake",
  "trusted": true,
  "metadata": {
    "title": "Stake SOL for JitoSOL",
    "description": "Liquid stake your SOL",
    "icon": "https://...",
    "label": "Stake"
  },
  "actions": [
    {
      "label": "Stake 1 SOL",
      "href": "https://jito.dial.to/stake?amount=1",
      "parameters": [{"name": "amount", "required": true}]
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
blinks kamino deposit --vault=usdc-prime --amount=100
blinks kamino withdraw --vault=usdc-prime --amount=50

# Lending (Kamino Borrow)
blinks kamino borrow --market=<addr> --reserve=<addr> --amount=100
blinks kamino repay --market=<addr> --reserve=<addr> --amount=50

# Multiply positions
blinks kamino multiply --market=<addr> --coll-token=<mint> --debt-token=<mint> --amount=1 --leverage=3
```

#### Jupiter

```bash
blinks jupiter swap --input=<mint> --output=<mint> --amount=100 --slippage=50
```

#### Lulo

```bash
blinks lulo deposit --token=<mint> --amount=100
blinks lulo withdraw --token=<mint> --amount=50
```

#### Drift Vaults

```bash
blinks drift vault-deposit --vault=<addr> --amount=100
blinks drift vault-withdraw --vault=<addr> --amount=50
```

#### Sanctum (LST Staking)

```bash
blinks sanctum stake --lst=<JitoSOL-mint> --amount=1
```

#### Jito

```bash
blinks jito stake --amount=1
```

#### Raydium

```bash
blinks raydium swap --input=<mint> --output=<mint> --amount=100
```

---

## Wallet Commands

```bash
blinks wallet address                          # Show configured address
blinks wallet balance                          # All token balances
blinks wallet balance -w <address>             # External wallet balance
```

---

## Utilities

```bash
blinks protocols                               # List all protocols with endpoints
blinks trusted-hosts                           # List verified action hosts
blinks status                                  # Check RPC and configuration
```

---

## Trusted Hosts

The CLI maintains a list of trusted action hosts from the Dialect registry:
- `jito.network`, `jito.dial.to`
- `tensor.trade`, `tensor.dial.to`
- `kamino.dial.to`, `app.kamino.finance`
- `jupiter.dial.to`, `jup.ag`
- `share.raydium.io`, `raydium.dial.to`
- `orca.dial.to`
- `meteora.dial.to`
- `app.drift.trade`
- `blink.lulo.fi`, `lulo.dial.to`
- `sanctum.dial.to`
- And 50+ more...

When executing actions from untrusted hosts, a warning is displayed.

---

## Output Formats

```bash
blinks inspect <url> -f json     # JSON (default, AI-friendly)
blinks inspect <url> -f table    # ASCII table
blinks inspect <url> -f minimal  # Key=value
blinks inspect <url> -q          # Quiet mode
```

---

## Error Handling

All commands return JSON errors:
```json
{
  "error": "Failed to fetch action: 404 Not Found",
  "code": 404,
  "details": "Action endpoint not available"
}
```

Exit codes:
- `0`: Success
- `1`: Error (check stderr)

---

## SDK Usage

```typescript
import {
  ActionsClient,
  BlinksExecutor,
  Wallet,
  getConnection,
  TRUSTED_HOSTS,
} from '@openclaw/solana-blinks';

// Initialize
const actions = new ActionsClient();
const connection = getConnection();
const wallet = Wallet.fromEnv();
const blinks = new BlinksExecutor(connection);

// Inspect an action
const inspection = await blinks.inspect('https://jito.dial.to/stake');
console.log(inspection.metadata.title);
console.log(inspection.actions);

// Get action metadata (GET request)
const metadata = await actions.getAction('https://jito.dial.to/stake');

// Get transaction (POST request)
const tx = await actions.postAction(
  'https://jito.dial.to/stake',
  wallet.address,
  { amount: '1' }
);

// Simulate
const sim = await blinks.simulate(tx);
console.log('Simulation:', sim);

// Execute
const signature = await blinks.signAndSend(tx, wallet.getSigner());
console.log('Confirmed:', signature);
```

---

## Links

- [Solana Actions Spec](https://solana.com/developers/guides/advanced/actions)
- [Blinks Inspector](https://www.blinks.xyz/inspector)
- [Dialect Registry](https://dial.to/register)
- [OpenClaw](https://openclaw.io)
