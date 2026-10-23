import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { BrandCard } from "@/components/marketing/brand-card";

/**
 * A brand's name appears once in the text of its card, never with its first
 * letter doubled.
 *
 * The defect this exists for: the fallback monogram — the coloured square
 * shown for a brand with no logo on file — was a text child inside a span
 * marked `aria-hidden="true"`. That attribute keeps the letter out of the
 * accessibility tree and out of nothing else. A crawler reads the DOM, where
 * the letter sat immediately before the brand's name with no whitespace
 * between them, so the extracted text of every logo-less brand was its own
 * name with the first letter doubled: MMicrosoft, HHPE, OOracle, CCorel,
 * IIBM, SSalesforce, EESET, SSophos.
 *
 * It was not cosmetic. Those strings were what Google indexed as the brand
 * names, and thirty of the brands on file have no logo.
 *
 * Asserted against the rendered markup rather than the component's props,
 * because the bug lived entirely in the gap between what the component meant
 * and what the document said.
 */

const brand = {
  slug: "microsoft",
  name: "Microsoft",
  tagline: "Productivity, cloud and security.",
  accentColor: "#0F6CBD",
  logoUrl: null,
  productCount: 12,
};

/** The card's text layer, as a crawler would extract it. */
function textOf(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("a brand card with no logo on file", () => {
  const markup = renderToStaticMarkup(<BrandCard brand={brand} />);
  const text = textOf(markup);

  it("does not double the brand's first letter in the text", () => {
    expect(text).not.toContain("MMicrosoft");
    // The general shape, so a different brand cannot reintroduce it: no word
    // anywhere in the card starts with the same capital twice.
    expect(text).not.toMatch(/(?<![A-Za-z])([A-Z])\1[a-z]/);
  });

  it("still names the brand, exactly once", () => {
    expect(text).toContain("Microsoft");
    expect(text.match(/Microsoft/g)).toHaveLength(1);
  });

  it("still draws the monogram, as a pseudo-element rather than as text", () => {
    /*
     * The letter has to survive the fix — the square would otherwise be an
     * empty coloured box. It lives in an attribute the stylesheet reads back,
     * which renders the same glyph and contributes nothing to the text above.
     */
    expect(markup).toContain('data-monogram="M"');
    expect(markup).toContain("before:content-[attr(data-monogram)]");
  });

  it("keeps the monogram out of the accessibility tree too", () => {
    // Unchanged, and still right: the name is beside it in text, so a screen
    // reader announcing the letter as well would only repeat itself.
    expect(markup).toContain('aria-hidden="true"');
  });
});
