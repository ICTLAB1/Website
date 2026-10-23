# TechZoid brand artwork

Supplied by the business on 23 August 2026 as `TECHZOID_Logo_Files.zip`. Only
one file from that pack is a master; everything else here is derived from it,
so there is a single source and the marks cannot drift apart.

## Not `public/brand/`

The directory is `brand-assets` for one reason, and it is worth knowing before
renaming it back: `next.config.ts` carries a legacy redirect
`/brand/:slug → /brands/:slug`, left over from the old site's URLs. It matches
any single segment, so a file at `/brand/techzoid-logo.png` is answered with a
**308 to `/brands/techzoid-logo.png`** and the browser shows a broken image.
Not a 404 — which is why it takes a moment to spot.

## What is here

| File | What it is |
|---|---|
| `techzoid-logo.png` | **The master.** 2167×725, RGBA, genuinely transparent (83% alpha-zero). Exactly as supplied. |
| `techzoid-logo-reversed.png` | The same lockup for dark grounds. Derived. |
| `techzoid-icon.png` | The aperture alone, 512×512, centred with padding. Derived. |

### The `.webp` derivatives are what the site serves

The four PNGs above are masters. The **pages reference the `.webp` cuts beside
them**, and `components/brand/logo.tsx` points at those rather than at the PNGs.

The reason is weight. The wordmark is 2167 px wide and renders at 303×44 in the
header; the reversed lockup renders at 191×64 in the footer. Between them they
were **1.85 MB on every page of the site** — 2.5 MB of the homepage's 3.2 MB
was PNG. As WebP at a sensible width they are 157 KB, and the page dropped from
3,240 KB to 1,546 KB with no visible change.

| Derivative | From | Width | Quality | Size |
|---|---|---|---|---|
| `techzoid-wordmark.webp` | `techzoid-wordmark.png` | 1200 | 90 | 72 KB (was 738 KB) |
| `techzoid-wordmark-reversed.webp` | `techzoid-wordmark-reversed.png` | 1200 | 90 | 68 KB (was 584 KB) |
| `techzoid-logo.webp` | `techzoid-logo.png` | 1000 | 82 | 257 KB (was 940 KB) |
| `techzoid-logo-reversed.webp` | `techzoid-logo-reversed.png` | 1000 | 82 | 85 KB (was 1,113 KB) |

Regenerate with `sharp`, resizing by **width only** so the height follows and
the master's aspect ratio is kept — 2167:314 for the wordmark, 2167:725 for the
lockup. `logo.tsx` declares those derived dimensions as the image's `width` and
`height`, which is what reserves the right box before the file arrives; change a
width here and change it there, or the header will jump as it loads.

Keep `alphaQuality: 100`. The marks are transparent and a lossy alpha channel
shows as a grey fringe on the charcoal footer, which is exactly where the
reversed cut is used.

The light lockup is converted for completeness and is not currently fetched by
any page — only the footer uses the strapline cut, and the footer is dark.

And derived into place elsewhere:

- `public/logo.png` — 900 px wide, for the quotation letterhead
  (`lib/pdf/assets.ts` looks for exactly this name) and for the `logo` property
  of the Organization schema.
- `src/app/icon.png` — the favicon.
- `src/app/apple-icon.png` — the iOS home-screen icon, on **white**: iOS
  composites onto its own ground and a transparent PNG arrives black.
- `public/og/techzoid-card.png` — the social share card.

## The reversed variant, and why it is not just "white"

The supplied letterforms are near-black and disappear on the charcoal footer.
The reversal lifts **only near-neutral dark pixels** towards white and leaves
everything with chroma alone — so the blue-to-orange aperture and the orange
ampersand come through untouched, and the circuit traces in the Z still read.
It is the same mark on a different ground, not a recoloured one.

Regenerating it means walking the pixels: keep a pixel if
`max(r,g,b) − min(r,g,b) ≥ 46`, otherwise map its luminance to `255 − lum×0.55`.

## What was in the pack and is not used

- **`TECHZOID_Logo.svg`** — not vector. It is a 1 MB base64 PNG inside an
  `<svg><image>` wrapper, so it scales no better than the PNG and costs more.
  If a true vector master exists, it would be worth having: the header lockup
  is currently a raster and would be sharper as paths.
- **`TECHZOID_Icon_1024.png`** — mis-cropped. Fragments of the Z's circuit
  traces bleed in on the left edge, the aperture is off-centre, and it is fully
  opaque on white rather than transparent. `techzoid-icon.png` was cut from the
  master instead.
- `TECHZOID_Logo.jpg`, `TECHZOID_Logo_High_Resolution.png` — the same lockup
  without an alpha channel. Nothing here needs a version that cannot sit on a
  coloured ground.
- `TECHZOID_Logo_Print.pdf` — for print suppliers, not for the web.

## If the logo changes

Replace `techzoid-logo.png` with the new master at the same path, then
regenerate the derived files. Everything else reads from those paths and needs
no code change. The one rule: **the mark must keep an O**, whether as the
aperture or as type — the site's wordmark once rendered as `TECHZID` in every
copy-paste and search-engine extraction because the letter existed nowhere in
the markup.
