# Solanda

**Claim your plot of the web.**

Solanda is a single fixed map — 64 squares across, 64 down, 4,096 plots in total.
A visitor pans across the survey, picks an empty square, names it, gives it a
colour and a mark, and points it at their work. Every plot has a
spreadsheet-style address like `AF32`, its own page, its own social card, and an
entry in a public JSON register.

There is no feed and no ranking. The map shows what exists, in the order it was
built, and the only thing that decides your position is which square you took.

## What is in here

| Route | What it does |
| --- | --- |
| `/` | Landing page: live counts, a whole-map preview, how it works, latest claims |
| `/map` | The interactive survey — pan, zoom, keyboard navigation, and the claim flow |
| `/settlers` | Searchable, sortable, colour-filterable directory of every claim |
| `/plot/[coord]` | Permalink for one address, its neighbours, and the owner's manage panel |
| `/manifesto` | Why the grid is fixed, what a claim means, and API notes |
| `/feed.xml` | RSS of new claims |

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

### Ownership without accounts

There is no sign-up. Claiming a plot returns a **claim key**, shown exactly
once, and that key is the only proof of ownership:

- it is stored only as a SHA-256 hash, so a leaked register cannot be used to
  take over anybody's plot;
- it is compared in constant time, so a wrong key cannot be narrowed down by
  timing;
- it is sent in an `x-claim-key` header, never in a URL;
- with it, an owner can edit their plot or hand it back — and without it, nobody
  can, including whoever runs the server.

The founding settlement in `src/lib/seed.ts` has no keys at all, so those plots
can be read but never changed. Addresses and handles are fixed once claimed;
everything else is editable.

### Theming

Light and dark are two token sets on `<html data-theme>`, referenced through
Tailwind's `@theme inline`. A tiny inline script applies the stored choice before
first paint, and the toggle itself holds no React state — CSS picks the icon — so
there is no flash and nothing to rehydrate.

### Social cards

`/opengraph-image` renders the live map — real claims, real counts — and each
plot gets its own card showing its mark, colour, title and holder. Both are
generated at request time from the register, so a shared link is never stale.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Test suite (node:test, no test framework to install) |
| `npm run typecheck` | `tsc --noEmit` over the app and the tests |
| `npm run lint` | ESLint |
| `npm run check` | All four, in the order CI runs them |

Node 20 or newer. No database, no API keys, no external services — it runs as
soon as it is cloned.

### Tests

Tests are plain `node:test` files run through Node's built-in TypeScript
support, so there is no test framework, no transpile step and no extra
dependency. `tests/resolve-ts.mjs` is a small resolver hook that lets the tests
import the app's extensionless modules directly, keeping that seam entirely on
the test side.

They cover grid geometry and address parsing, every input rule, the rate
limiter's sliding window, claim-key hashing and comparison, and the store —
including persistence across a restart, two claims racing for one address, and
the guarantee that a key hash never reaches a caller.

## The register

Claims are stored as a single JSON document, written atomically (temp file plus
rename) with writes serialised so two concurrent claims cannot clobber each
other. On first run the file is created from the founding settlement, so a fresh
install has a map worth looking at.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SOLANDA_DATA_DIR` | `./.data` | Where `plots.json` lives |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute URLs in social cards, `sitemap.xml`, `feed.xml` |

Copy `.env.example` to `.env.local` to change either. Everything that touches
storage goes through `src/lib/store.ts`; moving to Postgres or SQLite means
reimplementing that one module and nothing else.

## API

Reads are open, unkeyed and uncached. Writes need the claim key.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/plots` | Every claim, newest first, plus a summary of remaining land |
| `GET` | `/api/plots/AF32` | One address; returns `claimed: false` for empty ground |
| `GET` | `/api/stats` | `total`, `claimed`, `available`, `settlers`, `latestClaimAt` |
| `POST` | `/api/plots` | Records a claim, and returns the claim key once |
| `PATCH` | `/api/plots/AF32` | Edits a plot you hold |
| `DELETE` | `/api/plots/AF32` | Hands a plot back to the pool |

```bash
# Claim it. Keep the claimKey in the response — it is not shown again.
curl -X POST localhost:3000/api/plots \
  -H 'content-type: application/json' \
  -d '{"coord":"C7","title":"The Forge","handle":"tulla",
       "url":"example.com","bio":"Small tools, sharpened weekly.",
       "color":"moss","glyph":"✦"}'

# Change your mind.
curl -X PATCH localhost:3000/api/plots/C7 \
  -H 'content-type: application/json' \
  -H 'x-claim-key: YOUR_KEY' \
  -d '{"title":"The Old Forge","url":""}'

# Give it back.
curl -X DELETE localhost:3000/api/plots/C7 -H 'x-claim-key: YOUR_KEY'
```

Status codes: `201` on claim, `200` on edit, `400` with per-field messages,
`401` when a key is missing, `403` on a wrong key or a founding plot, `404` for
an unclaimed address, `409` when a plot is already held, `429` when a client
writes too fast.

**Write rules.** Input is normalised and checked server-side: handles are
lowercased and stripped of a leading `@`, URLs are parsed and forced to
http/https, colours and glyphs must be members of the curated sets in
`src/lib/palette.ts`, and invisible characters (control, zero-width,
bidi-override) are removed so a title cannot spoof another. A `PATCH` only
touches the fields it names, and can never change an address or a handle.

Rate limiting is per client and in-process, with a tight bucket for claims and a
looser one for edits — swap `src/lib/rate-limit.ts` for a shared store before
running more than one instance.

## Layout

```
src/
  app/
    page.tsx              landing
    map/                  interactive survey
    settlers/             directory
    plot/[coord]/         permalink, neighbours, manage panel, social card
    manifesto/            about, rules, API notes
    api/plots/            GET all, POST claim, GET/PATCH/DELETE one
    api/stats/            counts
    opengraph-image.tsx   social card rendered from live data
    feed.xml/             RSS of new claims
    globals.css           design tokens for both themes
  components/
    land-map.tsx          the survey: pan, zoom, keyboard, selection
    claim-form.tsx        validated claim flow
    plot-manager.tsx      edit and release, authorised by claim key
    settler-directory.tsx search, sort, colour filter
    minimap.tsx           static whole-map preview
  lib/
    land.ts               grid geometry, address parsing
    store.ts              the register (swap this to change storage)
    keys.ts               claim key generation, hashing, comparison
    validate.ts           server-side input rules
    palette.ts            plot colours and glyph set
    rate-limit.ts         per-client write limiter
tests/                    node:test suite
```

## Deploying

```bash
docker compose up --build
```

The compose file mounts a named volume at `/data` and points
`SOLANDA_DATA_DIR` at it, which is the one thing that matters: **the register
must live on storage that survives a redeploy.** The image is a multi-stage
build on Next's standalone output, runs as a non-root user, and has a
healthcheck against `/api/stats`.

Any Node host works too — it is a standard Next.js app. On a platform with an
ephemeral or read-only filesystem, point `SOLANDA_DATA_DIR` at a mounted volume
or reimplement `src/lib/store.ts` against a managed database, or every claim
will be lost on the next deploy.

CI runs typecheck, lint, tests and a production build on every push.

## Notes

The concept, code, copy and visual design here are original to this repository.
