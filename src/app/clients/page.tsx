import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { publishedClientLogos } from "@/lib/queries/client-logos";
import { safeClientLogo } from "@/lib/client-logo";
import { buildMetadata } from "@/lib/seo";

/**
 * The customers' logo wall.
 *
 * Built only from the customer logo rows an administrator has published, through
 * the same query the homepage belt uses, so a mark that may not be shown here is
 * not shown anywhere. With no published logo the page does not exist — it 404s and
 * leaves the sitemap — rather than presenting an empty wall.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Our Customers – Organisations We Supply Software & IT To | TechZoid",
    absoluteTitle: true,
    description:
      "Customers who buy software licences and IT hardware from TechZoid in India: government, public-sector and education organisations. Get a quote today.",
    path: "/clients",
  });
}

export default async function ClientsPage() {
  const logos = (await publishedClientLogos())
    .map((logo) => ({ ...logo, src: safeClientLogo(logo.logoUrl) }))
    .filter((logo): logo is typeof logo & { src: string } => Boolean(logo.src));
  if (logos.length === 0) notFound();

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Customers" }]} />
      <header className="max-w-3xl">
        <h1 className="text-3xl leading-tight sm:text-[2.4rem]">Customers we work with</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-600">
          These are organisations that buy software licences and IT hardware from TechZoid. Logos are shown with the
          customer&apos;s permission. Orders are raised against a purchase order and invoiced with GST.
        </p>
      </header>

      <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {logos.map((logo) => (
          <li
            key={logo.name}
            className="flex flex-col items-center justify-between rounded-(--radius-lg) border border-line bg-white p-5"
          >
            <div className="flex h-24 w-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.src}
                alt={`${logo.name} logo`}
                loading="lazy"
                decoding="async"
                className="max-h-24 max-w-full object-contain"
              />
            </div>
            <p className="mt-3 text-center text-[14px] font-medium text-graphite-900">{logo.name}</p>
            {logo.sector ? <p className="text-center text-[12px] text-ink-500">{logo.sector}</p> : null}
          </li>
        ))}
      </ul>

      <section className="mt-14 max-w-3xl">
        <h2 className="text-[1.5rem] font-bold text-graphite-900">Buying for your organisation</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-600">
          We quote Microsoft, Adobe, Autodesk and Zoho licences and business hardware on one purchase order. See the{" "}
          <Link className="text-accent-700 underline underline-offset-2" href="/price-list">
            price list
          </Link>
          , how we{" "}
          <Link className="text-accent-700 underline underline-offset-2" href="/blog/how-government-departments-procure-genuine-software">
            support government procurement
          </Link>
          , or ask for a written quotation.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/enquiry">Get a quotation</ButtonLink>
          <ButtonLink href="/contact" variant="outline">
            Talk to us
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
