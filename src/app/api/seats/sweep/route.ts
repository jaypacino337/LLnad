import { holdings } from "@/lib/seats/chain";
import { seatLabel, sweep } from "@/lib/seats/core";
import { fail, ok } from "@/lib/seats/http";
import { resolveCoin } from "@/lib/seats/resolve";

export const runtime = "nodejs";
export const maxDuration = 60;

const COOLDOWN_MS = 60_000;

/**
 * POST { mint? }: "sell it, lose it". Permissionless: it can only free seats
 * whose wallet really holds less than the minimum, read from chain here. 60s
 * cooldown. The shared flywheel worker calls this before every payout.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { mint?: string };
    const resolved = await resolveCoin(body.mint);
    if ("response" in resolved) return resolved.response;
    const { coin, store } = resolved;
    const wait = coin.lastSweepAt + COOLDOWN_MS - Date.now();
    if (wait > 0) return ok({ skipped: true, retryInMs: wait });

    const balances = await holdings(
      coin.mint,
      coin.seats.map((seat) => seat.wallet),
    );
    const result = await store.updateCoin(coin.mint, (c) => sweep(c, balances));
    return ok({
      freed: result.freed.map((s) => ({ wallet: s.wallet, x: s.x, label: seatLabel(s.index), balance: balances.get(s.wallet) })),
      promoted: result.promoted.map((s) => ({ wallet: s.wallet, x: s.x, label: seatLabel(s.index) })),
      checked: balances.size,
      unknown: coin.seats.length - balances.size,
    });
  } catch (error) {
    return fail(error);
  }
}
