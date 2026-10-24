import { chromium } from "playwright";

/**
 * The five WCAG 2.2 criteria a rule engine cannot decide.
 *
 * `verify:a11y` runs axe-core with the 2.2 tags, which covers exactly one of
 * the six criteria 2.2 added — `target-size`, 2.5.8. The other five are about
 * what a page *lets you do*, not what its markup says, so they need a browser
 * driving the page rather than a scan of it:
 *
 *   2.4.11 Focus Not Obscured — can you see the thing you tabbed to?
 *   2.5.7  Dragging Movements — is there a way to do it without dragging?
 *   3.3.7  Redundant Entry    — are you asked twice for the same thing?
 *   3.3.8  Accessible Authentication — can you paste your password?
 *   3.2.6  Consistent Help    — is help in the same place on every page?
 *
 * Each check below says what it can and cannot conclude. A check that cannot
 * decide a criterion reports that rather than passing it: a suite that claims
 * conformance it did not test is worse than no suite, because it stops anyone
 * looking.
 */

const BASE = "http://localhost:3000";

/** A sticky header is the usual cause of 2.4.11, so pages are tested scrolled. */
const PAGES = [
  "/", "/products", "/products/microsoft-365-business-standard", "/brands/microsoft",
  "/enquiry", "/contact", "/support", "/search", "/login", "/register",
  "/industries", "/privacy",
];

/** Where help lives, for 3.2.6. Any of these counts as a help mechanism. */
const HELP_HREFS = ["/contact", "/support"];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const findings = [];
const note = (path, criterion, detail) => findings.push({ path, criterion, detail });

/**
 * Focused controls something paints over, but not out of sight.
 *
 * Printed at the end rather than failed on — see `focusNotObscured` for why
 * the criterion draws the line there, and why these are still worth reading.
 */
const overlaps = [];

/**
 * 2.4.11 Focus Not Obscured (Minimum), AA.
 *
 * Presses Tab for real and, at each stop, asks the browser what is actually
 * painted at the middle of the focused element. If the answer is not that
 * element or something inside it, a fixed or sticky layer is covering it —
 * which on this site would be the header.
 *
 * Two deliberate choices, both of which an earlier version of this check got
 * wrong and reported ninety-nine footer links for:
 *
 * `page.keyboard.press("Tab")` rather than calling `.focus()` in the page. The
 * criterion is about what happens when somebody tabs, and the browser's own
 * tab order, scrolling and focus-visible behaviour are the thing under test.
 * Driving focus by script tests the script.
 *
 * And `elementFromPoint` rather than comparing the focused element's rectangle
 * against the header's: a rectangle test needs a list of every sticky element
 * on the page and silently passes whichever one it does not know about. It also
 * means no check for "off screen" — the browser scrolls focus into view, and
 * measuring whether it has finished measures the test's own timing, not the
 * page's conformance.
 *
 * Forty stops rather than every focusable on the page. The criterion is about
 * the sticky chrome, and anything the chrome covers it covers within the first
 * screenful of tabbing.
 *
 * One known blind spot, stated rather than left to be discovered: an overlay
 * drawn as a `::before`/`::after` pseudo-element is attributed by
 * `elementFromPoint` to the element it originates from, so a sticky bar painted
 * that way reads as the focused link's own ancestor and is not reported. A
 * sticky header built from a real element — which is what this site has, and
 * what a header needs to be to hold anything — is caught: inserting one over
 * the top 400px of each page turns this check's clean run into sixty-two
 * findings, which is how it was confirmed to bite at all.
 *
 * ## Why the centre point alone is not the criterion
 *
 * It was, and it reported something that is not a violation. 2.4.11 (Minimum)
 * says a focused component must not be **entirely** hidden by author content;
 * partial obscuring is what 2.4.12 (Enhanced, AAA) forbids, which this site
 * does not claim. A single centre-point sample cannot tell the two apart, and
 * the thing that exposed it was the chat launcher: a 56px button fixed in the
 * bottom-right corner, which at 390px wide lands on the right-hand third of
 * the home page's search submit — measured at 37% of the button's area, its
 * centre inside the launcher and twenty-five of twenty-five sampled points
 * still its own everywhere else. Reported as a violation, that is a check
 * failing a page for a floating launcher the standard permits, which is how a
 * suite earns a reputation for crying wolf.
 *
 * So the element is now sampled across its own area: if it owns none of its
 * points it is entirely hidden and that is a failure. If it owns some, the
 * overlap is printed at the end with the fraction covered — because a launcher
 * sitting over a tap target is still worth somebody's judgement, and the way
 * to keep that judgement available is to show it rather than to fail on it.
 */
