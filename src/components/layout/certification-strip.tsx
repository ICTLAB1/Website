import "server-only";

import { currentCertifications } from "@/lib/queries/certifications";

/**
 * The certifications this company holds, shown on every page.
 *
 * A compact strip rather than the full cards used on the homepage: the
 * standards this company holds, short enough not to compete with the navigation
 * above it.
 *
 * Expiry is filtered here as it is everywhere else. A certificate is a claim
 * about a period; showing a lapsed one on every page of the site would be the
 * most thorough possible way to make a false statement.
 */
export async function CertificationStrip() {
  const certifications = await currentCertifications();
  if (certifications.length === 0) return null;

  return (
    <div className="border-t border-graphite-800">
      <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-3 py-5">
        <p className="text-label font-semibold uppercase tracking-[0.12em] text-graphite-400">
          Certified and registered
        </p>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {certifications.map((certification) => (
            <li
              key={certification.id}
              className="flex items-baseline gap-2 rounded-[--radius-md] border border-graphite-700 bg-graphite-800 px-3 py-1.5"
            >
              {/*
                The standard alone. The certificate number was here too — the
                argument being that "ISO 27001 certified" is a claim anyone can
                type while a number is one a buyer can put to the issuing body —
                and the owner has asked for the numbers off the site. Their
                credentials, their call.
              */}
              <span className="text-meta font-semibold text-white">{certification.standard}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
