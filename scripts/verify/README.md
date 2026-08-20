# Verification scripts

Browser-driven checks that run against a **running production build**
(`npm run build && npm run start`), using the Chromium that Playwright resolves
from `PLAYWRIGHT_BROWSERS_PATH`.

They are deliberately separate from `npm test` (which is fast, hermetic Vitest)
because they need a server and a browser.

| Script             | What it asserts                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `responsive.mjs`   | No horizontal page scroll and no console errors, across 11 pages × 8 viewport widths (375–1920). |
| `accessibility.mjs`| Zero axe-core violations (WCAG 2.1 A/AA + best practice) across 14 pages × 2 widths.              |
| `interactions.mjs` | Mobile drawer, search autocomplete, basket, quote submission, catalogue filters, keyboard paths. |

Run them with the server up:

```bash
npm run build
npm run start &
npm run verify          # all three in sequence
```

`responsive.mjs` writes screenshots to `$SHOTS` when that variable is set.
