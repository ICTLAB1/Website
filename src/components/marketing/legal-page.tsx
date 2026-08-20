import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getSiteConfig } from "@/lib/site-config";

export type LegalSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

/**
 * Shared shell for the legal pages.
 *
 * Every legal page carries an explicit review notice. These documents are
 * drafted as a working starting point that describes what this application
 * actually does; they are not legal advice and must be reviewed by a qualified
 * adviser against the operating entity's obligations before the site goes live.
 */
export function LegalPage({
  title,
  intro,
  sections,
  effectiveNote,
  children,
}: {
  title: string;
  intro: string[];
  sections: LegalSection[];
  effectiveNote?: string;
  children?: ReactNode;
}) {
  const config = getSiteConfig();
  const entity = config.legalName;

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: title }]} />

      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-[2.25rem]">{title}</h1>

        <div className="mt-6 rounded-[--radius-lg] border border-warning-600/40 bg-warning-50 p-5">
          <h2 className="text-[14px] font-semibold text-warning-700">
            Review required before publication
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
            This document describes how this application actually handles data and
            transactions, and is provided as a working draft. It is not legal advice. It must be
            reviewed by a qualified legal adviser against the operating entity&rsquo;s
            obligations — including consumer protection, data protection and tax law in every
            jurisdiction it serves — before this site is published.
          </p>
          {!entity ? (
            <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
              The registered legal entity has not been configured, so this document refers to
              &ldquo;the Company&rdquo; throughout rather than naming a party. Set{" "}
              <code className="font-mono text-[12px]">COMPANY_LEGAL_NAME</code> before
              publication.
            </p>
          ) : null}
        </div>

        {effectiveNote ? (
          <p className="mt-6 text-[13px] text-ink-500">{effectiveNote}</p>
        ) : null}

        <div className="prose-content mt-8 text-[15px]">
          {intro.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}

          {sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {section.bullets?.length ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {children}
        </div>

        <div className="mt-12 rounded-[--radius-lg] border border-line bg-surface-muted p-5">
          <h2 className="text-[14px] font-semibold text-navy-900">Questions about this document</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            {config.email.support ? (
              <>
                Contact us at{" "}
                <a href={`mailto:${config.email.support}`} className="text-accent-700 hover:underline">
                  {config.email.support}
                </a>
                .
              </>
            ) : (
              <>
                Use the{" "}
                <Link href="/contact" className="text-accent-700 hover:underline">
                  contact form
                </Link>{" "}
                — a direct contact address has not been configured for this deployment.
              </>
            )}
          </p>
        </div>
      </article>
    </div>
  );
}
