import { chromium } from "playwright";
import { firstPurchasableSku } from "./lib/live-sku.mjs";

const BASE = "http://localhost:3000";

// Discovered, not hardcoded — see lib/live-sku.mjs.
const BUY_SKU = await firstPurchasableSku(BASE);
const WIDTHS = [320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440, 1920];
const PAGES = [
  ["home", "/"],
  ["catalogue", "/products"],
  ["product", "/products/microsoft-365-business-standard"],
  ["brand", "/brands/microsoft"],
  ["landing", "/microsoft-365"],
  ["service", "/services/cybersecurity"],
  ["enterprise", "/enterprise"],
  ["enquiry", "/enquiry"],
  ["contact", "/contact"],
  ["blog", "/blog/csp-vs-enterprise-agreement-which-microsoft-licensing-model"],
  ["login", "/login"],
  ["buy", `/buy?sku=${encodeURIComponent(BUY_SKU)}`],
  // The support page's accordion and the legal pages' date strip were both
  // rebuilt in this pass; neither page was in this sweep before.
  ["support", "/support"],
  ["legal", "/terms"],
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const problems = [];

for (const [name, path] of PAGES) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(400);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const offenders = [];
      if (doc.scrollWidth > doc.clientWidth + 1) {
        for (const el of document.querySelectorAll("body *")) {
          const rect = el.getBoundingClientRect();
          if (rect.right > doc.clientWidth + 1 || rect.left < -1) {
            const style = getComputedStyle(el);
            // Ignore elements that are their own scroll container by design.
            if (style.overflowX === "auto" || style.overflowX === "scroll") continue;
            let parent = el.parentElement, contained = false;
            while (parent) {
              const ps = getComputedStyle(parent);
              if (ps.overflowX === "auto" || ps.overflowX === "scroll" || ps.overflow === "hidden") { contained = true; break; }
              parent = parent.parentElement;
            }
            if (!contained) {
              offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
            }
          }
        }
        return { overflowing: true, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders: offenders.slice(0, 3) };
      }
      return { overflowing: false };
    });

    if (overflow.overflowing) {
      problems.push(`${name} @${width}px: body scrolls horizontally (${overflow.scrollWidth} > ${overflow.clientWidth}) ${overflow.offenders.join(", ")}`);
    }
    if (consoleErrors.length) {
      problems.push(`${name} @${width}px: console ${consoleErrors.slice(0, 2).join(" | ")}`);
    }

    if (width === 390 || width === 1440) {
      await page.screenshot({ path: `${process.env.SHOTS ?? "/tmp"}/${name}-${width}.png`, fullPage: width === 1440 });
    }
    await context.close();
  }
}

/**
 * The same overflow question, with the navigation panels open.
 *
 * The sweep above only ever measures a closed menu, which is how a mega panel
 * shipped hanging off the left edge of the screen: it was centred on the button
 * that opened it, so the leftmost menus put most of a 72rem panel off-viewport.
 * Nothing that measures a page at rest can see that.
 */
for (const width of [1024, 1280, 1440, 1600, 1920]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 20000 });

  const buttons = page.locator("nav[aria-label='Primary'] button");
  const count = await buttons.count();

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const label = (await button.innerText()).trim();
    await button.click();
    await page.waitForTimeout(180);

    const panel = page.locator("[id^='megamenu-']").first();
    if ((await panel.count()) === 0) {
      await page.keyboard.press("Escape");
      continue;
    }

    const box = await panel.boundingBox();
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );

    if (box && box.x < -0.5) {
      problems.push(`menu "${label}" @${width}px: panel starts ${Math.round(box.x)}px off the left edge`);
    }
    if (box && box.x + box.width > width + 0.5) {
      problems.push(`menu "${label}" @${width}px: panel ends ${Math.round(box.x + box.width - width)}px past the right edge`);
    }
    if (scrolls) {
      problems.push(`menu "${label}" @${width}px: opening it makes the page scroll sideways`);
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(120);
  }

  await context.close();
}

await browser.close();
if (problems.length) {
  console.log("PROBLEMS:");
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log(
  `No horizontal overflow or console errors across ${PAGES.length} pages × ${WIDTHS.length} widths,\n  and no navigation panel escapes the viewport at 5 desktop widths.`,
);
