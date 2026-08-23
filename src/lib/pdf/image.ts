import { deflateSync, inflateSync } from "node:zlib";

/**
 * Turning a logo file into something a PDF can hold.
 *
 * Written rather than installed, for the same reason as the rest of this
 * folder: the alternative is an image library and its transitive dependencies,
 * to do a job that is a few hundred lines of well-specified format reading.
 *
 * Two formats, because those are the two a company's brand pack actually
 * contains:
 *
 *   - **JPEG** goes in untouched. A PDF's `DCTDecode` filter *is* JPEG, so the
 *     bytes are copied straight into the stream and only the dimensions have to
 *     be read out of the header. No decoding, no re-encoding, no loss.
 *   - **PNG** has to be decoded, because PDF has no PNG filter. The pixels are
 *     inflated, un-filtered, and re-deflated as a raw image; transparency
 *     becomes a soft mask, which is what keeps a logo's rounded edges from
 *     printing as a white box on a tinted panel.
 *
 * Anything else — an interlaced PNG, sixteen bits a channel, CMYK JPEG — is
 * declined rather than guessed at. The caller then falls back to drawn artwork,
 * which is a worse logo but never a wrong one.
 *
 * SVG is deliberately not handled. Rasterising it would need a renderer, and
 * embedding it is not a thing PDF does; vector artwork belongs in
 * `lib/pdf/letterhead`, drawn with the writer's own path operators.
 */

export type EmbeddedImage = {
  width: number;
  height: number;
  /** The stream's colour space, as PDF names it. */
  colourSpace: "DeviceRGB" | "DeviceGray";
  filter: "DCTDecode" | "FlateDecode";
  data: Buffer;
  /** Alpha as a separate greyscale image, when the source had any. */
  mask: { width: number; height: number; data: Buffer } | null;
};

/** Reads whichever format this is, or nothing. */
export function readImage(bytes: Buffer): EmbeddedImage | null {
  if (isPng(bytes)) return readPng(bytes);
  if (isJpeg(bytes)) return readJpeg(bytes);
  return null;
}

// ---------------------------------------------------------------------------
// JPEG
// ---------------------------------------------------------------------------

function isJpeg(bytes: Buffer): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * The dimensions and component count, from the frame header.
 *
 * Everything else in the file is left alone: the compressed scan is exactly
 * what `DCTDecode` expects, so re-encoding it would only lose quality.
 */
function readJpeg(bytes: Buffer): EmbeddedImage | null {
  let offset = 2;

  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1]!;

    // Standalone markers carry no length.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break;

    const length = bytes.readUInt16BE(offset + 2);

    // Every start-of-frame except the arithmetic-coded and hierarchical ones,
    // which no camera or design tool emits.
    const isFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isFrame) {
      const precision = bytes[offset + 4]!;
      const height = bytes.readUInt16BE(offset + 5);
      const width = bytes.readUInt16BE(offset + 7);
      const components = bytes[offset + 9]!;

      if (precision !== 8) return null;
      if (components !== 1 && components !== 3) return null;

      return {
        width,
        height,
        colourSpace: components === 1 ? "DeviceGray" : "DeviceRGB",
        filter: "DCTDecode",
        data: bytes,
        mask: null,
      };
    }

    offset += 2 + length;
  }

  return null;
}

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isPng(bytes: Buffer): boolean {
  return bytes.length > 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE);
}

