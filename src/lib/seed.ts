import type { Plot } from "./types";

export type SeedPlot = Omit<Plot, "col" | "row">;

/**
 * The founding settlement. Ships with the app so a fresh install has a map
 * worth looking at instead of an empty grid.
 */
export const SEED_PLOTS: SeedPlot[] = [
  { coord: "AF32", title: "The Watchtower", handle: "ida", url: "https://example.com/ida", bio: "Keeps the survey markers straight. Ask me where anything is.", color: "ochre", glyph: "⚑", claimedAt: "2026-01-04T09:12:00.000Z" },
  { coord: "AG32", title: "Longhouse", handle: "birch", url: null, bio: "Open door, warm stove, bad coffee.", color: "clay", glyph: "⌂", claimedAt: "2026-01-04T11:40:00.000Z" },
  { coord: "AE33", title: "The Forge", handle: "tulla", url: "https://example.com/tulla", bio: "Small tools, sharpened weekly.", color: "ember", glyph: "✚", claimedAt: "2026-01-05T14:02:00.000Z" },
  { coord: "AF33", title: "Well & Cistern", handle: "onyx", url: null, bio: "Water for the commons.", color: "pine", glyph: "◉", claimedAt: "2026-01-05T16:25:00.000Z" },
  { coord: "AG33", title: "Paper Mill", handle: "quilla", url: "https://example.com/quilla", bio: "Prints the map you are standing on.", color: "slate", glyph: "■", claimedAt: "2026-01-06T08:15:00.000Z" },
  { coord: "AH33", title: "Signal Hut", handle: "vex", url: null, bio: "Relaying anything you shout loud enough.", color: "indigo", glyph: "➤", claimedAt: "2026-01-06T19:48:00.000Z" },
  { coord: "AE34", title: "Orchard Row", handle: "pomme", url: null, bio: "Slow work. Very slow work.", color: "moss", glyph: "❀", claimedAt: "2026-01-07T10:05:00.000Z" },
  { coord: "AF34", title: "The Commons Green", handle: "nadia", url: "https://example.com/nadia", bio: "Nobody owns this bit. That is the point.", color: "moss", glyph: "✿", claimedAt: "2026-01-07T12:30:00.000Z" },
  { coord: "AG34", title: "Ledger House", handle: "corvid", url: null, bio: "Every claim, written down twice.", color: "plum", glyph: "◆", claimedAt: "2026-01-08T09:00:00.000Z" },
  { coord: "AD35", title: "Kiln", handle: "sable", url: null, bio: "Fires on Tuesdays.", color: "ember", glyph: "▲", claimedAt: "2026-01-08T15:22:00.000Z" },
  { coord: "AF35", title: "Observatory", handle: "lyra", url: "https://example.com/lyra", bio: "Counting things that are very far away.", color: "indigo", glyph: "☾", claimedAt: "2026-01-09T22:41:00.000Z" },
  { coord: "AH35", title: "Rope Walk", handle: "hemp", url: null, bio: "Two hundred metres of patience.", color: "ochre", glyph: "✳", claimedAt: "2026-01-10T07:37:00.000Z" },

  { coord: "M14", title: "West Gate", handle: "marrow", url: "https://example.com/marrow", bio: "First stop for anyone arriving overland.", color: "slate", glyph: "⬢", claimedAt: "2026-01-11T11:11:00.000Z" },
  { coord: "N14", title: "Wayhouse", handle: "tinder", url: null, bio: "Beds, boots, bad directions.", color: "clay", glyph: "⌂", claimedAt: "2026-01-11T13:19:00.000Z" },
  { coord: "M15", title: "The Cold Store", handle: "frost", url: null, bio: "Keeping things for later.", color: "pine", glyph: "❖", claimedAt: "2026-01-12T09:54:00.000Z" },
  { coord: "O15", title: "Loom", handle: "weft", url: "https://example.com/weft", bio: "Threads, mostly. Occasionally opinions.", color: "plum", glyph: "✧", claimedAt: "2026-01-12T18:02:00.000Z" },
  { coord: "N16", title: "Hollow Bridge", handle: "span", url: null, bio: "It holds. Probably.", color: "slate", glyph: "▼", claimedAt: "2026-01-13T10:44:00.000Z" },

  { coord: "AV11", title: "Northeast Beacon", handle: "kestrel", url: "https://example.com/kestrel", bio: "Lit every night since the survey.", color: "ember", glyph: "☀", claimedAt: "2026-01-14T20:15:00.000Z" },
  { coord: "AW11", title: "Gull Station", handle: "brine", url: null, bio: "Weather, tides, complaints.", color: "indigo", glyph: "●", claimedAt: "2026-01-15T06:30:00.000Z" },
  { coord: "AV12", title: "Salt Flats", handle: "halide", url: null, bio: "Nothing grows. Everything keeps.", color: "ochre", glyph: "■", claimedAt: "2026-01-15T14:07:00.000Z" },

  { coord: "H51", title: "Southwest Quarry", handle: "granite", url: null, bio: "We make the small rocks.", color: "slate", glyph: "◈", claimedAt: "2026-01-16T08:20:00.000Z" },
  { coord: "I51", title: "Cart Yard", handle: "axle", url: "https://example.com/axle", bio: "Wheels true, axles greased.", color: "clay", glyph: "◉", claimedAt: "2026-01-16T11:45:00.000Z" },
  { coord: "H52", title: "Lime Kiln", handle: "chalk", url: null, bio: "White dust on everything I own.", color: "ember", glyph: "▲", claimedAt: "2026-01-17T09:33:00.000Z" },
  { coord: "J53", title: "The Lookout", handle: "vantage", url: null, bio: "You can see the Commons from here on a clear day.", color: "pine", glyph: "⚑", claimedAt: "2026-01-17T17:58:00.000Z" },

  { coord: "AT48", title: "Southeast Landing", handle: "keelson", url: "https://example.com/keelson", bio: "Boats in, boats out.", color: "indigo", glyph: "➤", claimedAt: "2026-01-18T07:12:00.000Z" },
  { coord: "AU48", title: "Net Sheds", handle: "mesh", url: null, bio: "Mending, always mending.", color: "moss", glyph: "⬡", claimedAt: "2026-01-18T15:26:00.000Z" },
  { coord: "AU49", title: "Smokehouse", handle: "alder", url: null, bio: "You will smell me before you see me.", color: "clay", glyph: "✦", claimedAt: "2026-01-19T12:04:00.000Z" },

  { coord: "T27", title: "Middle Road Inn", handle: "ferrous", url: "https://example.com/ferrous", bio: "Halfway to anywhere.", color: "ochre", glyph: "⌂", claimedAt: "2026-01-20T18:39:00.000Z" },
  { coord: "U28", title: "Toll Post", handle: "grig", url: null, bio: "One coin, or a good story.", color: "plum", glyph: "♦", claimedAt: "2026-01-21T09:47:00.000Z" },
  { coord: "AQ22", title: "The Aviary", handle: "pinion", url: null, bio: "Messages leave at dawn.", color: "moss", glyph: "☾", claimedAt: "2026-01-22T05:55:00.000Z" },
  { coord: "AR23", title: "Glasshouse", handle: "silica", url: "https://example.com/silica", bio: "Warm, bright, slightly cracked.", color: "pine", glyph: "⬢", claimedAt: "2026-01-22T13:21:00.000Z" },
  { coord: "P40", title: "Reed Beds", handle: "sedge", url: null, bio: "Filtering whatever comes downstream.", color: "moss", glyph: "✳", claimedAt: "2026-01-23T10:10:00.000Z" },
  { coord: "Q41", title: "Mud Kitchen", handle: "loam", url: null, bio: "Everything here is a bit damp.", color: "clay", glyph: "●", claimedAt: "2026-01-23T16:44:00.000Z" },
  { coord: "AB19", title: "Dye Works", handle: "woad", url: "https://example.com/woad", bio: "Blue hands, blue river, sorry.", color: "indigo", glyph: "◆", claimedAt: "2026-01-24T11:29:00.000Z" },
  { coord: "AC20", title: "Tannery", handle: "bark", url: null, bio: "Downwind of the Commons on purpose.", color: "ember", glyph: "■", claimedAt: "2026-01-24T14:52:00.000Z" },
  { coord: "AL44", title: "The Long Field", handle: "furrow", url: null, bio: "Straight lines, all the way down.", color: "moss", glyph: "▼", claimedAt: "2026-01-25T08:08:00.000Z" },
  { coord: "AM45", title: "Threshing Floor", handle: "chaff", url: "https://example.com/chaff", bio: "Separating the good stuff since day one.", color: "ochre", glyph: "✚", claimedAt: "2026-01-25T15:33:00.000Z" },
  { coord: "F8", title: "Far Corner", handle: "verge", url: null, bio: "I like the quiet.", color: "slate", glyph: "⬡", claimedAt: "2026-01-26T19:20:00.000Z" },
  { coord: "BJ60", title: "Last Marker", handle: "terminus", url: "https://example.com/terminus", bio: "The survey stops here. For now.", color: "plum", glyph: "❖", claimedAt: "2026-01-27T21:05:00.000Z" },
  { coord: "AI28", title: "Sawpit", handle: "rive", url: null, bio: "Planks to order.", color: "clay", glyph: "◈", claimedAt: "2026-01-28T09:41:00.000Z" },
  { coord: "AJ29", title: "Charcoal Stack", handle: "cinder", url: null, bio: "Smouldering quietly, like the rest of us.", color: "ember", glyph: "▲", claimedAt: "2026-01-28T17:16:00.000Z" },
  { coord: "AA37", title: "The Bindery", handle: "quire", url: "https://example.com/quire", bio: "Stitching the record together.", color: "plum", glyph: "✧", claimedAt: "2026-01-29T10:27:00.000Z" },
  { coord: "AB38", title: "Ink House", handle: "gall", url: null, bio: "Black, blacker, and one unfortunate purple.", color: "indigo", glyph: "♞", claimedAt: "2026-01-29T14:03:00.000Z" },
  { coord: "AY35", title: "East Watch", handle: "sentinel", url: null, bio: "Facing out, so you can face in.", color: "pine", glyph: "⚑", claimedAt: "2026-01-30T06:49:00.000Z" },
  { coord: "R6", title: "North Field Station", handle: "gale", url: "https://example.com/gale", bio: "Wind data nobody asked for.", color: "slate", glyph: "✦", claimedAt: "2026-01-30T12:58:00.000Z" },
];
