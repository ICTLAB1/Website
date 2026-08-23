import { describe, expect, it } from "vitest";

import {
  DEVICE_STATUS_LABELS,
  WARRANTY_HINTS,
  WARRANTY_LABELS,
  WARRANTY_WARNING_DAYS,
  warrantyDaysLeft,
  warrantyState,
} from "@/lib/warranty";
import {
  REMINDER_DAYS,
  RENEWAL_OPEN_STATUSES,
  RENEWAL_STATUS_LABELS,
  daysUntil,
  renewalCalendar,
  renewalSummary,
  renewalUrgency,
  URGENCY_LABELS,
  URGENCY_TONES,
} from "@/lib/renewals";
import {
  DELIVERY_STAGE_HINTS,
  DELIVERY_STAGE_LABELS,
  deliveryOverdue,
  deliveryStage,
  safeTrackingUrl,
} from "@/lib/delivery";
import { firstReplyHours, ticketIsClosed } from "@/lib/ticket-service";
import { deviceSchema } from "@/lib/device-service";

/**
 * The customer portal's rules.
 *
 * Four small modules that between them decide what a customer is told about
 * their own equipment, and every one of them can be wrong in a way that costs
 * somebody money: a warranty stated as expired when nobody checked, a renewal
 * that stops being urgent because a month boundary swallowed it, a tracking
 * link that is not a link.
 */

const NOW = new Date("2026-08-23T09:00:00Z");
const days = (count: number) => new Date(NOW.getTime() + count * 24 * 60 * 60 * 1000);

