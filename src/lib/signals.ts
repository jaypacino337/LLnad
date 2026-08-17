import { volumeAcceleration, type MarketToken } from "./market";

/**
 * Deterministic rules over live market fields.
 *
 * These are NOT model predictions. Each rule is a threshold over numbers the
 * market API returned, every observation quotes the figures it used, and the
 * same snapshot always produces the same output. The UI labels them as rules
 * for exactly that reason — the product does not claim an inference it cannot
 * substantiate.
 */

export type SignalKind =
  | "volume_acceleration"
  | "momentum"
  | "buy_pressure"
  | "sell_pressure"
  | "thin_liquidity"
  | "fresh_launch";

export interface SignalInput {
  label: string;
  value: string;
}

export interface Signal {
  id: string;
  kind: SignalKind;
  /** Short human label, e.g. "Volume acceleration". */
  label: string;
  direction: "up" | "down" | "neutral";
  symbol: string;
  name: string;
  tokenAddress: string;
  url: string;
  /** Plain statement of what the numbers show. */
  observation: string;
  /** 0–1, derived from how far past the threshold the measurement sits. */
  strength: number;
  inputs: SignalInput[];
}

/** Maps a measurement onto 0–1 between its trigger point and a saturation point. */
function ramp(value: number, trigger: number, saturate: number): number {
  if (saturate === trigger) return 1;
  const ratio = (value - trigger) / (saturate - trigger);
  return Math.max(0, Math.min(1, ratio));
}

