import { describe, expect, it } from "vitest";

import { metaDescription } from "@/lib/seo-description";
import { hardwareTitle } from "@/lib/catalogue/hardware";

/**
 * Two small rules that decide what a search result looks like.
 *
 * Both were written against real records that were wrong on the live site — a
 * forty-character meta description on `/brands/acer`, and "HP ProOne 440 G9
 * All-in-One — Commercial all-in-one" as a page title. The cases below are
 * those records.
 */

describe("metaDescription", () => {
  it("leaves a description that is already long enough alone", () => {
    const written =
      "AutoCAD subscriptions with all seven industry toolsets included, priced across one- and three-year " +
      "terms, and quoted against your seat count.";
    expect(written.length).toBeGreaterThanOrEqual(115);
    expect(metaDescription(written, "ignored context")).toBe(written);
  });

  it("adds context to a description that would look empty in a result", () => {
    const result = metaDescription(
      "Business laptops, desktops and displays.",
      "Sourced and quoted by TechZoid, on one quotation and one purchase order with the rest of your estate.",
    );
    expect(result.startsWith("Business laptops, desktops and displays.")).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(115);
    expect(result.length).toBeLessThanOrEqual(160);
  });

  /*
   * The threshold moved from 70 to 115, and this is the band that moved.
   *
   * A description of a hundred characters used to be returned untouched, which
   * is 65% of the space a result gets and reads as a stub beside a competitor
   * filling all of it. The fixture above had to be lengthened for the same
   * reason — at 105 characters it is no longer an example of "long enough".
   */
  it("extends a description that is long but still short of the window", () => {
    const lead =
      "Endpoint detection and response for Windows, macOS and Linux estates, licensed per endpoint.";
    expect(lead.length).toBeGreaterThan(70);
    expect(lead.length).toBeLessThan(115);

    const result = metaDescription(lead, "Quoted by TechZoid with GST invoicing.");
    expect(result).toBe(`${lead} Quoted by TechZoid with GST invoicing.`);
  });

  it("takes the first candidate that fits, not the first candidate", () => {
    // 69 characters: long enough that the preferred sentence would overflow.
    const lead = "Falcon endpoint detection and response, by module and endpoint count.";
    expect(lead.length).toBe(69);

    const result = metaDescription(
      lead,
      "A sentence far too long to append to this one without running past the hundred and sixty characters a search result will show anybody.",
      "Sourced and quoted by TechZoid.",
    );
    expect(result).toBe(`${lead} Sourced and quoted by TechZoid.`);
    expect(result.length).toBeLessThanOrEqual(160);
  });

  it("returns the short description rather than an overlong one when nothing fits", () => {
    const lead = "Ad-free business email hosting on your own domain.";
    const result = metaDescription(lead, "x".repeat(200));
    expect(result).toBe(lead);
  });

  it("never truncates the record's own words", () => {
    const lead = "Endpoint, server and cloud workload protection.";
    expect(metaDescription(lead, "Sourced and quoted by TechZoid.")).toContain(lead);
  });
});

describe("hardwareTitle", () => {
  it("qualifies a model name that does not say what it is", () => {
    expect(hardwareTitle("HP Pro 400 G9 Microtower", "DESKTOP_TOWER")).toBe(
      "HP Pro 400 G9 Microtower — Commercial desktop",
    );
  });

  it("does not repeat a noun the model name already carries", () => {
    expect(hardwareTitle("HP Z8 Fury G5 Tower Workstation", "DESKTOP_WORKSTATION")).toBe(
      "HP Z8 Fury G5 Tower Workstation",
    );
    expect(hardwareTitle("HP ProOne 440 G9 All-in-One", "ALL_IN_ONE")).toBe(
      "HP ProOne 440 G9 All-in-One",
    );
    expect(hardwareTitle("Dell PowerEdge R760 Server", "RACK_SERVER")).toBe(
      "Dell PowerEdge R760 Server",
    );
  });

  it("matches the noun case-insensitively and on a word boundary", () => {
    expect(hardwareTitle("Lenovo ThinkPad X1 laptop", "LAPTOP")).toBe("Lenovo ThinkPad X1 laptop");
    // "Miniature" must not count as "mini pc", and "Minitower" must not either.
    expect(hardwareTitle("HP Pro Minitower 290", "DESKTOP_MINI")).toBe(
      "HP Pro Minitower 290 — Commercial mini PC",
    );
  });
});
