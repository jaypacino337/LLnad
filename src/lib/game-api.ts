import { equity, liquidationPrice, positionPnl, type Account } from "./game";
import { getTokenPrices } from "./market";
import { allHeldTokens } from "./game-store";
import { isEligible } from "./player";

/** Prices for everything any account currently holds, plus any extras. */
export async function pricesForGame(extra: string[] = []): Promise<Map<string, number>> {
  return getTokenPrices([...(await allHeldTokens()), ...extra]);
}

/** The account as the client sees it: marked to market, secrets-free. */
export function accountView(account: Account, prices: Map<string, number>) {
  const positions = account.positions.map((position) => {
    const price = prices.get(position.tokenAddress) ?? null;
    return {
      ...position,
      markPrice: price,
      pnlUsd: price !== null ? positionPnl(position, price) : null,
      liquidationPrice: liquidationPrice(position),
      priced: price !== null,
    };
  });

  const equityNow = equity(account, prices);

  return {
    wallet: account.wallet,
    balance: account.balance,
    equity: equityNow,
    positions,
    history: account.history.slice(0, 30),
    periods: {
      daily: { ...account.periods.daily, return: periodReturnOf(account, "daily", equityNow) },
      weekly: { ...account.periods.weekly, return: periodReturnOf(account, "weekly", equityNow) },
      monthly: { ...account.periods.monthly, return: periodReturnOf(account, "monthly", equityNow) },
    },
    heldAmount: account.held?.amount ?? null,
    rewardEligible: isEligible(account.held?.amount ?? null),
  };
}

function periodReturnOf(account: Account, period: "daily" | "weekly" | "monthly", equityNow: number) {
  const start = account.periods[period];
  return start.equity > 0 ? equityNow / start.equity - 1 : 0;
}
