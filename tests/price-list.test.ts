import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { listSheets, readSheet } from "../scripts/lib/xlsx";
import {
  COST_HEADERS,
  baseName,
  defaultVariant,
  describe as describeProduct,
  licenceTypeFor,
  monthsOf,
  optionsFromPriceRatio,
  optionsFromStatedTerms,
  parseSheet,
  plan,
  priceColumn,
  sameMoney,
  skuFor,
  termLabel,
  variantName,
  type Row,
  type VariantPlan,
} from "../scripts/lib/price-list";

/**
 * These tests exist because of what the channel price list carries.
 *
 * Beside the retail price it states what this company pays, and the two are a
 * few columns apart. Every other property here — a stable key, a term read
 * rather than guessed, an option that is not listed twice — matters to a page
 * looking right. That one matters to a page not publishing a margin, so it is
 * the first thing asserted and the thing asserted from several directions.
 */

function row(overrides: Partial<Row> = {}): Row {
  return {
    source: "nce",
    productId: "CFQ7TTC0HL8Z",
    title: "10-Year Audit Log Retention Add On",
    segment: "Commercial",
    termMonths: 12,
    termStated: true,
    billedMonthly: false,
    priceMajor: 1980,
    ...overrides,
  };
}

describe("the price column", () => {
  const channelHeader = [
    "Publisher",
    "ChangeIndicator",
    "Tags",
    "ProductId",
    "SkuId",
    "SkuTitle",
    "TermDuration",
    "BillingPlan",
    "Segment",
    "Unit SELL Price",
    "Discounted Price",
    "Qty",
    "Total",
    "Discount %",
    "ERP Price",
  ];

  it("finds ERP in the channel workbook, past four columns of cost", () => {
    expect(priceColumn(channelHeader)).toBe(14);
  });

  it("finds it under the bare name the other sheets use", () => {
    expect(priceColumn(["ProductId", "SkuTitle", "Segment", "ERP"])).toBe(3);
  });

  it("refuses a file that has cost columns and no ERP", () => {
    const withoutErp = channelHeader.filter((name) => !/^erp/i.test(name));
    expect(priceColumn(withoutErp)).toBe(-1);
  });

  it("recognises every cost column in the workbook as one", () => {
    for (const name of ["Unit SELL Price", "Discounted Price", "Total", "Discount %"]) {
      expect(COST_HEADERS.test(name)).toBe(true);
    }
  });

  it("does not mistake the retail price for one", () => {
    expect(COST_HEADERS.test("ERP Price")).toBe(false);
    expect(COST_HEADERS.test("ERP")).toBe(false);
  });
});

describe("terms", () => {
  it("reads the durations the workbook states", () => {
    expect(monthsOf("P1M")).toBe(1);
    expect(monthsOf("P1Y")).toBe(12);
    expect(monthsOf("P3Y")).toBe(36);
  });

  it("returns nothing for a shape it does not know, rather than a guess", () => {
    for (const value of ["", "annual", "P0Y", "1Y", "PT1H", "P1D"]) {
      expect(monthsOf(value)).toBeNull();
    }
  });

  it("names each one the way the page says it", () => {
    expect(termLabel(null)).toBe("Perpetual licence");
    expect(termLabel(1)).toBe("Monthly subscription");
    expect(termLabel(12)).toBe("Annual commitment");
    expect(termLabel(36)).toBe("Three-year commitment");
    expect(termLabel(60)).toBe("5-year commitment");
    expect(termLabel(18)).toBe("18-month term");
  });
});

describe("two figures that are the same money", () => {
  it("treats a rounding difference on a large total as one price", () => {
    expect(sameMoney(15_293, 15_293.01)).toBe(true);
    expect(sameMoney(1_523_550.99, 1_523_551)).toBe(true);
  });

  it("keeps the ~5% charged for paying monthly apart", () => {
    expect(sameMoney(1980, 2079)).toBe(false);
  });

  it("does not divide by zero on a free SKU", () => {
    expect(sameMoney(0, 0)).toBe(true);
  });
});

