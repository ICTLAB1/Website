import "server-only";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { publicReference } from "@/lib/auth/tokens";
import { resolveVariantsBySku } from "@/lib/queries/catalogue";
import { salesInbox, sendMail } from "@/lib/mail";
import { renderEmailHtml, renderEmailText, type EmailContent } from "@/lib/emails/shell";
import { absoluteUrl } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { logger } from "@/lib/logger";
import type { enquirySchema } from "@/lib/validation";

/**
 * Enquiry submission.
 *
 * The client sends only SKUs and quantities. Product names, prices and brand
 * details are re-read from the catalogue here, so nothing a user can edit in
 * the browser reaches the stored enquiry.
 */

export type EnquiryInput = z.infer<typeof enquirySchema>;

export type EnquiryResult =
  | { ok: true; reference: string }
  | { ok: false; reason: "no_valid_items"; message: string };

export async function createEnquiry(
  input: EnquiryInput,
  context: { userId?: string | null; companyId?: string | null },
): Promise<EnquiryResult> {
  const requestedSkus = [...new Set(input.items.map((item) => item.sku))];
  const variants = await resolveVariantsBySku(requestedSkus);

  if (variants.length === 0) {
    return {
      ok: false,
      reason: "no_valid_items",
      message:
        "None of the products in your enquiry are still available. Please review your basket and try again.",
    };
  }

  const bySku = new Map(variants.map((variant) => [variant.sku, variant]));

  // Line items are rebuilt from catalogue rows, never from the request body.
  const items = input.items
    .map((item) => {
      const variant = bySku.get(item.sku);
      if (!variant) return null;
      return {
        productId: variant.product.id,
        variantId: variant.id,
        productName: `${variant.product.name} — ${variant.name}`,
        sku: variant.sku,
        quantity: Math.min(100_000, Math.max(1, Math.floor(item.quantity))),
        note: item.note?.slice(0, 500) ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) {
    return {
      ok: false,
      reason: "no_valid_items",
      message:
        "None of the products in your enquiry are still available. Please review your basket and try again.",
    };
  }

  const reference = publicReference("ENQ");

  const enquiry = await prisma.enquiry.create({
    data: {
      reference,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      companyName: input.companyName,
      gstin: input.gstin || null,
      country: input.country || "India",
      city: input.city || null,
      userCount: input.userCount ?? null,
      requirements: input.requirements || null,
      timeline: input.timeline,
      userId: context.userId ?? null,
      companyId: context.companyId ?? null,
      items: { create: items },
    },
    select: { id: true, reference: true },
  });

  logger.info("enquiry_created", {
    reference: enquiry.reference,
    itemCount: items.length,
    // The contact's email is deliberately not logged.
  });

  // Notifications are best-effort: a mail failure must not fail the submission,
  // because the enquiry is already safely stored.
  void notify(enquiry.reference, input, items).catch((error) => {
    logger.error("enquiry_notification_failed", {
      reference: enquiry.reference,
      message: error instanceof Error ? error.message : String(error),
    });
  });

  return { ok: true, reference: enquiry.reference };
}

async function notify(
  reference: string,
  input: EnquiryInput,
  items: Array<{ productName: string; sku: string; quantity: number }>,
) {
  const config = await getSiteConfig();
  const lines = items
    .map((item) => `  • ${item.productName} (${item.sku}) — quantity ${item.quantity}`)
    .join("\n");

  const internal = await salesInbox();
  if (internal) {
    await sendMail({
      to: internal,
      replyTo: input.contactEmail,
      subject: `New enterprise enquiry ${reference} — ${input.companyName}`,
      text: [
        `Enquiry reference: ${reference}`,
        "",
        `Company:   ${input.companyName}`,
        `Contact:   ${input.contactName}`,
        `Email:     ${input.contactEmail}`,
        `Phone:     ${input.contactPhone}`,
        input.gstin ? `GSTIN:     ${input.gstin}` : null,
        `Location:  ${[input.city, input.country].filter(Boolean).join(", ")}`,
        input.userCount ? `Users:     ${input.userCount}` : null,
        `Timeline:  ${input.timeline.replace(/_/g, " ").toLowerCase()}`,
        "",
        "Products requested:",
        lines,
        "",
        input.requirements ? `Requirements:\n${input.requirements}` : null,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });
  }

  /*
   * The acknowledgement, through the same shell as every other transactional
   * email.
   *
   * It was the one that never got there: a handful of `<p>` tags and a `<ul>`,
   * assembled here, while the ticket, quotation and order emails all went
   * through `emails/shell`. So the first message a new customer ever receives
   * from this business was the only one that did not look like it came from it.
   */
  const steps = [
    "A member of the sales team reads the enquiry and checks current publisher pricing for what you asked for.",
    "We come back to you with a written quotation, itemised, with taxes shown separately.",
    "If anything in the list needs clarifying first, we will reply to this address before quoting.",
  ];

  /*
   * A button only where it leads somewhere.
   *
   * `/track-order` deliberately refuses reference-only lookup — status lives
   * inside the account, because a form that returned an enquiry for any
   * reference typed into it would hand one customer's enquiry to anyone who
   * guessed. So the link is offered only when this address already has an
   * account to sign in to; for everyone else the reference and a reply are the
   * honest answer, and a button leading to a sign-in wall is not.
   */
  const account = await prisma.user.findUnique({
    where: { email: input.contactEmail },
    select: { id: true },
  });

  const content: EmailContent = {
    heading: "Thank you — we have your enquiry",
    greetingName: input.contactName,
    paragraphs: [
      `Your reference is ${reference}. Quote it in any follow-up and we will find this immediately.`,
    ],
    lines: items.map((item) => ({
      name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
    })),
    steps,
    details: [
      ["Reference", reference],
      ["Organisation", input.companyName],
      ["Contact", input.contactName],
      ["Timeline", input.timeline.replace(/_/g, " ").toLowerCase()],
      ["Users", input.userCount ? String(input.userCount) : null],
      ["Location", [input.city, input.country].filter(Boolean).join(", ") || null],
    ],
    action: account
      ? {
          label: "Follow this enquiry in your account",
          url: absoluteUrl(`/account/enquiries/${reference}`),
        }
      : undefined,
    footnote:
      "This is an acknowledgement that your enquiry reached us. It is not a quotation, and no " +
      "price is committed until we send one.",
  };

  await sendMail({
    to: input.contactEmail,
    subject: `We have received your enquiry (${reference})`,
    text: renderEmailText(content, config),
    html: renderEmailHtml(content, config),
  });
}
