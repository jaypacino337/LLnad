# Solanda

**Claim your plot of the web.**

Solanda is a single fixed map — 64 squares across, 64 down, 4,096 plots in total. A
visitor pans across the survey, picks an empty square, names it, gives it a
colour and a mark, and points it at their work. Every plot has a spreadsheet-style
address like `AF32`, its own page, and an entry in a public JSON register.

There is no feed and no ranking. The map shows what exists, in the order it was
built, and the only thing that decides your position is which square you took.

## What is in here

| Route | What it does |
| --- | --- |
| `/` | Landing page: live counts, a whole-map preview, how it works, latest claims |
| `/map` | The interactive survey — pan, zoom, keyboard navigation, and the claim flow |
| `/settlers` | Searchable, sortable, colour-filterable directory of every claim |
| `/plot/[coord]` | Permalink for one address, plus its nearest neighbours |
| `/manifesto` | Why the grid is fixed, what a claim means, and API notes |

### The map

The survey is a single pointer surface rather than 4,096 DOM nodes: the empty
ground is a CSS gradient, only claimed plots are rendered as elements, and the
cell under the pointer is derived from arithmetic. It stays smooth at any grid
size.

- Drag to pan, scroll to zoom (anchored on the cursor, so the plot under the
  pointer stays put)
- Arrow keys move a cursor, shift jumps eight plots, `Enter` selects, `+`/`-`
  zoom — the map is fully usable without a mouse
- `Go to AF32` jumps to any address
- Rulers track each axis of the pan, so the labels stay aligned
- Plot sizes are computed in real pixels instead of being CSS-scaled, which
  keeps the survey lines a crisp 1px at every zoom level

### Theming

Light and dark are two token sets on `<html data-theme>`, referenced through
Tailwind's `@theme inline`. A tiny inline script applies the stored choice before
first paint, and the toggle itself holds no React state — CSS picks the icon — so
there is no flash and nothing to rehydrate.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start   # production
npm run lint
```

Node 20 or newer. No database, no API keys, no external services — it runs as
soon as it is cloned.

## The register

Claims are stored as a single JSON document, written atomically (temp file plus
rename) with writes serialised so two concurrent claims cannot clobber each
other. On first run the file is created from the founding settlement in
`src/lib/seed.ts`, so a fresh install has a map worth looking at.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SOLANDA_DATA_DIR` | `./.data` | Where `plots.json` lives |
| `NEXT_PUBLIC_SITE_URL` | unset | Absolute URLs in metadata, `sitemap.xml`, `robots.txt` |

Everything that touches storage goes through `src/lib/store.ts`. Moving to
Postgres or SQLite means reimplementing that one module and nothing else.

## API

Reads are open, unkeyed and uncached.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/plots` | Every claim, newest first, plus a summary of remaining land |
| `GET` | `/api/plots/AF32` | One address; returns `claimed: false` for empty ground |
| `GET` | `/api/stats` | `total`, `claimed`, `available`, `settlers`, `latestClaimAt` |
| `POST` | `/api/plots` | Records a claim |

```bash
curl -X POST localhost:3000/api/plots \
  -H 'content-type: application/json' \
  -d '{"coord":"C7","title":"The Forge","handle":"tulla",
       "url":"example.com","bio":"Small tools, sharpened weekly.",
       "color":"moss","glyph":"✦"}'
```

`201` with the new plot, `400` with per-field messages, `409` if the plot is
already held, `429` if a client claims too fast.

**Write rules.** The register is append-only — a claim cannot be overwritten.
Input is normalised and checked server-side: handles are lowercased and stripped
of a leading `@`, URLs are parsed and forced to http/https, colours and glyphs
must be members of the curated sets in `src/lib/palette.ts`, and invisible
characters (control, zero-width, bidi-override) are removed so a title cannot
spoof another. Claims are rate limited per client, in-process — swap
`src/lib/rate-limit.ts` for a shared store before running more than one instance.

## Layout

```
src/
  app/
    page.tsx              landing
    map/                  interactive survey
    settlers/             directory
    plot/[coord]/         permalink + neighbours
    manifesto/            about, rules, API notes
    api/plots/            GET all, POST claim, GET one
    api/stats/            counts
    globals.css           design tokens for both themes
  components/
    land-map.tsx          the survey: pan, zoom, keyboard, selection
    claim-form.tsx        validated claim flow
    settler-directory.tsx search, sort, colour filter
    minimap.tsx           static whole-map preview
  lib/
    land.ts               grid geometry, address parsing
    store.ts              the register (swap this to change storage)
    validate.ts           server-side input rules
    palette.ts            plot colours and glyph set
    rate-limit.ts         per-client write limiter
```

## Deploying

A standard Next.js app — any Node host works. The only requirement is a
**writable, persistent** `SOLANDA_DATA_DIR`. On platforms with an ephemeral or
read-only filesystem the register will reset on redeploy, so point
`SOLANDA_DATA_DIR` at a mounted volume or reimplement `src/lib/store.ts` against a
managed database.

## Notes

The concept, code, copy and visual design here are original to this repository.
