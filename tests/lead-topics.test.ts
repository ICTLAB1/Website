import { describe, expect, it } from "vitest";
import { CONTACT_TOPICS, LEAD_TOPICS, contactSchema, topicIsLead } from "@/lib/validation";

/**
 * Which contact-form topics are a lead.
 *
 * This decides what gets reported to Google Ads as a conversion, and a bidding
 * strategy set to maximise conversions bids for more of whatever it is told is
 * one. Counting a support request would have it buy traffic from people whose
 * licence is broken.
 *
 * The list also used to exist three times — in the schema, in the admin
 * queue's filter, and in the form that reports the conversion — so the checks
 * below are as much about the copies staying one copy as about the values.
 */
describe("contact topics", () => {
  it("treats a sales or procurement enquiry as a lead", () => {
    expect(topicIsLead("SALES")).toBe(true);
    expect(topicIsLead("ENTERPRISE")).toBe(true);
  });

  it("does not treat support or a general question as a lead", () => {
    expect(topicIsLead("SUPPORT")).toBe(false);
    expect(topicIsLead("GENERAL")).toBe(false);
  });

  it("refuses anything that is not a topic at all", () => {
    // Reached with whatever a submitted form carried, so an unknown value must
    // not count rather than throw.
    for (const value of ["", "sales", "LEAD", "SALES ", "__proto__"]) {
      expect(topicIsLead(value)).toBe(false);
    }
  });

  it("every lead topic is a topic the form can actually submit", () => {
    // A lead topic the schema rejects is a conversion that can never fire;
    // this is the assertion that catches a rename in one place only.
    for (const topic of LEAD_TOPICS) {
      expect(CONTACT_TOPICS).toContain(topic);
      expect(contactSchema.safeParse({
        name: "A Person",
        email: "person@example.test",
        topic,
        message: "A message long enough to pass validation.",
      }).success).toBe(true);
    }
  });

  it("the schema accepts exactly the topics on the shared list", () => {
    for (const topic of CONTACT_TOPICS) {
      expect(contactSchema.safeParse({
        name: "A Person",
        email: "person@example.test",
        topic,
        message: "A message long enough to pass validation.",
      }).success).toBe(true);
    }
    expect(contactSchema.safeParse({
      name: "A Person",
      email: "person@example.test",
      topic: "BILLING",
      message: "A message long enough to pass validation.",
    }).success).toBe(false);
  });
});
