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
PNG trimmed of its uniform border and scaled to 200 pixels tall — which is
what `scripts/prepare-client-logo.mjs` does. Do not
recolour, crop into, or recompose a mark — most brand programmes prohibit it,
and an altered mark is no longer the one that was licensed.

## What is here

Thirteen organisation emblems, prepared for the web by two operations and no
others: the uniform border each file carried was trimmed, and the artwork was
scaled to a common height with its aspect ratio preserved. Neither alters an
emblem. Nothing was recoloured, cropped into or recomposed.

`scripts/prepare-client-logo.mjs` does both, so the next batch is one command
per file rather than a set of steps somebody has to remember.

Nine came from `TechZoid_Organisation_Logos_Final.zip` on 29 August 2026:

> `bsnl` · `ongc` · `nbcc` · `hal` · `delhi-police` · `drdo` · `bro` ·
> `indian-army` · `indian-air-force`

Four more from `claude_government_client_logos.zip`:

> `sardar-patel-university` · `nagpur-metro` · `rites` · `barc`

Lossless WebP rather than PNG. Several are detailed — the BRO mark is a
photograph of a painted board — and as PNG they ran to 80–110 KB each for
something that renders 48 pixels tall.

The pack also contained `HR_` variants at 1800px. They are not used: the pack's
own README calls them "enlarged, not newly authenticated official artwork", and
an upscale is the wrong source for a small mark.

All thirteen are published. `permissionReference` on each row records where the
artwork came from and what was done to it; the authorising person and date are
blank, by the owner's decision, and can be filled in at any time from
**Customer logos**.

## Deliberately not installed

**HUDCO.** The supplied file is a marketing banner, not a mark: the hudco logo
sits over a grey cityscape with a captioned bar beneath it, on an opaque plate.
At the size a belt renders a mark it is a grey smear, and getting the logo out
of it means cropping into the picture — which is the line the preparation
script does not cross. The row is on file with no artwork, which keeps it off
the site. The file to ask for is the mark on its own.

**The National Security Guard.** Never supplied as a file; it arrived pasted
into a conversation, which is a picture of a mark rather than the mark.

**The State Emblem of India.** `Government_of_India_Emblem.png` was in the
second pack. It is not an organisation this business supplies — it is the
national emblem — and it is the clearest case in the Emblems and Names
(Prevention of Improper Use) Act, 1950, which names it specifically.

**IRCON.** There is no IRCON row and no IRCON file. The second pack contains
`IRCON.png`, and the image inside it is the RITES mark. It is installed as
`rites`, an organisation the business had already named. A filename is not
evidence of a customer relationship.

`QCI` was in the pack and is not here. The Quality Council of India is an
accreditation body, not an organisation this business supplies, so its mark in
a wall captioned "organisations we have supplied" would be a category error —
and a quality-council mark on a supplier's site reads as a statement about that
supplier's own accreditation, which is a different claim needing its own
evidence. If it belongs anywhere it is beside the ISO certificates, and only
if that accreditation is real and current.
