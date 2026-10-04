/**
 * Seat holders' $CLONE balances, read from chain over plain JSON-RPC.
 *
 * Ported from memcoinz `.claude/skills/launchpad-site/preset-seats/lib/chain.ts`
 * (ataBalances), rewritten without @solana/web3.js so CLONE keeps zero runtime
 * dependencies: `getTokenAccountsByOwner` with a mint filter sums every token
 * account the wallet holds for the mint (Token and Token-2022 alike).
 *
 * Same safety rule as the source: a wallet whose read failed is left OUT of
 * the map, and the sweep keeps seats it has no reading for. A wallet with no
 * token account at all holds 0.
 */

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";
const TIMEOUT_MS = 12_000;

export const rpcUrl = () => process.env.SOLANA_RPC_URL || PUBLIC_RPC;

interface ParsedTokenAccount {
  account: { data: { parsed?: { info?: { tokenAmount?: { amount?: string; decimals?: number } } } } };
}

/** Whole tokens held, or null when the RPC answer was unusable. */
export function wholeTokens(accounts: ParsedTokenAccount[]): number | null {
  let raw = BigInt(0);
  let decimals: number | null = null;
  for (const entry of accounts) {
    const amount = entry.account?.data?.parsed?.info?.tokenAmount;
    if (!amount || typeof amount.amount !== "string" || !/^\d+$/.test(amount.amount)) return null;
    if (typeof amount.decimals !== "number") return null;
    decimals = amount.decimals;
    raw += BigInt(amount.amount);
  }
  if (decimals === null) return 0;
  return Number(raw / BigInt(10) ** BigInt(decimals));
}

export async function holdings(
  mint: string,
  wallets: string[],
  { url = rpcUrl(), fetchImpl = fetch, concurrency = 6 }: { url?: string; fetchImpl?: typeof fetch; concurrency?: number } = {},
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let next = 0;

  async function readOne(wallet: string) {
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [wallet, { mint }, { encoding: "jsonParsed", commitment: "confirmed" }],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { result?: { value?: ParsedTokenAccount[] }; error?: unknown };
      if (json.error || !Array.isArray(json.result?.value)) return;
      const balance = wholeTokens(json.result.value);
      if (balance !== null) out.set(wallet, balance);
    } catch {
      /* unknown → keep the seat */
    }
  }

  async function worker() {
    while (next < wallets.length) await readOne(wallets[next++]);
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, wallets.length) }, worker));
  return out;
}
