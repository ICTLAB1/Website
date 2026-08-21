import { chromium } from "playwright";

/**
 * The FAQ accordion.
 *
 * Every assertion here corresponds to something that was wrong: the indicator
 * turned into a multiplication sign, the padding down each side of a row looked
 * clickable and was not, focus drew the global amber outline so a row read as a
 * text input, and nothing in the accessibility tree said a row could be opened
 * or whether it was.
 */

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const problems = [];

await page.goto(`${BASE}/support`, { waitUntil: "load" });

// Wait for the accordion to be interactive before touching it.
//
// It is a client component, so between first paint and hydration a click does
// nothing at all. Without this the suite passed alone and failed inside the
// full gate, where the machine is busy and hydration lands later — a flake that
// was reporting a real property of the page as three unrelated defects.
await page.locator(".faq-list[data-hydrated='true']").first().waitFor({ timeout: 15000 });

const triggers = page.locator("button.faq-trigger");
const count = await triggers.count();
console.log("questions:", count);
if (count === 0) problems.push("no FAQ questions rendered");

const first = triggers.first();
const panel = page.locator(`#${(await first.getAttribute("aria-controls")).replace(/:/g, "\\:")}`);

// 1. Collapsed on arrival, and the state is in the accessibility tree.
if ((await first.getAttribute("aria-expanded")) !== "false") {
  problems.push("the first question is expanded on load");
}
if ((await page.getByRole("button", { expanded: true }).count()) !== 0) {
  problems.push("something reports itself expanded before any click");
}

// 2. The whole row is the control, including the padding down its sides.
//    Measured on the *row*, not on the button: measuring the button and then
//    clicking inside it proves only that a button is clickable. The defect this
//    catches is a button inset from its row, leaving a strip down each side
//    that looks like part of the control and does nothing.
const row = page.locator(".faq-row").first();

// Scroll it into view before measuring, because the clicks below are positional
// — `page.mouse.click` takes viewport coordinates and does no scrolling of its
// own. Without this the suite silently clicked empty space the moment the FAQ
// moved below the fold, which is exactly what happened when the support page
// gained a section above it: three checks failed at once and none of them was
// about the accordion.
await row.scrollIntoViewIfNeeded();
await page.waitForTimeout(150);

const box = await row.boundingBox();
const buttonBox = await first.boundingBox();
if (buttonBox.x - box.x > 0.5 || box.x + box.width - (buttonBox.x + buttonBox.width) > 0.5) {
  problems.push(
    `the control is inset from its row by ${Math.round(buttonBox.x - box.x)}px, so the edges are dead`,
  );
}
const target = { x: box.x + 6, y: box.y + buttonBox.height / 2 };
const onScreen = await page.evaluate(
  ({ x, y }) => Boolean(document.elementFromPoint(x, y)),
  target,
);
if (!onScreen) {
  problems.push(`the row is not on screen at (${Math.round(target.x)}, ${Math.round(target.y)})`);
}

await page.mouse.click(target.x, target.y);
await page.waitForTimeout(400);
if ((await first.getAttribute("aria-expanded")) !== "true") {
  problems.push("clicking the left padding of a row did not open it");
}

// 3. The answer is reachable once open, and was not before.
if (!(await panel.isVisible())) problems.push("the answer is not visible after opening");
const region = page.getByRole("region").filter({ hasText: (await panel.innerText()).slice(0, 30) });
if ((await region.count()) === 0) problems.push("the open answer is not exposed as a region");

// 4. The indicator is a minus, not a cross: the vertical stroke is scaled away,
//    and nothing is rotated onto a diagonal.
const stroke = first.locator(".faq-plus-stroke");
const open = await stroke.evaluate((el) => getComputedStyle(el).transform);
if (!/^matrix\(1,\s*0,\s*0,\s*0,/.test(open)) {
  problems.push(`open indicator transform is "${open}"; expected the vertical stroke scaled to 0`);
}

// 5. Closing puts the plus back and hides the answer again.
await page.mouse.click(target.x, target.y);
await page.waitForTimeout(500);
if ((await first.getAttribute("aria-expanded")) !== "false") {
  problems.push("clicking an open row did not close it");
}
if (await panel.isVisible()) problems.push("the answer is still visible after closing");
const closed = await stroke.evaluate((el) => getComputedStyle(el).transform);
if (!/none|^matrix\(1,\s*0,\s*0,\s*1,/.test(closed)) {
  problems.push(`closed indicator transform is "${closed}"; expected an unmodified plus`);
}

// 6. Focus does not draw the global outline, and does draw the row bar.
//    Reached with the keyboard, not `focus()`: `:focus-visible` only matches
//    when the browser judges the interaction to have been a keyboard one, so
//    focusing programmatically after the clicks above would never match and the
//    check would prove nothing.
await page.reload({ waitUntil: "load" });
await page.locator(".faq-list[data-hydrated='true']").first().waitFor({ timeout: 15000 });
await row.scrollIntoViewIfNeeded();
for (let step = 0; step < 60; step += 1) {
  await page.keyboard.press("Tab");
  if (await first.evaluate((el) => el === document.activeElement)) break;
}
if (!(await first.evaluate((el) => el === document.activeElement))) {
  problems.push("could not reach the first question by tabbing");
}
if (!(await first.evaluate((el) => el.matches(":focus-visible")))) {
  problems.push("a keyboard-focused row does not match :focus-visible");
}
const focus = await first.evaluate((el) => {
  const style = getComputedStyle(el);
  return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
});
if (focus.outlineStyle !== "none" && focus.outlineWidth !== "0px") {
  problems.push(`a focused row still draws an outline: ${focus.outlineStyle} ${focus.outlineWidth}`);
}
if (!focus.boxShadow.includes("inset")) {
  problems.push(`a focused row has no leading bar: ${focus.boxShadow}`);
}

// 7. Keyboard: Enter on a focused row opens it.
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
if ((await first.getAttribute("aria-expanded")) !== "true") {
  problems.push("Enter on a focused row did not open it");
}

// 8. Opening is animated rather than instant.
const duration = await panel.evaluate((el) => getComputedStyle(el).transitionDuration);
if (/^(0s|0s,)/.test(duration)) problems.push(`the answer does not transition (${duration})`);

await browser.close();

if (problems.length) {
  console.log("PROBLEMS:");
  for (const problem of problems) console.log("  " + problem);
  process.exit(1);
}
console.log(`FAQ accordion: 8 checks passed across ${count} questions.`);
