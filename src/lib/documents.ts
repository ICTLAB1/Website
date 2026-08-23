import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DocumentKind, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { publicReference } from "@/lib/auth/tokens";
import { orgScope, type Scoped } from "@/lib/auth/scope";
import { detectDocument, type DocumentType } from "@/lib/document-bytes";
import { logger } from "@/lib/logger";

export { detectDocument };
export type { DocumentType };

/**
 * Business documents: quotations, purchase orders, bills of quantities.
 *
 * Kept deliberately apart from the image uploads, which are public artwork
 * served from a guessable path. These are the opposite: a purchase order is
 * commercially sensitive, an invoice more so, and neither may be readable by
 * anybody who guesses a URL. So
 *
 *   - the bytes live outside `public/` entirely, in a directory the web server
 *     does not serve;
 *   - the stored filename is a digest of the contents, so nothing anybody typed
 *     reaches the filesystem and traversal is unrepresentable rather than
 *     filtered;
 *   - every read goes through `readDocumentFor`, which resolves the
 *     organisation before it touches a file.
 *
 * A document is never deleted from disk when its row is archived. Two rows can
 * legitimately share one file — the same purchase order attached to an enquiry
 * and to the order it became — and an orphan of a few hundred kilobytes is a
 * far better outcome than a live record pointing at nothing.
 */

/** 10 MB. A bill of quantities is a spreadsheet, not a video. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Where documents are kept. A volume in production; git-ignored in dev. */
export function documentDir(): string {
  return process.env.DOCUMENT_DIR?.trim() || join(process.cwd(), ".documents");
}

export type StoredDocument = {
  reference: string;
  filename: string;
  mimeType: string;
  bytes: number;
  kind: DocumentKind;
};

export type StoreDocumentInput = {
  buffer: Buffer;
  /** What the person called it. Cleaned, kept for display and for download. */
  filename: string;
  kind: DocumentKind;
  companyId?: string | null;
  userId?: string | null;
  enquiryId?: string | null;
  quoteId?: string | null;
  orderId?: string | null;
  ticketId?: string | null;
  note?: string | null;
};

export type StoreResult =
  | { ok: true; document: StoredDocument }
  | { ok: false; reason: "empty" | "too_large" | "unsupported" };

/**
 * A display name that is safe to put in a header and in a page.
 *
 * Not used to find anything — the file is found by its digest — so this only
 * has to be harmless: no path separators, no control characters, no quotes to
 * break out of a Content-Disposition, and a sane length.
 */
export function safeFilename(input: string): string {
  const base = input.split(/[\\/]/).pop() ?? "document";
  const cleaned = base.replace(/[\u0000-\u001f"\\]/g, "").trim();
  return (cleaned.length > 0 ? cleaned : "document").slice(0, 120);
}

export async function storeDocument(input: StoreDocumentInput): Promise<StoreResult> {
  if (input.buffer.length === 0) return { ok: false, reason: "empty" };
  if (input.buffer.length > MAX_DOCUMENT_BYTES) return { ok: false, reason: "too_large" };

  const filename = safeFilename(input.filename);
  const type = detectDocument(input.buffer, filename);
  if (!type) return { ok: false, reason: "unsupported" };

  const digest = createHash("sha256").update(input.buffer).digest("hex");
  const storageKey = `${digest.slice(0, 32)}.${type.extension}`;

  const directory = documentDir();
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, storageKey), input.buffer);

  const record = await prisma.document.create({
    data: {
      reference: publicReference("DOC"),
      kind: input.kind,
      filename,
      mimeType: type.contentType,
      bytes: input.buffer.length,
      storageKey,
      digest,
      companyId: input.companyId ?? null,
      userId: input.userId ?? null,
      enquiryId: input.enquiryId ?? null,
      quoteId: input.quoteId ?? null,
      orderId: input.orderId ?? null,
      ticketId: input.ticketId ?? null,
      note: input.note ?? null,
    },
    select: { reference: true, filename: true, mimeType: true, bytes: true, kind: true },
  });

  logger.info("document_stored", {
    reference: record.reference,
    kind: record.kind,
    bytes: record.bytes,
    // The filename is deliberately not logged: it is customer content.
  });

  return { ok: true, document: record };
}

/** The exact shape `storeDocument` produces. Anything else never sees the disk. */
const STORAGE_KEY = /^[0-9a-f]{32}\.[a-z]{3,4}$/;

export type DocumentPayload = {
  filename: string;
  mimeType: string;
  bytes: Buffer;
};

/**
 * Reads a document, if this account is allowed to.
 *
 * The scope is part of the lookup rather than a check afterwards: a reference
 * belonging to another organisation matches nothing, so the answer is "no such
 * document" rather than "not yours" — which is also all a stranger should learn.
 *
 * Staff pass `staff: true` and are scoped to nothing, because handling other
 * organisations' purchase orders is the job.
 */
export async function readDocumentFor(
  reference: string,
  actor: { user: Scoped; staff: boolean },
): Promise<DocumentPayload | null> {
  const where: Prisma.DocumentWhereInput = actor.staff
    ? { reference, deletedAt: null }
    : { reference, deletedAt: null, ...orgScope(actor.user) };

  const record = await prisma.document.findFirst({
    where,
    select: { filename: true, mimeType: true, storageKey: true },
  });
  if (!record) return null;

  if (!STORAGE_KEY.test(record.storageKey)) {
    // A row written by something other than `storeDocument`. Refused rather
    // than read: this is the only place a stored value becomes a path.
    logger.error("document_key_rejected", { reference });
    return null;
  }

  try {
    const bytes = await readFile(join(documentDir(), record.storageKey));
    return { filename: record.filename, mimeType: record.mimeType, bytes };
  } catch {
    logger.error("document_missing_on_disk", { reference });
    return null;
  }
}

/** Documents attached to one record, for the screens that list them. */
export async function listDocuments(where: Prisma.DocumentWhereInput) {
  return prisma.document.findMany({
    where: { ...where, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      reference: true,
      kind: true,
      filename: true,
      mimeType: true,
      bytes: true,
      note: true,
      verifiedAt: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
}

/** A size a person can read, for the interface. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
