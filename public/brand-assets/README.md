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
