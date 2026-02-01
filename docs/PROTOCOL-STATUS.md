# Protocol Endpoint Status

Last tested: 2026-02-01

## Summary

| Status | Count |
|--------|-------|
| ✅ Working | 3 |
| ⚠️ Partial | 3 |
| 🔒 Cloudflare Blocked | 2 |
| ❌ Not Working | 6 |

## Detailed Status

### ✅ Fully Working

#### Kamino (`kamino.dial.to`)
- **GET** `/api/v0/lend/{vault}/deposit` → Returns action metadata
- **GET** `/api/v0/lend/{vault}/withdraw` → Returns action metadata
- **POST** with `{ account, type: "transaction" }` → Returns transaction
- **Vaults**: `usdg-prime`, `usdc-main`, `sol-main`, etc.
- **Status**: Production ready

#### Tensor (`tensor.trade`, `tensor.dial.to`)
- **actions.json** routes `/trade/**` → `tensor.dial.to/buy-floor/**`
- **actions.json** routes `/item/**` → `tensor.dial.to/bid/**`
- **Status**: Working (NFT-specific, needs collection/item params)

#### Jito (`jito.network`)
- **actions.json** routes `/` → `jito.dial.to/stake`
- **Status**: Routing works, but dial.to endpoint blocked by Cloudflare

---

### ⚠️ Partial / Needs Discovery

#### Meteora (`meteora.dial.to`)
- **actions.json** exists with 4 rules:
  - `/*` → `/api/*`
  - `/api/**` → `/api/**`
  - `/bonding-curve/**` → `/api/bonding-curve/**`
  - `/dlmm/**` → `/api/dlmm/**`
- **Issue**: Paths return 404. Likely need specific pool IDs.
- **Next**: Try `/api/dlmm/{poolAddress}/add-liquidity`

#### Drift (`app.drift.trade`)
- **actions.json** exists with 2 rules:
  - `/deposit` → `/api/blinks/deposit`
  - `/elections` → `/api/blinks/elections`
- **Issue**: `/api/blinks/deposit` returns 500 Internal Server Error
- **Status**: Endpoint exists but broken

#### Raydium (`share.raydium.io`)
- **No actions.json** found (404)
- **Issue**: Need to discover correct endpoints
- **Next**: Check if specific swap URL patterns work

---

### 🔒 Cloudflare Blocked (Server IPs)

#### Sanctum (`sanctum.dial.to`)
- Returns 403 Forbidden from server IPs
- Works from browser

#### Jito (`jito.dial.to`)
- Returns 403 Forbidden from server IPs
- Self-hosted `jito.network` routes here but also blocked

---

### ❌ Not Working / Unknown Paths

#### Jupiter (`jupiter.dial.to`)
- All tested paths return 404:
  - `/swap`, `/api/swap`, `/api/v0/swap`, `/api/v1/swap`
  - `/perps`, `/api/perps/earn/deposit`
- **Issue**: Endpoint structure unknown

#### Orca (`orca.dial.to`)
- All tested paths return 404
- **Issue**: Endpoint structure unknown

#### MarginFi (`marginfi.dial.to`)
- All tested paths return 404
- **Issue**: Endpoint structure unknown

#### Lulo (`lulo.dial.to`, `blink.lulo.fi`)
- `lulo.dial.to`: 404 on all paths
- `blink.lulo.fi`: SSL certificate error (526)
- **Issue**: Both endpoints broken

#### Helius (`helius.dial.to`)
- Returns 403 Forbidden
- **Issue**: Access denied

#### Magic Eden (`api-mainnet.magiceden.dev`)
- Returns 400 Bad Request
- **Issue**: Needs specific item/collection parameters

---

## Test Commands

```bash
# Run all protocol tests
npx vitest run tests/protocols.test.ts

# Run endpoint discovery
npx vitest run tests/discover-paths.test.ts

# Test specific protocol
npx vitest run tests/protocols.test.ts -t "kamino"
```

## Registry Stats

- **Trusted hosts**: 964
- **Malicious hosts**: 10
- **Registry URL**: https://actions-registry.dial.to/all

## Notes

1. **Cloudflare blocking**: Many dial.to subdomains block server IPs. Works fine from browsers.

2. **Path discovery needed**: Most protocols don't have documented API paths. Kamino is the exception.

3. **Parameter requirements**: Many endpoints likely need specific parameters (pool IDs, token addresses) that aren't discoverable without docs.

4. **Dialect Markets API**: Alternative approach - use the Markets API to get pre-built blink URLs for supported protocols.
