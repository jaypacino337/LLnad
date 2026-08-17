import { NextResponse } from "next/server";

import { callMultiple, closeCall, getCalls, publishCall } from "@/lib/calls";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET() {
  const calls = await getCalls();
  return NextResponse.json(
    {
      count: calls.length,
      calls: calls.map((call) => ({ ...call, multiple: callMultiple(call) })),
    },
    { headers: NO_STORE },
  );
}

/**
 * Publishing and closing calls is an operator action, guarded by ADMIN_SECRET.
 * Without the secret configured, writes are refused outright — the track
 * record cannot be populated anonymously.
 */
function authorised(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("x-admin-key") ?? "";
  return provided.length > 0 && provided === secret;
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json(
      {
        error: "unauthorized",
        detail: process.env.ADMIN_SECRET
          ? "send the admin key in the x-admin-key header"
          : "ADMIN_SECRET is not configured; publishing is disabled",
      },
      { status: 401, headers: NO_STORE },
    );
  }

  let body: { symbol?: string; tokenAddress?: string; entryMarketCap?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const result = await publishCall({
    symbol: body.symbol ?? "",
    tokenAddress: body.tokenAddress ?? "",
    entryMarketCap: body.entryMarketCap ?? Number.NaN,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "invalid_call", detail: result.error }, { status: 400, headers: NO_STORE });
  }
  return NextResponse.json({ call: result.call }, { status: 201, headers: NO_STORE });
}

export async function PATCH(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: { id?: string; status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  if (body.status !== "closed" || !body.id) {
    return NextResponse.json(
      { error: "invalid_patch", detail: 'send { id, status: "closed" }' },
      { status: 400, headers: NO_STORE },
    );
  }

  const result = await closeCall(body.id);
  if (!result.ok) {
    return NextResponse.json({ error: "invalid_call", detail: result.error }, { status: 400, headers: NO_STORE });
  }
  return NextResponse.json({ call: result.call }, { headers: NO_STORE });
}
