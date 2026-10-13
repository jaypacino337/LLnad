import { claimWithPost, fetchPost, isWallet, SeatError } from "@/lib/seats/core";
import { clientIp, fail, ok, rateLimited } from "@/lib/seats/http";
import { resolveCoin } from "@/lib/seats/resolve";

export const runtime = "nodejs";

/** POST { wallet, postUrl[, mint] }: verify the 𝕏 post, then seat or waitlist the wallet. */
export async function POST(request: Request) {
  if (rateLimited(`claim:${clientIp(request)}`, 10)) {
    return ok({ error: "Slow down. Try again in a minute." }, { status: 429 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { mint?: string; wallet?: string; postUrl?: string };
    const wallet = body.wallet?.trim() ?? "";
    if (!wallet || !body.postUrl) throw new SeatError("BAD_POST_URL", "wallet and postUrl are required");
    if (!isWallet(wallet)) throw new SeatError("BAD_WALLET", "Not a valid Solana address");
    const resolved = await resolveCoin(body.mint);
    if ("response" in resolved) return resolved.response;
    const { coin, config, store } = resolved;
    const post = await fetchPost(body.postUrl); // network call outside the lock
    const result = await store.updateCoin(coin.mint, (c) => claimWithPost(c, wallet, post, config.handle));
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
