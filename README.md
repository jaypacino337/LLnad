# PumpXBT

**AI intelligence for Pump.fun.**

Track launches, wallet flow, market momentum, verified calls, and on-chain
activity in one live feed.

A light, crypto-native intelligence terminal: white page, black text, one mint
green carrying the emphasis. Dense tables, compact cards, mono for numbers only.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Dashboard: agent status, live market feed, agent feed, momentum, wallet flow, calls, treasury, Pro |
| `/signals` | Every active rule match, plus the full rule set with its thresholds |
| `/wallets` | Wallet and cluster flow |
| `/calls` | Call track record — entry, current and peak market cap |
| `/agent` | What is indexed, how signals are derived, and per-source live state |

## Data integrity

This is the part that matters most, so it is stated plainly.

**Nothing in this app is fabricated.** Every number rendered is a field returned
by a live API. There is no seed data, no sample rows, no placeholder metrics, and
no "AI confidence" that is not arithmetic.

When a source cannot be reached, the UI says so — source name and upstream
reason — and shows nothing else. `/api/market` and `/api/signals` return **503**
in that state rather than an empty success, so a monitor sees the truth.

### Signals are rules, not predictions

The agent feed runs six deterministic rules over live market fields. Each one is
a threshold, each entry quotes the figures it used, and the same snapshot always
produces the same output.

| Rule | Fires when |
| --- | --- |
| Volume acceleration | 1h volume ≥ 2x the average hour of the last six, and 1h volume > $5k |
| Momentum | 1h change ≥ +15% on top of a positive 6h change |
| Buy pressure | ≥66% of the last hour's trades are buys, over ≥40 trades |
| Sell pressure | ≥66% of the last hour's trades are sells, over ≥40 trades |
| Thin liquidity | Market cap ≥ 25x pooled liquidity |
| New launch | Pair under 6h old with > $10k traded in the last hour |

Strength is how far past its threshold a measurement sits. The UI labels these as
rules deliberately: the product does not claim an inference it cannot show the
arithmetic for.

## Sources

| Source | Credentials | Provides |
| --- | --- | --- |
| **Dexscreener** | **none** | Market feed, momentum, and every signal rule |
| Wallet flow | `HELIUS_API_KEY` | Per-wallet buys/sells and repeated-buyer clusters, fully implemented against Helius parsed swaps |
| Treasury | `TREASURY_WALLET`, `SOLANA_RPC_URL` | SOL and token balances over plain JSON-RPC (PnL is deliberately absent — it needs trade history) |
| Pro gating | `PUMPXBT_TOKEN_MINT`, `SOLANA_RPC_URL` | ed25519 wallet-signature verification plus an on-chain balance check |
| Calls publishing | `ADMIN_SECRET` | Operator-only publish/close on the track record |
| X autoposting | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` | Posts the strongest unposted signal |

**The market feed needs no credentials.** A fresh deploy has real data
immediately. Everything else renders an honest "needs `VAR`" state until
configured — wallet-level flow genuinely cannot be derived from Dexscreener,
which aggregates pairs rather than wallets.

Copy `.env.example` to `.env.local` to configure any of it.

## X autoposting

Conservative by design:

- nothing is sent unless all four X credentials are present;
- without them `/api/autopost` still runs and returns the composed post as a
  **dry run**, so a schedule can be validated before going live;
- a signal is posted at most once;
- only signals at strength ≥ 0.6 qualify;
- posts are composed from the same rules the UI shows, so the account never
  states something the site cannot substantiate;
- it refuses to post at all from a snapshot it could not fetch.

Driven by Vercel Cron (`vercel.json`). The schedule is **daily** because
Vercel's Hobby plan rejects deployments carrying more frequent crons; on a Pro
plan, raise it (e.g. `0 */2 * * *`). Set `CRON_SECRET` to require
`Authorization: Bearer <secret>`.

## API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/market` | Indexed markets and trending symbols. 503 when upstream is down |
| `GET` | `/api/signals` | Rule matches, tagged `kind: "deterministic-rules"` |
| `GET` | `/api/wallets` | Wallet flow rows and repeat-buyer clusters (needs `HELIUS_API_KEY`) |
| `GET` | `/api/treasury` | Treasury balances (needs `TREASURY_WALLET` + `SOLANA_RPC_URL`) |
| `GET` | `/api/calls` | The public track record, with return multiples |
| `POST`/`PATCH` | `/api/calls` | Publish or close a call. Requires `x-admin-key: $ADMIN_SECRET` |
| `POST` | `/api/pro/verify` | Wallet-signature holder verification; sets the Pro session cookie |
| `GET` | `/api/status` | Agent state and per-source configuration — good for uptime checks |
| `GET`/`POST` | `/api/autopost` | Cron entry point for X |

### Publishing a call

```bash
curl -X POST localhost:3000/api/calls \
  -H 'content-type: application/json' -H "x-admin-key: $ADMIN_SECRET" \
  -d '{"symbol":"TICKER","tokenAddress":"<mint>","entryMarketCap":120000}'
```

Open calls are refreshed against the market source on read; current and peak
market cap stay `null` until the source can be reached. The call store is a
JSON file under `PUMPXBT_DATA_DIR` — on serverless hosts the filesystem is
ephemeral, so production should mount storage there or swap `src/lib/calls.ts`
for a database.

### Pro unlock flow

1. the client signs `PumpXBT Pro verification\nwallet: <addr>\nts: <ms>` with
   Phantom (`window.solana.signMessage`);
2. `/api/pro/verify` checks the ed25519 signature (timestamp bounds replay),
   reads the wallet's PUMPXBT balance over RPC, and
3. a positive balance earns a 24h HttpOnly HMAC-signed cookie.

No dependency on web3.js — base58 and signature verification live in
`src/lib/solana.ts` on node:crypto.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
npm run lint
npx tsc --noEmit
```

Node 20+. Deploys to Vercel as-is.

## Design system

Components live in `src/components/ui.tsx` and compose everything: `Panel`,
`MetricCard`, `MetricGrid`, `SectionHeader`, `SignalBadge`, `Pill`, `Delta`,
`EmptyState`, `SourceUnavailable`, `TableSkeleton`, `LockedPanel`. Feature
components — `MarketTable`, `AgentFeed`, `TrendingList`, `AgentStatus` — build on
those rather than carrying their own styling.

Tables are real tables on desktop and stacked cards under `md`, so mobile never
scrolls sideways. Numbers use tabular figures so they do not jitter on refresh.
Animation is limited to one status pulse, a 0.22s row entrance, and hover states.

No webfonts: this build uses system stacks, which render instantly with no
layout shift.

## Brand assets

The mascot and banner activate automatically when committed:

| File | Used as |
| --- | --- |
| `public/brand/agent.png` | Header/footer mark and the hero mascot (square, transparent background works best) |
| `public/brand/banner.png` | The social share card (1200x630 or wider) |

Detection happens at build time (`next.config.ts`), so committing the files and
redeploying is the whole procedure — no code change, no env var. Until they
exist, an original geometric glyph (hooded silhouette + capsule) stands in, and
the social card falls back to a drawn brand layout. Neither card variant
carries metrics, so a cached share can never show stale numbers.