describe("the SKU key", () => {
  /*
   * These two strings were written into the catalogue by the previous import.
   * If either changes, a re-import archives the live variant and creates a new
   * one under a new key, and every order line pointing at the old one is
   * orphaned. That is the whole reason the publisher's own part number, which
   * arrived with this workbook, is still not used.
   */
  it("still produces the keys the previous import wrote", () => {
    expect(skuFor(row(), "COMMERCIAL", 12, false)).toBe("CFQ7TTC0HL8Z-C12-0326A9");
    expect(
      skuFor(
        row({ title: "10-Year Audit Log Retention Add On (Education Pricing)" }),
        "EDUCATION",
        12,
        false,
      ),
    ).toBe("CFQ7TTC0HL8Z-E12-FDD6AF");
  });

  it("gives the monthly-billed option its own key, and only it", () => {
    expect(skuFor(row(), "COMMERCIAL", 12, true)).toBe("CFQ7TTC0HL8Z-C12M-0326A9");
  });

  it("separates the term, the audience and the title", () => {
    const keys = new Set([
      skuFor(row(), "COMMERCIAL", 12, false),
      skuFor(row(), "COMMERCIAL", 36, false),
      skuFor(row(), "COMMERCIAL", 1, false),
      skuFor(row(), "COMMERCIAL", null, false),
      skuFor(row(), "NON_PROFIT", 12, false),
      skuFor(row({ title: "Something else" }), "COMMERCIAL", 12, false),
    ]);
    expect(keys.size).toBe(6);
  });
});

describe("options from a sheet that states the term", () => {
  const nothing = () => {};

  it("prices an annual commitment and the same commitment billed monthly", () => {
    const options = optionsFromStatedTerms(
      [row({ priceMajor: 1980 }), row({ priceMajor: 2079, billedMonthly: true })],
      nothing,
    );
    expect(options).toEqual([
      { termMonths: 12, billedMonthly: false, price: 1980 },
      { termMonths: 12, billedMonthly: true, price: 2079 },
    ]);
  });

  it("drops a monthly-billed option that costs the same as paying up front", () => {
    const options = optionsFromStatedTerms(
      [row({ priceMajor: 606_841 }), row({ priceMajor: 606_840.96, billedMonthly: true })],
      nothing,
    );
    expect(options).toEqual([{ termMonths: 12, billedMonthly: false, price: 606_841 }]);
  });

  it("keeps a lone monthly-billed option, which has nothing to duplicate", () => {
    const options = optionsFromStatedTerms([row({ priceMajor: 2079, billedMonthly: true })], nothing);
    expect(options).toEqual([{ termMonths: 12, billedMonthly: true, price: 2079 }]);
  });

  it("takes the higher of two figures that differ only by rounding, silently", () => {
    const said: string[] = [];
    const options = optionsFromStatedTerms(
      [row({ priceMajor: 15_293 }), row({ priceMajor: 15_293.01 })],
      (why) => said.push(why),
    );
    expect(options).toEqual([{ termMonths: 12, billedMonthly: false, price: 15_293.01 }]);
    expect(said).toEqual([]);
  });

  it("reports one term priced two genuinely different ways", () => {
    const said: string[] = [];
    optionsFromStatedTerms([row({ priceMajor: 1000 }), row({ priceMajor: 4000 })], (why) =>
      said.push(why),
    );
    expect(said).toHaveLength(1);
    expect(said[0]).toContain("1000, 4000");
  });

  it("keeps terms apart", () => {
    const options = optionsFromStatedTerms(
      [row({ priceMajor: 198, termMonths: 1 }), row({ priceMajor: 1980 }), row({ priceMajor: 5940, termMonths: 36 })],
      nothing,
    );
    expect(options.map((option) => option.termMonths)).toEqual([1, 12, 36]);
  });
});

