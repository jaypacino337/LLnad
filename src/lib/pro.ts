/**
 * Token gating.
 *
 * Verifying a holder requires an RPC endpoint and the token mint, so Pro stays
 * locked until both are configured and a wallet has been verified. There is no
 * "pretend unlocked" path — an unconfigured deployment reports itself as
 * unconfigured rather than showing Pro data.
 */

export interface ProState {
  /** Both the mint and an RPC endpoint are present. */
  configured: boolean;
  /** True only for a verified holder. Always false until wallet auth is wired. */
  unlocked: boolean;
  /** What an operator needs to do next. */
  requirement: string;
  missingEnv: string[];
}

export const PRO_ENV = ["PUMPXBT_TOKEN_MINT", "SOLANA_RPC_URL"] as const;

export function getProState(): ProState {
  const missingEnv = PRO_ENV.filter((key) => !process.env[key]);
  const configured = missingEnv.length === 0;

  return {
    configured,
    // Holder verification is a wallet-signature flow; nothing is unlocked
    // server-side without it.
    unlocked: false,
    requirement: configured
      ? "Connect a wallet holding PUMPXBT to unlock."
      : `Gating is not configured. Set ${missingEnv.join(" and ")}.`,
    missingEnv: [...missingEnv],
  };
}

export const PRO_FEATURES = [
  "Tracked smart wallets",
  "Full wallet cluster graph",
  "Advanced rule sets and custom thresholds",
  "Historical call performance",
  "Wallet alerts",
  "Custom watchlists",
] as const;
