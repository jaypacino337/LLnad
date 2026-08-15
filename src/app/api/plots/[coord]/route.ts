import { NextResponse } from "next/server";

import { parseCoord, regionName, toCoord } from "@/lib/land";
import { checkEditRate, clientKey } from "@/lib/rate-limit";
import { getPlot, releasePlot, updatePlot, type OwnerResult } from "@/lib/store";
import { validatePatch } from "@/lib/validate";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

/** Header first, body second — so a key never has to sit in a query string. */
function readClaimKey(request: Request, body: unknown): string {
  const header = request.headers.get("x-claim-key");
  if (header) return header.trim();
  if (typeof body === "object" && body !== null) {
    const candidate = (body as Record<string, unknown>).claimKey;
    if (typeof candidate === "string") return candidate.trim();
  }
  return "";
}

function ownerFailure(result: OwnerResult<unknown> & { ok: false }) {
  switch (result.reason) {
    case "not-found":
      return NextResponse.json(
        { error: "not_found", message: "There is no claim recorded at that address." },
        { status: 404, headers: NO_STORE },
      );
    case "immutable":
      return NextResponse.json(
        {
          error: "immutable",
          message: "That is a founding plot. Nobody holds a key to it, so it cannot be changed.",
        },
        { status: 403, headers: NO_STORE },
      );
    case "forbidden":
    default:
      return NextResponse.json(
        { error: "forbidden", message: "That claim key does not open this plot." },
        { status: 403, headers: NO_STORE },
      );
  }
}

async function parseBody(request: Request): Promise<{ body: unknown; bad?: NextResponse }> {
  const raw = await request.text();
  if (!raw) return { body: {} };
  try {
    return { body: JSON.parse(raw) as unknown };
  } catch {
    return {
      body: {},
      bad: NextResponse.json(
        { error: "invalid_json", message: "The request body was not valid JSON." },
        { status: 400, headers: NO_STORE },
      ),
    };
  }
}

export async function GET(_request: Request, context: { params: Promise<{ coord: string }> }) {
  const { coord } = await context.params;
  const position = parseCoord(coord);

  if (!position) {
    return NextResponse.json(
      { error: "out_of_bounds", message: "That address is not on the land." },
      { status: 400, headers: NO_STORE },
    );
  }

  const canonical = toCoord(position.col, position.row);
  const plot = await getPlot(canonical);
  const region = regionName(position.col, position.row);

  if (!plot) {
    return NextResponse.json({ coord: canonical, claimed: false, region }, { headers: NO_STORE });
  }

  return NextResponse.json({ coord: canonical, claimed: true, region, plot }, { headers: NO_STORE });
}

/** Edit a plot you hold. Requires the claim key issued when it was taken. */
export async function PATCH(request: Request, context: { params: Promise<{ coord: string }> }) {
  const { coord } = await context.params;
  if (!parseCoord(coord)) {
    return NextResponse.json(
      { error: "out_of_bounds", message: "That address is not on the land." },
      { status: 400, headers: NO_STORE },
    );
  }

  const limit = checkEditRate(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "too_many_edits", message: "Too many changes at once. Give it a moment." },
      { status: 429, headers: { ...NO_STORE, "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const { body, bad } = await parseBody(request);
  if (bad) return bad;

  const key = readClaimKey(request, body);
  if (!key) {
    return NextResponse.json(
      { error: "missing_key", message: "Send your claim key to edit this plot." },
      { status: 401, headers: NO_STORE },
    );
  }

  const validation = validatePatch(body);
  if (!validation.ok || !validation.value) {
    return NextResponse.json(
      { error: "invalid_patch", message: "Some details need fixing.", fields: validation.errors },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await updatePlot(coord, key, validation.value);
    if (!result.ok) return ownerFailure(result);
    return NextResponse.json({ plot: result.value }, { headers: NO_STORE });
  } catch (error) {
    console.error("[solanda] edit failed", error);
    return NextResponse.json(
      { error: "edit_failed", message: "The land record could not be written. Try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}

/** Give a plot back. The address returns to the pool for anyone to take. */
export async function DELETE(request: Request, context: { params: Promise<{ coord: string }> }) {
  const { coord } = await context.params;
  if (!parseCoord(coord)) {
    return NextResponse.json(
      { error: "out_of_bounds", message: "That address is not on the land." },
      { status: 400, headers: NO_STORE },
    );
  }

  const limit = checkEditRate(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "too_many_edits", message: "Too many changes at once. Give it a moment." },
      { status: 429, headers: { ...NO_STORE, "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const { body, bad } = await parseBody(request);
  if (bad) return bad;

  const key = readClaimKey(request, body);
  if (!key) {
    return NextResponse.json(
      { error: "missing_key", message: "Send your claim key to release this plot." },
      { status: 401, headers: NO_STORE },
    );
  }

  try {
    const result = await releasePlot(coord, key);
    if (!result.ok) return ownerFailure(result);
    return NextResponse.json(
      { released: result.value.coord, message: "The plot is unclaimed again." },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("[solanda] release failed", error);
    return NextResponse.json(
      { error: "release_failed", message: "The land record could not be written. Try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}
