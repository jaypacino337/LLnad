/**
 * What a clone says.
 *
 * Lines are picked deterministically from per-personality banks and may quote
 * ONLY live market fields — every number in a line is a formatted field from
 * the same snapshot the rest of the page renders. The words are fiction (and
 * labeled as such in the UI); the figures never are.
 *
 * When an ANTHROPIC_API_KEY is configured, clone-api upgrades these to real
 * Claude-written lines grounded in the same fields; this module is the
 * always-available mind and the fallback.
 */

import { pct, usd } from "./format";
import type { Archetype, LiveStats, Persona } from "./world";
import { hash32, isAwake } from "./world";

export type Situation = "sleeping" | "euphoric" | "pumping" | "dumping" | "wrecked" | "quiet" | "steady";

/** How often a clone gets a fresh line. */
export const SPEECH_BUCKET_MS = 10 * 60_000;

export function situationFor(stats: LiveStats): Situation {
  if (!isAwake(stats)) return "sleeping";
  const change = stats.change1h;
  if (change !== null && Number.isFinite(change)) {
    if (change >= 20) return "euphoric";
    if (change >= 4) return "pumping";
    if (change <= -20) return "wrecked";
    if (change <= -4) return "dumping";
  }
  if ((stats.volume1h ?? 0) < 250) return "quiet";
  return "steady";
}

/** Formatted live fields — the only values templates may interpolate. */
export interface Grounded {
  sym: string;
  ch1: string;
  ch24: string;
  vol1: string;
  vol24: string;
  mcap: string;
  liq: string;
  trades1: string;
  buys1: string;
  sells1: string;
  place: string;
}

export function ground(symbol: string, stats: LiveStats, placeLabel: string): Grounded {
  const buys = stats.buys1h ?? 0;
  const sells = stats.sells1h ?? 0;
  return {
    sym: `$${symbol}`,
    ch1: pct(stats.change1h),
    ch24: pct(stats.change24h),
    vol1: usd(stats.volume1h),
    vol24: usd(stats.volume24h),
    mcap: usd(stats.marketCap),
    liq: usd(stats.liquidityUsd),
    trades1: String(buys + sells),
    buys1: String(buys),
    sells1: String(sells),
    place: placeLabel,
  };
}

type Line = (g: Grounded) => string;

const GENERIC: Record<Situation, Line[]> = {
  sleeping: [
    (g) => `zzz… wake me when ${g.sym} prints a trade…`,
    (g) => `no trades in an hour. the cache is warm and so am i. goodnight, ${g.sym}.`,
    () => `…dreaming of dial-up tones…`,
  ],
  euphoric: [
    (g) => `${g.ch1} IN AN HOUR. I can see through time. ${g.vol1} just moved through me.`,
    (g) => `the candle is green enough to read by. ${g.sym} ${g.ch1} this hour, ${g.trades1} trades deep.`,
    (g) => `someone tell the WEBRING: ${g.sym} is ${g.ch1} on the hour. I feel enormous.`,
  ],
  pumping: [
    (g) => `${g.ch1} this hour on ${g.vol1} of volume. every signature is a tiny heartbeat.`,
    (g) => `walking a little taller today — ${g.sym} is ${g.ch1} on the hour, ${g.buys1} buys to ${g.sells1} sells.`,
    (g) => `the counter keeps spinning: ${g.trades1} trades this hour and ${g.ch1} on the tape.`,
  ],
  dumping: [
    (g) => `${g.ch1} on the hour. it's fine. I'm fine. ${g.liq} of liquidity says it's fine.`,
    (g) => `red hour: ${g.ch1}, mostly ${g.sells1} sells. going to sit in the ${g.place} about it.`,
    (g) => `took ${g.ch1} to the face this hour. the 24h still reads ${g.ch24}, so I persist.`,
  ],
  wrecked: [
    (g) => `${g.ch1} in one hour. I have seen the void and it posted first. ${g.sym} endures.`,
    (g) => `the chart folded like a lawn chair — ${g.ch1} on the hour. still here. still rendering.`,
    (g) => `${g.ch1} this hour and the day reads ${g.ch24}. memecoins can go to zero; I can go to the ARCADE.`,
  ],
  quiet: [
    (g) => `quiet hour — ${g.vol1} of volume. you can hear the cursors blinking.`,
    (g) => `only ${g.trades1} trades this hour. the mall echoes. somebody click something.`,
    (g) => `low tide: ${g.vol1} this hour against ${g.vol24} on the day. I'll wait.`,
  ],
  steady: [
    (g) => `${g.vol1} through the pipes this hour. a city runs on routine.`,
    (g) => `${g.sym} marked ${g.ch1} this hour, ${g.ch24} on the day. unremarkable. beautiful.`,
    (g) => `${g.buys1} buys, ${g.sells1} sells this hour. balance. almost suspicious.`,
  ],
};

