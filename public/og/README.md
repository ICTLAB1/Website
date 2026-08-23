# Social share card

`techzoid-card.png` — 1200×630. The image every link to this site unfurls into
on WhatsApp, LinkedIn, X, Slack and Facebook.

Referenced from `src/lib/seo.tsx` (`SOCIAL_CARD`), which puts it on the
`og:image` and `twitter:image` of every page built through `buildMetadata`.

## Why a PNG and not the logo

Two reasons, either of which is fatal on its own:

- **Aspect.** `public/logo.svg` is 520×150. Every platform crops to roughly
  1.91:1 and pads what does not fit, so a wordmark arrives as a thin strip
  floating in a grey box.
- **Format.** SVG is not accepted for `og:image` by Facebook, LinkedIn or X.
  They fetch the URL, fail to rasterise it, and fall back to no image at all.

## Regenerating it

The card is generated from this site's own lockup, colours and type — there is
no external design file, and nothing here was sourced from anywhere else. The
script that produced it is not committed, because it ran once; to change the
card, either drop a replacement PNG at this exact path and size, or re-render
one with Playwright at a 1200×630 viewport.

The one thing to keep: **the wordmark must contain the letter O**, whether as
the circular mark or as type. The mark stands in for it, and a card that spells
`TECHZID` is the same defect this repository has already had once.

## Replacing it with a designed asset

Drop a 1200×630 PNG at `public/og/techzoid-card.png` and nothing else needs to
change. If the dimensions change, update `SOCIAL_CARD` in `src/lib/seo.tsx` to
match — the width and height are declared in the tags, and a declared size that
disagrees with the file makes some scrapers skip the image.

Keep it under about 1 MB. WhatsApp in particular refuses larger images and
shows no preview at all rather than a slow one.