const RULES: Array<(token: MarketToken) => Signal | null> = [
  // Current hour materially busier than the recent average hour.
  (token) => {
    const acceleration = volumeAcceleration(token);
    if (acceleration < 2 || (token.volume1h ?? 0) < 5_000) return null;
    return {
      id: `${token.pairAddress}:volume_acceleration`,
      kind: "volume_acceleration",
      label: "Volume acceleration",
      direction: "up",
      symbol: token.symbol,
      name: token.name,
      tokenAddress: token.tokenAddress,
      url: token.url,
      observation: `1h volume is ${acceleration.toFixed(1)}x the average hour of the last six.`,
      strength: ramp(acceleration, 2, 8),
      inputs: [
        { label: "vol 1h", value: `$${Math.round(token.volume1h ?? 0).toLocaleString("en-US")}` },
        { label: "vol 6h", value: `$${Math.round(token.volume6h ?? 0).toLocaleString("en-US")}` },
        { label: "ratio", value: `${acceleration.toFixed(1)}x` },
      ],
    };
  },

  // Price extending in the last hour on top of a positive six hours.
  (token) => {
    const hour = token.change1h;
    const sixHour = token.change6h;
    if (hour === null || sixHour === null || hour < 15 || sixHour <= 0) return null;
    return {
      id: `${token.pairAddress}:momentum`,
      kind: "momentum",
      label: "Momentum",
      direction: "up",
      symbol: token.symbol,
      name: token.name,
      tokenAddress: token.tokenAddress,
      url: token.url,
      observation: `Up ${hour.toFixed(1)}% in the last hour, extending a ${sixHour.toFixed(1)}% six-hour move.`,
      strength: ramp(hour, 15, 90),
      inputs: [
        { label: "1h", value: `${hour.toFixed(1)}%` },
        { label: "6h", value: `${sixHour.toFixed(1)}%` },
      ],
    };
  },

  // Buys clearly outnumbering sells over the last hour.
  (token) => {
    const buys = token.buys1h ?? 0;
    const sells = token.sells1h ?? 0;
    const total = buys + sells;
    if (total < 40) return null;
    const share = buys / total;
    if (share < 0.66) return null;
    return {
      id: `${token.pairAddress}:buy_pressure`,
      kind: "buy_pressure",
      label: "Buy pressure",
      direction: "up",
      symbol: token.symbol,
      name: token.name,
      tokenAddress: token.tokenAddress,
      url: token.url,
      observation: `${Math.round(share * 100)}% of the last ${total} trades were buys.`,
      strength: ramp(share, 0.66, 0.9),
      inputs: [
        { label: "buys 1h", value: String(buys) },
        { label: "sells 1h", value: String(sells) },
      ],
    };
  },

  // The same imbalance in the other direction.
  (token) => {
    const buys = token.buys1h ?? 0;
    const sells = token.sells1h ?? 0;
    const total = buys + sells;
    if (total < 40) return null;
    const share = sells / total;
    if (share < 0.66) return null;
    return {
      id: `${token.pairAddress}:sell_pressure`,
      kind: "sell_pressure",
      label: "Sell pressure",
      direction: "down",
      symbol: token.symbol,
      name: token.name,
      tokenAddress: token.tokenAddress,
      url: token.url,
      observation: `${Math.round(share * 100)}% of the last ${total} trades were sells.`,
      strength: ramp(share, 0.66, 0.9),
      inputs: [
        { label: "sells 1h", value: String(sells) },
        { label: "buys 1h", value: String(buys) },
      ],
    };
  },

  // Market cap far above the liquidity backing it — thin book, sharp exits.
  (token) => {
    const liquidity = token.liquidityUsd;
    const marketCap = token.marketCap;
    if (!liquidity || !marketCap || liquidity < 1_000) return null;
    const ratio = marketCap / liquidity;
    if (ratio < 25) return null;
    return {
      id: `${token.pairAddress}:thin_liquidity`,
      kind: "thin_liquidity",
      label: "Thin liquidity",
      direction: "down",
      symbol: token.symbol,
      name: token.name,
      tokenAddress: token.tokenAddress,
      url: token.url,
      observation: `Market cap is ${Math.round(ratio)}x the pooled liquidity.`,
      strength: ramp(ratio, 25, 150),
      inputs: [
        { label: "mcap", value: `$${Math.round(marketCap).toLocaleString("en-US")}` },
        { label: "liq", value: `$${Math.round(liquidity).toLocaleString("en-US")}` },
      ],
    };
  },

  // Pair opened in the last six hours and already trading real size.
  (token) => {
    if (!token.createdAtMs) return null;
    const ageHours = (Date.now() - token.createdAtMs) / 3_600_000;
    if (ageHours > 6 || ageHours < 0) return null;
    if ((token.volume1h ?? 0) < 10_000) return null;
    return {
      id: `${token.pairAddress}:fresh_launch`,
      kind: "fresh_launch",
      label: "New launch",
      direction: "neutral",
      symbol: token.symbol,
      name: token.name,
      tokenAddress: token.tokenAddress,
      url: token.url,
      observation: `Pair is ${ageHours < 1 ? `${Math.round(ageHours * 60)}m` : `${ageHours.toFixed(1)}h`} old with $${Math.round(token.volume1h ?? 0).toLocaleString("en-US")} traded in the last hour.`,
      strength: ramp(token.volume1h ?? 0, 10_000, 250_000),
      inputs: [
        { label: "age", value: ageHours < 1 ? `${Math.round(ageHours * 60)}m` : `${ageHours.toFixed(1)}h` },
        { label: "vol 1h", value: `$${Math.round(token.volume1h ?? 0).toLocaleString("en-US")}` },
      ],
    };
  },
];

/** Runs every rule against every token, strongest first. */
export function deriveSignals(tokens: MarketToken[], limit = 14): Signal[] {
  const signals: Signal[] = [];
  for (const token of tokens) {
    for (const rule of RULES) {
      const signal = rule(token);
      if (signal) signals.push(signal);
    }
  }
  return signals.sort((a, b) => b.strength - a.strength).slice(0, limit);
}

export function strengthLabel(strength: number): "low" | "medium" | "high" {
  if (strength >= 0.66) return "high";
  if (strength >= 0.33) return "medium";
  return "low";
}
