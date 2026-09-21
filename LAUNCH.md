# Launch runbook

Everything in the repo is finished: game engine, tests, branding, deploy
config. What remains is dashboard clicks.

## ⚠️ Never enter a private key

Nothing in Hood ST uses one. Players sign a message with their own wallet;
reward gating reads PUBLIC addresses. Anything asking for a private key is a
scam.

## 1. Deploy (2 minutes, required)

1. **vercel.com/new** → Import **`jaypacino337/LLnad`** → Deploy (change nothing).

Working = the Hood ST page with a populated markets table, and
`your-url/api/status` returns `"game": "trading"`. Trading, leagues and
signals are live with zero configuration.

If a deployment turns red: open it → Build Logs → paste the error into the
Claude session.

## 2. Reward gating (public addresses only)

Vercel → Settings → Environment Variables, then Redeploy:

| Variable | Value |
| --- | --- |
| `HOODST_TOKEN_MINT` | the reward token's **public mint address** |
| `HOODST_MIN_HOLD` | holding required for reward eligibility (e.g. `10000`) |
| `NEXT_PUBLIC_HOLD_SYMBOL` | the ticker to show, e.g. `$HOOD` |

## 3. Recommended

| Variable | Value | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | your Vercel URL | correct share-card links |
| `HOODST_SESSION_SECRET` | `openssl rand -hex 32` | sign-ins survive restarts |

## 4. Standings that survive redeploys

The game state is a JSON file; on Vercel it resets when the instance recycles.
Fine for a soft launch — before running leagues with real rewards, either set
`HOODST_DATA_DIR` to mounted storage (non-serverless hosts) or ask Claude to
swap `src/lib/game-store.ts` onto a database. One module, nothing else changes.

## 5. Optional

| Variable | Where | Turns on |
| --- | --- | --- |
| `X_API_*` ×4 | developer.x.com, Read & Write | autoposting the strongest signal (daily) |
| `CRON_SECRET` | `openssl rand -hex 24` | locks the cron endpoint |

Smoke-test autoposting any time at `your-url/api/autopost` — without
credentials it returns the post it would have sent.
