import type { CmsPage } from "@/lib/queries/pages";

/**
 * "Effective from" and "Last updated", for the legal documents.
 *
 * Neither date is typed into the content. `publishedAt` is set when a page is
 * first published and `updatedAt` moves by itself on every write, so the line
 * cannot drift from the document it heads — which matters more here than
 * anywhere else on the site, since a stale date on a Privacy Policy is a
 * substantive problem rather than a cosmetic one.
 *
 * A page that has somehow not been published renders nothing rather than a
 * guess: an invented effective date on a legal document would be worse than no
 * date at all.
 */

/**
 * Pages that carry the dates.
 *
 * A list rather than a database column. These five are the site's legal
 * documents, they change about once a year, and adding a column plus a
 * migration to express a fact this stable would cost more than it explains.
 */
const LEGAL_SLUGS = new Set([
  "terms",
  "privacy",
  "refund-policy",
  "delivery-policy",
  "cookie-policy",
]);

export function isLegalDocument(slug: string): boolean {
  return LEGAL_SLUGS.has(slug);
}

/** 21 August 2026 — unambiguous, and not the ambiguous all-numeric form. */
function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export function DocumentDates({ page }: { page: CmsPage }) {
  if (!isLegalDocument(page.slug) || !page.publishedAt) return null;

  const effective = formatDate(page.publishedAt);
  const updated = formatDate(page.updatedAt);

  return (
    <div className="container-page pt-6">
      <dl className="flex flex-wrap gap-x-8 gap-y-2 border-b border-line pb-5 text-meta text-ink-600">
        <div className="flex gap-2">
          <dt className="text-ink-500">Effective from</dt>
          <dd>
            <time dateTime={page.publishedAt.toISOString()}>{effective}</time>
          </dd>
        </div>
        {/* Only worth stating separately once it differs from the first date. */}
        {updated !== effective ? (
          <div className="flex gap-2">
            <dt className="text-ink-500">Last updated</dt>
            <dd>
              <time dateTime={page.updatedAt.toISOString()}>{updated}</time>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
