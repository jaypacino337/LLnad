/**
 * Sources that are not live in a default deployment.
 *
 * Wallet-level flow, treasury balances and the call record each need something
 * this repo cannot supply on its own — an indexer key, a wallet address, or a
 * recorded history. Rather than shipping invented rows, each one reports what it
 * needs so the UI can render an honest state and the README can list the exact
 * variables.
 */

export interface SourceState {
  configured: boolean;
  missingEnv: string[];
  /** What this source would provide once configured. */
  provides: string;
}

/**
 * Per-wallet buys/sells and cluster detection need a transaction indexer.
 * Dexscreener aggregates pairs, not wallets, so it cannot fill this in.
 */
export const WALLET_ENV = ["HELIUS_API_KEY"] as const;

export function walletFlowState(): SourceState {
  const missingEnv = WALLET_ENV.filter((key) => !process.env[key]);
  return {
    configured: missingEnv.length === 0,
    missingEnv: [...missingEnv],
    provides: "per-wallet buys and sells, repeated-buyer clusters, creator wallet movement",
  };
}

export const TREASURY_ENV = ["TREASURY_WALLET", "SOLANA_RPC_URL"] as const;

export function treasuryState(): SourceState {
  const missingEnv = TREASURY_ENV.filter((key) => !process.env[key]);
  return {
    configured: missingEnv.length === 0,
    missingEnv: [...missingEnv],
    provides: "treasury balance, deployed capital, open positions, realised and unrealised PnL",
  };
}

/* --- verified calls ------------------------------------------------------- */

export interface Call {
  symbol: string;
  tokenAddress: string;
  calledAt: string;
  entryMarketCap: number;
  currentMarketCap: number | null;
  peakMarketCap: number | null;
  status: "open" | "closed";
}

/**
 * The call record. Empty until calls are actually published — a track record
 * that starts populated would be worthless, so this ships with nothing in it
 * and the UI shows an empty state.
 */
export const CALLS: Call[] = [];

export function getCalls(): Call[] {
  return CALLS;
}

/** Return multiple against entry, computed only from recorded numbers. */
export function callMultiple(call: Call): number | null {
  if (!call.currentMarketCap || call.entryMarketCap <= 0) return null;
  return call.currentMarketCap / call.entryMarketCap;
}
