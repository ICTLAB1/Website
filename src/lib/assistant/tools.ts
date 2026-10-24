import "server-only";
import { prisma } from "@/lib/db";
import { searchProducts, searchAll, normaliseQuery } from "@/lib/queries/search";
import { publicVariantWhere } from "@/lib/catalogue/audience";
import { isQuoteOnly, TENTATIVE_PRICE_NOTE } from "@/lib/catalogue/quote-only";
import { effectivePriceMinor, formatMoney, formatTerm } from "@/lib/money";
import type { ToolDefinition } from "@/lib/assistant/anthropic";
import { captureLead } from "@/lib/assistant/lead-service";

/**
 * What the assistant is allowed to do, beyond talking.
 *
 * Four tools, and every one of them is narrow on purpose.
 *
 * `search_catalogue` is the only source of product facts the assistant is
 * given — it is never told to answer from what it already knows about
 * software, because what it already knows is not this catalogue: the wrong
 * SKU, a discontinued edition, a price nobody quoted. Every fact returned here
 * is read from the same tables `/products` renders from, in the same
 * "tentative" framing the public pages already carry — nothing this tool
 * says is a claim the site does not also make.
 *
 * `get_product_details` is the follow-up question answered properly: a search
 * result is a name and a figure, and "what is actually in it, and for how
 * long" needs the variants, the features and the product's own FAQs. Without
 * it the assistant had one line per product and improvised the rest, which is
 * the one thing rule 1 of its prompt forbids.
 *
 * `search_site` is everything on this site that is not a product — the
 * services, the brand pages, the licensing articles and, above all, the FAQs.
 * Those answers are written and checked by this business; an assistant that
 * cannot read them re-derives them from a general knowledge of software
 * licensing, and a general knowledge of software licensing does not know that
 * these Business plans cap at 300 seats or that this catalogue prices a
 * PowerEdge. Full answers rather than the 160-character excerpt the site
 * search shows, because this consumer has to answer from them rather than
 * link to them.
 *
 * `capture_lead` is the point of the whole feature. It is deliberately the
 * only way a conversation leaves a trace anywhere — nothing is logged to the
 * CRM until a visitor has given a name and an email and the assistant has
 * decided there is a real enquiry to record.
 */

export const TOOLS: ToolDefinition[] = [
  {
    name: "search_catalogue",
    description:
      "Search the real product catalogue by name, brand or keyword. Returns up to 5 real matches with their tentative price where one is shown publicly. Use this before naming any product, brand or price — never state one from memory.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for, e.g. 'autocad' or 'antivirus'." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_product_details",
    description:
      "Everything the site knows about one product: every licence option with its term and tentative price, what is included, and the questions already answered about it. Use the slug from search_catalogue. Call this before answering 'what does it include', 'how long is the term', 'what are the options' or any comparison between two products.",
    input_schema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "The product slug from a search_catalogue result, e.g. 'microsoft-365-business-standard'.",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "search_site",
    description:
      "Search everything on this site that is not a product listing: the published FAQs with their full answers, the IT services offered, the brand pages and the licensing articles. Use this for how-it-works questions — licensing programmes, seat limits, renewals, migrations, what this business does — before saying you do not know.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What the visitor is asking about, e.g. 'CSP billing', 'seat limit', 'migration'.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "capture_lead",
    description:
      "Record this visitor as a sales lead once they have shared their name and email and shown genuine interest in a product or service. Call this once per conversation, only after asking for and receiving a name and email — never invent either.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string", description: "Optional." },
        companyName: { type: "string", description: "Optional." },
        interest: {
          type: "string",
          description: "One or two sentences on what they are looking for, in your own words.",
        },
      },
      required: ["name", "email", "interest"],
    },
  },
];

export type ToolExecutionContext = { transcript: string };

