import { rpc, solanaRpcUrl } from "./solana";

/**
 * Treasury reading: real balances from the configured wallet over plain
 * JSON-RPC. PnL is deliberately absent — computing it honestly requires trade
 * history this deployment does not hold, and an estimated PnL would violate
 * the no-fabrication rule.
 */

/** Only the wallet address is required — the RPC defaults to Solana's public endpoint. */
export const TREASURY_ENV = ["TREASURY_WALLET"] as const;

export interface TreasuryTokenBalance {
  mint: string;
  amount: number;
}

export interface TreasurySnapshot {
  state: "unconfigured" | "live" | "unavailable";
  missingEnv: string[];
  wallet: string | null;
  solBalance: number | null;
  tokenBalances: TreasuryTokenBalance[];
  fetchedAt: string;
  error?: string;
}

export function treasuryMissingEnv(): string[] {
  return TREASURY_ENV.filter((key) => !process.env[key]);
}

export async function getTreasury(): Promise<TreasurySnapshot> {
  const missingEnv = treasuryMissingEnv();
  const fetchedAt = new Date().toISOString();

  if (missingEnv.length > 0) {
    return {
      state: "unconfigured",
      missingEnv,
      wallet: null,
      solBalance: null,
      tokenBalances: [],
      fetchedAt,
    };
  }

  const wallet = process.env.TREASURY_WALLET!;
  const rpcUrl = solanaRpcUrl();

  try {
    interface Lamports {
      value: number;
    }
    interface TokenAccounts {
      value: Array<{
        account: {
          data: {
            parsed: { info: { mint: string; tokenAmount: { uiAmount: number | null } } };
          };
        };
      }>;
    }

    const [balance, accounts] = await Promise.all([
      rpc<Lamports>(rpcUrl, "getBalance", [wallet]),
      rpc<TokenAccounts>(rpcUrl, "getTokenAccountsByOwner", [
        wallet,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]),
    ]);

    const tokenBalances = accounts.value
      .map((entry) => ({
        mint: entry.account.data.parsed.info.mint,
        amount: entry.account.data.parsed.info.tokenAmount.uiAmount ?? 0,
      }))
      .filter((token) => token.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    return {
      state: "live",
      missingEnv: [],
      wallet,
      solBalance: balance.value / 1_000_000_000,
      tokenBalances,
      fetchedAt,
    };
  } catch (error) {
    return {
      state: "unavailable",
      missingEnv: [],
      wallet,
      solBalance: null,
      tokenBalances: [],
      fetchedAt,
      error: error instanceof Error ? error.message : "unknown rpc error",
    };
  }
}
