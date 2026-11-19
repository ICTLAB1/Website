# Enquiry form on five landing pages

`/microsoft-365`, `/adobe-licensing`, `/autodesk-licensing`, `/enterprise-it-hardware`
and `/corporate-it-solutions` open with a seven-field enquiry form directly under
the page heading: company name, contact person, designation, corporate email,
phone, product interested in, estimated quantity or licences.

- The form posts to the existing requirement action, so a lead is an ordinary
  `REQUIREMENT` enquiry: same reference, staff notification, acknowledgement email
  and `quote_form_submit` conversion event. Source tags: `landing_<slug>`.
- Designation is stored in the requirement JSON (no DB migration) and appears in
  the enquiry text and staff email. Designation and quantity are enforced
  server-side only when the hidden `form=landing` field is present.
- Config (products per page, source tags): `src/lib/lead-pages.ts`.
- Four pages are new (content migration `2026-11-lead-landing-pages`) and are
  linked from the footer (`2026-11-link-the-lead-pages`). `/microsoft-365` keeps
  its content; only its bottom form moved to the top.
- Fields stay filled after a validation error (controlled inputs).

## Known trade-offs
- The new pages overlap `/adobe`, `/autodesk`, `/hardware`, `/solutions`
  (cannibalisation risk). To hold them back from search, set them to noindex.
- Page copy is drafted from facts already on the site; owner review advised.
- "Corporate email" is not blocked against free providers.
- Verification: `BASE=http://localhost:3000 node scripts/verify/lead-forms.mjs`
  (writes test rows; the form allows 10 submissions an hour per visitor).