describe("warranty", () => {
  it("says nothing at all when no end date is on file", () => {
    /*
     * The rule the whole module exists for. "Expired" would send somebody to
     * pay for a repair they were entitled to; "in warranty" would promise cover
     * nobody has checked. Neither is honest about a blank field.
     */
    expect(warrantyState({ warrantyEndsAt: null }, NOW)).toBe("unknown");
    expect(warrantyState({}, NOW)).toBe("unknown");
    expect(WARRANTY_LABELS.unknown).toBe("Not recorded");
    expect(WARRANTY_LABELS.unknown).not.toMatch(/out of warranty|expired|covered/i);
  });

  it("treats an unreadable date as unrecorded rather than as expired", () => {
    expect(warrantyState({ warrantyEndsAt: "not a date" }, NOW)).toBe("unknown");
    expect(warrantyDaysLeft({ warrantyEndsAt: "not a date" }, NOW)).toBeNull();
  });

  it("calls a warranty active, expiring or expired around the warning window", () => {
    expect(warrantyState({ warrantyEndsAt: days(400) }, NOW)).toBe("active");
    expect(warrantyState({ warrantyEndsAt: days(WARRANTY_WARNING_DAYS - 1) }, NOW)).toBe("expiring");
    expect(warrantyState({ warrantyEndsAt: days(WARRANTY_WARNING_DAYS + 5) }, NOW)).toBe("active");
    expect(warrantyState({ warrantyEndsAt: days(-1) }, NOW)).toBe("expired");
  });

  it("counts the day a warranty ends as still covered", () => {
    // A warranty that ends today has not ended. Rounding it into "expired" is
    // an argument with a customer on the one day they are certainly right.
    expect(warrantyState({ warrantyEndsAt: NOW }, NOW)).toBe("expiring");
    expect(warrantyDaysLeft({ warrantyEndsAt: NOW }, NOW)).toBe(0);
  });

  it("tells somebody what to do about a missing date", () => {
    expect(WARRANTY_HINTS.unknown).toMatch(/tell us/i);
  });

  it("has a label for every device status", () => {
    for (const label of Object.values(DEVICE_STATUS_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe("recording a device", () => {
  const base = { brandName: "HP", model: "ProBook 450 G10" };

  it("needs only a make and a model", () => {
    const parsed = deviceSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.serial).toBeNull();
      expect(parsed.data.warrantyEndsAt).toBeNull();
      expect(parsed.data.status).toBe("IN_SERVICE");
    }
  });

  it("turns a date somebody could not type into nothing, never into today", () => {
    const parsed = deviceSchema.safeParse({ ...base, warrantyEndsAt: "next tuesday" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.warrantyEndsAt).toBeNull();
  });

  it("refuses a warranty that ends before it starts", () => {
    const parsed = deviceSchema.safeParse({
      ...base,
      warrantyStartsAt: "2026-08-01",
      warrantyEndsAt: "2025-08-01",
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps a warranty that starts and ends on the same day", () => {
    const parsed = deviceSchema.safeParse({
      ...base,
      warrantyStartsAt: "2026-08-01",
      warrantyEndsAt: "2026-08-01",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("renewal urgency", () => {
  it("puts an overdue renewal in its own band", () => {
    expect(renewalUrgency(days(-1), NOW)).toBe("overdue");
    expect(URGENCY_TONES.overdue).toBe("danger");
  });

  it("bands the rest at the points we said we would review them", () => {
    expect(renewalUrgency(days(3), NOW)).toBe("critical");
    expect(renewalUrgency(days(20), NOW)).toBe("soon");
    expect(renewalUrgency(days(45), NOW)).toBe("approaching");
    expect(renewalUrgency(days(100), NOW)).toBe("planned");
    expect(renewalUrgency(days(300), NOW)).toBe("distant");
  });

  it("counts days rather than nearly-days", () => {
    // Six hours from now is still today's problem, not tomorrow's.
    expect(daysUntil(new Date(NOW.getTime() + 6 * 60 * 60 * 1000), NOW)).toBe(1);
    expect(daysUntil(days(30), NOW)).toBe(30);
  });

  it("says how long in words, and pluralises them", () => {
    expect(renewalSummary(days(1), NOW)).toBe("Due tomorrow");
    expect(renewalSummary(days(14), NOW)).toBe("Due in 14 days");
    expect(renewalSummary(days(-1), NOW)).toBe("1 day overdue");
    expect(renewalSummary(days(-3), NOW)).toBe("3 days overdue");
    expect(renewalSummary(days(180), NOW)).toMatch(/about 6 months/);
  });

  it("keeps the review points and the labels in step", () => {
    expect(REMINDER_DAYS).toEqual([120, 90, 60, 30, 15, 7, 1]);
    for (const band of Object.keys(URGENCY_LABELS)) {
      expect(URGENCY_TONES[band as keyof typeof URGENCY_TONES]).toBeDefined();
    }
    expect(RENEWAL_OPEN_STATUSES).toContain("UPCOMING");
    expect(RENEWAL_STATUS_LABELS.LAPSED).toBe("Lapsed");
  });
});

describe("the renewal calendar", () => {
  it("shows the empty months between the populated ones", () => {
    /*
     * A calendar that silently omits October reads as a calendar with no
     * October, and the whole point of the view is to make a quiet month
     * visibly quiet.
     */
    const months = renewalCalendar(
      [{ dueAt: "2026-09-10" }, { dueAt: "2026-11-04" }, { dueAt: "2026-11-20" }],
      NOW,
    );
    expect(months.map((month) => month.count)).toEqual([1, 0, 2]);
    expect(months[1]!.label).toBe("October 2026");
  });

  it("takes the most urgent renewal in a month as the month's colour", () => {
    const months = renewalCalendar([{ dueAt: days(2) }, { dueAt: days(4) }], NOW);
    expect(months[0]!.urgency).toBe("critical");
  });

  it("returns nothing for nothing, and ignores what it cannot read", () => {
    expect(renewalCalendar([], NOW)).toEqual([]);
    expect(renewalCalendar([{ dueAt: "not a date" }], NOW)).toEqual([]);
  });
});

describe("delivery", () => {
  it("derives the stage from the dates rather than from a status", () => {
    expect(deliveryStage({ status: "CONFIRMED" })).toBe("not_dispatched");
    expect(deliveryStage({ status: "CONFIRMED", dispatchedAt: NOW })).toBe("dispatched");
    expect(deliveryStage({ status: "CONFIRMED", dispatchedAt: NOW, deliveredAt: NOW })).toBe(
      "delivered",
    );
  });

  it("says nothing is being delivered on a cancelled order", () => {
    expect(deliveryStage({ status: "CANCELLED", dispatchedAt: NOW })).toBe("not_applicable");
    expect(DELIVERY_STAGE_LABELS.not_applicable).toMatch(/not being delivered/i);
  });

  it("promises nothing in the copy for an order that has not moved", () => {
    expect(DELIVERY_STAGE_HINTS.not_dispatched).not.toMatch(/\b(will arrive|guarantee)\b/i);
  });

  it("calls a missed estimate missed", () => {
    expect(deliveryOverdue({ status: "CONFIRMED", expectedAt: days(-2) }, NOW)).toBe(true);
    expect(deliveryOverdue({ status: "CONFIRMED", expectedAt: days(2) }, NOW)).toBe(false);
    expect(
      deliveryOverdue({ status: "CONFIRMED", expectedAt: days(-2), deliveredAt: days(-1) }, NOW),
    ).toBe(false);
  });

  it("refuses a tracking link that is not a web address", () => {
    /*
     * The one field on a customer's order that a panel account controls and the
     * customer clicks. A `javascript:` here would be stored cross-site
     * scripting aimed at the customer, so nothing but http(s) survives.
     */
    expect(safeTrackingUrl("javascript:alert(1)")).toBeNull();
    expect(safeTrackingUrl("data:text/html,<script>")).toBeNull();
    expect(safeTrackingUrl("//evil.example/track")).toBeNull();
    expect(safeTrackingUrl("bluedart.com/track")).toBeNull();
    expect(safeTrackingUrl("  ")).toBeNull();
    expect(safeTrackingUrl(null)).toBeNull();
    expect(safeTrackingUrl("https://www.bluedart.com/tracking?awb=123")).toBe(
      "https://www.bluedart.com/tracking?awb=123",
    );
  });
});

describe("support tickets", () => {
  it("knows which states are finished", () => {
    expect(ticketIsClosed("RESOLVED")).toBe(true);
    expect(ticketIsClosed("CLOSED")).toBe(true);
    expect(ticketIsClosed("WAITING_ON_CUSTOMER")).toBe(false);
    expect(ticketIsClosed("OPEN")).toBe(false);
  });

  it("reports no response time at all until somebody has replied", () => {
    // Not zero. An unanswered ticket answered instantly is a figure that
    // flatters us and means nothing.
    expect(firstReplyHours({ createdAt: NOW })).toBeNull();
    expect(firstReplyHours({ createdAt: NOW, firstReplyAt: null })).toBeNull();
  });

  it("measures the wait from when it was raised", () => {
    const replied = new Date(NOW.getTime() + 3.5 * 60 * 60 * 1000);
    expect(firstReplyHours({ createdAt: NOW, firstReplyAt: replied })).toBe(3.5);
  });
});
