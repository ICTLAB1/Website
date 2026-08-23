import { describe, expect, it } from "vitest";

import { extractFromText, extractRequirementLines, parseDelimited } from "@/lib/boq";
import { detectDocument, ACCEPTED_DOCUMENTS } from "@/lib/document-bytes";
import { safeFilename } from "@/lib/documents";

/**
 * Reading a bill of quantities, and refusing to over-read one.
 *
 * The extraction tests are mostly about the second: what comes out is a
 * suggestion, every line says so, and a row that cannot be read is kept rather
 * than dropped. A quantity misread from a spreadsheet and quoted back as fact
 * is the failure this whole design is arranged around.
 */

describe("parsing delimited text", () => {
  it("finds a header and the rows under it", () => {
    const parsed = parseDelimited("Item,Specification,Quantity\nLaptop,i5 16GB,50\nDesktop,i5,20");
    expect(parsed.header).toEqual(["Item", "Specification", "Quantity"]);
    expect(parsed.rows).toHaveLength(2);
  });

  it("treats a first row of data as data", () => {
    const parsed = parseDelimited("Laptop,i5 16GB,50\nDesktop,i5,20");
    expect(parsed.header).toBeNull();
    expect(parsed.rows).toHaveLength(2);
  });

  it("copes with semicolons and tabs, which real exports use", () => {
    expect(parseDelimited("Item;Qty\nLaptop;50").rows[0]).toEqual(["Laptop", "50"]);
    expect(parseDelimited("Item\tQty\nLaptop\t50").rows[0]).toEqual(["Laptop", "50"]);
  });

  it("keeps a quoted comma inside its field", () => {
    const parsed = parseDelimited('Item,Spec,Qty\n"Laptop, 14 inch","i7, 32GB",10');
    expect(parsed.rows[0]).toEqual(["Laptop, 14 inch", "i7, 32GB", "10"]);
  });

  it("handles a doubled quote", () => {
    const parsed = parseDelimited('Item,Qty\n"14"" display",5');
    expect(parsed.rows[0]?.[0]).toBe('14" display');
  });

  it("ignores blank lines", () => {
    expect(parseDelimited("Item,Qty\n\nLaptop,5\n\n").rows).toHaveLength(1);
  });
});

describe("extracting requirement lines", () => {
  it("maps columns by their header names", () => {
    const { lines } = extractFromText("Quantity,Product,Specification\n50,Laptop,i5 16GB");
    expect(lines[0]?.description).toBe("Laptop");
    expect(lines[0]?.quantity).toBe(50);
    expect(lines[0]?.note).toBe("i5 16GB");
  });

  it("marks every extracted line as needing review", () => {
    // The rule the whole feature rests on: nothing read out of a file is
    // treated as confirmed, whatever it looked like.
    const { lines } = extractFromText("Item,Qty\nLaptop,50\nDesktop,20");
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.needsReview)).toBe(true);
  });

  it("reads a quantity written the way people write them", () => {
    expect(extractFromText("Item,Qty\nLaptop,\"1,200\"").lines[0]?.quantity).toBe(1200);
    expect(extractFromText("Item,Qty\nLaptop,24 nos").lines[0]?.quantity).toBe(24);
  });

  it("keeps a line whose quantity it cannot read, rather than dropping it", () => {
    // Somebody wants this priced. Losing the line because the quantity said
    // "as required" would be the worst possible reading of the document.
    const { lines } = extractFromText("Item,Qty\nLaptop,as required");
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(1);
    expect(lines[0]?.needsReview).toBe(true);
  });

  it("skips totals and empty rows instead of quoting them", () => {
    const { lines, skipped } = extractFromText("Item,Qty\nLaptop,50\nTotal,50\n,");
    expect(lines).toHaveLength(1);
    expect(skipped.length).toBeGreaterThan(0);
  });

  it("records what it did not read rather than losing it", () => {
    const rows = Array.from({ length: 65 }, (_, index) => `Item ${index},1`).join("\n");
    const { lines, skipped } = extractFromText(`Item,Qty\n${rows}`);
    expect(lines).toHaveLength(60);
    expect(skipped).toHaveLength(5);
  });

  it("reads a two-column file as description and quantity", () => {
    const { lines } = extractRequirementLines(parseDelimited("Laptop,50"));
    expect(lines[0]?.description).toBe("Laptop");
    expect(lines[0]?.quantity).toBe(50);
  });
});

describe("what a document is, from its bytes", () => {
  const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(64)]);
  const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64),
  ]);

  it("identifies a PDF whatever it is called", () => {
    expect(detectDocument(pdf, "po.pdf")?.contentType).toBe("application/pdf");
    expect(detectDocument(pdf, "po.xlsx")?.contentType).toBe("application/pdf");
  });

  it("uses the extension only to tell apart formats sharing a container", () => {
    expect(detectDocument(zip, "boq.xlsx")?.extension).toBe("xlsx");
    expect(detectDocument(zip, "letter.docx")?.extension).toBe("docx");
    // A ZIP that claims to be neither is refused rather than stored as "a zip".
    expect(detectDocument(zip, "archive.zip")).toBeNull();
  });

  it("takes the images a procurement officer photographs a signed page with", () => {
    expect(detectDocument(png, "signed.png")?.label).toBe("Image");
  });

  it("refuses an executable renamed to look like a document", () => {
    const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(64)]);
    expect(detectDocument(elf, "requirements.csv")).toBeNull();
    expect(detectDocument(elf, "requirements.pdf")).toBeNull();
  });

  it("accepts CSV only when the bytes really are text", () => {
    expect(detectDocument(Buffer.from("Item,Qty\nLaptop,50\n"), "boq.csv")?.extension).toBe("csv");
    const withNul = Buffer.concat([Buffer.from("Item,Qty\n"), Buffer.from([0x00, 0x01, 0x02])]);
    expect(detectDocument(withNul, "boq.csv")).toBeNull();
  });

  it("refuses something too short to identify", () => {
    expect(detectDocument(Buffer.from("PK"), "boq.xlsx")).toBeNull();
  });

  it("states the accepted formats in words for the interface", () => {
    expect(ACCEPTED_DOCUMENTS).toContain("PDF");
  });
});

describe("the stored filename", () => {
  it("keeps the name a person gave it", () => {
    expect(safeFilename("Purchase Order 4471.pdf")).toBe("Purchase Order 4471.pdf");
  });

  it("takes any path out of it", () => {
    // The name is never used to find the file — the digest is — but it goes
    // into a header and a page, so it is made harmless anyway.
    expect(safeFilename("../../etc/passwd")).toBe("passwd");
    expect(safeFilename("C:\\Users\\me\\po.pdf")).toBe("po.pdf");
  });

  it("takes out what would break a Content-Disposition header", () => {
    expect(safeFilename('po".pdf')).toBe("po.pdf");
    expect(safeFilename("po\r\nX-Injected: 1.pdf")).toBe("poX-Injected: 1.pdf");
  });

  it("never returns nothing", () => {
    expect(safeFilename("")).toBe("document");
    expect(safeFilename("   ")).toBe("document");
    expect(safeFilename("/")).toBe("document");
  });

  it("bounds the length", () => {
    expect(safeFilename("a".repeat(400)).length).toBe(120);
  });
});
