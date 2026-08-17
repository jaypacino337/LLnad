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
| Transaction indexer | `HELIUS_API_KEY` | Per-wallet buys/sells, buyer clusters, creator wallet movement |
| Treasury | `TREASURY_WALLET`, `SOLANA_RPC_URL` | Balance, deployed capital, positions, PnL |
| Pro gating | `PUMPXBT_TOKEN_MINT`, `SOLANA_RPC_URL` | Holder verification |
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

Driven by Vercel Cron (`vercel.json`, every 2 hours). Set `CRON_SECRET` to
require `Authorization: Bearer <secret>`.

## API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/market` | Indexed markets and trending symbols. 503 when upstream is down |
| `GET` | `/api/signals` | Rule matches, tagged `kind: "deterministic-rules"` |
| `GET` | `/api/status` | Agent state and per-source configuration — good for uptime checks |
| `GET`/`POST` | `/api/autopost` | Cron entry point for X |

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

## Notes

The agent mark in `src/components/brand-mark.tsx` and `src/app/icon.svg` is an
original geometric glyph — a hooded silhouette with the capsule motif — not a
reproduction of any existing character artwork.
