# Brand logos

Files here are served at `/brands/<name>`, and a brand points at one through
its `logoUrl` — set in the seed, or from the admin panel under **Brands → (the
brand) → Logo**.

A brand with no file set keeps the lettered wordmark it has always had. That is
the intended fallback, not a gap to be filled with something approximate: a
logo that is not the publisher's actual artwork is worse than no logo, and on a
site that tells buyers who it is authorised to supply, it is worse than useless.

## What is here, and where it came from

Twenty-three marks, taken from [Simple Icons](https://simpleicons.org) v16.28.0
and recoloured to each brand's own published hex. Simple Icons releases the
icon files under CC0, which is what makes redistributing them possible; the
**trademarks remain the property of their owners**, and CC0 does not and cannot
grant any right in those. They are used here descriptively, to identify
products this business supplies.

Two changes are made to each file, and no others:

1. a `fill` on the root `<svg>` — the source files are monochrome and would
   otherwise render black;
2. a `viewBox` cropped to the artwork, by
   `node scripts/normalise-brand-logo.mjs`. **Run that after adding any file
   here.** Without it a wordmark inherits the icon set's square canvas and
   renders a few pixels tall; the script explains the mechanism.

To regenerate the set: `npm pack simple-icons`, take `icons/<slug>.svg`, set
`fill` from the `hex` field in `data/simple-icons.json`, then run the script.

## Artwork supplied by the business

Five files are PNG rather than SVG, because they are the publishers' own
artwork supplied through this business's partner relationships rather than
anything an icon set carries:

> `microsoft.png` · `adobe.png` · `hp.png` · `lenovo.png` · `acer.png`

Microsoft and Adobe are two of the publishers named below as unobtainable from
an icon set; these came from the right place instead. HP, Lenovo and Acer
previously used the Simple Icons marks, which are correct but monochrome
single-glyph versions — the supplied files are the full-colour lockups, so they
replaced them.

Each was trimmed of its transparent margin and scaled to 128 pixels tall, which
is four times the height they render at and keeps every one under 26 KB. The
originals are unmodified otherwise: no recolouring, no cropping into the
lockup, no recomposition. Several publishers' brand programmes prohibit exactly
that, and a mark altered by us is no longer the mark they licensed.

Two of them — Adobe and Microsoft — are stacked lockups, taller than they are
wide. They render legibly, but a horizontal variant would read better in a
32-pixel-tall slot; if the brand programme offers one, replace the file and
nothing else needs to change.

## What is deliberately missing

Simple Icons no longer carries several of the largest publishers, having
removed icons whose owners do not permit redistribution. Among the brands this
site supplies, that means:

> Oracle · IBM · Salesforce · Google Workspace · Corel · ESET · Sophos ·
> WatchGuard · CrowdStrike · HPE · APC · Logitech · SOLIDWORKS

These are **not** to be sourced from an icon site or a search engine. Each of
those publishers distributes its own artwork through its partner or brand-assets
programme, together with the rules for using it — which variant, at what minimum
size, with how much clear space, and next to which wording. Take the file from
there and upload it in the admin panel.

That is not pedantry about design. Several of those programmes tie logo use to
partner status, so using the mark is a claim about the relationship; a buyer in
a government or defence procurement office is exactly the reader who checks.

## What is accepted

- The file must live in this directory. Not a subdirectory, not a URL.
- `.svg`, `.png`, `.webp`, `.jpg` or `.avif`.
- The filename may contain letters, digits, dashes, underscores and dots.

Anything else is refused rather than rendered, because the value ends up in an
`src` attribute — see `src/lib/brand-logo.ts` and the tests beside it. Files
uploaded from the admin panel go to a different directory under stricter rules
again; the same file explains why.

## Practical notes

- SVG is preferred: one file that stays sharp everywhere.
- The mark renders at 36 px on brand cards and 20 px in the header strip, so a
  wordmark with fine lettering will not be legible — use the icon-only variant
  where the publisher provides one.
- Both places show the brand's name in text beside the mark, so a logo in a
  pale brand colour is legible-by-context rather than on its own. That is why
  the official colour is kept even where it is light against white.
- Files here are served publicly and cached hard. Change the filename rather
  than the contents when replacing one, or browsers will keep the old image.
