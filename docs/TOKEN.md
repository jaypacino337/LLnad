# $CLONE: launch, seats and the rewards flywheel

This repo only holds the **site side** of $CLONE: the seat registry (residents),
its API, and the config for the shared tooling. Launching the token and running
the flywheel use the shared memcoinz toolkit (`bin/mc`, branch `claude/solana-skills`).
Nothing here sends a transaction, and no key ever lives in this repo or the site.

```
          ┌──────────── memcoinz (Jay's machine) ───────────┐
 launch → │ mc launch …            (dry run, then --send)   │ → mint
          └─────────────────────────────────────────────────┘
                                   │ CLONE_TOKEN_MINT
                                   ▼
 CLONE site (Vercel + Supabase): /residents  ·  GET /api/seats  ·  POST /api/seats/{claim,sweep,batch}
                                   ▲  sweep, then read seated wallets
                                   │
 Railway "clone-flywheel" service (memcoinz deploy/worker): claim fees → buyback / airdrop (seats only) / payouts
```

## 1. Launch $CLONE (Jay, locally, with memcoinz)

Open questions first. These are product/legal calls, not code: see the PR body.

```sh
cd ~/memcoinz && npm install     # once
cp ~/LLnad/memcoin.config.example.json ./memcoin.config.json   # then edit: keys stay as file paths locally
# dry run: prints exactly what would happen, sends nothing
bin/mc launch --name "CLONE" --symbol CLONE --image <path/to/clone-logo.png> \
  --description "Every coin gets a clone." --website https://<your-clone-site> \
  --twitter https://x.com/<handle> --keypair keys/creator.json --dev-buy 0
# only after reading the dry run:
bin/mc launch … --send
```

- There is no $CLONE logo in this repo yet: the art is Jay's call.
- Needs `PINATA_JWT` (image → IPFS) or `--metadata-uri`.
- A vanity `…pump` address: `solana-keygen grind --ends-with pump:1`, then `--mint-keypair`.
- On success it writes `mint` + `wallets.creator` into memcoinz's `memcoin.config.json`.

## 2. Open the seats (Vercel env)

| Variable | Value |
| --- | --- |
| `CLONE_TOKEN_MINT` | the new mint |
| `CLONE_TOKEN_CREATOR` | the creator wallet's **public** address (gets seat 1A, signs seat batches) |
| `CLONE_X_HANDLE` | the 𝕏 account claim posts must @mention, without `@` |
| `CLONE_SEAT_CAP` | initial seats (creator batches add more later) |
| `CLONE_SEAT_MIN_HOLD` | whole $CLONE a wallet must hold to keep its seat |
| `SOLANA_RPC_URL` | a private RPC (Helius etc.); the public one rate-limits sweeps |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | required on Vercel, or seats vanish on cold starts |

Redeploy. The coin record is created on the first request (`ensureCoin`) and is
never reset by later env edits: change the cap with a creator batch on
`/residents`, not with env.

Check: `curl https://<site>/api/status` → `seats.open: true`, `store.backend: "supabase"`;
`curl "https://<site>/api/seats?mint=<MINT>"` → cap, taken, seats list.

## 3. Run the flywheel (Railway, shared memcoinz worker)

One more service on the shared worker image, exactly as in memcoinz
`.claude/skills/deploy/SKILL.md` §1: New service → repo `memcoinz` →
config-as-code `deploy/worker/railway.json` → Volume at `/data` → variables:

```
MEMCOIN_CONFIG_JSON = <memcoin.config.example.json from this repo, one line, with the real mint / payTo / seats.url>
CREATOR_KEYPAIR     = <creator secret>        ← Railway sealed variable; "wallets.creator" names this env var
SOLANA_RPC_URL      = https://mainnet.helius-rpc.com/?api-key=…
RAILWAY_RUN_UID     = 0
LIVE                = (leave unset for a dry-run week; then "true" — Jay's call)
```

With `"seats": { "url": "https://<clone-site>" }` the worker, each cycle:
1. claims creator fees,
2. `POST <site>/api/seats/sweep` (sell it, lose it),
3. snapshots holders and keeps **only seated wallets** (`GET <site>/api/seats?mint=…`),
4. routes the claim per `route` (airdrop / buyback / creator).

If the seat list can't be fetched, the snapshot refuses to pay rather than paying everyone.
Keep `snapshot.minBalance` equal to `CLONE_SEAT_MIN_HOLD` so the two rules agree.

The route in the example (`airdrop 50 / buyback 30 / creator 20`) is a placeholder
from the memcoinz example config; pick the real split before going live.

## What the site never does

- Hold, ask for, or display a private key. Seat claims take a public address and a
  public 𝕏 post link; the creator batch takes a Phantom `signMessage` signature.
- Show a number it didn't read: before launch every seat figure renders `—` or
  "not open"; $CLONE's price comes from Dexscreener or shows `—`.
