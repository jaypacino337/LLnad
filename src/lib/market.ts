/**
 * Live market data from Dexscreener's public API.
 *
 * Dexscreener needs no API key, which is why it is the default source: a fresh
 * deploy has real data with no credentials. Every number surfaced in the UI is
 * a field returned by this API — nothing here is synthesised. If the API cannot
 * be reached the snapshot carries status "unavailable" and the UI renders a
 * source-unavailable state rather than inventing figures.
 */

const DEX_BASE = "https://api.dexscreener.com";
const REQUEST_TIMEOUT_MS = 9_000;
/** Dexscreener asks for <=30 addresses per token lookup. */
const ADDRESS_BATCH = 30;
/** Short server-side cache so a burst of page loads makes one upstream call. */
const CACHE_TTL_MS = 20_000;

export type SourceStatus = "live" | "unavailable";

export interface MarketToken {
  pairAddress: string;
  tokenAddress: string;
  name: string;
  symbol: string;
  priceUsd: number | null;
  marketCap: number | null;
  liquidityUsd: number | null;
  volume1h: number | null;
  volume6h: number | null;
  volume24h: number | null;
  change5m: number | null;
  change1h: number | null;
  change6h: number | null;
  change24h: number | null;
  buys1h: number | null;
  sells1h: number | null;
  createdAtMs: number | null;
  dexId: string;
  /** True when the pair is on Pump.fun's own AMM or carries its label. */
  isPumpFun: boolean;
  url: string;
}

export interface MarketSnapshot {
  status: SourceStatus;
  source: string;
  tokens: MarketToken[];
  fetchedAt: string;
  /** Present only when status is "unavailable". */
  error?: string;
}

// --- upstream shapes (only the fields we actually read) ---------------------

interface DexProfile {
  chainId?: string;
  tokenAddress?: string;
}

interface DexPair {
  pairAddress?: string;
  dexId?: string;
  url?: string;
  labels?: string[];
  chainId?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  txns?: Record<string, { buys?: number; sells?: number }>;
  pairCreatedAt?: number;
}

function num(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${DEX_BASE}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`dexscreener ${path} responded ${response.status}`);
  }
  return (await response.json()) as T;
}

function toToken(pair: DexPair): MarketToken | null {
  const tokenAddress = pair.baseToken?.address;
  if (!tokenAddress) return null;

  const dexId = pair.dexId ?? "unknown";
  const labels = (pair.labels ?? []).join(" ").toLowerCase();

  return {
    pairAddress: pair.pairAddress ?? tokenAddress,
    tokenAddress,
    name: pair.baseToken?.name?.trim() || pair.baseToken?.symbol?.trim() || "Unknown",
    symbol: (pair.baseToken?.symbol ?? "?").trim().toUpperCase().slice(0, 12),
    priceUsd: num(pair.priceUsd),
    // Dexscreener exposes marketCap for most pairs and fdv for the rest.
    marketCap: num(pair.marketCap) ?? num(pair.fdv),
    liquidityUsd: num(pair.liquidity?.usd),
    volume1h: num(pair.volume?.h1),
    volume6h: num(pair.volume?.h6),
    volume24h: num(pair.volume?.h24),
    change5m: num(pair.priceChange?.m5),
    change1h: num(pair.priceChange?.h1),
    change6h: num(pair.priceChange?.h6),
    change24h: num(pair.priceChange?.h24),
    buys1h: num(pair.txns?.h1?.buys),
    sells1h: num(pair.txns?.h1?.sells),
    createdAtMs: num(pair.pairCreatedAt),
    dexId,
    isPumpFun: dexId.includes("pump") || labels.includes("pump"),
    url: pair.url ?? `https://dexscreener.com/solana/${tokenAddress}`,
  };
}

/** Keep the deepest pair per token so one token cannot occupy several rows. */
function dedupeByToken(tokens: MarketToken[]): MarketToken[] {
  const best = new Map<string, MarketToken>();
  for (const token of tokens) {
    const held = best.get(token.tokenAddress);
    if (!held || (token.liquidityUsd ?? 0) > (held.liquidityUsd ?? 0)) {
      best.set(token.tokenAddress, token);
    }
  }
  return [...best.values()];
}

let cache: { snapshot: MarketSnapshot; at: number } | null = null;

async function fetchSnapshot(): Promise<MarketSnapshot> {
  const fetchedAt = new Date().toISOString();

  try {
    // 1. Recently listed/updated token profiles, filtered to Solana.
    const profiles = await getJson<DexProfile[]>("/token-profiles/latest/v1");
    const addresses = [
      ...new Set(
        (Array.isArray(profiles) ? profiles : [])
          .filter((profile) => profile.chainId === "solana")
          .map((profile) => profile.tokenAddress)
          .filter((address): address is string => Boolean(address)),
      ),
    ].slice(0, ADDRESS_BATCH);

    if (addresses.length === 0) {
      return { status: "live", source: "dexscreener", tokens: [], fetchedAt };
    }

    // 2. Full market data for those tokens.
    const pairs = await getJson<DexPair[] | { pairs?: DexPair[] }>(
      `/latest/dex/tokens/${addresses.join(",")}`,
    );
    const list = Array.isArray(pairs) ? pairs : (pairs.pairs ?? []);

    const tokens = dedupeByToken(
      list
        .filter((pair) => pair.chainId === "solana")
        .map(toToken)
        .filter((token): token is MarketToken => token !== null),
    ).sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));

    return { status: "live", source: "dexscreener", tokens, fetchedAt };
  } catch (error) {
    // No fallback data: an unreachable source is reported as such.
    return {
      status: "unavailable",
      source: "dexscreener",
      tokens: [],
      fetchedAt,
      error: error instanceof Error ? error.message : "unknown upstream error",
    };
  }
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.snapshot;
  const snapshot = await fetchSnapshot();
  // Only cache a good response, so an outage retries on the next request.
  if (snapshot.status === "live") cache = { snapshot, at: Date.now() };
  return snapshot;
}

/** Highest 1h volume relative to its 6h average — the momentum board. */
export function trending(tokens: MarketToken[], limit = 8): MarketToken[] {
  return [...tokens]
    .filter((token) => (token.volume6h ?? 0) > 0)
    .sort((a, b) => volumeAcceleration(b) - volumeAcceleration(a))
    .slice(0, limit);
}

/**
 * 1h volume against the average hour of the last six. Above 1 means this hour
 * is busier than the recent norm.
 */
export function volumeAcceleration(token: MarketToken): number {
  const hour = token.volume1h ?? 0;
  const sixHourAverage = (token.volume6h ?? 0) / 6;
  if (sixHourAverage <= 0) return 0;
  return hour / sixHourAverage;
}
