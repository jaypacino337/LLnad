import { claimCode, isWallet, publicView, seatPhrase, settle } from "@/lib/seats/core";
import { fail, ok } from "@/lib/seats/http";
import { resolveCoin } from "@/lib/seats/resolve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/seats[?mint=…][&wallet=…]: public seat state for $CLONE, plus the
 * exact claim phrase for a wallet. Same contract as the memcoinz seats preset,
 * so `mc snapshot --seats <this site>` and the flywheel read it unchanged.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const wallet = url.searchParams.get("wallet");
  try {
    const resolved = await resolveCoin(url.searchParams.get("mint"));
    if ("response" in resolved) return resolved.response;
    const { coin, config } = resolved;
    settle(coin); // reflect a batch that opened since the last write (read-only view)
    const view = publicView(coin);
    return ok({
      ...view,
      open: true,
      handle: config.handle,
      ...(wallet && isWallet(wallet)
        ? { phrase: seatPhrase(config.handle, coin.symbol, claimCode(coin.mint, wallet)) }
        : {}),
      ...(wallet
        ? {
            you: {
              seat: view.seats.find((seat) => seat.wallet === wallet) ?? null,
              /** 1-based waitlist position, or null. */
              waitlist: coin.waitlist.findIndex((entry) => entry.wallet === wallet) + 1 || null,
            },
          }
        : {}),
    });
  } catch (error) {
    return fail(error);
  }
}
