import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/player";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ signedOut: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
