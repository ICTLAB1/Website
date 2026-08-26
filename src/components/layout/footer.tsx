import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { getNavigation } from "@/lib/queries/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { socialLinks } from "@/lib/social";
import { CertificationStrip } from "@/components/layout/certification-strip";

export async function Footer() {
  const config = await getSiteConfig();
  const social = socialLinks(config.profileUrls);
  const navigation = await getNavigation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-graphite-800 bg-graphite-900 text-graphite-200">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="max-w-sm">
            <Logo name={config.tradingName} onDark withStrapline className="h-auto" />
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
              {/*
                Two offices, told apart by the only thing that distinguishes
                them to a reader: which country's registrations they hold.

                The GSTIN and CIN used to sit as their own rows at the bottom of
                this list, below the UAE address and level with it, which read
                as if they covered the whole business. They are registrations of
                the Indian company. Under the Indian address is where they say
                that without anyone having to know it already.
              */}
              {config.formattedAddress ? (
                <div className="flex gap-2">
                  {/* Named by country only once there is a second office. */}
                  <dt className="shrink-0 text-graphite-400">
                    {config.secondaryEntity ? "India" : "Office"}
                  </dt>
                  <dd className="text-graphite-300">
                    {config.formattedAddress}
                    {config.primaryRegistrations.length > 0 ? (
                      <span className="mt-1 block font-mono text-label text-graphite-400">
                        {config.primaryRegistrations
                          .map((entry) => `${entry.label} ${entry.value}`)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              {config.secondaryEntity ? (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-graphite-400">UAE</dt>
                  <dd className="text-graphite-300">
                    <span className="whitespace-pre-line">{config.secondaryEntity.address}</span>
                    {config.secondaryEntity.phone ? (
                      <>
                        {" "}
                        <a
                          href={`tel:${config.secondaryEntity.phone.replace(/[^+\d]/g, "")}`}
                          className="whitespace-nowrap hover:text-white hover:underline"
                        >
                          {config.secondaryEntity.phone}
                        </a>
                      </>
                    ) : null}
                    {/*
                      The branch's registrations, on their own line under the
                      address, in the same treatment as the Indian ones above. A
                      free-zone licence number and a TRN are what a customer's
                      finance team checks a foreign supplier against, and they
                      are of as little use as a GSTIN without a label to say what
                      they are — so each prints only when both halves are set.
                    */}
                    {config.secondaryEntity.registrations.length > 0 ? (
                      <span className="mt-1 block font-mono text-label text-graphite-400">
                        {config.secondaryEntity.registrations
                          .map((entry) => `${entry.label} ${entry.value}`)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>

            {/*
              The profiles, finally visible.

              These have been in the settings for weeks and reached only the
              `sameAs` in the structured data — a claim to a search engine that
              those pages and this site are one business, published while no
              visitor was ever shown a link. Named rather than drawn: there is
              no licensed artwork for these marks here, and a logo reproduced
              from memory is a brand's mark slightly wrong on a company's own
              website.

              Only the recognised networks. The same setting holds a GeM seller
              profile and a directory listing on other deployments, and neither
              belongs under "Follow".
            */}
            {social.length > 0 ? (
              <div className="mt-6">
                <h2 className="text-label font-semibold uppercase tracking-[0.12em] text-white">
                  Follow
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {social.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        target="_blank"
                        /*
                          `noopener` because the new tab would otherwise get a
                          handle on this one; `noreferrer` because where a
                          visitor came from is nobody else's business.
                        */
                        rel="me noopener noreferrer"
                        className="inline-flex h-8 items-center rounded-[--radius-md] border border-graphite-700 px-3 text-meta text-graphite-200 transition-colors hover:border-graphite-400 hover:text-white"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

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

      {/*
        Above the small print, below the link columns: seen on every page.

        The partner badges used to sit here too, on white plates, because they
        are issued as artwork on a light ground and a charcoal footer leaves no
        other lawful way to show one. They are in the white band under the
        navigation now, where they need no plate — see `layout/trust-bar`. The
        certificate numbers stay here, where a reader who wants to verify one
        has gone looking for exactly that.
      */}
      <CertificationStrip />

      <div className="border-t border-graphite-800">
        <div className="container-page flex flex-col gap-3 py-5 text-label text-graphite-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {config.entityName}. All rights reserved.
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