describe("options from a sheet that does not state the term", () => {
  const nothing = () => {};

  it("reads a 3x pair as the annual and three-year commitment", () => {
    const options = optionsFromPriceRatio(
      [row({ termStated: false, priceMajor: 1980 }), row({ termStated: false, priceMajor: 5940 })],
      "nce",
      nothing,
    );
    expect(options).toEqual([
      { termMonths: 12, billedMonthly: false, price: 1980 },
      { termMonths: 36, billedMonthly: false, price: 5940 },
    ]);
  });

  it("takes a single price as the annual commitment", () => {
    expect(optionsFromPriceRatio([row({ termStated: false })], "nce", nothing)).toEqual([
      { termMonths: 12, billedMonthly: false, price: 1980 },
    ]);
  });

  it("reports a second price in any other ratio rather than guessing at it", () => {
    const said: string[] = [];
    const options = optionsFromPriceRatio(
      [row({ termStated: false, priceMajor: 1000 }), row({ termStated: false, priceMajor: 2500 })],
      "nce",
      (why) => said.push(why),
    );
    expect(options).toEqual([{ termMonths: 12, billedMonthly: false, price: 1000 }]);
    expect(said[0]).toContain("not 3x");
  });

  it("gives a perpetual row no term at all", () => {
    expect(optionsFromPriceRatio([row({ source: "perpetual" })], "perpetual", nothing)).toEqual([
      { termMonths: null, billedMonthly: false, price: 1980 },
    ]);
  });
});

describe("licence type", () => {
  it("calls a one-month term a monthly subscription, whichever sheet it came on", () => {
    expect(licenceTypeFor("nce", 1)).toBe("SUBSCRIPTION_MONTHLY");
    expect(licenceTypeFor("subscription", 1)).toBe("SUBSCRIPTION_MONTHLY");
  });

  it("keeps the rest by source", () => {
    expect(licenceTypeFor("nce", 12)).toBe("CSP");
    expect(licenceTypeFor("subscription", 12)).toBe("SUBSCRIPTION_ANNUAL");
    expect(licenceTypeFor("perpetual", null)).toBe("PERPETUAL");
  });
});

describe("the display name", () => {
  it("takes the audience suffix back out, wherever it sits", () => {
    expect(baseName("Advanced Communications (Education Student Pricing)")).toBe(
      "Advanced Communications",
    );
    expect(baseName("Dynamics 365 Business Central (Non-Profit Pricing) - 3 Year")).toBe(
      "Dynamics 365 Business Central - 3 Year",
    );
  });

  it("leaves a term marker in the title alone, because it is already a page", () => {
    expect(baseName("Microsoft 365 E3 - 3 year")).toBe("Microsoft 365 E3 - 3 year");
    expect(baseName("Dynamics 365 Business Central Device (36mo)")).toBe(
      "Dynamics 365 Business Central Device (36mo)",
    );
  });

  it("names the term, the billing and the audience on the option", () => {
    expect(variantName("Windows Server 2025 CAL - 1 User CAL", "COMMERCIAL", 12, false)).toBe(
      "Annual commitment, 1 user cal",
    );
    expect(variantName("Advanced Communications", "EDUCATION", 12, true)).toBe(
      "Annual commitment, billed monthly, academic pricing",
    );
    expect(variantName("Advanced Communications", "NON_PROFIT", 1, false)).toBe(
      "Monthly subscription, non-profit pricing",
    );
  });
});

describe("planning a catalogue from rows", () => {
  it("reads the audience from the segment column, never from the title", () => {
    // The title says nothing about education; the column does.
    const { products } = plan([
      row({ title: "Office 365 A1 Student Use Benefit", segment: "Education", priceMajor: 100 }),
    ]);
    expect(products[0]?.variants[0]?.audience).toBe("EDUCATION");
  });

  it("puts two audiences of one product on one page", () => {
    const { products } = plan([
      row({ priceMajor: 1980 }),
      row({
        title: "10-Year Audit Log Retention Add On (Education Pricing)",
        segment: "Education",
        priceMajor: 990,
      }),
    ]);
    expect(products).toHaveLength(1);
    expect(products[0]?.variants.map((variant) => variant.audience).sort()).toEqual([
      "COMMERCIAL",
      "EDUCATION",
    ]);
  });

  it("does not import a free SKU as a zero-rupee line", () => {
    const { products, skipped } = plan([row({ priceMajor: 0 })]);
    expect(products).toHaveLength(0);
    expect(skipped[0]?.why).toBe("no price");
  });

  it("does not import a segment it cannot place", () => {
    const { products, skipped } = plan([row({ segment: "Government" })]);
    expect(products).toHaveLength(0);
    expect(skipped[0]?.why).toBe("unrecognised segment");
  });

  it("lists a price too large to store on quote rather than wrapped", () => {
    const { products, skipped } = plan([row({ priceMajor: 116_356_149 })]);
    expect(products[0]?.variants[0]?.listPriceMinor).toBe(0);
    expect(skipped[0]?.why).toContain("above the maximum storable price");
  });

  it("gives two products that normalise to one slug distinct addresses", () => {
    const { products } = plan([
      row({ productId: "AAAA1111", title: "Widget" }),
      row({ productId: "BBBB2222", title: "Widget!" }),
    ]);
    expect(new Set(products.map((product) => product.slug)).size).toBe(2);
  });
});

