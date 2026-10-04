import { tokenConfig, type TokenConfig } from "./config";
import type { SeatCoin } from "./core";
import { ok } from "./http";
import { ensureCoin, seatStore, type SeatStore } from "./store";

/**
 * Every seat route serves exactly one coin: $CLONE, as configured by env.
 * A `mint` param is optional (the memcoinz flywheel and snapshot send it) but
 * must match. Returns the coin or the response to send instead.
 */
export async function resolveCoin(
  mintParam: string | null | undefined,
): Promise<{ coin: SeatCoin; config: TokenConfig; store: SeatStore } | { response: Response }> {
  const result = tokenConfig();
  if (!result.ok) {
    return {
      response: ok(
        { error: "$CLONE seats are not open yet.", open: false, missingEnv: result.missing },
        { status: 404 },
      ),
    };
  }
  if (mintParam && mintParam !== result.config.mint) {
    return { response: ok({ error: "Unknown coin" }, { status: 404 }) };
  }
  const store = seatStore();
  const coin = await ensureCoin(store);
  if (!coin) return { response: ok({ error: "Unknown coin" }, { status: 404 }) };
  return { coin, config: result.config, store };
}
