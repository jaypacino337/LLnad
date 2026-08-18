# Launch runbook

Everything in the repo is finished: code, tests, branding, deploy config.
This file is the complete list of what remains, all of it dashboard clicks.

## ⚠️ Never enter a private key

Nothing in PumpXBT uses a private key. Treasury tracking reads a **public
address**. Pro gating verifies holders through their own wallet signatures.
Any tool, site, or person asking for the private key is a scam.

## 1. Deploy (2 minutes, required)

1. Go to **vercel.com/new**
2. Import **`jaypacino337/LLnad`**
   (not listed? "Adjust GitHub App Permissions" → grant access to the repo)
3. Change nothing. Click **Deploy**.

Working = the white/mint PumpXBT terminal with a populated market table, and
`your-url/api/status` returns `"agent": "online"`. Market data, signals and
momentum are live with zero configuration.

If a deployment turns red: open it → Build Logs → paste the error into the
Claude session.

## 2. Turn on the token features (public addresses only)

Vercel → your project → **Settings → Environment Variables**, then Redeploy:

| Variable | Value | Turns on |
| --- | --- | --- |
| `PUMPXBT_TOKEN_MINT` | the token's **public mint address** | Pro holder gating |
| `TREASURY_WALLET` | the treasury's **public address** | Treasury balances |

RPC defaults to Solana's free public endpoint — no key needed. Optionally set
`SOLANA_RPC_URL` to a dedicated endpoint later for higher rate limits.

## 3. Optional, whenever ready

| Variable | Where to get it | Turns on |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | your Vercel URL | correct absolute links in share cards |
| `HELIUS_API_KEY` | helius.dev (free tier) | wallet flow + buyer clusters |
| `X_API_KEY` `X_API_SECRET` `X_ACCESS_TOKEN` `X_ACCESS_TOKEN_SECRET` | developer.x.com app, Read & Write | autoposting (daily cron) |
| `CRON_SECRET` | `openssl rand -hex 24` | locks the cron endpoint |
| `ADMIN_SECRET` | `openssl rand -hex 24` | publishing calls |
| `PRO_SESSION_SECRET` | `openssl rand -hex 24` | Pro sessions survive restarts |

Smoke-test autoposting any time by opening `your-url/api/autopost` — without
credentials it returns the post it *would* have sent (dry run); with them it
posts the strongest live signal once.
