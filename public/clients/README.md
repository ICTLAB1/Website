# Customer logos

Files here are served at `/clients/<name>`, and a customer points at one
through `ClientLogo.logoUrl`. Most will not be committed here at all — the
admin panel uploads them, under **Customer logos → (the customer) → Logo**,
which is the route that does not need a redeploy.

Commit a file here only when it should ship with a fresh install.

## Before adding anything

A customer's mark is their property. Two things have to be true before one
reaches a visitor, and the code enforces the first:

1. **The row is published** — off by default, so a row created while somebody
   is still gathering artwork cannot appear halfway through.
2. **The use is lawful** — which no field can check.

Recording the permission — who granted it, where the evidence is, when it was
confirmed — is optional and worth doing anyway: those fields are the answer to
"who said we could?" when somebody asks. They used to gate the logo; the
business owner decided that recording a date per organisation is not how they
want to work, so the rule was changed rather than dates being invented to
satisfy it. In India the Emblems and
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

## What is here

Nine organisation emblems, supplied by the business on 29 August 2026 in
`TechZoid_Organisation_Logos_Final.zip`, prepared for the web by two operations
and no others: the uniform border each file carried was trimmed, and the
artwork was scaled down to a common height with its aspect ratio preserved
exactly. Neither alters an emblem. Nothing was recoloured, cropped into or
recomposed.

> `bsnl` · `ongc` · `nbcc` · `hal` · `delhi-police` · `drdo` · `bro` ·
> `indian-army` · `indian-air-force`

Lossless WebP rather than PNG. Several are detailed — the BRO mark is a
photograph of a painted board — and as PNG they ran to 80–110 KB each for
something that renders 48 pixels tall.

The pack also contained `HR_` variants at 1800px. They are not used: the pack's
own README calls them "enlarged, not newly authenticated official artwork", and
an upscale is the wrong source for a small mark.

All nine are published. `permissionReference` on each row records where the
artwork came from and what was done to it; the authorising person and date are
blank, by the owner's decision, and can be filled in at any time from
**Customer logos**.

## Deliberately not installed

`QCI` was in the pack and is not here. The Quality Council of India is an
accreditation body, not an organisation this business supplies, so its mark in
a wall captioned "organisations we have supplied" would be a category error —
and a quality-council mark on a supplier's site reads as a statement about that
supplier's own accreditation, which is a different claim needing its own
evidence. If it belongs anywhere it is beside the ISO certificates, and only
if that accreditation is real and current.
