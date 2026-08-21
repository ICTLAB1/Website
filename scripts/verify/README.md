# Verification scripts

Browser-driven checks that run against a **running production build**
(`npm run build && npm run start`), using the Chromium that Playwright resolves
from `PLAYWRIGHT_BROWSERS_PATH`.

They are deliberately separate from `npm test` (which is fast, hermetic Vitest)
because they need a server and a browser.

| Script              | What it asserts                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `responsive.mjs`    | No horizontal page scroll and no console errors, across 12 pages × 11 viewport widths (320–1920), plus every navigation panel staying inside the viewport at 5 desktop widths. |
| `accessibility.mjs` | Zero axe-core violations (WCAG 2.1 A/AA + best practice) across 16 pages × 2 widths.             |
| `interactions.mjs`  | Mobile drawer, search autocomplete, basket, quote submission, catalogue filters, keyboard paths. |
| `faq.mjs`           | The FAQ accordion: collapsed on arrival, the whole row clickable, a plus that becomes a minus rather than a cross, expanded state in the accessibility tree, a focus indicator that is not the form-input ring, and an animated open. |
| `lifecycle.mjs`     | The full commercial chain: enquiry → quotation → discount → issue → accept → order → fulfilment → licences and renewals, across a customer and a staff session. |
| `settings-editor.mjs` | The business-identity editor: a saved grievance officer or address reaches the public site with no redeploy, a malformed GSTIN or email is refused with a field-level message, and clearing a field hands it back to the environment rather than blanking it. |
| `crawl.mjs`         | Every public page loads without a console error, every internal link resolves, and no page leaks a configuration warning, an environment variable name, draft text, or the reversed supplier terminology. |
| `seo.mjs`           | Title, meta description, canonical, `og:title` and exactly one `h1` on every page in the sitemap, with no duplicate titles or descriptions and no sitemap entry marked `noindex`. |

`crawl.mjs` and `seo.mjs` read the rendered site, which is the only place the
source and the database meet: the unit tests can scan `src` and `prisma`, but
copy that lives in the CMS reaches a visitor without passing through either.

**Clear `.next/cache` before running these after changing content out of band.**
The persistent data cache survives a rebuild, so a page edited with a script
rather than through the admin panel keeps serving its previous text until the
tag is invalidated or the entry ages out — which reads exactly like a fix that
did not work.

Run them with the server up:

```bash
npm run build
npm run start &
npm run verify          # all three in sequence
```

`responsive.mjs` writes screenshots to `$SHOTS` when that variable is set.
