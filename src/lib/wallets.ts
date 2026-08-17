/**
 * Wallet flow via a Helius transaction indexer.
 *
 * The market API aggregates pairs, not wallets, so per-wallet flow genuinely
 * needs its own source. With HELIUS_API_KEY set this fetches recent parsed
 * swaps for the indexed Pump.fun mints and derives buyer/seller rows plus a
 * simple repeated-wallet cluster count. Without the key it reports itself as
 * unconfigured — no synthetic rows.
 */

const HELIUS_BASE = "https://api.helius.xyz/v0";
/** Keep the per-load upstream cost bounded. */
const MAX_MINTS = 4;
const TX_PER_MINT = 25;
const MAX_ROWS = 40;

export const WALLET_ENV = ["HELIUS_API_KEY"] as const;

export interface WalletFlowRow {
  signature: string;
  wallet: string;
  mint: string;
  symbol: string | null;
  side: "buy" | "sell";
  amount: number;
  valueUsd: number | null;
  timestampMs: number;
  /** How many rows in this window involve the same wallet. */
  clusterCount: number;
}

export interface WalletFlowResult {
  state: "unconfigured" | "live" | "unavailable";
  missingEnv: string[];
  rows: WalletFlowRow[];
  /** Wallets seen more than once in the window, most active first. */
  clusters: Array<{ wallet: string; trades: number }>;
  fetchedAt: string;
  error?: string;
}

interface HeliusTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  mint?: string;
  tokenAmount?: number;
}

interface HeliusTx {
  signature?: string;
  timestamp?: number;
  feePayer?: string;
  tokenTransfers?: HeliusTransfer[];
}

export function walletMissingEnv(): string[] {
  return WALLET_ENV.filter((key) => !process.env[key]);
}

function parseTx(tx: HeliusTx, mint: string): Omit<WalletFlowRow, "clusterCount" | "symbol" | "valueUsd"> | null {
  const wallet = tx.feePayer;
  if (!wallet || !tx.signature || !tx.timestamp) return null;

  // The fee payer receiving the mint is a buy; sending it is a sell.
  const transfer = (tx.tokenTransfers ?? []).find(
    (candidate) =>
      candidate.mint === mint &&
      (candidate.toUserAccount === wallet || candidate.fromUserAccount === wallet) &&
      (candidate.tokenAmount ?? 0) > 0,
  );
  if (!transfer) return null;

  return {
    signature: tx.signature,
    wallet,
    mint,
    side: transfer.toUserAccount === wallet ? "buy" : "sell",
    amount: transfer.tokenAmount ?? 0,
    timestampMs: tx.timestamp * 1000,
  };
}

export async function getWalletFlow(
  mints: Array<{ mint: string; symbol: string; priceUsd: number | null }>,
): Promise<WalletFlowResult> {
  const missingEnv = walletMissingEnv();
  const fetchedAt = new Date().toISOString();

  if (missingEnv.length > 0) {
    return { state: "unconfigured", missingEnv, rows: [], clusters: [], fetchedAt };
  }

  const key = process.env.HELIUS_API_KEY!;
  const targets = mints.slice(0, MAX_MINTS);
  if (targets.length === 0) {
    return { state: "live", missingEnv: [], rows: [], clusters: [], fetchedAt };
  }

  const settled = await Promise.allSettled(
    targets.map(async (target) => {
      const response = await fetch(
        `${HELIUS_BASE}/addresses/${target.mint}/transactions?api-key=${key}&limit=${TX_PER_MINT}&type=SWAP`,
        { headers: { accept: "application/json" }, signal: AbortSignal.timeout(9_000), cache: "no-store" },
      );
      if (!response.ok) throw new Error(`helius responded ${response.status}`);
      const txs = (await response.json()) as HeliusTx[];
      return { target, txs: Array.isArray(txs) ? txs : [] };
    }),
  );

  const fulfilled = settled.filter(
    (result): result is PromiseFulfilledResult<{ target: (typeof targets)[number]; txs: HeliusTx[] }> =>
      result.status === "fulfilled",
  );

  // All requests failing is an outage; partial failure still yields real rows.
  if (fulfilled.length === 0) {
    const firstError = settled.find((result) => result.status === "rejected") as
      | PromiseRejectedResult
      | undefined;
    return {
      state: "unavailable",
      missingEnv: [],
      rows: [],
      clusters: [],
      fetchedAt,
      error:
        firstError?.reason instanceof Error ? firstError.reason.message : "all indexer requests failed",
    };
  }

  const bare = fulfilled.flatMap((result) => {
    const { target, txs } = result.value;
    return txs
      .map((tx) => parseTx(tx, target.mint))
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .map((row) => ({
        ...row,
        symbol: target.symbol,
        valueUsd: target.priceUsd !== null ? row.amount * target.priceUsd : null,
      }));
  });

  const counts = new Map<string, number>();
  for (const row of bare) counts.set(row.wallet, (counts.get(row.wallet) ?? 0) + 1);

  const rows: WalletFlowRow[] = bare
    .map((row) => ({ ...row, clusterCount: counts.get(row.wallet) ?? 1 }))
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, MAX_ROWS);

  const clusters = [...counts.entries()]
    .filter(([, trades]) => trades > 1)
    .map(([wallet, trades]) => ({ wallet, trades }))
    .sort((a, b) => b.trades - a.trades)
    .slice(0, 10);

  return { state: "live", missingEnv: [], rows, clusters, fetchedAt };
}
