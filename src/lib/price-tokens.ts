import "server-only";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { publicVariantWhere } from "@/lib/catalogue/audience";
import { effectivePriceMinor, formatMoney, gstAmountMinor } from "@/lib/money";

/**
 * Prices in long-form copy, resolved from the catalogue when the page renders.
 *
 * A price lives in the product row and nowhere else — typing one into an
 * article is how an article goes on quoting last quarter's figure. So copy
 * carries `{{price:<slug>}}` (the annual price excluding GST) or
 * `{{gst:<slug>}}` (the same including GST), and this swaps in the live figure.
 *
 * A product with no price becomes "price on request": never an invented number,
 * never a blank.
 */
const TOKEN = /\{\{(price|gst):([a-z0-9-]+)\}\}/g;

export const NO_PRICE_TEXT = "price on request";

type Quote = { exGstMinor: number; gstRate: number };

/** The lowest priced public variant per product slug — the figure a listing shows as "from". */
const loadQuotes = cache(async (key: string): Promise<Map<string, Quote>> => {
  const slugs = key ? key.split(",") : [];
  const result = new Map<string, Quote>();
  if (slugs.length === 0) return result;
  const rows = await prisma.productVariant.findMany({
    where: { ...publicVariantWhere, product: { slug: { in: slugs }, status: "ACTIVE", deletedAt: null } },
    select: { listPriceMinor: true, salePriceMinor: true, gstRatePercent: true, product: { select: { slug: true } } },
  });
  for (const row of rows) {
    const price = effectivePriceMinor(row.listPriceMinor, row.salePriceMinor);
    if (price <= 0) continue;
    const current = result.get(row.product.slug);
    if (!current || price < current.exGstMinor) {
      result.set(row.product.slug, { exGstMinor: price, gstRate: row.gstRatePercent });
    }
  }
  return result;
});

export function priceTokenSlugs(text: string): string[] {
  return [...new Set([...text.matchAll(TOKEN)].map((match) => match[2]!))];
}

/** Replaces every price token in `texts` with the live figure. Same order out as in. */
export async function resolvePriceTokens(texts: string[]): Promise<string[]> {
  const slugs = [...new Set(texts.flatMap(priceTokenSlugs))].sort();
  const quotes = await loadQuotes(slugs.join(","));
  return texts.map((text) =>
    text.replace(TOKEN, (_, kind: string, slug: string) => {
      const quote = quotes.get(slug);
      if (!quote) return NO_PRICE_TEXT;
      const minor = kind === "gst" ? quote.exGstMinor + gstAmountMinor(quote.exGstMinor, quote.gstRate) : quote.exGstMinor;
      return formatMoney(minor);
    }),
  );
}

export async function resolvePriceToken(text: string): Promise<string> {
  return (await resolvePriceTokens([text]))[0]!;
}
