import "server-only";
import { appUrl } from "@/lib/env";
import { salesInbox, sendMail } from "@/lib/mail";
import { formatMoney } from "@/lib/money";
import { getSiteConfig } from "@/lib/site-config";
import { renderEmailHtml, renderEmailText, type EmailContent } from "@/lib/emails/shell";
import { humanise } from "@/lib/utils";

/**
 * The messages this business sends when something happens.
 *
 * Each of these existed as a state change with nobody told. A customer raised a
 * ticket from their account and heard nothing; accepted a quotation and nobody
 * at this end found out; had an order confirmed, provisioned and fulfilled with
 * licence keys issued, in silence. The panel showed all of it and the customer
 * saw none of it.
 *
 * Every function here is fire-and-forget by design. The thing being reported has
 * already happened and been written down: an order is fulfilled whether or not
 * the customer can be told, and unwinding real work because a mail server was
 * briefly unreachable would be far worse than a missing email. The failure is
 * logged inside `sendMail` and shows up in the admin panel's mail test.
 */

async function deliver(to: string, subject: string, content: EmailContent, replyTo?: string) {
  const config = await getSiteConfig();
  void sendMail({
    to,
    subject,
    text: renderEmailText(content, config),
    html: renderEmailHtml(content, config),
    replyTo,
  });
}

/** Both sides of a support ticket being raised. */
export async function notifyTicketRaised(ticket: {
  reference: string;
  subject: string;
  category: string;
  message: string;
  customerName: string;
  customerEmail: string;
}): Promise<void> {
  await deliver(ticket.customerEmail, `We have your request (${ticket.reference})`, {
    heading: "Your request has been logged",
    greetingName: ticket.customerName,
    paragraphs: [
      "Thank you — our team has your message and will reply to this address.",
      "Please quote the reference below in any follow-up so we can find it quickly.",
    ],
    details: [
      ["Reference", ticket.reference],
      ["Subject", ticket.subject],
      ["Category", humanise(ticket.category)],
    ],
    action: { label: "View this request", url: `${appUrl()}/account/support` },
  });

  const internal = await salesInbox();
  if (!internal) return;

  await deliver(
    internal,
    `New support ticket ${ticket.reference} — ${ticket.subject}`,
    {
      heading: `New ticket: ${ticket.subject}`,
      paragraphs: [ticket.message],
      details: [
        ["Reference", ticket.reference],
        ["From", `${ticket.customerName} <${ticket.customerEmail}>`],
        ["Category", humanise(ticket.category)],
      ],
      action: { label: "Open in the admin panel", url: `${appUrl()}/admin/support` },
    },
    // Replying to the notification reaches the customer, which is what anyone
    // reading it will try to do.
    ticket.customerEmail,
  );
}

/**
 * A customer's decision on a quotation, to whoever is watching the sales inbox.
 *
 * Internal only. The customer already knows what they just clicked, and an
 * order confirmation follows on acceptance — but nobody here found out at all,
 * which meant an accepted quotation could sit unnoticed for as long as it took
 * somebody to open the panel.
 */
export async function notifyQuoteDecision(quote: {
  reference: string;
  decision: "ACCEPTED" | "DECLINED";
  totalMinor: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  orderReference: string | null;
}): Promise<void> {
  const internal = await salesInbox();
  if (!internal) return;

  const accepted = quote.decision === "ACCEPTED";

  await deliver(
    internal,
    `Quotation ${quote.reference} ${accepted ? "accepted" : "declined"} — ${quote.customerName}`,
    {
      heading: accepted
        ? `${quote.customerName} accepted quotation ${quote.reference}`
        : `${quote.customerName} declined quotation ${quote.reference}`,
      paragraphs: accepted
        ? ["An order has been raised and is waiting to be confirmed."]
        : ["No order was raised. Worth a follow-up while the requirement is still live."],
      details: [
        ["Quotation", quote.reference],
        ["Value", formatMoney(quote.totalMinor, quote.currency)],
        ["Customer", `${quote.customerName} <${quote.customerEmail}>`],
        ["Order", quote.orderReference],
      ],
      action: quote.orderReference
        ? { label: "Open the order", url: `${appUrl()}/admin/orders/${quote.orderReference}` }
        : { label: "Open the quotation", url: `${appUrl()}/admin/quotes/${quote.reference}` },
    },
    quote.customerEmail,
  );
}


/**
 * A customer wrote on a quotation.
 *
 * Goes to the sales inbox rather than to the customer: they have just typed it
 * and can see it on the page. What matters is that it reaches somebody here
 * quickly — a revision request sitting unread for three days is how a live
 * requirement goes elsewhere.
 */
export async function notifyQuoteMessage(message: {
  reference: string;
  kind: "QUESTION" | "REVISION_REQUEST";
  body: string;
  customerName: string;
  customerEmail: string;
}): Promise<void> {
  const internal = await salesInbox();
  if (!internal) return;

  const revision = message.kind === "REVISION_REQUEST";

  await deliver(
    internal,
    `${revision ? "Revision requested" : "Question"} on ${message.reference} — ${message.customerName}`,
    {
      heading: revision
        ? `${message.customerName} has asked for changes to ${message.reference}`
        : `${message.customerName} has a question about ${message.reference}`,
      paragraphs: [message.body],
      details: [
        ["Quotation", message.reference],
        ["Customer", `${message.customerName} <${message.customerEmail}>`],
      ],
      action: {
        label: "Open the quotation",
        url: `${appUrl()}/admin/quotes/${message.reference}`,
      },
    },
    message.customerEmail,
  );
}

