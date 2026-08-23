import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { formatDocumentNumber, seriesKey, templateProblem } from "@/lib/document-number";
import { logger } from "@/lib/logger";

/**
 * Handing out the next number in a series.
 *
 * The whole of the difficulty here is concurrency. Two salespeople drafting a
 * quotation in the same second must not be given the same number, and a
 * read-then-write in application code cannot promise that however carefully it
 * is written — between the read and the write, the other transaction has
 * already read.
 *
 * So the read and the increment are one statement. `INSERT ... ON CONFLICT DO
 * UPDATE ... RETURNING` takes a row lock for the duration, and the value it
 * returns is the caller's alone. There is no retry loop because there is
 * nothing to retry.
 *
 * A gap is possible — a draft that is abandoned keeps its number — and that is
 * correct for a quotation. An invoice series may not have gaps under Indian
 * law, and when this application starts issuing invoices that will need a
 * different allocation point, not a different counter.
 */
export async function allocateDocumentNumber(
  template: string,
  when: Date = new Date(),
  client: Prisma.TransactionClient = prisma,
): Promise<string | null> {
  if (templateProblem(template)) return null;

  const key = seriesKey(template, when);

  try {
    /*
     * `next` holds the value to hand out *next*, so the statement returns what
     * it was before incrementing. A fresh series therefore starts at 1 and
     * leaves 2 behind it.
     */
    const rows = await client.$queryRaw<Array<{ value: number }>>`
      INSERT INTO "DocumentSeries" ("key", "next", "updatedAt")
      VALUES (${key}, 2, NOW())
      ON CONFLICT ("key")
      DO UPDATE SET "next" = "DocumentSeries"."next" + 1, "updatedAt" = NOW()
      RETURNING CASE WHEN "DocumentSeries"."next" = 2 THEN 1 ELSE "DocumentSeries"."next" - 1 END AS "value"
    `;

    const value = rows[0]?.value;
    if (typeof value !== "number") return null;

    return formatDocumentNumber(template, value, when);
  } catch (error) {
    /*
     * A quotation is not lost because its number could not be allocated.
     *
     * The document falls back to printing its internal reference, which is
     * always present and always unique. Losing a drafted quotation over a
     * counter would be a far worse outcome than a document numbered the old
     * way, and the failure is logged where it will be seen.
     */
    logger.error("document_number_allocation_failed", {
      key,
      message: error instanceof Error ? error.message.split("\n")[0] : String(error),
    });
    return null;
  }
}

/**
 * Where a series has got to, for the settings screen.
 *
 * Read-only and deliberately so: an administrator who could set the counter
 * directly could set it backwards, and the next document would collide with
 * one already issued.
 */
export async function seriesPosition(template: string, when: Date = new Date()) {
  if (templateProblem(template)) return null;

  const key = seriesKey(template, when);
  const row = await prisma.documentSeries.findUnique({ where: { key }, select: { next: true } });

  return {
    key,
    issued: (row?.next ?? 1) - 1,
    nextNumber: formatDocumentNumber(template, row?.next ?? 1, when),
  };
}
