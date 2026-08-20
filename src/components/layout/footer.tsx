import Link from "next/link";
import { footerColumns } from "@/lib/navigation";
import { getSiteConfig, getUnconfiguredIdentityKeys } from "@/lib/site-config";

export function Footer() {
  const config = getSiteConfig();
  const missing = getUnconfiguredIdentityKeys();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-navy-800 bg-navy-900 text-navy-200">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="max-w-sm">
            <p className="text-[17px] font-semibold text-white">{config.tradingName}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-navy-300">
              Enterprise software licensing, cloud and IT solutions. Multiple technology
              vendors consolidated into a single procurement relationship.
            </p>

            <dl className="mt-6 space-y-2 text-[13px]">
              {config.phone.sales ? (
                <div className="flex gap-2">
                  <dt className="text-navy-400">Sales</dt>
                  <dd>
                    <a href={`tel:${config.phone.sales.replace(/\s/g, "")}`} className="hover:text-white hover:underline">
                      {config.phone.sales}
                    </a>
                  </dd>
                </div>
              ) : null}
              {config.email.sales ? (
                <div className="flex gap-2">
                  <dt className="text-navy-400">Email</dt>
                  <dd>
                    <a href={`mailto:${config.email.sales}`} className="hover:text-white hover:underline">
                      {config.email.sales}
                    </a>
                  </dd>
                </div>
              ) : null}
              {config.formattedAddress ? (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-navy-400">Office</dt>
                  <dd className="text-navy-300">{config.formattedAddress}</dd>
                </div>
              ) : null}
              {config.gstin ? (
                <div className="flex gap-2">
                  <dt className="text-navy-400">GSTIN</dt>
                  <dd className="font-mono text-[12px] text-navy-300">{config.gstin}</dd>
                </div>
              ) : null}
            </dl>

            {missing.length > 0 ? (
              <p className="mt-6 rounded-[--radius-md] border border-warning-600/40 bg-warning-600/10 px-3 py-2 text-[12px] leading-relaxed text-warning-600">
                <strong className="font-semibold">Configuration required.</strong> Company
                contact details are not set. Populate {missing.join(", ")} in the environment
                before this site goes live.
              </p>
            ) : null}
          </div>

          {footerColumns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[13px] text-navy-300 hover:text-white hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-navy-800">
        <div className="container-page flex flex-col gap-3 py-5 text-[12px] text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {config.entityName}. All rights reserved.
            {config.cin ? <span className="ml-2 font-mono">CIN {config.cin}</span> : null}
          </p>
          <p className="max-w-2xl text-navy-300">
            Third-party product names and trademarks are the property of their respective
            owners and are used here only to identify the software supplied.
          </p>
        </div>
      </div>
    </footer>
  );
}
