import "server-only";
import { searchProducts } from "@/lib/queries/search";
import { isHardware } from "@/lib/catalogue/hardware";
import { formatMoney } from "@/lib/money";
import type { ToolDefinition } from "@/lib/assistant/anthropic";
import { captureLead } from "@/lib/assistant/lead-service";

/**
 * What the assistant is allowed to do, beyond talking.
 *
 * Two tools, and both are narrow on purpose.
 *
 * `search_catalogue` is the only source of product facts the assistant is
 * given — it is never told to answer from what it already knows about
 * software, because what it already knows is not this catalogue: the wrong
 * SKU, a discontinued edition, a price nobody quoted. Every fact returned here
 * is read from the same tables `/products` renders from, in the same
 * "tentative" framing the public pages already carry — nothing this tool
 * says is a claim the site does not also make.
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

    const lines = products.map((product) => {
      const variant = product.variants[0];
      const hardware = isHardware(product);
      const priceText =
        !hardware && variant
          ? `tentative price ${formatMoney(variant.salePriceMinor ?? variant.listPriceMinor, variant.currency)}`
          : "priced on request";
      return `- ${product.name} (${product.brand.name}), /products/${product.slug} — ${priceText}`;
    });

    return { content: lines.join("\n") };
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
