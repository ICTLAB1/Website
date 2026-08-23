import { deflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { readImage } from "@/lib/pdf/image";
import { PdfDocument } from "@/lib/pdf/writer";

/**
 * Getting a logo into a PDF.
 *
 * The writer has no image library behind it, so the format reading is ours and
 * so are its failure modes. What matters is that the artwork a business
 * actually supplies goes in intact, and that anything this code cannot read is
 * declined rather than half-decoded into a smear on a commercial document.
 */

/** A tiny PNG built by hand, so the test does not depend on a fixture. */
function png(colourType: number, pixels: number[][], width: number, height: number): Buffer {
  const channels = { 0: 1, 2: 3, 6: 4 }[colourType]!;

  const raw: number[] = [];
  for (let row = 0; row < height; row += 1) {
    raw.push(0); // filter: none
    for (let column = 0; column < width; column += 1) {
      raw.push(...pixels[row * width + column]!.slice(0, channels));
    }
  }

  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    // The CRC is not checked by the reader, so a placeholder is honest here:
    // this exercises the parser, not a corruption detector we do not have.
    return Buffer.concat([length, Buffer.from(type, "latin1"), data, Buffer.alloc(4)]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colourType;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.from(raw))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("reading a PNG", () => {
  it("reads an opaque one and asks for no mask", () => {
    const image = readImage(png(2, [[255, 0, 0], [0, 255, 0]], 2, 1));
    expect(image).not.toBeNull();
    expect(image!.width).toBe(2);
    expect(image!.height).toBe(1);
    expect(image!.colourSpace).toBe("DeviceRGB");
    expect(image!.filter).toBe("FlateDecode");
    // An all-opaque mask is a third of the file for no effect.
    expect(image!.mask).toBeNull();
  });

  it("carries transparency through as a soft mask", () => {
    // Without this a logo with rounded edges prints as a white box.
    const image = readImage(png(6, [[255, 0, 0, 0], [0, 255, 0, 255]], 2, 1));
    expect(image!.mask).not.toBeNull();
    expect(image!.mask!.width).toBe(2);
  });

  it("declines what it cannot read rather than guessing", () => {
    expect(readImage(Buffer.from("not an image"))).toBeNull();
    expect(readImage(Buffer.alloc(0))).toBeNull();
    // An SVG is not a raster at all; PDF cannot hold one.
    expect(readImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });

  it("reads the artwork actually shipped in this repository", () => {
    for (const path of [
      "public/badges/microsoft-solutions-partner.png",
      "public/badges/adobe-certified-reseller.png",
      "public/brands/microsoft.png",
      "public/brands/adobe.png",
    ]) {
      const image = readImage(readFileSync(path));
      expect(image, path).not.toBeNull();
      expect(image!.width).toBeGreaterThan(0);
    }
  });
});

describe("placing an image", () => {
  it("emits one stream however many times it is drawn", () => {
    const pdf = new PdfDocument();
    const image = readImage(png(2, [[1, 2, 3]], 1, 1))!;

    pdf.image(image, 10, 10, 40, 40);
    pdf.addPage();
    pdf.image(image, 10, 10, 40, 40);

    const text = pdf.build().toString("latin1");
    expect(text.match(/\/Subtype \/Image/g)?.length).toBe(1);
    expect(text.match(/\/Im0 Do/g)?.length).toBe(2);
  });

  it("keeps the artwork's proportions inside the box it is given", () => {
    // A square mark and a seven-to-one wordmark both have to sit correctly in
    // the slot the letterhead reserves.
    const pdf = new PdfDocument();
    const wide = readImage(png(2, [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], 4, 1))!;

    pdf.image(wide, 0, 0, 40, 40);
    const text = pdf.build().toString("latin1");

    const transform = text.match(/q ([\d.]+) 0 0 ([\d.]+) /);
    expect(Number(transform![1])).toBeCloseTo(40, 1);
    expect(Number(transform![2])).toBeCloseTo(10, 1);
  });

  it("declares no XObject dictionary when nothing was placed", () => {
    const pdf = new PdfDocument();
    pdf.text("no pictures here", 10, 10);
    expect(pdf.build().toString("latin1")).not.toContain("/XObject");
  });
});
