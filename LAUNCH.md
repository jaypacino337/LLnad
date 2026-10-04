# Launching CLONE

The site works with zero configuration: deploy the repo and the city populates itself with wild
clones of the most-traded live Solana markets.

## Deploy

1. Point your host (e.g. Vercel) at this repository's default branch. Every push deploys.
2. That's it. No env vars are required.

## Optional configuration (host env vars)

| Variable | Effect when set |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for social cards and metadata. |
| `ANTHROPIC_API_KEY` | Clone speech is written by Claude (Haiku) instead of the rule bank. Lines stay grounded: any figure Claude writes is checked against the live readings, and ungrounded lines are discarded. Costs a few short calls per awake clone per hour. |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Durable state (summons, feed, $CLONE seats) in Supabase. Run `supabase/schema.sql` in the project's SQL editor first. Server-only: never `NEXT_PUBLIC_`. **Needed on Vercel**, whose disk is ephemeral. |
| `CLONE_DATA_DIR` | File-backend directory when Supabase is not set. Unset, it is `./.data` (fine locally, ephemeral on serverless). |
| `CLONE_TOKEN_MINT`, `CLONE_TOKEN_CREATOR`, `CLONE_X_HANDLE`, `CLONE_SEAT_CAP`, `CLONE_SEAT_MIN_HOLD` | Open $CLONE seats (residents). All five required; see `docs/TOKEN.md`. |
| `SOLANA_RPC_URL` | RPC for seat sweeps. Unset, Solana's public RPC (rate limited). |

## ⚠️ Keys

There is no private-key input anywhere in this product and none must ever be added. User input is
public: a token mint address, a wallet address and an 𝕏 post link (seats). The creator opens seat
batches with a Phantom `signMessage`; only the signature reaches the server. Server secrets
(`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, an RPC URL with an API key) are host env vars —
never commit them, never prefix them `NEXT_PUBLIC_`. The flywheel's creator key lives only in the
Railway worker (memcoinz), never here.

## Verifying a deploy

- `/api/status` — source health, mind mode (claude/rules), store backend, seats open/closed, summon count.
- `/residents` — "not open" until the token env is set; then the claim desk and seat map.
- `/` — the header light says **live** when market data is flowing; the city shows clones.
- `/summon` — paste any live token's mint; the clone should appear and link to its page.
