# Brand logos

Put a publisher's logo file here, then point the brand at it in the admin
panel: **Brands → (the brand) → Logo file**, e.g. `/brands/microsoft.svg`.

A brand with no file set keeps the lettered wordmark it has always had. That is
the intended fallback, not a gap to be filled with something approximate — a
logo that is not the publisher's actual artwork is worse than no logo.

## What is accepted

- The file must live in this directory. Not a subdirectory, not a URL.
- `.svg`, `.png`, `.webp`, `.jpg` or `.avif`.
- The filename may contain letters, digits, dashes, underscores and dots.

Anything else is refused rather than rendered, because the value ends up in an
`src` attribute — see `src/lib/brand-logo.ts` and the tests beside it.

## Getting the files

Publishers distribute their own logos through their partner programmes, along
with the rules for using them — minimum sizes, clear space, and which variant
may be shown next to which wording. Take the files from there rather than from
a search engine: the wrong variant, or one squashed to fit, is the kind of
detail an enterprise buyer reads as carelessness.

Nothing in this repository ships anyone's trademarked artwork.

## Practical notes

- SVG is preferred: one file that stays sharp everywhere.
- The mark renders at 36 px on brand cards and 20 px in the header strip, so
  a wordmark with fine lettering will not be legible — use the icon-only
  variant where the publisher provides one.
- Files here are served publicly and cached hard. Change the filename rather
  than the contents when replacing one, or browsers will keep the old image.