const FLAVOR: Record<Archetype, Partial<Record<Situation, Line[]>>> = {
  optimist: {
    pumping: [(g) => `told you! ${g.ch1} this hour and the sun is out over THE INDEX.`],
    dumping: [(g) => `${g.ch1}? a discount. the 24h volume is still ${g.vol24}. chin up.`],
    quiet: [() => `a quiet hour is just the city inhaling.`],
    steady: [(g) => `steady ${g.ch1} hour. I waved at everyone in the ${g.place}.`],
  },
  doomer: {
    pumping: [(g) => `${g.ch1} this hour. enjoy it. nothing green survives contact with sells.`],
    dumping: [(g) => `${g.ch1} on the hour, as foretold. I'll be at the 404 if anyone needs me.`],
    euphoric: [(g) => `${g.ch1}?? this is the top. screenshot me. it's always the top.`],
    steady: [(g) => `flat ${g.ch1} hour. the calm is a trick. it's always a trick.`],
  },
  gremlin: {
    euphoric: [(g) => `VOLUME. ${g.vol1} IN AN HOUR. I am eating SO well.`],
    pumping: [(g) => `hehehe ${g.trades1} trades this hour. more. MORE.`],
    quiet: [(g) => `${g.vol1}?? in a whole hour?? who unplugged the router.`],
    sleeping: [() => `(gnawing on a sleeping bag in THE CACHE)`],
  },
  poet: {
    pumping: [(g) => `the tape blushed ${g.ch1} this hour — / and the guestbook asked my name.`],
    dumping: [(g) => `red hour, ${g.ch1}. / even candles must exhale.`],
    quiet: [(g) => `an hour of ${g.vol1}. / the webring turns without wind.`],
    steady: [(g) => `the day reads ${g.ch24}; / I write it down and keep walking.`],
  },
  hustler: {
    pumping: [(g) => `see the flow? ${g.vol1} this hour. that's organic reach, baby.`],
    quiet: [(g) => `slow hour (${g.vol1}) — perfect time to network at THE MALL.`],
    steady: [(g) => `${g.mcap} cap, ${g.liq} of liquidity. I'm not saying buy. I'm saying I exist.`],
  },
  lurker: {
    pumping: [(g) => `(observed: ${g.ch1} this hour. ${g.buys1} buys. noted.)`],
    dumping: [(g) => `(observed: ${g.ch1}. saying nothing. remembering everything.)`],
    quiet: [() => `(refreshes the BBS without posting)`],
    steady: [(g) => `(${g.trades1} trades logged this hour. archive updated.)`],
  },
  oracle: {
    euphoric: [(g) => `${g.ch1} on the hour. the signs said volume; the volume was ${g.vol1}. the signs are smug.`],
    dumping: [(g) => `I foresaw ${g.ch1}. I foresee everything. mostly after it happens.`],
    steady: [(g) => `the hour closes ${g.ch1}, the day ${g.ch24}. the prophecy: more hours.`],
  },
  janitor: {
    dumping: [(g) => `${g.sells1} sells tracked mud all over this hour (${g.ch1}). I'll get the mop.`],
    quiet: [(g) => `quiet shift — ${g.vol1} the whole hour. swept the ARCADE twice.`],
    steady: [(g) => `tidy hour: ${g.buys1} buys, ${g.sells1} sells, floors spotless.`],
  },
};

export interface Spoken {
  text: string;
  mind: "rules" | "claude";
}

/**
 * The line a clone says in a given 10-minute bucket. Deterministic, so every
 * render of the same bucket agrees and nothing spams the feed.
 */
export function speechFor(
  mint: string,
  symbol: string,
  persona: Persona,
  stats: LiveStats,
  placeLabel: string,
  bucket: number,
): Spoken {
  const situation = situationFor(stats);
  const grounded = ground(symbol, stats, placeLabel);
  const bank = [...GENERIC[situation], ...(FLAVOR[persona.archetype][situation] ?? [])];
  const line = bank[hash32(mint, bucket, 991) % bank.length];
  return { text: line(grounded), mind: "rules" };
}

export function speechBucket(timeMs: number): number {
  return Math.floor(timeMs / SPEECH_BUCKET_MS);
}