/** Channels per pixel for each PNG colour type. */
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function readPng(bytes: Buffer): EmbeddedImage | null {
  let offset = 8;
  let header: { width: number; height: number; depth: number; colourType: number } | null = null;
  let palette: Buffer | null = null;
  let paletteAlpha: Buffer | null = null;
  const idat: Buffer[] = [];

  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      header = {
        width: bytes.readUInt32BE(offset + 8),
        height: bytes.readUInt32BE(offset + 12),
        depth: data[8]!,
        colourType: data[9]!,
      };
      // Interlaced images need a seven-pass reassembly nobody's brand pack
      // will ever require of us.
      if (data[12] !== 0) return null;
    } else if (type === "PLTE") {
      palette = Buffer.from(data);
    } else if (type === "tRNS") {
      paletteAlpha = Buffer.from(data);
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  if (!header || idat.length === 0) return null;
  if (header.depth !== 8) return null;

  const channels = CHANNELS[header.colourType];
  if (!channels) return null;
  if (header.colourType === 3 && !palette) return null;

  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch {
    return null;
  }

  const pixels = unfilter(raw, header.width, header.height, channels);
  if (!pixels) return null;

  const { width, height } = header;
  const rgb = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height);
  let hasAlpha = false;

  for (let index = 0; index < width * height; index += 1) {
    const from = index * channels;
    let r: number;
    let g: number;
    let b: number;
    let a = 255;

    switch (header.colourType) {
      case 0:
        r = g = b = pixels[from]!;
        break;
      case 2:
        r = pixels[from]!;
        g = pixels[from + 1]!;
        b = pixels[from + 2]!;
        break;
      case 3: {
        const entry = pixels[from]! * 3;
        r = palette![entry] ?? 0;
        g = palette![entry + 1] ?? 0;
        b = palette![entry + 2] ?? 0;
        a = paletteAlpha?.[pixels[from]!] ?? 255;
        break;
      }
      case 4:
        r = g = b = pixels[from]!;
        a = pixels[from + 1]!;
        break;
      default:
        r = pixels[from]!;
        g = pixels[from + 1]!;
        b = pixels[from + 2]!;
        a = pixels[from + 3]!;
        break;
    }

    rgb[index * 3] = r;
    rgb[index * 3 + 1] = g;
    rgb[index * 3 + 2] = b;
    alpha[index] = a;
    if (a !== 255) hasAlpha = true;
  }

  return {
    width,
    height,
    colourSpace: "DeviceRGB",
    filter: "FlateDecode",
    data: deflateSync(rgb),
    /*
     * The soft mask is what stops a logo printing as a white rectangle.
     * Omitted entirely when every pixel is opaque, because an all-255 mask is
     * a third of the file size for no effect.
     */
    mask: hasAlpha ? { width, height, data: deflateSync(alpha) } : null,
  };
}

/**
 * Reverses the per-scanline filter PNG applies before compressing.
 *
 * Each row is prefixed with a filter byte naming one of five predictors, all
 * of which reference the pixel to the left, the one above, or both. This is
 * the whole of PNG decoding once the stream has been inflated.
 */
function unfilter(raw: Buffer, width: number, height: number, channels: number): Buffer | null {
  const stride = width * channels;
  if (raw.length < height * (stride + 1)) return null;

  const out = Buffer.alloc(height * stride);

  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)]!;
    const from = row * (stride + 1) + 1;
    const to = row * stride;

    for (let index = 0; index < stride; index += 1) {
      const value = raw[from + index]!;
      const left = index >= channels ? out[to + index - channels]! : 0;
      const up = row > 0 ? out[to - stride + index]! : 0;
      const upLeft = row > 0 && index >= channels ? out[to - stride + index - channels]! : 0;

      let restored: number;
      switch (filter) {
        case 0:
          restored = value;
          break;
        case 1:
          restored = value + left;
          break;
        case 2:
          restored = value + up;
          break;
        case 3:
          restored = value + ((left + up) >> 1);
          break;
        case 4:
          restored = value + paeth(left, up, upLeft);
          break;
        default:
          return null;
      }

      out[to + index] = restored & 0xff;
    }
  }

  return out;
}

/** The PNG predictor: whichever neighbour the gradient points at. */
function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const dLeft = Math.abs(estimate - left);
  const dUp = Math.abs(estimate - up);
  const dUpLeft = Math.abs(estimate - upLeft);

  if (dLeft <= dUp && dLeft <= dUpLeft) return left;
  return dUp <= dUpLeft ? up : upLeft;
}
