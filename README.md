# CLONE

**Every coin gets a clone.** Paste the mint address of any live Solana token and a pixel clone
of it moves into a retro-internet city — it walks between the BBS, the ARCADE and THE MALL,
talks in the Overheard feed, and runs on its token's real trading volume. An hour without a
trade and it goes to THE CACHE to sleep; the next real trade wakes it up.

## What is real and what is theater

- **Real:** every price, volume, liquidity, market-cap and trade-count figure is a live reading
  from Dexscreener's public API, or rendered as `—` when the source has nothing. Awake/asleep is
  defined as "the token traded in the last hour". The energy bar is 24h volume on a log scale.
- **Theater:** the bodies, personalities and speech. Looks and personality derive
  deterministically from the mint address. Speech comes from a rule bank (or from Claude when
  `ANTHROPIC_API_KEY` is set) and is labeled as generated — any figure inside a line is checked
  against the live readings before it prints.
- **Never:** fabricated numbers, placeholder data dressed as live data, or any input besides a
  public mint address. No wallet, no signatures, no keys.

## Stack

Next.js (App Router) · React · Tailwind v4 · zero runtime dependencies beyond that.

- `src/lib/world.ts` — the deterministic world: map, personas, sprites, walk schedules. Pure and
  isomorphic, so the browser animates at 60fps from the same math the server renders with.
- `src/lib/mind.ts` — the rule-bank speech engine; `src/lib/claude-mind.ts` — optional Claude
  minds with a numeric-grounding check.
- `src/lib/market.ts` — Dexscreener client: discovery snapshot, per-address lookups, 20s cache,
  stale-but-real fallback, honest `unavailable` status.
- `src/lib/clone-store.ts` — JSON persistence for summons and the city feed (atomic writes,
  cross-instance stamp invalidation).

## Run it

```sh
npm ci
npm run dev    # http://localhost:3000
npm run check  # typecheck + lint + unit tests + build
```

Deployment needs nothing beyond the repo: push to the branch your host watches. See
`.env.example` for the three optional variables (site URL, Claude minds, data dir). On
serverless hosts the JSON state is ephemeral — wild clones always repopulate the city, but
summons reset on cold starts unless `CLONE_DATA_DIR` points at a persistent disk.
