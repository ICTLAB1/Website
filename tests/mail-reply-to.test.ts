import { describe, expect, it } from "vitest";

import { resolveReplyTo } from "@/lib/mail";

/**
 * The reply-to policy, in one place because that is where it is enforced.
 *
 * The From address is a no-reply, so a message with no reply-to sends a
 * customer's answer into a mailbox nobody reads. The two failures this guards
 * both shipped: a quotation and a quote follow-up went to customers with no
 * reply-to at all. `resolveReplyTo` defaults a missing one to the sales inbox,
 * below every send, so no path can reintroduce it.
 *
 * The other half matters just as much: an explicit reply-to must win, or the
 * internal lead notifications — which set the customer's own address so a
 * colleague can reply to the lead — would start routing those replies to the
 * sales inbox the colleague is already reading the alert in.
 */
describe("the reply-to address a message is sent with", () => {
  const sales = "sales@techzoidtechnologies.com";

  it("defaults to the sales inbox when the sender set none", () => {
    // Quotations, follow-ups and status notices: nothing chosen, so the sales
    // inbox, never the no-reply From address.
    expect(resolveReplyTo(undefined, sales)).toBe(sales);
  });

  it("keeps an explicit reply-to, so a lead alert still answers to the lead", () => {
    const customer = "buyer@example.com";
    expect(resolveReplyTo(customer, sales)).toBe(customer);
  });

  it("treats a blank or whitespace reply-to as none", () => {
    expect(resolveReplyTo("", sales)).toBe(sales);
    expect(resolveReplyTo("   ", sales)).toBe(sales);
  });

  it("is undefined, not empty, when there is no reply-to and no sales inbox", () => {
    // A deployment that has published no sales address anywhere. Better to send
    // with no reply-to than with an empty header the transport may reject.
    expect(resolveReplyTo(undefined, null)).toBeUndefined();
    expect(resolveReplyTo("  ", "  ")).toBeUndefined();
  });

  it("trims what it returns", () => {
    expect(resolveReplyTo("  buyer@example.com  ", sales)).toBe("buyer@example.com");
    expect(resolveReplyTo(undefined, "  sales@techzoidtechnologies.com ")).toBe(sales);
  });
});