describe("the price a card quotes", () => {
  const variant = (over: Partial<VariantPlan>): VariantPlan => ({
    sku: "X",
    name: "n",
    audience: "COMMERCIAL",
    licenceType: "CSP",
    termMonths: 12,
    billedMonthly: false,
    listPriceMinor: 100,
    ...over,
  });

  it("is the annual commitment, not the cheaper monthly subscription", () => {
    const chosen = defaultVariant([
      variant({ sku: "MONTH", termMonths: 1, listPriceMinor: 19_800 }),
      variant({ sku: "YEAR", termMonths: 12, listPriceMinor: 198_000 }),
    ]);
    expect(chosen?.sku).toBe("YEAR");
  });

  it("prefers paying up front over the monthly-billed option at the same term", () => {
    const chosen = defaultVariant([
      variant({ sku: "MONTHLY_BILLED", billedMonthly: true, listPriceMinor: 207_900 }),
      variant({ sku: "UPFRONT", listPriceMinor: 198_000 }),
    ]);
    expect(chosen?.sku).toBe("UPFRONT");
  });

  it("ignores a price nobody browsing is entitled to", () => {
    const chosen = defaultVariant([
      variant({ sku: "ACADEMIC", audience: "EDUCATION", listPriceMinor: 1_000 }),
      variant({ sku: "COMMERCIAL", listPriceMinor: 198_000 }),
    ]);
    expect(chosen?.sku).toBe("COMMERCIAL");
  });

  it("falls back to the cheapest when there is no annual commitment", () => {
    const chosen = defaultVariant([
      variant({ sku: "THREE", termMonths: 36, listPriceMinor: 594_000 }),
      variant({ sku: "ONE", termMonths: 1, listPriceMinor: 19_800 }),
    ]);
    expect(chosen?.sku).toBe("ONE");
  });
});

describe("the product copy", () => {
  it("states the terms present and claims nothing else", () => {
    const { products } = plan([row({ priceMajor: 1980 }), row({ priceMajor: 5940, termMonths: 36 })]);
    const copy = describeProduct(products[0]!);
    expect(copy.short).toContain("an annual commitment or a three-year commitment");
    expect(copy.long).toContain("exclusive of GST");
    // Nothing about what the product does, because the list does not say.
    expect(copy.long).not.toMatch(/best|leading|powerful|industry/i);
  });

  it("mentions academic pricing only where an academic price exists", () => {
    const commercial = plan([row()]).products[0]!;
    expect(describeProduct(commercial).long).not.toContain("Academic pricing");

    const academic = plan([row({ segment: "Education", priceMajor: 990 })]).products[0]!;
    expect(describeProduct(academic).long).toContain("Academic pricing");
  });
});

// ─────────────────────────────────────────────────── reading the workbook

/**
 * A ZIP of stored (uncompressed) entries.
 *
 * Enough of the format for the reader under test, which takes its offsets from
 * the central directory and never checks a CRC. Written by hand so a test can
 * build a workbook whose tabs are in a different order from its sheet files —
 * the case that motivated resolving sheets through the relationships.
 */
function zip(files: Array<[string, string]>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const [name, text] of files) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(text, "utf8");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, directory, end]);
}

function sheetXml(rows: string[][]): string {
  const letters = (index: number) => String.fromCharCode(65 + index);
  const cells = rows
    .map(
      (cells, rowIndex) =>
        `<row r="${rowIndex + 1}">` +
        cells
          .map(
            (value, index) =>
              `<c r="${letters(index)}${rowIndex + 1}" t="inlineStr"><is><t>${value}</t></is></c>`,
          )
          .join("") +
        "</row>",
    )
    .join("");
  return `<worksheet><sheetData>${cells}</sheetData></worksheet>`;
}

