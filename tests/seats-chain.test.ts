import assert from "node:assert/strict";
import test from "node:test";

import { holdings, wholeTokens } from "../src/lib/seats/chain.ts";

const acct = (amount: string, decimals = 6) => ({
  account: { data: { parsed: { info: { tokenAmount: { amount, decimals } } } } },
});

test("wholeTokens sums accounts in raw units and floors to whole tokens", () => {
  assert.equal(wholeTokens([]), 0);
  assert.equal(wholeTokens([acct("1500000"), acct("2600000")]), 4);
  assert.equal(wholeTokens([acct("garbage")]), null);
});

test("holdings: a failed read leaves the wallet out (its seat is kept)", async () => {
  const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const wallet = JSON.parse(String(init?.body)).params[0] as string;
    if (wallet === "down") return new Response("rate limited", { status: 429 });
    if (wallet === "rpcerr") return new Response(JSON.stringify({ error: { code: -32000 } }));
    if (wallet === "empty") return new Response(JSON.stringify({ result: { value: [] } }));
    return new Response(JSON.stringify({ result: { value: [acct("300000000000")] } }));
  }) as typeof fetch;
  const out = await holdings("MINT", ["rich", "empty", "down", "rpcerr"], { url: "http://rpc", fetchImpl });
  assert.equal(out.get("rich"), 300_000);
  assert.equal(out.get("empty"), 0);
  assert.ok(!out.has("down"));
  assert.ok(!out.has("rpcerr"));
});
