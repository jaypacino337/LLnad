import { NextResponse } from "next/server";

import { getMarketSnapshot } from "@/lib/market";
import { getWalletFlow } from "@/lib/wallets";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getMarketSnapshot();
  const flow = await getWalletFlow(
    snapshot.tokens
      .filter((token) => token.isPumpFun)
      .map((token) => ({ mint: token.tokenAddress, symbol: token.symbol, priceUsd: token.priceUsd })),
  );

  return NextResponse.json(flow, {
    status: flow.state === "unavailable" ? 503 : 200,
    headers: { "cache-control": "no-store" },
  });
}