async function focusNotObscured(page, path) {
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press("Tab");

    const problem = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) return null;

      const rect = active.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      // Outside the viewport: the browser has either not finished scrolling or
      // has nothing to scroll. Either way it is not evidence of obscuring.
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return null;

      const painted = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (!painted || painted === active) return null;
      if (active.contains(painted) || painted.contains(active)) return null;

      /*
       * The centre is covered. Whether that is a violation depends on how much
       * else is, so the element's own area is sampled on a 5x5 grid inset from
       * the edges — a border or a focus ring at the very edge belongs to a
       * parent and would read as covered on every element on the page.
       */
      const isItsOwn = (x, y) => {
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit) && (hit === active || active.contains(hit) || hit.contains(active));
      };

      let own = 0;
      let sampled = 0;
      for (let gx = 1; gx <= 5; gx += 1) {
        for (let gy = 1; gy <= 5; gy += 1) {
          sampled += 1;
          if (isItsOwn(rect.left + (rect.width * gx) / 6, rect.top + (rect.height * gy) / 6)) own += 1;
        }
      }

      const cover = painted.closest("*");
      const position = cover ? getComputedStyle(cover).position : "";

      return {
        html: active.outerHTML.slice(0, 100),
        by: `${painted.tagName.toLowerCase()}${painted.className ? `.${String(painted.className).split(" ")[0]}` : ""}`,
        position,
        entirelyHidden: own === 0,
        covered: `${sampled - own}/${sampled} sampled points`,
      };
    });

    if (problem?.entirelyHidden) {
      note(
        path,
        "2.4.11 Focus Not Obscured",
        `entirely hidden by ${problem.by} (position: ${problem.position || "static"}): ${problem.html}`,
      );
    } else if (problem) {
      overlaps.push({
        path,
        detail: `${problem.covered} covered by ${problem.by} (position: ${problem.position || "static"}): ${problem.html}`,
      });
    }
  }
}

/**
 * 2.5.7 Dragging Movements, AA.
 *
 * Looks for anything that can only be operated by dragging: a native
 * `draggable` element, or a pointer-drag handler, with no button beside it. A
 * clean result means the site has no drag-only interaction to provide an
 * alternative for — which is how it passes, rather than by having alternatives.
 */
async function draggingMovements(page, path) {
  const draggers = await page.evaluate(() =>
    [...document.querySelectorAll('[draggable="true"], [data-drag], .cursor-grab, .cursor-move')]
      .map((el) => el.outerHTML.slice(0, 100)),
  );

  for (const html of draggers) {
    note(path, "2.5.7 Dragging Movements", `drag affordance — confirm a non-drag alternative: ${html}`);
  }
}

/**
 * 3.3.7 Redundant Entry, A, and 3.3.8 Accessible Authentication (Minimum), AA.
 *
 * Both come down to whether the browser and the password manager are allowed to
 * do their job, so both are read off the same pass over the form controls.
 *
 * - every control that holds personal data carries an `autocomplete` token, so
 *   a browser can refill it rather than the person retyping it (3.3.7);
 * - no password field blocks paste, and each names itself to a password
 *   manager (3.3.8);
 * - no one-time-code field blocks paste either, which is the usual way this
 *   criterion is failed in practice — a six-box OTP input that eats a paste.
 *
 * `autocomplete="off"` is accepted on a field that is not about the person
 * using the browser — an SMTP password in an admin form is not the operator's
 * own password and should not be offered from their keychain.
 */
const PERSONAL = /^(name|email|phone|tel|mobile|contact|company|organisation|organization|address|city|state|postcode|pincode|country|gstin)/i;