/** A workbook whose first tab is the *second* sheet file. */
function workbook(): string {
  const dir = mkdtempSync(join(tmpdir(), "price-list-"));
  const path = join(dir, "book.xlsx");

  writeFileSync(
    path,
    zip([
      [
        "xl/workbook.xml",
        `<workbook><sheets><sheet name="NCE" sheetId="2" r:id="rB"/>` +
          `<sheet name="PERPETUAL" sheetId="1" r:id="rA"/></sheets></workbook>`,
      ],
      [
        "xl/_rels/workbook.xml.rels",
        `<Relationships><Relationship Id="rA" Target="worksheets/sheet1.xml"/>` +
          `<Relationship Id="rB" Target="worksheets/sheet2.xml"/></Relationships>`,
      ],
      [
        "xl/worksheets/sheet1.xml",
        sheetXml([
          ["ProductId", "SkuTitle", "Segment", "ERP", "Unit SELL Price"],
          ["DG7GMGF0PN5J", "Access LTSC 2024", "Commercial", "14443", "14145"],
        ]),
      ],
      [
        "xl/worksheets/sheet2.xml",
        sheetXml([
          ["ProductId", "SkuTitle", "TermDuration", "BillingPlan", "Segment", "Unit SELL Price", "ERP Price"],
          ["CFQ7TTC0HL8Z", "Audit Log Retention", "P1Y", "Annual", "Commercial", "1584", "1980"],
          ["CFQ7TTC0HL8Z", "Audit Log Retention", "P1Y", "Monthly", "Commercial", "1663", "2079"],
        ]),
      ],
    ]),
  );

  return path;
}

describe("reading a multi-sheet workbook", () => {
  it("lists the tabs in the order they appear, not the order the files are numbered", () => {
    expect(listSheets(workbook())).toEqual(["NCE", "PERPETUAL"]);
  });

  it("reads a tab by its name rather than by its file number", () => {
    const rows = readSheet(workbook(), "PERPETUAL");
    expect(rows[1]?.[1]).toBe("Access LTSC 2024");
  });

  it("says which tabs exist when asked for one that does not", () => {
    expect(() => readSheet(workbook(), "EST")).toThrow(/Available: NCE, PERPETUAL/);
  });

  it("takes ERP and leaves the buy price in the file", () => {
    const parsed = parseSheet(workbook(), "nce", "NCE");
    expect(parsed.rows.map((sheetRow) => sheetRow.priceMajor)).toEqual([1980, 2079]);
    expect(parsed.ignoredColumns).toEqual(["Unit SELL Price"]);
    expect(parsed.hasTermColumn).toBe(true);
  });

  it("plans one option per way of paying, at the ERP figures", () => {
    const { products } = plan(parseSheet(workbook(), "nce", "NCE").rows);
    expect(products[0]?.variants.map((variant) => [variant.name, variant.listPriceMinor])).toEqual([
      ["Annual commitment", 198_000],
      ["Annual commitment, billed monthly", 207_900],
    ]);
  });

  it("refuses a sheet whose price column has been renamed away", () => {
    const dir = mkdtempSync(join(tmpdir(), "price-list-"));
    const path = join(dir, "no-erp.xlsx");
    writeFileSync(
      path,
      zip([
        ["xl/workbook.xml", `<workbook><sheets><sheet name="NCE" sheetId="1" r:id="rA"/></sheets></workbook>`],
        ["xl/_rels/workbook.xml.rels", `<Relationships><Relationship Id="rA" Target="worksheets/sheet1.xml"/></Relationships>`],
        [
          "xl/worksheets/sheet1.xml",
          sheetXml([
            ["ProductId", "SkuTitle", "Segment", "Unit SELL Price"],
            ["X", "Y", "Commercial", "100"],
          ]),
        ],
      ]),
    );

    expect(() => parseSheet(path, "nce", "NCE")).toThrow(/no ERP column/);
  });
});
