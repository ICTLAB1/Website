# Careers: the page now sends people to the HR portal

`/careers` no longer lists jobs or takes applications. Jobs, their details, the
application form and the resume upload live in the HR system at
https://hr.techzoidtechnologies.com/careers; applications go straight into it.
This site stores no applicant data.

## What changed

- **`/careers`** is a landing page: banner, why work here, how hiring works,
  teams, and a closing strip. Both "View open positions" buttons open the portal
  in the same tab (no `target="_blank"`). The one `mailto:` is
  `hr.preeti@techzoidtechnologies.com`.
- **Main menu.** A "Careers" item at the end of the top-level items, desktop and
  mobile (one row feeds both). It is last rather than "before Contact" because
  there is no top-level Contact — Contact is inside the About dropdown. Added by
  the `2026-11-careers-menu-item` content migration for the live database and by
  the seed for fresh ones.
- **Footer.** Already linked to `/careers` (Company column); unchanged.
- **Old role pages.** `/careers/<role>` used to be one page per vacancy kept in
  this site's database. They now 301 to `/careers`, and are out of the sitemap.
  The two that were indexed were Business Development Manager/Executive and
  Sales Executive - IT sales.
- **Search.** Title "Careers at TechZoid Technologies | Jobs in New Delhi" (used
  as written, without the site suffix), the description from the brief, and the
  site's default share image for Open Graph.

## Left alone, on purpose

The admin **Jobs** section, `src/lib/careers.ts`, its queries and tests are
untouched. Nothing on the public site reads them any more; they are there if the
in-site board is ever wanted back.

## Checking it

`npm run verify:careers` (against a seeded server) checks the page at 375, 768
and 1440px: one H1, four H2s, no sideways scroll, both portal buttons 44px or
taller and same-tab, no form or input, the menu item (desktop, mobile, last),
the footer link, and the role-page redirects.
