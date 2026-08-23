import { describe, expect, it } from "vitest";

import {
  financialYear,
  formatDocumentNumber,
  seriesKey,
  templateProblem,
} from "@/lib/document-number";

/**
 * The number printed at the top of a quotation.
 *
 * Two things here can go wrong quietly and expensively: a financial year that
 * turns over in the wrong month, which restarts a series early and issues two
 * documents with the same number; and a template with no counter in it, which
 * does the same thing on the second quotation.
 */

describe("the Indian financial year", () => {
  it("turns over in April, not January", () => {
    expect(financialYear(new Date("2026-04-01T00:00:00Z")).short).toBe("2627");
    expect(financialYear(new Date("2026-03-31T00:00:00Z")).short).toBe("2526");
    // The one that catches a naive implementation: January is the *old* year.
    expect(financialYear(new Date("2027-01-15T00:00:00Z")).short).toBe("2627");
    expect(financialYear(new Date("2027-04-01T00:00:00Z")).short).toBe("2728");
  });

  it("writes the long form the way a document does", () => {
    expect(financialYear(new Date("2026-08-23T00:00:00Z")).long).toBe("2026-27");
  });
});

describe("rendering a number", () => {
  const when = new Date("2026-08-23T00:00:00Z");

  it("produces the series the business already uses", () => {
    expect(formatDocumentNumber("TZ/QT/{FY}/{SEQ:4}", 42, when)).toBe("TZ/QT/2627/0042");
  });

  it("pads only when asked", () => {
    expect(formatDocumentNumber("QT-{SEQ}", 7, when)).toBe("QT-7");
    expect(formatDocumentNumber("QT-{SEQ:5}", 7, when)).toBe("QT-00007");
  });

  it("does not truncate a counter that outgrew its padding", () => {
    // Better a wider number than a wrong one: 10000 must not print as 0000.
    expect(formatDocumentNumber("QT-{SEQ:4}", 10_000, when)).toBe("QT-10000");
  });

  it("fills in the other date tokens", () => {
    expect(formatDocumentNumber("{YYYY}/{MM}/{SEQ:3}", 5, when)).toBe("2026/08/005");
    expect(formatDocumentNumber("{YY}-{SEQ}", 5, when)).toBe("26-5");
    expect(formatDocumentNumber("{FYYYY}/{SEQ}", 5, when)).toBe("2026-27/5");
  });
});

describe("which counter a template uses", () => {
  it("counts separately per financial year when the format says so", () => {
    const april = new Date("2026-04-02T00:00:00Z");
    const march = new Date("2027-03-30T00:00:00Z");
    const after = new Date("2027-04-02T00:00:00Z");

    const template = "TZ/QT/{FY}/{SEQ:4}";
    expect(seriesKey(template, april)).toBe(seriesKey(template, march));
    expect(seriesKey(template, april)).not.toBe(seriesKey(template, after));
  });

  it("counts once and for ever when the format has no period in it", () => {
    const template = "QT-{SEQ:5}";
    expect(seriesKey(template, new Date("2026-01-01T00:00:00Z"))).toBe(
      seriesKey(template, new Date("2030-01-01T00:00:00Z")),
    );
  });
});

describe("checking a template before it is saved", () => {
  it("insists on a counter", () => {
    /*
     * The important one. Without {SEQ} every quotation gets the same number,
     * and the second one fails to save against the unique constraint — at the
     * moment somebody is trying to send it.
     */
    expect(templateProblem("TZ/QT/{FY}")).toBe("no_sequence");
    expect(templateProblem("TZ/QT/{FY}/{SEQ:4}")).toBeNull();
  });

  it("treats blank as no series rather than as an error to fix", () => {
    expect(templateProblem("")).toBe("empty");
    expect(templateProblem(null)).toBe("empty");
  });

  it("refuses what a document number cannot contain", () => {
    expect(templateProblem("QT/<script>/{SEQ}")).toBe("bad_characters");
    expect(templateProblem(`${"X".repeat(70)}{SEQ}`)).toBe("too_long");
  });
});
