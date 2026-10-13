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
- **Never:** fabricated numbers, placeholder data dressed as live data, or a private-key input.
  Summoning takes one public mint address. $CLONE seats take a public wallet address and a public
  𝕏 post link; the only signature anywhere is the creator's Phantom `signMessage` to open seats.

## $CLONE residents

Seat holders of $CLONE get a **resident clone**: a pixel body seeded from their wallet that walks
the city with a cobalt badge and lives on $CLONE's real pulse. Seats are the memcoinz guest list,
ported: claim with an 𝕏 post carrying a wallet-bound code, one seat per wallet / 𝕏 account,
waitlist in post order, "sell it, lose it" sweeps from on-chain balances, creator-signed batches.
The shared flywheel pays seated wallets only. Until `CLONE_TOKEN_MINT` and friends are set, the
seats show "not open" and no figures. Launch + flywheel runbook: [`docs/TOKEN.md`](docs/TOKEN.md).

## Stack

Next.js (App Router) · React · Tailwind v4 · zero runtime dependencies beyond that (Supabase and
Solana RPC are plain `fetch`).

- `src/lib/world.ts` — the deterministic world: map, personas, sprites, walk schedules. Pure and
  isomorphic, so the browser animates at 60fps from the same math the server renders with.
- `src/lib/mind.ts` — the rule-bank speech engine; `src/lib/claude-mind.ts` — optional Claude
  minds with a numeric-grounding check.
- `src/lib/market.ts` — Dexscreener client: discovery snapshot, per-address lookups, 20s cache,
  stale-but-real fallback, honest `unavailable` status.
- `src/lib/clone-store.ts` — persistence for summons and the city feed: Supabase (versioned jsonb,
  optimistic locking) when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, else a JSON file.
- `src/lib/seats/` — the $CLONE guest list, ported from memcoinz: `core.ts` (rules), `store.ts`
  (Supabase / file), `chain.ts` (balances over JSON-RPC), API in `src/app/api/seats/*`.
- `supabase/schema.sql` — the two tables (`clone_city`, `seat_coins`), RLS on, no public policies.

## Run it

```sh
npm ci
npm run dev    # http://localhost:3000
npm run check  # typecheck + lint + unit tests + build
```

Deployment needs nothing beyond the repo: push to the branch your host watches. Every variable in
`.env.example` is optional. On serverless hosts set the two Supabase variables (after running
`supabase/schema.sql`), or summons and seats reset on cold starts. Locally, state lives in
`./.data` (or `CLONE_DATA_DIR`).
