import "server-only";

import { currentCertifications } from "@/lib/queries/certifications";

/**
 * The certifications, at the top of every page.
 *
 * They were only in the footer, which is the wrong end of the page for them. A
 * buyer deciding whether this company can be trusted with a procurement
 * decides it in the first few seconds, and a reader who never scrolls to the
 * bottom never learns the business is certified at all.
 *
 * A slim band under the navigation rather than a section in the page: it has to
 * be seen on every page including the ones the CMS owns, and it must not push
 * the content it introduces below the fold. The standards alone here — the
 * certificate numbers are in the footer, where a reader who wants to verify one
 * has gone looking for exactly that.
 *
 * Expiry is filtered in the query, as it is everywhere else. A lapsed
 * certificate shown on every page of the site would be the most thorough
 * possible way to make a false statement.
 */
export async function CertificationBar() {
  const certifications = await currentCertifications();
  if (certifications.length === 0) return null;

  return (
    <div className="border-b border-line bg-surface-muted">
      <div className="container-page flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-2 sm:justify-start">
        <p className="text-label font-semibold uppercase tracking-[0.1em] text-ink-500">
          Certified
        </p>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {certifications.map((certification) => (
            <li key={certification.reference} className="flex items-baseline gap-1.5">
              <span className="text-label font-semibold text-graphite-900">
                {certification.standard}
              </span>
              {/*
                The scope, not the certificate number. A number belongs where
                somebody has gone to check it; here it would be four opaque
                strings competing with the navigation directly above.
              */}
              <span className="hidden text-label text-ink-500 sm:inline">
                {certification.title}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
