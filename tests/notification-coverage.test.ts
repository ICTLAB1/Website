import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every state change a customer would expect to hear about, still sends.
 *
 * This exists because five of them did not, and none of them looked wrong. A
 * ticket raised from inside the account, a quotation accepted, an order
 * confirmed, an order *fulfilled with licences issued* — all of them wrote the
 * right rows, showed the right thing in the admin panel, and told the customer
 * nothing. Nobody notices a missing email while building the feature that
 * should have sent it; you notice when a customer asks where their software is.
 *
 * So the check is structural rather than behavioural. It reads the source of
 * each action and asserts a notification is reachable from it. That is a
 * blunter instrument than driving the flow — it cannot prove the message is
 * correct, which is what `quotation-email` and the lifecycle suite are for —
 * but it is the one that fails when somebody adds a sixth action next year and
 * forgets, which is the failure that actually happens.
 */

const read = (file: string) => readFile(path.join(process.cwd(), file), "utf8");

/**
 * Each entry: the function that changes state, and the notification that must
 * be reachable from the file it lives in.
 */
const REQUIRED: Array<{ what: string; file: string; fn: string; notifies: string }> = [
  {
    what: "a support ticket raised from the customer's account",
    file: "src/app/account/actions.ts",
    fn: "createSupportTicket",
    notifies: "notifyTicketRaised",
  },
  {
    what: "a quotation accepted or declined",
    file: "src/app/account/actions.ts",
    fn: "decideQuote",
    notifies: "notifyQuoteDecision",
  },
  {
    what: "an order moved to a new status by staff",
    file: "src/app/admin/quote-actions.ts",
    fn: "updateOrderStatus",
    notifies: "notifyOrderStatus",
  },
  {
    what: "a support ticket moved on by staff",
    file: "src/app/admin/quote-actions.ts",
    fn: "updateSupportTicket",
    notifies: "notifyTicketUpdated",
  },
  {
    what: "an order fulfilled and its licences issued",
    file: "src/lib/order-service.ts",
    fn: "fulfilOrder",
    notifies: "notifyOrderFulfilled",
  },
  {
    what: "a quotation issued to the customer",
    file: "src/lib/quote-service.ts",
    fn: "sendQuote",
    notifies: "quotationHtml",
  },
  {
    what: "an account registered",
    file: "src/app/api/auth/register/route.ts",
    fn: "POST",
    notifies: "sendVerificationEmail",
  },
  {
    what: "a password reset requested",
    file: "src/app/api/auth/forgot-password/route.ts",
    fn: "POST",
    notifies: "sendMail",
  },
  {
    what: "a payment captured",
    file: "src/lib/payments/service.ts",
    fn: "recordCapture",
    notifies: "notifyPaid",
  },
  {
    what: "an enquiry submitted",
    file: "src/lib/enquiry-service.ts",
    fn: "createEnquiry",
    notifies: "sendMail",
  },
  {
    what: "an order placed directly",
    file: "src/lib/order-service.ts",
    fn: "createDirectOrder",
    notifies: "notifyOrder",
  },
];

describe("nothing changes state in silence", () => {
  it.each(REQUIRED)("$what tells somebody", async ({ file, fn, notifies }) => {
    const source = await read(file);

    // The function exists at all. Renaming it without updating this list would
    // otherwise leave the row passing against a file it no longer describes.
    expect(source, `${fn} not found in ${file}`).toMatch(
      new RegExp(`(?:export )?(?:async )?(?:function |const )${fn}\\b`),
    );
    expect(source, `${file} never calls ${notifies}`).toContain(notifies);
  });

  it("sends through the shared renderer rather than hand-built HTML", async () => {
    /*
     * A customer gets half a dozen of these across one purchase and they should
     * look like one company sent them. Before the shared shell existed each was
     * assembled at its call site, and they had drifted — which is also how three
     * of them ended up not existing at all.
     */
    const source = await read("src/lib/emails/transactional.ts");
    expect(source).toContain("renderEmailHtml");
    expect(source).toContain("renderEmailText");

    // Every message carries a plain-text alternative. It is not a formality: it
    // is what a client refusing HTML shows, and what the log records when mail
    // is unconfigured.
    const senders = source.match(/export async function notify\w+/g) ?? [];
    expect(senders.length).toBeGreaterThanOrEqual(5);
  });
});
