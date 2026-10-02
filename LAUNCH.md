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
| `CLONE_DATA_DIR` | Directory for the city's JSON state. Unset, it is `./.data`, which is ephemeral on serverless — summoned clones reset on cold starts (wild clones always come back on their own). Point it at a mounted disk, or swap `src/lib/clone-store.ts` for a database, to make summons permanent. |

## ⚠️ Keys

There is no private-key input anywhere in this product and none must ever be added. CLONE reads
public market data and takes exactly one kind of user input: a public token mint address. The
only secret it can use is your own `ANTHROPIC_API_KEY`, set as a host env var — never commit it.

## Verifying a deploy

- `/api/status` — source health, mind mode (claude/rules), summon count.
- `/` — the header light says **live** when market data is flowing; the city shows clones.
- `/summon` — paste any live token's mint; the clone should appear and link to its page.
