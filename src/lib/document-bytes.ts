/**
 * What a business document is, decided from its bytes.
 *
 * The same reasoning as the image uploader: a file arrives with a name, a
 * declared type and a size, and all three are written by whoever is uploading.
 * None of them are evidence. So the first bytes are examined instead, and the
 * type served back later is the one detected here — never the one claimed.
 *
 * The set is what a procurement department actually sends: a PDF purchase
 * order, a spreadsheet bill of quantities, occasionally a Word document, and
 * quite often a photograph of a signed page.
 *
 * Kept free of `server-only` so the parsing tests can reach it.
 */

export type DocumentType = {
  extension: string;
  contentType: string;
  /** What a person would call it, for the interface. */
  label: string;
};

const starts = (buffer: Buffer, signature: number[], offset = 0): boolean =>
  signature.every((byte, index) => buffer[offset + index] === byte);

/**
 * Whether the bytes are plausible UTF-8 text with no control characters.
 *
 * The fallback for CSV, which has no signature of any kind. A NUL byte or a
 * decoding failure means it is not text, whatever the extension says, and the
 * file is refused rather than stored as something it is not.
 */
function looksLikeText(buffer: Buffer): boolean {
  if (buffer.includes(0)) return false;
  const sample = buffer.subarray(0, 8192);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(sample);
    // Allow tab, newline and carriage return; refuse the other control
    // characters, which no bill of quantities contains and a disguised
    // binary is full of.
    return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
  } catch {
    return false;
  }
}

/**
 * Identifies a document, or returns null.
 *
 * The `filename` is used for one thing only: telling apart the formats that
 * share a container. A .xlsx and a .docx are both ZIP archives, and no amount
 * of byte-sniffing at offset zero separates them — so the container is proven
 * from the bytes and the extension picks between the members of that family.
 * A mismatch is refused rather than guessed at.
 */
export function detectDocument(buffer: Buffer, filename: string): DocumentType | null {
  if (buffer.length < 8) return null;

  const extension = filename.toLowerCase().split(".").pop() ?? "";

  // %PDF
  if (starts(buffer, [0x25, 0x50, 0x44, 0x46])) {
    return { extension: "pdf", contentType: "application/pdf", label: "PDF" };
  }

  // PK.. — a ZIP container: xlsx, docx, and a great deal else.
  if (starts(buffer, [0x50, 0x4b, 0x03, 0x04]) || starts(buffer, [0x50, 0x4b, 0x05, 0x06])) {
    if (extension === "xlsx") {
      return {
        extension: "xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        label: "Excel workbook",
      };
    }
    if (extension === "docx") {
      return {
        extension: "docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        label: "Word document",
      };
    }
    return null;
  }

  // The old OLE compound file: .xls and .doc.
  if (starts(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    if (extension === "xls") {
      return { extension: "xls", contentType: "application/vnd.ms-excel", label: "Excel workbook" };
    }
    if (extension === "doc") {
      return { extension: "doc", contentType: "application/msword", label: "Word document" };
    }
    return null;
  }

  if (starts(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: "png", contentType: "image/png", label: "Image" };
  }

  if (starts(buffer, [0xff, 0xd8, 0xff])) {
    return { extension: "jpg", contentType: "image/jpeg", label: "Image" };
  }

  // RIFF....WEBP
  if (starts(buffer, [0x52, 0x49, 0x46, 0x46]) && starts(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { extension: "webp", contentType: "image/webp", label: "Image" };
  }

  if ((extension === "csv" || extension === "txt") && looksLikeText(buffer)) {
    return {
      extension: extension === "csv" ? "csv" : "txt",
      contentType: "text/plain; charset=utf-8",
      label: extension === "csv" ? "CSV" : "Text file",
    };
  }

  return null;
}

/** The formats a customer may upload, for the interface to state plainly. */
export const ACCEPTED_DOCUMENTS = "PDF, Excel, CSV, Word, PNG or JPEG";

/** What goes in the file input's `accept`. A convenience, not a control. */
export const DOCUMENT_ACCEPT_ATTRIBUTE =
  ".pdf,.xlsx,.xls,.csv,.txt,.docx,.doc,.png,.jpg,.jpeg,.webp";
