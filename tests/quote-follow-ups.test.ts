import { describe, expect, it } from "vitest";

import {
  dueStep,
  followUpBlock,
  FOLLOW_UP_DEFAULTS,
  type FollowUpSettings,
} from "@/lib/quotes/follow-ups";

/**
 * When a quotation gets chased, and — mostly — when it does not.
 *
 * Every case here is one where sending would be wrong: a quotation that has
 * been answered, one whose pricing has lapsed, one the customer has already
 * written on, one chased by hand yesterday. A follow-up is a machine writing to
 * a customer about money, and the failure that matters is not a missed send but
 * a message that was not true when it went out.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-25T09:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const ahead = (days: number) => new Date(NOW.getTime() + days * DAY);

type Quote = Parameters<typeof followUpBlock>[0];

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "q1",
    reference: "QTE-2026-4F7K2P",
    status: "SENT",
    sentAt: ago(10),
    validUntil: ahead(20),
    currency: "INR",
    totalMinor: 132534178,
    followUpsPausedAt: null,
    owner: { name: "Abhinav Jain" },
    enquiry: { contactEmail: "buyer@example.edu.in", contactName: "Dr. Suresh Rao" },
    followUps: [],
    messages: [],
    ...overrides,
  };
}

const settings: FollowUpSettings = { ...FOLLOW_UP_DEFAULTS, enabled: true };

describe("whether a quotation may be chased at all", () => {
  it("allows one that is sent, unanswered and still valid", () => {
    expect(followUpBlock(quote(), NOW)).toBeNull();
  });

  it("refuses a draft, and one that has been answered either way", () => {
    expect(followUpBlock(quote({ status: "DRAFT", sentAt: null }), NOW)).toBe("not-sent");
    expect(followUpBlock(quote({ status: "ACCEPTED" }), NOW)).toBe("answered");
    expect(followUpBlock(quote({ status: "DECLINED" }), NOW)).toBe("answered");
  });

  it("refuses one whose pricing has lapsed", () => {
    /*
     * The offer has been withdrawn by its own terms. Asking whether they would
     * like to proceed at a price that no longer stands is not a reminder, it is
     * a second offer nobody authorised.
     */
    expect(followUpBlock(quote({ validUntil: ago(1) }), NOW)).toBe("expired");
  });

  it("refuses one with nowhere to write", () => {
    expect(followUpBlock(quote({ enquiry: null }), NOW)).toBe("no-address");
  });

  it("allows one with no validity date at all", () => {
    expect(followUpBlock(quote({ validUntil: null }), NOW)).toBeNull();
  });
});

describe("which automatic step is due", () => {
  it("sends the first once its day has arrived, and not before", () => {
    expect(dueStep(quote({ sentAt: ago(2) }), settings, NOW)).toEqual({ blocked: "not-due" });
    expect(dueStep(quote({ sentAt: ago(3) }), settings, NOW)).toEqual({ step: 1 });
  });

  it("resumes the sequence rather than skipping to the end", () => {
    /*
     * A quotation that sat through a scheduler outage is owed its first chase,
     * not its third. Telling a customer "this is the last reminder" as the
     * first thing they hear is worse than being three days late.
     */
    expect(dueStep(quote({ sentAt: ago(40) }), settings, NOW)).toEqual({ step: 1 });

    const chased = quote({
      sentAt: ago(40),
      followUps: [{ step: 1, sentAt: ago(30) }],
    });
    expect(dueStep(chased, settings, NOW)).toEqual({ step: 2 });
  });

  it("stops when the schedule is exhausted", () => {
    const done = quote({
      sentAt: ago(40),
      followUps: [
        { step: 1, sentAt: ago(30) },
        { step: 2, sentAt: ago(20) },
        { step: 3, sentAt: ago(10) },
      ],
    });
    expect(dueStep(done, settings, NOW)).toEqual({ blocked: "schedule-complete" });
  });

  it("stops when the customer has written, and only when that is configured", () => {
    const replied = quote({ sentAt: ago(10), messages: [{ createdAt: ago(4) }] });
    expect(dueStep(replied, settings, NOW)).toEqual({ blocked: "customer-replied" });
    expect(dueStep(replied, { ...settings, stopOnReply: false }, NOW)).toEqual({ step: 1 });
  });

  it("respects a follow-up sent by hand yesterday", () => {
    /*
     * The step is not consumed — it stays due and goes out once the gap has
     * passed, which is the difference between spacing messages and losing one.
     */
    const chasedByHand = quote({
      sentAt: ago(10),
      followUps: [{ step: null, sentAt: ago(1) }],
    });
    expect(dueStep(chasedByHand, settings, NOW)).toEqual({ blocked: "too-soon" });
    expect(dueStep(chasedByHand, { ...settings, minimumGapDays: 1 }, NOW)).toEqual({ step: 1 });
  });

  it("sends nothing on a paused quotation", () => {
    expect(dueStep(quote({ followUpsPausedAt: ago(1) }), settings, NOW)).toEqual({
      blocked: "paused",
    });
  });

  it("sends nothing when the schedule is empty", () => {
    expect(dueStep(quote(), { ...settings, schedule: [] }, NOW)).toEqual({
      blocked: "schedule-complete",
    });
  });

  it("counts a step from when the quotation went out, not from the last chase", () => {
    /*
     * Sent 8 days ago and chased on day 3: step 2 falls on day 7, which has
     * passed, so it is due now — not seven days after the first chase.
     */
    const quotation = quote({ sentAt: ago(8), followUps: [{ step: 1, sentAt: ago(5) }] });
    expect(dueStep(quotation, settings, NOW)).toEqual({ step: 2 });
  });
});

describe("the defaults", () => {
  it("are off", () => {
    /*
     * A deployment that has never opened the settings screen must not start
     * emailing customers because a release shipped.
     */
    expect(FOLLOW_UP_DEFAULTS.enabled).toBe(false);
  });
});
