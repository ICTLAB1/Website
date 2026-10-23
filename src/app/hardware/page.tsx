import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { CatalogueListing } from "@/components/catalogue/catalogue-listing";
import { getHardwareBrands, getHardwareFormFactors } from "@/lib/queries/hardware";
import { FAMILY_LANDINGS, familyLandingKey } from "@/lib/catalogue/families";
import { TENTATIVE_PRICE_NOTE } from "@/lib/catalogue/quote-only";
import { parseCatalogueParams, type RawSearchParams } from "@/lib/catalogue-params";
import { buildMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { safeBrandLogo } from "@/lib/brand-logo";
import { AccreditationMark } from "@/components/marketing/accreditation-mark";

type PageProps = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;

  /*
   * A family on its own is a landing page; everything else is a filtered view.
   *
   * `/hardware?family=servers` is what the main menu links to, and it is the
   * only route to the servers in this catalogue — they carry a form factor
   * rather than a category. It was `noindex` under a rule that treated every
   * parameterised view as a near-duplicate, so the site had no indexable page
   * for servers at all, while linking to one from the navigation of every page.
   *
   * `?sort=`, `?page=`, `?min=`, `?brand=` and the rest keep that rule, and
   * `?family=servers&sort=price-asc` keeps it too: that one really is a
   * near-duplicate of the landing page beside it. See
   * `lib/catalogue/families.ts`.
   */
  const landing = familyLandingKey(params);
  if (landing) {
    const copy = FAMILY_LANDINGS[landing];
    return buildMetadata({
      title: copy.title,
      description: copy.description,
      path: `/hardware?family=${landing}`,
    });
  }

  const hasFilters = Object.keys(params).some((key) => key !== "page" && params[key]);

  return buildMetadata({
    title: "Business Laptops & Desktops — Commercial Computers",
    description:
      "Commercial laptops, desktops, all-in-ones and workstations for enterprise, government, PSU and education procurement. Quoted to your configuration and quantity.",
    path: "/hardware",
    // Filtered permutations are near-duplicates of the base listing.
    noIndex: hasFilters,
  });
}

/**
 * The hardware catalogue.
 *
 * The same listing as `/products` restricted to products with a form factor,
 * with the entry points a hardware buyer arrives looking for: the manufacturer,
 * and the shape of the machine. Those two questions come before any filter — a
 * procurement officer has usually been told "Lenovo, twenty of them, docked"
 * before they open a browser.
 *
 * `kind: "hardware"` is set here rather than read from the query string. The
 * route decides what catalogue this is; a visitor cannot turn `/hardware` into
 * a software listing by editing the URL, which keeps the page's promise and its
 * metadata honest.
 */
export default async function HardwarePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = { ...parseCatalogueParams(params), kind: "hardware" as const };

  /*
   * The heading and the sentence under it follow the metadata. An indexable
   * page whose body says "commercial computers for business and enterprise"
   * when its title says "rack and tower servers" is a near-duplicate in
   * everything but the tab, and would have deserved the noindex it used to
   * carry.
   */
  const landing = familyLandingKey(params);
  const copy = landing ? FAMILY_LANDINGS[landing] : null;

  const [brands, formFactors, config] = await Promise.all([
    getHardwareBrands(),
    getHardwareFormFactors(),
    getSiteConfig(),
  ]);

  return (
    <div className="container-page pb-16">
      <Breadcrumb
        items={
          copy
            ? [
                { label: "Home", href: "/" },
                { label: "Business computers", href: "/hardware" },
                { label: copy.heading },
              ]
            : [{ label: "Home", href: "/" }, { label: "Business computers" }]
        }
      />

      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">
          {copy ? copy.heading : "Commercial computers for business and enterprise"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          {copy ? (
            copy.intro
          ) : (
            <>
              Business-class laptops, desktops and workstations for enterprise, government, PSU,
              education and corporate requirements — sourced from the manufacturers and supplied
              by {config.entityName} on one quotation, alongside the licensing that goes on them.
            </>
          )}
        </p>
        {/*
          Said once, at the top, in the plainest words available. The catalogue
          deliberately carries no prices, and a visitor who expects them will
          otherwise read their absence as a page that failed to load.
        */}
        <p className="mt-3 text-meta leading-relaxed text-ink-500">
          {/*
            This said hardware is never listed at a price, which stopped being
            true when the business asked for a price on every listing. It now
            qualifies whatever is shown and says where a better figure comes
            from, in the same words as every other priced surface — with the
            configuration clause that is true here and nowhere else.
          */}
          {TENTATIVE_PRICE_NOTE} Configuration, quantity and delivery schedule all move a
          hardware figure, so a model with no price shown is quoted against your build.
        </p>
      </header>

      {brands.length > 0 ? (
        <section className="mb-10" aria-labelledby="by-brand">
          <h2 id="by-brand" className="mb-4 text-section">
            Shop by brand
          </h2>
          <ul className="flex flex-wrap gap-3">
            {brands.map((brand) => {
              const logo = safeBrandLogo(brand.logoUrl);
              return (
                <li key={brand.slug}>
                  <Link
                    href={`/hardware?brand=${brand.slug}`}
                    className="inline-flex items-center gap-3 rounded-[--radius-md] border border-line bg-white px-4 py-3 lift hover:border-graphite-300"
                  >
                    {logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logo}
                        alt=""
                        className="h-5 w-auto max-w-[4.5rem] shrink-0 object-contain object-left"
                      />
                    ) : null}
                    <span className="text-meta font-medium text-graphite-900">{brand.name}</span>
                    <span className="text-label text-ink-500">{brand.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {formFactors.length > 0 ? (
        <section className="mb-10" aria-labelledby="by-type">
          <h2 id="by-type" className="mb-4 text-section">
            Shop by product type
          </h2>
          <ul className="flex flex-wrap gap-3">
            {formFactors.map((formFactor) => (
              <li key={formFactor.value}>
                <Link
                  href={`/hardware?form=${formFactor.value}`}
                  className="inline-flex items-center gap-2 rounded-[--radius-md] border border-line bg-white px-4 py-2.5 text-meta font-medium text-graphite-900 lift hover:border-graphite-300"
                >
                  {formFactor.label}
                  <span className="text-label font-normal text-ink-500">{formFactor.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CatalogueListing
        params={params}
        filters={filters}
        basePath="/hardware"
        emptyDescription="No commercial models match these filters yet. Tell us the specification you need and we will source and quote it."
      />

      <div className="mt-14 rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
        <h2 className="text-[1.25rem]">Need bulk quantity?</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Volume requirements, staged delivery, standard-build configurations and asset tagging
          are handled on the quotation. Government and PSU procurement, including requirements
          that must be routed through the Government e-Marketplace, are supported.
        </p>
        {/*
          The mark earns its place here because this paragraph is where a public
          buyer learns the GeM route is open to them. It is deliberately not on
          the cards or in the footer: beside a product it would read as an
          endorsement of that product rather than a statement about the seller.
        */}
        <AccreditationMark
          src="/marks/gem.webp"
          alt="Government e Marketplace (GeM)"
          className="mt-5 h-12"
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/requirement">Tell us what you need</ButtonLink>
          <ButtonLink href="/enquiry" variant="outline">
            Request enterprise quote
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline">
            Talk to a specialist
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