export async function executeTool(
  name: string,
  input: unknown,
  context: ToolExecutionContext,
): Promise<{ content: string; isError?: boolean }> {
  if (name === "search_catalogue") {
    const query = typeof (input as { query?: unknown })?.query === "string" ? (input as { query: string }).query : "";
    const products = await searchProducts(query, 5);

    if (products.length === 0) {
      return { content: "No matching products in the catalogue. Suggest they browse /products or /hardware, or describe what they need in more detail." };
    }

    /*
     * `isQuoteOnly`, not `isHardware`.
     *
     * This read "priced on request" for every hardware product, which was the
     * rule before `2026-10-dtp-price-list` put a figure on every server and
     * workstation. The assistant was telling visitors a PowerEdge is quoted
     * while the page behind it showed ₹3,27,500 — the same defect the HPE FAQ
     * had, and the reason `isQuoteOnly` exists: one function, every surface,
     * so a policy change does not have to be found in four places.
     *
     * `variants[0]` is safe here and worth saying why: `searchProducts`
     * selects public variants ordered `isDefault desc` and takes one, so this
     * is the default variant rather than an arbitrary row.
     */
    const lines = products.map((product) => {
      const variant = product.variants[0];
      const quoted = isQuoteOnly(product);
      const priceText =
        !quoted && variant
          ? `tentative price ${formatMoney(effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor), variant.currency)}, excluding GST`
          : "priced on request";
      return `- ${product.name} (${product.brand.name}), /products/${product.slug} — ${priceText}`;
    });

    return { content: lines.join("\n") };
  }

  if (name === "get_product_details") {
    const slug = typeof (input as { slug?: unknown })?.slug === "string" ? (input as { slug: string }).slug.trim() : "";
    /*
     * Its own query rather than `getProductBySlug`.
     *
     * That helper is wrapped in `unstable_cache`, which throws outside a
     * request context — fine for the page that uses it, and a failure mode
     * this tool should not inherit, because the only symptom would be a chat
     * request returning 500 on a widget the business is relying on. It also
     * needs less than the page does: no specs, no category tree, no
     * neighbours. A narrower select is both provable and cheaper.
     */
    const product = slug
      ? await prisma.product.findFirst({
          where: { slug, status: "ACTIVE", deletedAt: null },
          select: {
            slug: true,
            name: true,
            shortDescription: true,
            features: true,
            unitLabel: true,
            variants: {
              where: publicVariantWhere,
              orderBy: [{ isDefault: "desc" }, { listPriceMinor: "asc" }],
              select: {
                sku: true,
                name: true,
                termMonths: true,
                seats: true,
                currency: true,
                listPriceMinor: true,
                salePriceMinor: true,
              },
            },
            faqs: { orderBy: { displayOrder: "asc" }, select: { question: true, answer: true } },
            brand: {
              select: {
                name: true,
                faqs: { orderBy: { displayOrder: "asc" }, select: { question: true, answer: true } },
              },
            },
          },
        })
      : null;

    if (!product) {
      return {
        content: `No product with the slug "${slug}". Call search_catalogue again and use a slug from its results.`,
        isError: true,
      };
    }

    const quoted = isQuoteOnly(product);

    /*
     * Every licence option, not just the default one. "Is there a cheaper
     * term?" and "what is the difference between these two?" are the
     * questions a visitor asks after the search result, and both need the
     * whole list. The term and the seat basis travel with each figure for the
     * reason the product page carries them: a yearly total beside a monthly
     * instalment, with neither labelled, is how a plan reads as nine times
     * cheaper than it is.
     */
    /*
     * The record's own word, then "unit" — which is what the product page
     * says, and this answer points at the product page.
     *
     * Worth recording, because it was tempting to be cleverer: the site is
     * not consistent here. `variant-selector.tsx` renders "per unit,
     * excluding GST at 18%" on the product page while `product-card.tsx`
     * renders "per seat" on the card for the same variant. Neither reads
     * `unitLabel`, which ninety products leave null. An assistant that picks
     * its own third wording makes it worse; one that matches the page it
     * links to at least cannot contradict the page the visitor then opens.
     */
    const unit = product.unitLabel ?? "unit";
    const options = product.variants.map((variant) => {
      const price = quoted
        ? "priced on request"
        : `${formatMoney(effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor), variant.currency)} excluding GST`;
      /*
       * The product's own unit, and a term only where there is one.
       *
       * This said "per seat, Perpetual" for a PowerEdge — a server is not
       * sold by the seat and is not licensed at all. `unitLabel` is what the
       * record itself calls the thing being counted, and ninety products
       * leave it null because counting them needs no word.
       */
      const basis = variant.seats > 1 ? `${variant.seats} ${unit}s` : `per ${unit}`;
      const term = variant.termMonths ? `, ${formatTerm(variant.termMonths)}` : "";
      return `  - ${variant.name}: ${price}${term}, ${basis} (SKU ${variant.sku})`;
    });

    /*
     * The product's own answers, and the brand's behind them — the same
     * fallback the product page renders, so the assistant and the page cannot
     * answer the same question differently.
     */
    const faqs = product.faqs.length > 0 ? product.faqs : product.brand.faqs;

    const parts = [
      `${product.name} (${product.brand.name}) — /products/${product.slug}`,
      product.shortDescription,
      "",
      options.length > 0 ? `Options:\n${options.join("\n")}` : "No options are published for it.",
      quoted ? "" : TENTATIVE_PRICE_NOTE,
      product.features.length > 0 ? `\nIncluded:\n${product.features.map((f) => `  - ${f}`).join("\n")}` : "",
      faqs.length > 0
        ? `\nAlready answered on the page:\n${faqs
            .slice(0, 4)
            .map((faq) => `  Q: ${faq.question}\n  A: ${faq.answer}`)
            .join("\n")}`
        : "",
    ].filter((part) => part !== "");

    return { content: parts.join("\n") };
  }

  if (name === "search_site") {
    const raw = typeof (input as { query?: unknown })?.query === "string" ? (input as { query: string }).query : "";
    const term = normaliseQuery(raw);
    if (!term) return { content: "Empty query.", isError: true };

    /*
     * FAQs are read separately from `searchAll` rather than through it. The
     * site search truncates an answer to 160 characters because it is drawing
     * a result list; this consumer has to answer *from* the answer, and half
     * a sentence about a seat cap is worse than none.
     */
    const [results, faqs] = await Promise.all([
      searchAll(term),
      prisma.faq.findMany({
        where: {
          OR: [
            { question: { contains: term, mode: "insensitive" } },
            { answer: { contains: term, mode: "insensitive" } },
          ],
        },
        select: {
          question: true,
          answer: true,
          brand: { select: { name: true } },
          service: { select: { name: true } },
        },
        orderBy: { displayOrder: "asc" },
        take: 4,
      }),
    ]);

    const sections: string[] = [];

    if (faqs.length > 0) {
      sections.push(
        `Published answers:\n${faqs
          .map((faq) => {
            const about = faq.brand?.name ?? faq.service?.name;
            return `  Q: ${faq.question}${about ? ` (${about})` : ""}\n  A: ${faq.answer}`;
          })
          .join("\n")}`,
      );
    }

    const linkList = (label: string, rows: Array<{ title: string; subtitle: string; href: string }>) =>
      rows.length > 0
        ? `${label}:\n${rows
            .slice(0, 4)
            .map((row) => `  - ${row.title} — ${row.href}${row.subtitle ? ` — ${row.subtitle}` : ""}`)
            .join("\n")}`
        : null;

    for (const section of [
      linkList("Services", results.services),
      linkList("Brand pages", results.brands),
      linkList("Articles", results.articles),
    ]) {
      if (section) sections.push(section);
    }

    if (sections.length === 0) {
      return {
        content:
          "Nothing on the site covers that. Say so plainly rather than answering from general knowledge, and offer to take their details for the sales team.",
      };
    }

    return { content: sections.join("\n\n") };
  }

  if (name === "capture_lead") {
    const parsed = input as {
      name?: unknown;
      email?: unknown;
      phone?: unknown;
      companyName?: unknown;
      interest?: unknown;
    };

    if (typeof parsed.name !== "string" || typeof parsed.email !== "string" || typeof parsed.interest !== "string") {
      return { content: "Missing required fields — need at least a name, email and interest.", isError: true };
    }

    const result = await captureLead({
      name: parsed.name,
      email: parsed.email,
      phone: typeof parsed.phone === "string" ? parsed.phone : null,
      companyName: typeof parsed.companyName === "string" ? parsed.companyName : null,
      interest: parsed.interest,
      transcript: context.transcript,
    });

    if (!result.ok) return { content: result.reason, isError: true };
    return { content: `Lead recorded as ${result.reference}. Thank the visitor and let them know our sales team will be in touch.` };
  }

  return { content: `Unknown tool: ${name}`, isError: true };
}
