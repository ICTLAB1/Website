# Customer logos

Files here are served at `/clients/<name>`, and a customer points at one
through `ClientLogo.logoUrl`. Most will not be committed here at all — the
admin panel uploads them, under **Customer logos → (the customer) → Logo**,
which is the route that does not need a redeploy.

Commit a file here only when it should ship with a fresh install.

## Before adding anything

A customer's mark is their property. Three things have to be true before one
reaches a visitor, and the code enforces the first two:

1. **Permission is recorded** — who granted it, where the evidence is, and the
   date it was confirmed. `lib/client-logo` will not show a mark without a
   confirmed date.
2. **The row is published** — off by default, even once permission is
   recorded.
3. **The use is lawful** — which no field can check. In India the Emblems and
   Names (Prevention of Improper Use) Act, 1950 bars using a scheduled name or
   emblem, including those of the armed forces and the national emblem, "for
   the purpose of any trade, business, calling or profession". A supplier's
   marketing page is that purpose, and because the bar is statutory the
   department concerned cannot waive it by letter. Permission from a customer
   is necessary; for a public body it is not always sufficient.

The organisations this business has supplied are already named, in text, on the
homepage. Naming a customer factually and reproducing their emblem are
different acts under that Act, and the text list is not affected by any of the
above.

## Format

Same as `public/brands/`: SVG where the organisation publishes one, otherwise
PNG trimmed of its transparent margin and scaled to 128 pixels tall. Do not
recolour, crop into, or recompose a mark — most brand programmes prohibit it,
and an altered mark is no longer the one that was licensed.
