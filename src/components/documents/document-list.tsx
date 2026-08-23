import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/documents";
import { formatDate } from "@/lib/utils";

const KIND_LABELS: Record<string, string> = {
  BOQ: "Requirement",
  PURCHASE_ORDER: "Purchase order",
  QUOTATION: "Quotation",
  INVOICE: "Invoice",
  DELIVERY_NOTE: "Delivery note",
  LICENCE: "Licence",
  WARRANTY: "Warranty",
  SUPPORT_ATTACHMENT: "Attachment",
  OTHER: "Document",
};

export type DocumentRow = {
  reference: string;
  kind: string;
  filename: string;
  bytes: number;
  note: string | null;
  verifiedAt: Date | string | null;
  createdAt: Date | string;
  user: { name: string } | null;
};

/**
 * Files attached to a record.
 *
 * Every link goes through `/documents/[reference]`, which resolves the
 * organisation before it opens anything — there is no path here that a stranger
 * could follow, because there is no path here that names a file.
 */
export function DocumentList({
  documents,
  emptyMessage = "No documents attached.",
}: {
  documents: DocumentRow[];
  emptyMessage?: string;
}) {
  if (documents.length === 0) {
    return <p className="text-meta text-ink-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {documents.map((document) => (
        <li
          key={document.reference}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[--radius-md] border border-line bg-white px-4 py-3"
        >
          <div className="min-w-0">
            <Link
              href={`/documents/${document.reference}`}
              className="text-meta font-medium text-graphite-900 underline underline-offset-2 hover:text-accent-700"
            >
              {document.filename}
            </Link>
            <span className="mt-0.5 block text-label text-ink-500">
              {KIND_LABELS[document.kind] ?? document.kind} · {formatBytes(document.bytes)} ·{" "}
              {formatDate(document.createdAt)}
              {document.user ? ` · ${document.user.name}` : ""}
            </span>
            {document.note ? (
              <span className="mt-0.5 block text-label text-ink-500">{document.note}</span>
            ) : null}
          </div>

          {/*
            A purchase order that nobody has checked must not look like one that
            has been accepted, so the state is stated rather than implied.
          */}
          {document.kind === "PURCHASE_ORDER" ? (
            document.verifiedAt ? (
              <Badge tone="success">Verified</Badge>
            ) : (
              <Badge tone="warning">Awaiting verification</Badge>
            )
          ) : null}
        </li>
      ))}
    </ul>
  );
}
