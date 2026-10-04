/**
 * Assembles the world the pages and /api/state serve.
 *
 * Clones come from two doors:
 *  - wild: the most-traded tokens on the live feed drift through the city on
 *    their own, so the place is alive before anyone summons anything;
 *  - summoned: tokens visitors adopted by mint address, persisted in the store;
 *  - residents: wallets holding a $CLONE seat (src/lib/seats). They have no
 *    token of their own, so they live on $CLONE's real pulse: all awake when
 *    $CLONE traded in the last hour, all asleep when it didn't.
 *
 * Vitality is read, not simulated: awake/asleep and energy are functions of
 * each token's real last-hour and 24h volume from the market module.
 */

import { cityFeed, recordRound, summonedClones, type FeedEntry } from "./clone-store";
import { claudeLine, mindMode } from "./claude-mind";
import { speechBucket, speechFor, situationFor, type Situation } from "./mind";
import { getMarketSnapshot, tokensByAddress, type MarketToken, type SourceStatus } from "./market";
import { tokenConfig } from "./seats/config";
import { seatLabel, type Seat } from "./seats/core";
import { ensureCoin } from "./seats/store";
import { energyFrom, isAwake, moodFrom, personaFor, placeById, poseAt, type LiveStats, type Mood } from "./world";

/** How many live-feed tokens get wild clones. */
export const WILD_COUNT = 8;
/** Residents drawn on the map; the full list lives on /residents. */
export const RESIDENTS_ON_MAP = 24;

export interface CloneView {
  /** Token mint — or, for a resident, the seat holder's wallet (its sprite seed). */
  mint: string;
  symbol: string;
  name: string;
  kind: "wild" | "summoned" | "resident";
  stats: LiveStats;
  /** True when the live source returned data for this token this round. */
  priced: boolean;
  awake: boolean;
  energy: number;
  mood: Mood;
  situation: Situation;
  summonedAt?: string;
  /** Residents only: the $CLONE seat this clone was issued for. */
  seat?: { label: string; x: string };
  dexUrl: string;
}

/** $CLONE seat summary for the UI; nulls until the token is configured. */
export interface TokenSeats {
  open: boolean;
  symbol: string;
  mint: string | null;
  seatsTaken: number | null;
  seatCap: number | null;
}

export interface WorldState {
  status: SourceStatus;
  source: string;
  error?: string;
  fetchedAt: string;
  clones: CloneView[];
  feed: FeedEntry[];
  mind: "claude" | "rules";
  token: TokenSeats;
}

function statsOf(token: MarketToken | undefined): { stats: LiveStats; priced: boolean } {
  if (!token) {
    return {
      priced: false,
      stats: {
        priceUsd: null,
        marketCap: null,
        liquidityUsd: null,
        volume1h: null,
        volume24h: null,
        change1h: null,
        change24h: null,
        buys1h: null,
        sells1h: null,
      },
    };
  }
  return {
    priced: true,
    stats: {
      priceUsd: token.priceUsd,
      marketCap: token.marketCap,
      liquidityUsd: token.liquidityUsd,
      volume1h: token.volume1h,
      volume24h: token.volume24h,
      change1h: token.change1h,
      change24h: token.change24h,
      buys1h: token.buys1h,
      sells1h: token.sells1h,
    },
  };
}

/**
 * The current world. Also advances the Overheard feed: awake clones get one
 * line per 10-minute bucket (Claude-written when a key is configured,
 * rule-written otherwise — both grounded in the same live fields).
 */
/** Seated wallets, or none when seats are not configured or unreadable. */
async function residentSeats(): Promise<{ seats: Seat[]; seatCap: number | null }> {
  try {
    const coin = await ensureCoin();
    if (!coin) return { seats: [], seatCap: null };
    return { seats: coin.seats.slice().sort((a, b) => a.index - b.index), seatCap: coin.seatCap };
  } catch (error) {
    // A seat-store outage must never take the city down with it.
    console.error("seat registry unavailable:", error);
    return { seats: [], seatCap: null };
  }
}

