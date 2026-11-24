import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FaqList } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { JsonLd, absoluteUrl } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { UAE_UPDATED, type UaePageCopy } from "@/lib/content/uae";
import { formatDate } from "@/lib/utils";

/**
 * A page of the UAE section. Quote-only: no price appears, in any currency. The
 * Ajman office details are read from the site settings, so they are the same ones
 * the footer prints and cannot drift from them.
 */
export async function UaePage({ copy, showOffice = false }: { copy: UaePageCopy; showOffice?: boolean }) {
  const config = await getSiteConfig();
  const office = config.secondaryEntity;
  const url = absoluteUrl(copy.path);

  return (
    <div className="container-page pb-16">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          ...(copy.path === "/ae" ? [] : [{ label: "UAE", href: "/ae" }]),
          { label: copy.breadcrumb },
        ]}
      />
      <header className="max-w-3xl">
        <h1 className="text-3xl leading-tight sm:text-[2.4rem]">{copy.h1}</h1>
        <p className="mt-3 text-meta text-ink-500">
          Last updated <time dateTime={UAE_UPDATED}>{formatDate(new Date(UAE_UPDATED))}</time>
        </p>
        {copy.intro.map((paragraph) => (
          <Markdown key={paragraph.slice(0, 40)} body={paragraph} className="prose-content mt-5 text-[17px]" />
        ))}
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/enquiry?market=ae">Request a quotation</ButtonLink>
          <ButtonLink href={copy.indiaPath} variant="outline">
            India site
          </ButtonLink>
        </div>
      </header>

      <div className="mt-6 max-w-3xl">
        {copy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mt-12 text-[1.6rem] font-bold text-graphite-900">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <Markdown key={paragraph.slice(0, 40)} body={paragraph} className="prose-content mt-4 text-[16px]" />
            ))}
            {section.bullets ? (
              <Markdown body={section.bullets.map((item) => `- ${item}`).join("\n")} className="prose-content mt-4 text-[16px]" />
            ) : null}
          </section>
        ))}

        {showOffice && office ? (
          <section>
            <h2 className="mt-12 text-[1.6rem] font-bold text-graphite-900">Our office in the Ajman Free Zone</h2>
            <address className="mt-4 not-italic text-[16px] leading-relaxed text-ink-700">
              <strong className="block text-graphite-900">{office.name}</strong>
              <span className="whitespace-pre-line">{office.address}</span>
              {office.phone ? (
                <span className="mt-1 block">
                  <a href={`tel:${office.phone.replace(/[^+\d]/g, "")}`} className="text-accent-700 underline underline-offset-2">
                    {office.phone}
                  </a>
                </span>
              ) : null}
              {office.registrations.length > 0 ? (
                <span className="mt-2 block font-mono text-meta text-ink-600">
                  {office.registrations.map((entry) => `${entry.label} ${entry.value}`).join(" · ")}
                </span>
              ) : null}
            </address>
            <p className="mt-3 text-[15px] text-ink-600">
              Our head office is in {config.address.city}, India. Visit the <Link href="/contact" className="text-accent-700 underline underline-offset-2">contact page</Link> for both offices.
            </p>
          </section>
        ) : null}
      </div>

      <section id="faq" className="mt-16 max-w-3xl scroll-mt-32">
        <h2 className="mb-6 text-[1.6rem] font-bold text-graphite-900">Frequently asked questions</h2>
        <FaqList url={url} items={copy.faqs} />
      </section>

      {copy.links.length > 0 ? (
        <section className="mt-14 max-w-3xl">
          <h2 className="text-[1.3rem] font-bold text-graphite-900">Keep reading</h2>
          <ul className="prose-content mt-3 text-[16px]">
            {copy.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: copy.h1,
          url,
          inLanguage: "en-AE",
          dateModified: UAE_UPDATED,
          about: { "@type": "Organization", name: office?.name ?? config.entityName },
        }}
      />
    </div>
  );
}