/** An order moving to a state the customer would want to know about. */
export async function notifyOrderStatus(order: {
  reference: string;
  status: "CONFIRMED" | "PROVISIONING" | "CANCELLED" | "REFUNDED";
  billingName: string;
  billingEmail: string;
}): Promise<void> {
  /*
   * What each state means to a customer, in their words rather than ours.
   *
   * "PROVISIONING" is an internal term; the customer wants to know their
   * licences are being set up. A status name copied straight into an email
   * reads as a database field, because that is what it is.
   */
  const wording: Record<typeof order.status, { subject: string; heading: string; body: string[] }> = {
    CONFIRMED: {
      subject: `Order ${order.reference} is confirmed`,
      heading: "Your order is confirmed",
      body: [
        "We have everything we need and your order is now being prepared.",
        "We will be in touch again once your licences are ready.",
      ],
    },
    PROVISIONING: {
      subject: `Order ${order.reference} is being set up`,
      heading: "We are setting up your licences",
      body: [
        "Your licences are being provisioned with the publisher now.",
        "We will confirm as soon as they are assigned and ready to use.",
      ],
    },
    CANCELLED: {
      subject: `Order ${order.reference} has been cancelled`,
      heading: "Your order has been cancelled",
      body: [
        "This order will not be fulfilled and nothing further is owed on it.",
        "If this is not what you expected, reply to this email and we will look into it.",
      ],
    },
    REFUNDED: {
      subject: `Order ${order.reference} has been refunded`,
      heading: "Your order has been refunded",
      body: [
        "A refund has been issued against this order.",
        "Card refunds usually reach the account within five to seven working days; a bank transfer is issued separately.",
      ],
    },
  };

  const { subject, heading, body } = wording[order.status];

  await deliver(order.billingEmail, subject, {
    heading,
    greetingName: order.billingName,
    paragraphs: body,
    details: [["Order reference", order.reference]],
    action: { label: "View your orders", url: `${appUrl()}/account/orders` },
  });
}

/** Licences issued. The message a customer has actually been waiting for. */
export async function notifyOrderFulfilled(order: {
  reference: string;
  billingName: string;
  billingEmail: string;
  licences: Array<{ reference: string; productName: string; seats: number; expiresAt: Date | null }>;
}): Promise<void> {
  const lines = order.licences.map(
    (licence) =>
      `${licence.productName} — ${licence.seats} ${licence.seats === 1 ? "seat" : "seats"}` +
      (licence.expiresAt
        ? `, renews ${licence.expiresAt.toISOString().slice(0, 10)}`
        : ", perpetual"),
  );

  await deliver(order.billingEmail, `Your licences are ready (${order.reference})`, {
    heading: "Your licences are ready",
    greetingName: order.billingName,
    paragraphs: [
      "Your order has been fulfilled and your licences are active.",
      ...lines,
      "Every licence, its seat count and its renewal date are listed in your account, and we will remind you before anything is due to renew.",
    ],
    details: [
      ["Order reference", order.reference],
      ["Licences issued", String(order.licences.length)],
    ],
    action: { label: "View your licences", url: `${appUrl()}/account/licences` },
    footnote:
      "Keep this email for your records. Your GST invoice is issued separately if it has not reached you already.",
  });
}

/** A ticket a member of staff has moved on. */
export async function notifyTicketUpdated(ticket: {
  reference: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING_ON_CUSTOMER" | "RESOLVED" | "CLOSED";
  customerName: string;
  customerEmail: string;
}): Promise<void> {
  /*
   * Only the states worth interrupting somebody for.
   *
   * A ticket moving to IN_PROGRESS or being closed after resolution are
   * bookkeeping. Being asked for something, or being told the problem is
   * solved, are not — and those two are exactly where silence costs the most:
   * a ticket sitting on WAITING_ON_CUSTOMER that the customer never learned
   * was waiting on them.
   */
  const wording: Partial<
    Record<typeof ticket.status, { subject: string; heading: string; body: string[] }>
  > = {
    WAITING_ON_CUSTOMER: {
      subject: `We need something from you (${ticket.reference})`,
      heading: "We are waiting on you",
      body: [
        `Our team has replied about "${ticket.subject}" and needs something from you before we can continue.`,
        "Open the request to see what is needed.",
      ],
    },
    RESOLVED: {
      subject: `Resolved: ${ticket.subject} (${ticket.reference})`,
      heading: "Your request has been resolved",
      body: [
        `We believe "${ticket.subject}" is now sorted.`,
        "If it is not, reply to this email and we will reopen it.",
      ],
    },
  };

  const content = wording[ticket.status];
  if (!content) return;

  await deliver(ticket.customerEmail, content.subject, {
    heading: content.heading,
    greetingName: ticket.customerName,
    paragraphs: content.body,
    details: [
      ["Reference", ticket.reference],
      ["Subject", ticket.subject],
    ],
    action: { label: "Open this request", url: `${appUrl()}/account/support` },
  });
}