export async function getWorldState(): Promise<WorldState> {
  const [snapshot, summoned, seated] = await Promise.all([getMarketSnapshot(), summonedClones(), residentSeats()]);
  const config = tokenConfig();
  const tokenMint = config.ok ? config.config.mint : null;

  const wild = snapshot.tokens
    .slice()
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
    .filter((token) => !summoned.some((entry) => entry.mint === token.tokenAddress))
    .slice(0, WILD_COUNT);

  // Summoned tokens may have rotated out of the discovery list; price them
  // directly. Tokens already in the snapshot ride along for free.
  const inSnapshot = new Map(snapshot.tokens.map((token) => [token.tokenAddress, token]));
  const missing = [...summoned.map((entry) => entry.mint), ...(tokenMint && seated.seats.length ? [tokenMint] : [])].filter(
    (mint, index, all) => !inSnapshot.has(mint) && all.indexOf(mint) === index,
  );
  const fetched = missing.length > 0 ? await tokensByAddress(missing) : new Map<string, MarketToken>();

  const clones: CloneView[] = [];

  for (const token of wild) {
    const { stats, priced } = statsOf(token);
    clones.push({
      mint: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      kind: "wild",
      stats,
      priced,
      awake: priced && isAwake(stats),
      energy: energyFrom(stats.volume24h),
      mood: moodFrom(stats.change1h),
      situation: situationFor(stats),
      dexUrl: token.url,
    });
  }

  for (const entry of summoned) {
    const token = inSnapshot.get(entry.mint) ?? fetched.get(entry.mint);
    const { stats, priced } = statsOf(token);
    clones.push({
      mint: entry.mint,
      symbol: token?.symbol ?? entry.symbol,
      name: token?.name ?? entry.name,
      kind: "summoned",
      stats,
      priced,
      awake: priced && isAwake(stats),
      energy: energyFrom(stats.volume24h),
      mood: moodFrom(stats.change1h),
      situation: situationFor(stats),
      summonedAt: entry.summonedAt,
      dexUrl: token?.url ?? `https://dexscreener.com/solana/${entry.mint}`,
    });
  }

  // Residents: one clone per seat, living on $CLONE's own real readings.
  if (tokenMint) {
    const token = inSnapshot.get(tokenMint) ?? fetched.get(tokenMint);
    const { stats, priced } = statsOf(token);
    for (const seat of seated.seats.slice(0, RESIDENTS_ON_MAP)) {
      const label = seatLabel(seat.index);
      clones.push({
        mint: seat.wallet,
        symbol: seat.x === "creator" ? "FOUNDER" : `@${seat.x}`,
        name: `Resident ${label}`,
        kind: "resident",
        stats,
        priced,
        awake: priced && isAwake(stats),
        energy: energyFrom(stats.volume24h),
        mood: moodFrom(stats.change1h),
        situation: situationFor(stats),
        seat: { label, x: seat.x },
        dexUrl: token?.url ?? `https://dexscreener.com/solana/${tokenMint}`,
      });
    }
  }

  // Speech round: only when the source is live — silent clones beat clones
  // narrating numbers nobody can verify.
  let feed = await cityFeed();
  if (snapshot.status === "live") {
    const now = Date.now();
    const bucket = speechBucket(now);
    const candidates = await Promise.all(
      clones
        // Residents share one token's readings; they listen rather than talk.
        .filter((clone) => clone.priced && clone.kind !== "resident")
        .map(async (clone) => {
          const persona = personaFor(clone.mint);
          const place = placeById(poseAt(clone.mint, now, clone.awake).place);
          const fallback = speechFor(clone.mint, clone.symbol, persona, clone.stats, place.label, bucket);
          const upgraded = clone.awake
            ? await claudeLine(clone.symbol, persona, clone.stats, place.label)
            : null;
          return {
            mint: clone.mint,
            symbol: clone.symbol,
            bucket,
            text: upgraded?.text ?? fallback.text,
            place: place.label,
            mind: upgraded?.mind ?? fallback.mind,
            awake: clone.awake,
          };
        }),
    );
    feed = await recordRound(candidates);
  }

  return {
    status: snapshot.status,
    source: snapshot.source,
    error: snapshot.error,
    fetchedAt: snapshot.fetchedAt,
    clones,
    feed: feed.slice(-60).reverse(),
    mind: mindMode(),
    token: {
      open: config.ok,
      symbol: config.ok ? config.config.symbol : "CLONE",
      mint: tokenMint,
      seatsTaken: config.ok && seated.seatCap !== null ? seated.seats.length : null,
      seatCap: seated.seatCap,
    },
  };
}
