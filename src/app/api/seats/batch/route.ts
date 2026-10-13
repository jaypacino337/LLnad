import { batchMessage, scheduleBatch, SeatError, verifyWalletSignature } from "@/lib/seats/core";
import { fail, ok } from "@/lib/seats/http";
import { resolveCoin } from "@/lib/seats/resolve";

export const runtime = "nodejs";

/**
 * POST { count, openAt, signature[, mint] }: the creator schedules a seat
 * batch, signed in their own wallet (Phantom signMessage). Only the base58
 * signature reaches the server; no key ever does.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      mint?: string;
      count?: number;
      openAt?: number;
      signature?: string;
    };
    const resolved = await resolveCoin(body.mint);
    if ("response" in resolved) return resolved.response;
    const { coin, store } = resolved;
    const count = Number(body.count);
    const openAt = Number(body.openAt);
    if (!body.signature || !verifyWalletSignature(coin.creator, batchMessage(coin.mint, count, openAt), body.signature)) {
      throw new SeatError("NOT_CREATOR", "Only the $CLONE creator can open seats (signature check failed)");
    }
    await store.updateCoin(coin.mint, (c) => scheduleBatch(c, count, openAt));
    return ok({ scheduled: { count, openAt } });
  } catch (error) {
    return fail(error);
  }
}
