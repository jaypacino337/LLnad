# Hood ST

**Paper trading league for Pump.fun.**

Every wallet gets a $10,000 paper balance. Long or short live Pump.fun markets
with up to 20x leverage — real prices, zero risk — and compete in daily, weekly
and monthly leagues ranked by return.

White page, black text, one mint green. Mono for numbers. No real funds, ever.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Markets, your account, today's league, live signals |
| `/trade` | Order ticket: side, margin, leverage, live entry and liquidation preview |
| `/leaderboard` | Daily / weekly / monthly leagues with reward-eligibility badges |
| `/portfolio` | Equity, open positions with close buttons, trade history |
| `/rules` | The five rules and the exact arithmetic |
| `/signals` | Deterministic rule matches over live market data |

## The game

- **$10,000** paper balance per wallet, created at first sign-in
- **Isolated margin**: minimum $10, up to 10 open positions
- **Leverage 1–20x**; a position liquidates when its loss reaches its margin
  (settled exactly at the liquidation price — the margin is lost, never more)
- **No fees, no funding** — stated, not hidden
- **Leagues** on UTC boundaries, ranked by *return over the period* (equity now
  vs equity when the period started), so late joiners start flat
- **Money settles in cents** at every realisation boundary

The full arithmetic is on `/rules` and implemented in `src/lib/game.ts` as pure
functions with tests over every branch, including exact liquidation-boundary
behaviour and ISO-week year rollovers.

## Data integrity

**No price is ever invented.** Fills, marks and liquidations all use live
prices from Dexscreener (no API key needed). When the source is unreachable:
trading pauses with an honest message, unpriced positions display escrowed
margin instead of a guessed PnL and cannot be closed, and the UI says exactly
what is down. Open positions stay priceable even after a token rotates out of
the discovery list via direct per-address lookups.

Signals are the same six deterministic rules as before — thresholds over
returned fields, each entry quoting its numbers, tagged
`kind: "deterministic-rules"` in the API.

## Identity and rewards

You are your wallet. Signing in = signing a short timestamped message with
Phantom; the server verifies the ed25519 signature (no web3.js — base58 and
verification live in `src/lib/solana.ts` on node:crypto) and issues an
HMAC-signed HttpOnly session cookie.

**Nothing here takes a private key.** Anything that asks for one is a scam.

League placement is open to everyone. Reward *payouts* are gated: set
`HOODST_TOKEN_MINT` (public mint address) and `HOODST_MIN_HOLD`, and each
sign-in checks the wallet's balance on-chain (public RPC by default), showing an
eligibility badge on the boards. Unconfigured gating fails closed — no badge for
anyone rather than a fake one.

## Configuration

Markets, trading and leagues need **no credentials at all.**

| Variable | Required | Purpose |
| --- | --- | --- |
| `HOODST_TOKEN_MINT` | for reward badges | Public mint of the reward token |
| `HOODST_MIN_HOLD` | optional (default 1) | Minimum holding for eligibility |
| `NEXT_PUBLIC_HOLD_SYMBOL` | optional | Ticker shown in copy (default `$HOODST`) |
| `SOLANA_RPC_URL` | optional | Dedicated RPC; defaults to the free public endpoint |
| `HOODST_SESSION_SECRET` | recommended | Sessions survive restarts |
| `HOODST_DATA_DIR` | production | Where `game.json` lives — see persistence below |
| `NEXT_PUBLIC_SITE_URL` | recommended | Absolute URLs in social cards |
| `X_API_KEY` `X_API_SECRET` `X_ACCESS_TOKEN` `X_ACCESS_TOKEN_SECRET` | for autoposting | Posts the strongest signal (daily cron) |
| `CRON_SECRET` | recommended | Locks `/api/autopost` |

**Persistence:** accounts live in one JSON document with atomic writes and
cross-instance reload. On serverless hosts the filesystem is ephemeral — fine
for trying it out, but real league standings need `HOODST_DATA_DIR` on mounted
storage or `src/lib/game-store.ts` reimplemented on a database. That module is
the only thing to swap.

## API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/market` | Tradeable markets. 503 when upstream is down |
| `GET` | `/api/signals` | Rule matches |
| `POST` | `/api/auth/verify` | Wallet-signature sign-in; sets the session cookie |
| `POST` | `/api/auth/logout` | Clears the session |
| `GET` | `/api/account` | Your account, marked to live prices (401 signed out) |
| `POST` | `/api/trade/open` | `{tokenAddress, symbol, side, marginUsd, leverage}` |
| `POST` | `/api/trade/close` | `{positionId}` — 503 rather than a made-up fill when unpriced |
| `GET` | `/api/leaderboard?period=daily\|weekly\|monthly` | Ranked rows with eligibility |
| `GET` | `/api/status` | Health: prices, players, gate, autopost |
| `GET`/`POST` | `/api/autopost` | Cron entry point for X |

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 52 tests: engine math, store, sessions, signals, OAuth vector
npm run check    # typecheck + lint + test + build
```

Node 20.9+. Deploys to Vercel as-is (daily cron is Hobby-plan safe).