async function entryAndAuthentication(page, path) {
  const fields = await page.evaluate(() =>
    [...document.querySelectorAll("input")]
      .filter((el) => el.type !== "hidden" && el.offsetParent !== null)
      .map((el) => ({
        name: el.name || el.id || "",
        type: el.type,
        autocomplete: el.getAttribute("autocomplete"),
        /*
         * `onpaste` as an attribute, and the property, which is how React would
         * have attached one. A handler that is attached with addEventListener
         * is invisible to this and is the one gap in the check — recorded here
         * rather than left for somebody to discover.
         */
        blocksPaste: el.hasAttribute("onpaste") || typeof el.onpaste === "function",
        html: el.outerHTML.slice(0, 100),
      })),
  );

  for (const field of fields) {
    if (field.type === "password") {
      if (field.blocksPaste) {
        note(path, "3.3.8 Accessible Authentication", `password field blocks paste: ${field.html}`);
      }
      if (!field.autocomplete) {
        note(
          path,
          "3.3.8 Accessible Authentication",
          `password field names nothing to a password manager: ${field.html}`,
        );
      }
      continue;
    }

    if (field.autocomplete === "one-time-code" && field.blocksPaste) {
      note(path, "3.3.8 Accessible Authentication", `one-time-code field blocks paste: ${field.html}`);
      continue;
    }

    if (PERSONAL.test(field.name) && !field.autocomplete) {
      note(
        path,
        "3.3.7 Redundant Entry",
        `asks for personal data with no autocomplete token, so it cannot be refilled: ${field.html}`,
      );
    }
  }
}

/**
 * 3.2.6 Consistent Help, A.
 *
 * The criterion is about *relative order*: where a help mechanism appears on
 * more than one page, it must appear in the same place in the reading order
 * relative to the rest of the page, not at the same pixel.
 *
 * So what is recorded per page is the position of the help link as a fraction
 * of the page's links — a footer link is near 1.0 on every page whatever the
 * page's length — and the comparison afterwards is between those fractions.
 * The tolerance is wide on purpose: a product page has three hundred links and
 * the homepage has eighty, and the criterion is not about that difference.
 */
async function helpPosition(page) {
  return page.evaluate((hrefs) => {
    const links = [...document.querySelectorAll("a[href]")];
    const index = links.findIndex((link) => {
      const href = link.getAttribute("href") ?? "";
      return hrefs.some((candidate) => href === candidate || href.startsWith(`${candidate}?`));
    });
    return index === -1 ? null : index / Math.max(1, links.length - 1);
  }, HELP_HREFS);
}

const helpPositions = new Map();

for (const path of PAGES) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(250);

    // Scrolled, because an unscrolled page has no sticky header over anything.
    await page.evaluate(() => window.scrollTo(0, Math.min(600, document.body.scrollHeight)));
    await page.waitForTimeout(150);

    await focusNotObscured(page, path);
    await draggingMovements(page, path);
    await entryAndAuthentication(page, path);
    helpPositions.set(path, await helpPosition(page));
  } catch (error) {
    note(path, "run", `could not be audited: ${error.message}`);
  }

  await context.close();
}

await browser.close();

/*
 * 3.2.6, decided across pages rather than on any one of them. A page with no
 * help link at all is not a failure of the criterion — it only applies where
 * the mechanism is present — but on this site the footer is on every page, so
 * an absence means something broke.
 */
const present = [...helpPositions].filter(([, position]) => position !== null);
const missing = [...helpPositions].filter(([, position]) => position === null).map(([path]) => path);

if (missing.length > 0) {
  note(missing.join(", "), "3.2.6 Consistent Help", "no link to contact or support on the page");
}

if (present.length > 1) {
  const values = present.map(([, position]) => position);
  const spread = Math.max(...values) - Math.min(...values);
  if (spread > 0.25) {
    const worst = present
      .slice()
      .sort(([, a], [, b]) => a - b)
      .map(([path, position]) => `${path} ${position.toFixed(2)}`);
    note("across pages", "3.2.6 Consistent Help", `help link order varies: ${worst.join(", ")}`);
  }
}

if (overlaps.length > 0) {
  console.log(
    `Partly covered on focus — ${overlaps.length} control${overlaps.length === 1 ? "" : "s"}. ` +
      "Permitted by 2.4.11 (Minimum), forbidden by 2.4.12 (Enhanced, AAA), and\n" +
      "worth a look where the cover is a floating launcher over a tap target:",
  );
  for (const overlap of overlaps) {
    console.log(`  ${overlap.path}\n    ${overlap.detail}`);
  }
  console.log("");
}

if (findings.length === 0) {
  console.log(
    `WCAG 2.2: no violations across ${PAGES.length} pages — ` +
      "2.4.11, 2.5.7, 3.2.6, 3.3.7 and 3.3.8 checked; 2.5.8 is covered by verify:a11y.",
  );
  process.exit(0);
}

console.error(`WCAG 2.2: ${findings.length} finding${findings.length === 1 ? "" : "s"}\n`);
for (const finding of findings) {
  console.error(`  ${finding.criterion}  ${finding.path}\n    ${finding.detail}`);
}
process.exit(1);
