/**
 * Response helpers for the seat routes. Ported from memcoinz
 * `.claude/skills/launchpad-site/preset-seats/lib/http.ts`.
 */

import { NextResponse } from "next/server";

import { SeatError } from "./core";

export const ok = (data: unknown, init?: ResponseInit) =>
  NextResponse.json(data, { ...init, headers: { "cache-control": "no-store", ...init?.headers } });

export function fail(error: unknown) {
  if (error instanceof SeatError) return ok({ error: error.message, code: error.code }, { status: 400 });
  const message = (error as Error).message ?? "error";
  if (message === "Unknown coin" || message === "bad mint") return ok({ error: "Unknown coin" }, { status: 404 });
  console.error(error);
  return ok({ error: "Something went wrong. Try again." }, { status: 500 });
}

const hits = new Map<string, number[]>();

/** Tiny in-memory rate limit (per instance): `limit` calls per `windowMs` per key. */
export function rateLimited(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

export const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
