/**
 * The Hood ST game engine: pure arithmetic, no I/O.
 *
 * Paper trading against live prices. Every fill uses a price the market source
 * actually returned; nothing here invents a number. Positions are simple
 * isolated-margin perps: margin is escrowed from the balance at open, PnL is
 * linear in price, and a position liquidates when its loss reaches its margin.
 */

export const STARTING_BALANCE = 10_000;
export const MIN_MARGIN = 10;
export const MAX_LEVERAGE = 20;
export const MAX_OPEN_POSITIONS = 10;

export type Side = "long" | "short";

/** Money is settled in cents; raw floats are for marks and display only. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface Position {
  id: string;
  tokenAddress: string;
  symbol: string;
  side: Side;
  /** USD escrowed from the balance at open. */
  marginUsd: number;
  leverage: number;
  entryPrice: number;
  openedAt: string;
}

export interface ClosedTrade extends Position {
  exitPrice: number;
  pnlUsd: number;
  closedAt: string;
  reason: "closed" | "liquidated";
}

export interface PeriodStart {
  key: string;
  equity: number;
}

export interface Account {
  wallet: string;
  createdAt: string;
  /** Free balance, excluding escrowed margin. */
  balance: number;
  positions: Position[];
  history: ClosedTrade[];
  periods: { daily: PeriodStart; weekly: PeriodStart; monthly: PeriodStart };
  /** Reward-token holding, refreshed best-effort at sign-in. */
  held: { amount: number; checkedAt: string } | null;
}

/** Token quantity the margin controls. */
export function positionSize(position: Position): number {
  return (position.marginUsd * position.leverage) / position.entryPrice;
}

/** Signed PnL at a price, capped below at -margin (isolated margin). */
export function positionPnl(position: Position, price: number): number {
  const size = positionSize(position);
  const raw =
    position.side === "long"
      ? (price - position.entryPrice) * size
      : (position.entryPrice - price) * size;
  return Math.max(raw, -position.marginUsd);
}

/** Price at which loss equals margin. */
export function liquidationPrice(position: Position): number {
  const move = position.entryPrice / position.leverage;
  return position.side === "long"
    ? position.entryPrice - move
    : position.entryPrice + move;
}

export function isLiquidated(position: Position, price: number): boolean {
  return position.side === "long"
    ? price <= liquidationPrice(position)
    : price >= liquidationPrice(position);
}

/**
 * Account equity: free balance plus the marked value of every position. A
 * position without a live price contributes its entry value (margin), flagged
 * upstream as unpriced — displaying the escrowed margin is factual, guessing a
 * price is not.
 */
export function equity(account: Account, prices: Map<string, number>): number {
  let total = account.balance;
  for (const position of account.positions) {
    const price = prices.get(position.tokenAddress);
    total += position.marginUsd + (price !== undefined ? positionPnl(position, price) : 0);
  }
  return total;
}

/* --- competition periods (UTC) --------------------------------------------- */

export type Period = "daily" | "weekly" | "monthly";

export function dailyKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthlyKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** ISO-8601 week, e.g. "2026-W39". */
export function weeklyKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO weeks are anchored on Thursday.
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(utc.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((utc.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function periodKey(period: Period, date: Date): string {
  if (period === "daily") return dailyKey(date);
  if (period === "weekly") return weeklyKey(date);
  return monthlyKey(date);
}

/**
 * Return over a period: equity now against equity when the period was first
 * seen. New entrants start flat, so a period joined late is still fair.
 */
export function periodReturn(start: PeriodStart, equityNow: number): number {
  if (start.equity <= 0) return 0;
  return equityNow / start.equity - 1;
}
