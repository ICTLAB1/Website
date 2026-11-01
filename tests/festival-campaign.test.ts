import { describe, expect, it } from "vitest";

import { CAMPAIGN_ENDS_AT, campaignIsRunning } from "@/lib/marketing/festival-campaign";

/**
 * The date a promotion stops is a promise to customers, and the one thing in
 * this feature nobody will notice going wrong until it already has: a pop-up
 * that ends a day early takes a day off an advertised offer, and one that
 * ends late is still wishing people a happy Diwali at Christmas.
 *
 * So the boundary is pinned from both sides, and in the timezone the offer
 * was advertised in rather than the one the server happens to keep.
 */
describe("the Diwali campaign window", () => {
  const ist = (iso: string) => Date.parse(`${iso}+05:30`);

  it("runs through the last day it was advertised for", async () => {
    expect(await campaignIsRunning(ist("2026-11-10T09:00:00"))).toBe(true);
    expect(await campaignIsRunning(ist("2026-11-10T23:59:59"))).toBe(true);
  });

  it("stops at midnight India time, not at half past five in the evening", async () => {
    // The trap this guards: `new Date("2026-11-10")` is midnight UTC, which is
    // 05:30 on the tenth in India — most of a day early.
    expect(await campaignIsRunning(Date.parse("2026-11-10T00:00:00Z"))).toBe(true);
    expect(await campaignIsRunning(Date.parse("2026-11-10T18:29:59Z"))).toBe(true);
    expect(await campaignIsRunning(ist("2026-11-11T00:00:01"))).toBe(false);
  });

  it("is over well before the next festive season", async () => {
    expect(await campaignIsRunning(ist("2026-12-25T12:00:00"))).toBe(false);
    expect(await campaignIsRunning(ist("2027-11-01T12:00:00"))).toBe(false);
  });

  it("ends at the instant the copy claims", () => {
    // 11 November, 00:00 IST — the moment after "until 10 November".
    expect(new Date(CAMPAIGN_ENDS_AT).toISOString()).toBe("2026-11-10T18:30:00.000Z");
  });
});
