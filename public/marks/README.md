# Accreditation marks

Marks that say something about **TechZoid Technologies Private Limited** itself —
that it is registered with a programme, admitted to a marketplace, or certified
against a standard. Not to be confused with `public/brands/`, which holds the
logos of publishers and manufacturers whose products are in the catalogue.

Served from `/marks/`, and validated by `src/lib/mark-image.ts` before anything
stored in the database can reach an `src` attribute.

| File | Mark | Supplied by | Used where |
| --- | --- | --- | --- |
| `gem.webp` | Government e Marketplace (GeM) | The client, 2026-08 | The "Registered GeM seller" panel on the homepage, and the public-procurement note on `/hardware` |

## Before adding a mark here

A mark of this kind is a claim, not decoration. Two rules:

1. **Only where the site is already making the claim in words.** The GeM mark
   appears beside the two passages that state the GeM registration. It is
   deliberately not in the header, the footer, or on product cards, where it
   would read as an endorsement of whatever it sits next to.
2. **Only while the registration is current.** If the GeM seller registration
   lapses, remove the mark in the same change that removes the wording —
   `prisma/seed-data/pages.ts` and `src/app/hardware/page.tsx`.

## Source files

`gem.webp` is the artwork supplied by the client, trimmed to its bounding box
and resized to 400 px wide. It keeps its transparent background, so it sits on
the panel's own surface colour rather than carrying a white box with it.
