# Careers: live jobs from the HR system

`/careers` shows the open jobs **live from the HR system's public feed**,
`https://hr.techzoidtechnologies.com/api/public/jobs`. Applications happen on
the HR portal; this site takes none and stores nothing about an applicant.

## How the jobs get on the page

- The page is rendered **on the server**. It reads the feed, caches the result
  for **60 seconds**, and puts the jobs in the HTML. A job HR opens or closes is
  here, or gone, within about a minute.
- **Nothing is copied.** No job is written to this site's files or database. The
  feed is the only source.
- The fetch has a **5-second timeout**. A failure is cached for the same minute,
  so an HR outage cannot make this site slow — one request in a minute pays for
  the timeout; the rest are instant.
- The browser never contacts the HR system, so its CORS rules are irrelevant to
  this page.

## What a visitor sees

| Feed | /careers | Home page | Menu |
| --- | --- | --- | --- |
| 1 or more jobs | a card per job; filter chips if there are 2+ departments; "View details" | a slim "We're hiring" strip above the footer | "Careers" with a count badge |
| 0 jobs | "No openings right now. Send your resume to hr.preeti@… and we'll keep it on file." | nothing | "Careers" |
| unreachable, or not a feed | "See current openings on our careers portal" + button | nothing | "Careers" |

Never a technical message. When a feed is down the visitor is sent to the portal.

## The menu badge

The header is on every page, so the count never holds one up: it waits at most
**1.5 seconds** and otherwise shows plain "Careers". On a cold cache with a
dead feed the first request waits about that long; the rest are instant.

## What the feed is trusted with

It is another system's output and is treated that way (`src/lib/hr-feed.ts`,
all tested):

- **Text is text.** Trimmed, control characters removed, length-capped, and only
  ever rendered as a React child, which escapes it. A job titled
  `<img onerror=…>` shows those characters. Nothing inserts feed text as HTML.
- **Links go to the portal or nowhere.** `url` and `apply_url` are used only if
  they are https on `hr.techzoidtechnologies.com` (no credentials, no port).
  Anything else becomes the portal's careers page. The apply link falls back to
  the job's own page first.
- **One bad job does not break the list.** A job with no id or title is skipped;
  one with an odd optional field is shown without it. A response that is not a
  feed is "unavailable".
- The number shown is the number of usable jobs, not the feed's `count`.

## Search

Title "Careers at TechZoid Technologies | Jobs in New Delhi", the description
from the brief, the site's default share image. **No `JobPosting` markup on this
site**: the portal's own job pages carry it, and a second copy on another domain
would be a duplicate for Google. A test fails if it ever appears here.

## What happened to the old pages

`/careers` used to be a job board backed by this site's database; the per-role
pages `/careers/<role>` were indexed. They now 301 to `/careers` and are out of
the sitemap. The admin **Jobs** section, `src/lib/careers.ts` and its queries
are untouched and unused by the public site.

## Testing against a copy of the feed

`CAREERS_FEED_URL` overrides the feed address, for testing only; it is unset in
production and nothing needs configuring.

```
node scripts/verify/lib/mock-hr-feed.mjs 4010          # /jobs /empty /hang /bad
CAREERS_FEED_URL=http://localhost:4010/jobs  next start -p 3101
SCENARIO=jobs  BASE=http://localhost:3101 npm run verify:careers
```

Run it once per scenario (`jobs`, `empty`, `down`) against a server started with
the matching URL. It checks the page at 375, 768 and 1440px, the filters,
"View details", the badge, the strip, the redirects and the sitemap.
