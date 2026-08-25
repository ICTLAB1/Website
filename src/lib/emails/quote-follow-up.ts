import "server-only";

import { renderEmailHtml, renderEmailText, type EmailContent } from "@/lib/emails/shell";
import { formatMoney } from "@/lib/money";
import type { SiteConfig } from "@/lib/site-config";

/**
 * The message that goes out when a quotation has been sent and nothing has
 * happened since.
 *
 * ## What it is not
 *
 * It is not the quotation again. The document was sent, with its letterhead,
 * its line items and its PDF; sending all of that a second time says the first
 * one may not have arrived, which is usually untrue and always slightly rude.
 * This is a short note that names the quotation, states what it is worth and
 * how long it stands, and asks whether anything is needed to move it on.
 *
 * ## What it may not say
 *
 * No deadline this business has not set, no discount, no scarcity, and nothing
 * about what a competitor might charge. The one time-bound fact available here
 * is the validity date already printed on the document, and it is stated as a
 * date rather than dressed up as pressure.
 *
 * The customer is presumed busy rather than rude: every wording here allows for
 * the requirement having moved on, and offers to close it as easily as to
 * continue it. A chase that only has one acceptable answer is a chase people
 * stop reading.
 */

export type QuoteFollowUpInput = {
  reference: string;
  /** What was quoted, so the message means something without the attachment. */
  currency: string;
  totalMinor: number;
  validUntil: Date | null;
  /** When the quotation itself went out — the thing being followed up. */
  sentAt: Date;
  customer: { name: string | null; email: string };
  /** Where the customer accepts, declines or asks a question. */
  quoteUrl: string;
  /**
   * Which chase this is, of how many, or null for one sent by hand.
   *
   * Not printed. It changes the opening line — a first note assumes the
   * quotation simply has not been looked at yet; a later one assumes it has,
   * and asks a different question.
   */
  step: number | null;
  /**
   * What a member of staff wrote, on a follow-up they sent themselves.
   *
   * Printed as its own paragraph, ahead of the standard wording, because a
   * sentence from the person handling the account is the reason that message
   * gets a reply and the template around it is not.
   */
  note: string | null;
  /** Who is chasing, where the quotation names somebody. */
  sender: { name: string } | null;
  config: SiteConfig;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function quoteFollowUpSubject(input: QuoteFollowUpInput): string {
  return `Following up on quotation ${input.reference}`;
}

/**
 * The opening line, chosen by how long this has been outstanding.
 *
 * A single wording used three times reads as an autoresponder by the third,
 * and a customer who is getting the same paragraph on a fortnightly clock has
 * been told something true about how much attention their file is getting.
 */
function opening(step: number | null): string {
  if (step === null) {
    return "I wanted to check in on the quotation below.";
  }
  if (step <= 1) {
    return "We sent the quotation below a few days ago and have not heard back, so this is just to make sure it reached you.";
  }
  if (step === 2) {
    return "The quotation below is still open on our side. If it is with someone else for approval, we are happy to wait — it helps to know.";
  }
  return "This is the last reminder we will send about the quotation below.";
}

function content(input: QuoteFollowUpInput): EmailContent {
  const total = formatMoney(input.totalMinor, input.currency, { showDecimals: true });

  return {
    heading: `Quotation ${input.reference}`,
    greetingName: input.customer.name,
    paragraphs: [
      ...(input.note ? [input.note] : []),
      opening(input.step),
      /*
       * Three options, not one.
       *
       * "Please confirm" assumes the answer. A person who has decided against
       * this, or whose budget moved to next quarter, has nothing to reply to
       * unless the message makes saying so as easy as saying yes — and a "no"
       * today is worth more to both sides than silence for a month.
       */
      "If you would like to go ahead, you can accept it online. If something needs changing — quantities, versions, the licence term — tell us and we will re-issue it. And if the requirement has gone away, say so and we will close it off.",
    ],
    details: [
      ["Quotation", input.reference],
      ["Value", total],
      ["Issued", formatDate(input.sentAt)],
      /*
       * The validity date, where the document carries one.
       *
       * Stated because it is the honest reason for a follow-up to exist at
       * all: pricing that stands until a date is pricing that stops standing
       * afterwards. Where no date was set, no line — an invented deadline is
       * exactly the thing this file exists to avoid.
       */
      ["Valid until", input.validUntil ? formatDate(input.validUntil) : null],
    ],
    action: { label: "Open the quotation", url: input.quoteUrl },
    footnote: input.sender
      ? `Sent by ${input.sender.name} at ${input.config.tradingName}. Replying to this email reaches them directly.`
      : `Replying to this email reaches the team handling your quotation at ${input.config.tradingName}.`,
  };
}

export function quoteFollowUpText(input: QuoteFollowUpInput): string {
  return renderEmailText(content(input), input.config);
}

export function quoteFollowUpHtml(input: QuoteFollowUpInput): string {
  return renderEmailHtml(content(input), input.config);
}
