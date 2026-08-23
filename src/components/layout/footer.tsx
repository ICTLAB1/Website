import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { getNavigation } from "@/lib/queries/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { CertificationStrip } from "@/components/layout/certification-strip";
import { AccreditationStrip } from "@/components/layout/accreditation-strip";

export async function Footer() {
  const config = await getSiteConfig();
  const navigation = await getNavigation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-graphite-800 bg-graphite-900 text-graphite-200">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="max-w-sm">
            <Logo name={config.tradingName} onDark />
            <p className="mt-5 text-meta leading-relaxed text-graphite-300">
              Enterprise software licensing, cloud and IT solutions. Software publishers and
              hardware manufacturers consolidated into a single procurement relationship.
            </p>

            <dl className="mt-6 space-y-2 text-meta">
              {config.phone.sales ? (
                <div className="flex gap-2">
                  <dt className="text-graphite-400">Sales</dt>
                  <dd>
                    <a href={`tel:${config.phone.sales.replace(/\s/g, "")}`} className="hover:text-white hover:underline">
                      {config.phone.sales}
                    </a>
                  </dd>
                </div>
              ) : null}
              {config.email.sales ? (
                <div className="flex gap-2">
                  <dt className="text-graphite-400">Email</dt>
                  <dd>
                    <a href={`mailto:${config.email.sales}`} className="hover:text-white hover:underline">
                      {config.email.sales}
                    </a>
                  </dd>
                </div>
              ) : null}
              {config.formattedAddress ? (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-graphite-400">Office</dt>
                  <dd className="text-graphite-300">{config.formattedAddress}</dd>
                </div>
              ) : null}
              {config.gstin ? (
                <div className="flex gap-2">
                  <dt className="text-graphite-400">GSTIN</dt>
                  <dd className="font-mono text-label text-graphite-300">{config.gstin}</dd>
                </div>
              ) : null}
            </dl>

            {/*
              A contact detail that is not configured renders as nothing at all.
              There used to be a warning panel here naming the environment
              variables still to be set, which told every visitor the site was
              half-built. That is an operator's concern: /admin reports it.
            */}
          </div>

          {navigation.footer.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-label font-semibold uppercase tracking-[0.12em] text-white">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-meta text-graphite-300 hover:text-white hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Above the small print, below the link columns: seen on every page. */}
      <AccreditationStrip />
      <CertificationStrip />

      <div className="border-t border-graphite-800">
        <div className="container-page flex flex-col gap-3 py-5 text-label text-graphite-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {config.entityName}. All rights reserved.
            {config.cin ? <span className="ml-2 font-mono">CIN {config.cin}</span> : null}
          </p>
          <p className="max-w-2xl text-graphite-300">
            Third-party product names, logos and trademarks are the property of their
            respective owners and are used here only to identify the software and
            hardware supplied.
          </p>
        </div>
      </div>
    </footer>
  );
}
