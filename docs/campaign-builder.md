# Campaign builder — phase A (banners and pop-ups)

Admin → **Campaigns** (`/admin/banners`). Write a message, choose how it is
shown, choose where and when, switch it on. Nothing needs a deploy.

## What you set

| Field | Meaning |
| --- | --- |
| Shown as | **Banner** (slim bar under the menu) or **Pop-up** (box over the page) |
| Message / heading / button | The words. A pop-up can have a heading; a button needs both a label and a link |
| Colour | Information, Promotion, Warning (banners) |
| Show on these pages | One per line. `/products/*` = that section and everything in it. Empty = every public page |
| Starts / Ends | **India time.** Down to the minute. It starts and stops itself |
| After a visitor closes it | Show again after a day · never again · on their next visit |
| Pop-up delay | Seconds after arrival before a pop-up opens (default 4) |
| Priority | Lowest number wins if several apply to one page |
| Switched on | Master switch |

Only one banner and one pop-up show on any page.

## Rules the code enforces (not left to whoever fills in the form)

- **India time.** The old date field read "20 Nov" as UTC midnight (05:30 IST),
  which is how the Diwali greeting ran past its last day. Campaigns use a
  date-and-time field stored as the exact instant; the list shows it as IST.
- **The server decides if it is running**, against the real clock, on every
  request. Only the *rows* are cached (5 min, and cleared the moment you save),
  never "is it live", so a campaign cannot outlive its end time.
- **Pop-ups stay off pages where someone is mid-task** — sign-in, register,
  password reset, checkout, enquiry, contact, requirement, uploads, order
  tracking, account — even if you list the page. **Nothing** shows on `/admin`,
  `/api` or `/documents`. A banner is allowed on form pages; a pop-up is not.
- **Links** may only be an on-site path or `https://`. `javascript:`, `//host`
  and `http://` are dropped at render time, and a label with no link (or the
  reverse) shows no button.
- **No layout shift.** The banner is rendered by the server in the page's flow,
  so it is in the first paint (measured CLS 0.0000). A pop-up is an overlay and
  takes no space. A banner someone has closed is not rendered at all — the
  dismissal is a cookie the server can read.
- **A pop-up is a real dialog**: focus moves in and is held, Escape / backdrop /
  × close it, focus goes back where it came from.
- **Editing a campaign shows it again** to people who closed the old version.

## Dismissal cookie

`tz_cmp` (one year; "once" and "once a day") and `tz_cmp_s` (the visit; "every
visit"). Each holds only campaign ids and timestamps — nothing personal. It
exists solely to honour the visitor's own click on ✕, so it is not a tracking
cookie.

## Analytics

GA4 events `campaign_view`, `campaign_click`, `campaign_dismiss` with
`campaign_id`, `campaign_format` and `page_path`. They go through the existing
consent mode, so nothing is sent until the visitor has agreed.

## Safety of the migration

Additive only: two enums and five new columns, all nullable or defaulted
(`prisma migrate diff` against the schema: no difference). The old *Banner*
feature had an admin screen and **no renderer**, so any rows from it have no
`format` and are never shown — turning this on cannot light up anything old.

## Not in this phase

Coupons at checkout (phase B); quote integration, campaign↔coupon links,
usage reports and bulk codes (phase C). A campaign can already link to any page
or to `/enterprise` etc.; it cannot yet carry a code.
