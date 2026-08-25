import { inflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";

/**
 * A minimal reader for the one shape of spreadsheet this project imports.
 *
 * Deliberately not a library. Adding a spreadsheet parser to a production
 * dependency tree for a job that runs when a publisher updates its price list —
 * a few times a year, from a terminal, never from a request — is a permanent
 * supply-chain cost for an occasional convenience. An `.xlsx` is a ZIP of XML,
 * Node can already inflate, and the files in question use a plain encoding:
 * shared strings, cached formula results, no styles that change a value's
 * meaning.
 *
 * What it supports: any named worksheet (the first, by default), shared and
 * inline strings, numbers, and blank cells. What it does not: dates (returned
 * as the underlying serial number) and anything encrypted. Formulas are read
 * through their cached value, which is what Excel wrote the last time it
 * calculated — a workbook saved by a tool that does not calculate would carry
 * an empty one, and an empty cell is what this reader would then report.
 *
 * If a future price list needs one of those, this is the file to extend — and
 * the failure will be a clear one rather than a wrong number, because an
 * unhandled cell type comes back as text.
 */

/**
 * Reads a ZIP archive from its central directory.
 *
 * The central directory is authoritative; scanning for local file headers
 * instead is the classic way to be confused by an archive that embeds one of
 * their signatures in compressed data.
 */
function readZip(buffer: Buffer): Map<string, Buffer> {
  const EOCD_SIGNATURE = 0x06054b50;
  const CENTRAL_SIGNATURE = 0x02014b50;

  // The end-of-central-directory record sits at the end, after an optional
  // comment of up to 64 KiB, so it is found by scanning backwards.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0 && i >= buffer.length - 22 - 0xffff; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a ZIP archive: no end-of-central-directory record.");

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  const entries = new Map<string, Buffer>();

  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new Error("Corrupt ZIP central directory.");
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);

    // The local header's own name and extra lengths are read again here: they
    // are allowed to differ from the central directory's, and using the wrong
    // one lands the read in the middle of the data.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(start, start + compressedSize);

    entries.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeXml(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return ENTITIES[entity] ?? whole;
  });
}

/**
 * The shared string table.
 *
 * A string cell holds an index into this rather than the text. Rich text splits
 * one string across several `<t>` runs inside a single `<si>`, so the runs are
 * concatenated — taking only the first would silently truncate any title
 * somebody had part-formatted.
 */
function readSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const item of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let text = "";
    for (const run of (item[1] ?? "").matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) {
      text += decodeXml(run[1] ?? "");
    }
    out.push(text);
  }
  return out;
}

/** "BC12" → 54. Column letters are base-26 with no zero. */
function columnIndex(reference: string): number {
  const letters = reference.replace(/\d+$/, "");
  let index = 0;
  for (const character of letters) index = index * 26 + (character.charCodeAt(0) - 64);
  return index - 1;
}

/**
 * The worksheets in a workbook, in the order the tabs appear.
 *
 * `workbook.xml` names them and points at a relationship id; the relationship
 * file turns that into a part name. The two are resolved together rather than
 * assuming `sheet1.xml` is the first tab — sheet files are numbered in creation
 * order, not tab order, so a workbook whose tabs have ever been dragged around
 * will disagree, and reading the wrong tab is not an error that announces
 * itself.
 */
function sheetParts(zip: Map<string, Buffer>, path: string): Array<[string, string]> {
  const workbook = zip.get("xl/workbook.xml");
  if (!workbook) throw new Error(`${path}: no workbook part.`);

  const relationships = new Map<string, string>();
  const relsXml = zip.get("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? "";
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attributes = match[1] ?? "";
    const id = /Id="([^"]+)"/.exec(attributes)?.[1];
    const target = /Target="([^"]+)"/.exec(attributes)?.[1];
    if (id && target) relationships.set(id, target.replace(/^\/?xl\//, "").replace(/^\//, ""));
  }

  const out: Array<[string, string]> = [];
  for (const match of workbook.toString("utf8").matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attributes = match[1] ?? "";
    const name = /name="([^"]+)"/.exec(attributes)?.[1];
    const id = /r:id="([^"]+)"/.exec(attributes)?.[1];
    const target = id ? relationships.get(id) : undefined;
    if (name && target) out.push([decodeXml(name), `xl/${target}`]);
  }

  return out;
}

/** The worksheet names in a workbook, in tab order. */
export function listSheets(path: string): string[] {
  const zip = readZip(readFileSync(path));
  return sheetParts(zip, path).map(([name]) => name);
}

/**
 * Every row of a worksheet, as an array of trimmed strings.
 *
 * `sheetName` picks a tab by the name on it; without one the first tab is read,
 * which is what the single-sheet exports need. Missing cells become empty
 * strings rather than holes, and each row is padded to the width of the header,
 * so a caller can index by column without checking length. Fully empty trailing
 * rows are dropped: these files declare a dimension of a million rows and hold a
 * few hundred.
 */
export function readSheet(path: string, sheetName?: string): string[][] {
  const zip = readZip(readFileSync(path));

  const parts = sheetParts(zip, path);
  const chosen = sheetName
    ? parts.find(([name]) => name.toLowerCase() === sheetName.toLowerCase())
    : parts[0];

  if (!chosen) {
    const available = parts.map(([name]) => name).join(", ") || "none";
    throw new Error(`${path}: no worksheet named "${sheetName}". Available: ${available}.`);
  }

  const sheet = zip.get(chosen[1]);
  if (!sheet) throw new Error(`${path}: worksheet "${chosen[0]}" is missing its part.`);

  const sharedXml = zip.get("xl/sharedStrings.xml");
  const shared = sharedXml ? readSharedStrings(sharedXml.toString("utf8")) : [];

  const xml = sheet.toString("utf8");
  const rows: string[][] = [];
  let width = 0;

  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];

    for (const cellMatch of (rowMatch[1] ?? "").matchAll(/<c([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attributes = cellMatch[1] ?? "";
      const body = cellMatch[2] ?? "";

      const reference = /r="([A-Z]+\d+)"/.exec(attributes)?.[1];
      const index = reference ? columnIndex(reference) : cells.length;
      while (cells.length < index) cells.push("");

      const type = /t="([^"]+)"/.exec(attributes)?.[1];
      let value = "";

      if (type === "inlineStr") {
        for (const run of body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) value += decodeXml(run[1] ?? "");
      } else {
        const raw = /<v[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
        if (type === "s") {
          value = shared[Number.parseInt(raw, 10)] ?? "";
        } else {
          value = decodeXml(raw);
        }
      }

      cells.push(value.trim());
    }

    if (rows.length === 0) width = cells.length;
    while (cells.length < width) cells.push("");
    rows.push(cells);
  }

  while (rows.length > 0 && (rows[rows.length - 1] ?? []).every((cell) => cell === "")) rows.pop();

  return rows;
}
