import type { RequirementLine } from "@/lib/rfq";

/**
 * Reading a bill of quantities.
 *
 * Procurement departments send requirements as files: a spreadsheet exported to
 * CSV, a tender annexure, a scan of a signed page. The useful thing this can do
 * with them is save somebody re-typing — and the dangerous thing it could do is
 * decide it understood one.
 *
 * So the rule, from the brief and from common sense: **nothing extracted is
 * ever treated as confirmed.** Every line this produces carries
 * `needsReview`, both sides see it marked, and no quotation is built from one
 * until a person has agreed it says what it appears to say. A misread quantity
 * in a quotation is worse than no quotation at all.
 *
 * What is parsed here is delimited text and nothing else. A PDF, a spreadsheet
 * in its native format or a photograph is stored, attached and shown to
 * somebody — no guessing, no library that half-reads a format, no AI inventing
 * a line item that was never in the document.
 */

/** Splits one delimited line, honouring quotes. */
function splitRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quoted) {
      if (character === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
}

/** Picks the delimiter by which one yields the most columns on the first rows. */
function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).filter((line) => line.trim().length > 0).slice(0, 5);
  if (sample.length === 0) return ",";

  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestScore = 0;

  for (const delimiter of candidates) {
    const counts = sample.map((line) => splitRow(line, delimiter).length);
    const score = Math.min(...counts);
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }

  return best;
}

export type ParsedRows = { header: string[] | null; rows: string[][] };

/** Parses delimited text into rows, and says whether the first one is a header. */
export function parseDelimited(text: string): ParsedRows {
  const delimiter = detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rows = lines.map((line) => splitRow(line, delimiter)).filter((row) => row.some((cell) => cell.length > 0));
  if (rows.length === 0) return { header: null, rows: [] };

  const first = rows[0]!;
  /*
   * A header is a row of words that name columns rather than describe a thing:
   * it contains one of the words we look for, and no cell of it is a bare
   * number. "Quantity" is a header; "24" in the same position is data.
   */
  const looksLikeHeader =
    first.some((cell) => /item|product|description|spec|qty|quantity|model|part/i.test(cell)) &&
    !first.some((cell) => /^\d+$/.test(cell.trim()));

  return looksLikeHeader ? { header: first, rows: rows.slice(1) } : { header: null, rows };
}

/** Which column holds what, by header name where there is one. */
type ColumnMap = { description: number; specification: number | null; quantity: number | null };

function mapColumns(header: string[] | null, width: number): ColumnMap {
  if (header) {
    const find = (pattern: RegExp) => {
      const index = header.findIndex((cell) => pattern.test(cell));
      return index === -1 ? null : index;
    };

    const description = find(/item|product|description|model|material/i);
    return {
      description: description ?? 0,
      specification: find(/spec|config|detail|make/i),
      quantity: find(/qty|quantity|nos|units/i),
    };
  }

  /*
   * No header. The shape procurement spreadsheets actually take is
   * description, then optionally a specification, then a quantity — and the
   * quantity is the last column often enough to be worth assuming, but only
   * when it is a number, which the caller checks.
   */
  if (width >= 3) return { description: 0, specification: 1, quantity: 2 };
  if (width === 2) return { description: 0, specification: null, quantity: 1 };
  return { description: 0, specification: null, quantity: null };
}

/** A quantity from a cell, or null when the cell is not one. */
function readQuantity(cell: string | undefined): number | null {
  if (!cell) return null;
  // "1,200" and "24 nos" both appear in real files.
  const digits = cell.replace(/[,\s]/g, "").match(/^(\d{1,6})/);
  if (!digits) return null;
  const value = Number.parseInt(digits[1]!, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export type Extraction = {
  lines: RequirementLine[];
  /** Rows that could not be read as a line, kept so nothing disappears silently. */
  skipped: string[];
};

/**
 * Turns parsed rows into requirement lines.
 *
 * Every line comes back with `needsReview` set. That is not a default that
 * somewhere else overrides — it is the point: this function's output is a
 * suggestion for a person to correct, and the interface says so.
 */
export function extractRequirementLines(parsed: ParsedRows, limit = 60): Extraction {
  const width = Math.max(...parsed.rows.map((row) => row.length), 1);
  const columns = mapColumns(parsed.header, width);

  const lines: RequirementLine[] = [];
  const skipped: string[] = [];

  for (const row of parsed.rows) {
    if (lines.length >= limit) {
      skipped.push(row.join(" | "));
      continue;
    }

    const description = (row[columns.description] ?? "").trim();
    if (description.length < 2) {
      skipped.push(row.join(" | "));
      continue;
    }

    // A row whose "description" is a total or a heading is not a line item.
    if (/^(total|sub-?total|grand total|s\.?\s?no\.?)$/i.test(description)) {
      skipped.push(row.join(" | "));
      continue;
    }

    const quantity =
      columns.quantity !== null
        ? readQuantity(row[columns.quantity])
        : // No quantity column: try the last cell, which is where it usually is.
          readQuantity(row[row.length - 1]);

    const specification =
      columns.specification !== null ? (row[columns.specification] ?? "").trim() : "";

    lines.push({
      description: description.slice(0, 200),
      // One, not zero, and marked for review like everything else here: a line
      // with no readable quantity is still a line somebody wants priced.
      quantity: quantity ?? 1,
      brands: [],
      note: specification.length > 0 ? specification.slice(0, 600) : undefined,
      needsReview: true,
    });
  }

  return { lines, skipped };
}

/** Reads delimited text straight into lines. The whole pipeline, for callers. */
export function extractFromText(text: string, limit = 60): Extraction {
  return extractRequirementLines(parseDelimited(text), limit);
}
