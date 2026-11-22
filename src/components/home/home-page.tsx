import Image from "next/image";
import Link from "next/link";

import { PHOTOS, photoForPath, type SitePhoto } from "@/lib/page-photos";
import { getHomeData } from "@/lib/queries/home";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * The home page body.
 *
 * Laid out as a run of short bands, each with a heading on the left and its
 * content on the right on wide screens, stacking on small ones. Every figure,
 * service, certification, brand mark and article is read from the database;
 * the copy that is fixed here is the copy that was already on the page.
 * Photographs are licensed stock and say so in their alt text.
 */

const arrow = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
);

function Tick() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-career-orange"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

function Band({
  id,
  title,
  intro,
  children,
  className,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("py-8 lg:py-10", className)}>
      <div className="container-page grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <Reveal>
          <h2
            id={id}
            className="text-[1.6rem] font-bold leading-tight text-graphite-900 lg:text-[1.75rem]"
          >
            {title}
          </h2>
          <span
            aria-hidden="true"
            className="mt-3 block h-[3px] w-12 bg-career-orange"
          />
          {intro ? (
            <p className="mt-4 text-body leading-relaxed text-ink-600">
              {intro}
            </p>
          ) : null}
        </Reveal>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function PhotoTile({
  href,
  label,
  photo,
  wide = false,
}: {
  href: string;
  label: string;
  photo: SitePhoto;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden rounded-[--radius-lg] bg-graphite-900",
        wide ? "aspect-[4/3]" : "aspect-[4/5] sm:aspect-[3/4]",
      )}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="(min-width: 1024px) 14rem, 45vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-career-navy-dark/90 via-career-navy-dark/20 to-transparent"
      />
      <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-[1.05rem] font-semibold leading-tight text-white">
        {label}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-career-orange">
          {arrow}
        </span>
      </span>
    </Link>
  );
}

const SOLUTIONS: Array<[string, string]> = [
  ["modern-workplace", "Modern Workplace"],
  ["cloud-transformation", "Cloud Transformation"],
  ["design-engineering", "Design & Engineering"],
  ["security-compliance", "Security & Compliance"],
];

const CATEGORIES: Array<[string, string, string]> = [
  [
    "productivity-collaboration",
    "Business Applications",
    "Microsoft 365, Windows and Office licensing",
  ],
  ["design-creative", "Creative Software", "Adobe and creative suites"],
  ["engineering-cad", "Design & Engineering", "Autodesk, CAD and BIM"],
  [
    "infrastructure-hardware",
    "IT Hardware & Devices",
    "Laptops, desktops, workstations",
  ],
  [
    "cloud-platforms",
    "Cloud & Infrastructure",
    "Servers, storage and cloud platforms",
  ],
];

const PROCUREMENT: Array<[string, string]> = [
  [
    "Multi-brand sourcing",
    "Access leading software and hardware brands through a single partner.",
  ],
  [
    "Consolidated quotation",
    "A unified, competitive proposal for all your technology needs.",
  ],
  [
    "One purchase order",
    "Simplified procurement with a single PO for multiple products and brands.",
  ],
  [
    "Renewal management",
    "Timely licence renewals, compliance and cost optimisation.",
  ],
];

const INDUSTRIES: Array<[string, string]> = [
  ["corporate-enterprise", "Corporate & Enterprise"],
  ["manufacturing", "Manufacturing"],
  ["infrastructure-construction", "Architecture & Construction"],
  ["education", "Education"],
  ["healthcare", "Healthcare"],
  ["banking-financial-services", "Financial Services"],
  ["government-psu", "Government & PSU"],
];

const GEM = [
  "Software licensing on GeM",
  "Commercial IT hardware",
  "CRAC support",
  "GST-compliant invoicing",
];

export async function HomePage({
  clientBelt,
}: {
  clientBelt?: React.ReactNode;
}) {
  const data = await getHomeData();
  const team = PHOTOS.team;

  const stats: Array<[string, string]> = [
    [data.productCount.toLocaleString("en-IN"), "Products"],
    [data.skuCount.toLocaleString("en-IN"), "Licensable SKUs"],
    [data.brandCount.toLocaleString("en-IN"), "Technology brands"],
    ["One", "Consolidated purchase order"],
  ];

  return (
    <>
      {/* Opening */}
      <section className="bg-career-mist">
        <div className="container-page grid items-center gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_34rem] lg:py-14">
          <div>
            <h1>
              <span className="inline-flex items-center gap-2 rounded-[--radius-md] border border-line bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-ink-600">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-career-orange"
                />
                Trusted IT Hardware &amp; Software Solutions Partner
              </span>
              <span className="mt-5 block text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-graphite-900 sm:text-[3.25rem]">
                Technology. Simplified.
                <span className="block text-career-orange">
                  Business. Empowered.
                </span>
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-ink-600">
              Enterprise software, cloud and IT hardware, brought together
              through one trusted procurement partner — with the licensing
              advice, deployment support and renewal management that make them
              worth owning.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/enquiry"
                className="inline-flex min-h-11 items-center gap-2 rounded-[--radius-md] bg-[#c2530a] px-5 font-semibold text-white hover:bg-[#a64608] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
              >
                Get Enterprise Quote {arrow}
              </Link>
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center rounded-[--radius-md] border border-graphite-900 bg-white px-5 font-semibold text-graphite-900 hover:bg-career-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
              >
                Browse Software
              </Link>
            </div>
          </div>
          <figure className="relative aspect-[3/2] overflow-hidden rounded-[--radius-lg] border border-line lg:aspect-auto lg:h-[24rem]">
            <Image
              src={team.src}
              alt={team.alt}
              fill
              priority
              sizes="(min-width: 1024px) 34rem, 92vw"
              className="object-cover"
            />
          </figure>
        </div>
      </section>

      {/* Figures */}
      <section
        aria-label="TechZoid at a glance"
        className="border-y border-line bg-white"
      >
        <dl className="container-page grid grid-cols-2 gap-y-5 py-6 lg:grid-cols-4">
          {stats.map(([value, label], index) => (
            <div
              key={label}
              className={cn(
                "px-4 lg:px-8",
                index > 0 && "lg:border-l lg:border-line",
              )}
            >
              <dd className="text-[2rem] font-extrabold leading-none text-graphite-900">
                {value}
              </dd>
              <dt className="mt-1.5 text-meta text-ink-600">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Brands */}
      {data.brands.length > 0 ? (
        <section
          aria-label="Technology brands we supply"
          className="border-b border-line bg-white"
        >
          <div className="container-page flex flex-wrap items-center gap-x-8 gap-y-4 py-5">
            <p className="w-24 text-[0.9rem] font-semibold leading-tight text-graphite-900">
              Our technology brands
            </p>
            <ul className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-8 gap-y-4">
              {data.brands.map((brand) => (
                <li key={brand.slug}>
                  <Link href={`/brands/${brand.slug}`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={brand.logoUrl ?? ""}
                      alt={brand.name}
                      loading="lazy"
                      className="h-7 w-auto max-w-[7.5rem] object-contain"
                    />
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/brands"
                  className="text-meta font-medium text-ink-600 hover:text-graphite-900"
                >
                  &amp; more
                </Link>
              </li>
            </ul>
          </div>
        </section>
      ) : null}

      <Band
        id="home-solutions"
        title="Technology for the way your business works"
        intro="Solutions that enable productivity, innovation, security and growth across your organisation."
      >
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SOLUTIONS.map(([slug, label]) => {
            const photo = photoForPath(`/solutions/${slug}`);
            return photo ? (
              <li key={slug}>
                <PhotoTile
                  href={`/solutions/${slug}`}
                  label={label}
                  photo={photo}
                />
              </li>
            ) : null;
          })}
        </ul>
      </Band>

      <Band
        id="home-catalogue"
        title="Software and hardware, sourced together."
        intro="A comprehensive catalogue of enterprise software and IT hardware from leading global brands."
        className="bg-career-mist"
      >
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {CATEGORIES.map(([slug, label, detail]) => (
            <li key={slug}>
              <Link
                href={`/products?category=${slug}`}
                className="flex h-full min-h-32 flex-col justify-between rounded-[--radius-lg] border border-line bg-white p-4 hover:border-career-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
              >
                <span className="font-semibold text-graphite-900">{label}</span>
                <span className="mt-2 flex items-end justify-between gap-2 text-label text-ink-600">
                  {detail}
                  <span className="text-career-orange">{arrow}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Band>

      <Band
        id="home-procurement"
        title="One procurement partner for your technology stack"
      >
        <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROCUREMENT.map(([title, body]) => (
            <li key={title} className="border-l-2 border-career-orange pl-4">
              <h3 className="font-semibold text-graphite-900">{title}</h3>
              <p className="mt-1 text-meta leading-relaxed text-ink-600">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </Band>

      {data.services.length > 0 ? (
        <Band
          id="home-services"
          title="Our Services"
          intro="End-to-end services to plan, deploy, manage and optimise your technology investments."
          className="bg-career-mist"
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.services.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="flex h-full min-h-20 items-center justify-between gap-3 rounded-[--radius-lg] border border-line bg-white p-4 font-semibold text-graphite-900 hover:border-career-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
                >
                  {service.name}
                  <span className="text-career-orange">{arrow}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/services"
                className="flex h-full min-h-20 items-center justify-between gap-3 rounded-[--radius-lg] border border-dashed border-career-orange p-4 font-semibold text-[#b8480a] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
              >
                All services {arrow}
              </Link>
            </li>
          </ul>
        </Band>
      ) : null}

      <Band
        id="home-industries"
        title="Industries We Serve"
        intro="Technology solutions for diverse business needs and industry requirements."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {INDUSTRIES.map(([slug, label]) => {
            const photo = photoForPath(`/industries/${slug}`);
            return photo ? (
              <li key={slug}>
                <PhotoTile
                  href={`/industries/${slug}`}
                  label={label}
                  photo={photo}
                  wide
                />
              </li>
            ) : null;
          })}
          <li>
            <Link
              href="/industries"
              className="flex aspect-[4/3] items-center justify-between gap-3 rounded-[--radius-lg] border border-dashed border-career-orange p-4 font-semibold text-[#b8480a] hover:bg-career-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
            >
              All industries {arrow}
            </Link>
          </li>
        </ul>
      </Band>

      <section aria-labelledby="home-gem" className="py-8 lg:py-10">
        <div className="container-page">
          <div className="grid items-stretch overflow-hidden rounded-[--radius-lg] border border-line bg-career-mist lg:grid-cols-[22rem_minmax(0,1fr)_17rem]">
            <div className="relative min-h-48">
              <Image
                src={PHOTOS.government.src}
                alt={PHOTOS.government.alt}
                fill
                sizes="(min-width: 1024px) 22rem, 92vw"
                className="object-cover"
              />
            </div>
            <div className="p-6 lg:p-8">
              <h2
                id="home-gem"
                className="text-[1.5rem] font-bold text-graphite-900"
              >
                Registered <span className="text-career-orange">GeM</span>{" "}
                seller
              </h2>
              <p className="mt-3 text-body leading-relaxed text-ink-600">
                Procure enterprise software licensing, commercial hardware and
                IT solutions through TechZoid on the Government e-Marketplace
                (GeM), with complete support for CRAC and GST invoicing.
              </p>
              <Link
                href="/gem-software-supplier"
                className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-career-navy hover:underline"
              >
                How we supply through GeM {arrow}
              </Link>
            </div>
            <ul className="flex flex-col justify-center gap-2.5 border-t border-line p-6 lg:border-l lg:border-t-0">
              {GEM.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-meta text-graphite-900"
                >
                  <Tick />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {data.certifications.length > 0 ? (
        <Band
          id="home-certs"
          title="Certifications & Registrations"
          intro="A commitment to quality, security and trusted business practices."
        >
          <ul className="grid grid-cols-2 gap-y-5 lg:grid-cols-4">
            {data.certifications.map((cert, index) => (
              <li
                key={cert.id}
                className={cn(
                  "px-4 text-center",
                  index > 0 && "lg:border-l lg:border-line",
                )}
              >
                <p className="text-[1.15rem] font-bold text-graphite-900">
                  {cert.standard}
                </p>
                <p className="mt-1 text-meta text-ink-600">{cert.title}</p>
              </li>
            ))}
          </ul>
        </Band>
      ) : null}

      {clientBelt}

      {data.posts.length > 0 ? (
        <Band
          id="home-insights"
          title="Insights & Resources"
          intro="Stay informed with the latest updates, licensing insights and technology trends."
          className="bg-career-mist"
        >
          <ul className="grid gap-3 lg:grid-cols-3">
            {data.posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex h-full flex-col rounded-[--radius-lg] border border-line bg-white p-4 hover:border-career-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
                >
                  <span className="text-label font-semibold uppercase tracking-wide text-[#b8480a]">
                    {post.category}
                  </span>
                  <span className="mt-2 font-semibold leading-snug text-graphite-900">
                    {post.title}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-meta font-medium text-career-navy">
                    Read more {arrow}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Band>
      ) : null}

      <section aria-labelledby="home-cta" className="bg-career-navy text-white">
        <div className="container-page flex flex-col gap-6 py-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2
              id="home-cta"
              className="text-[1.75rem] font-bold leading-tight text-white"
            >
              Ready to consolidate your technology{" "}
              <span className="text-[#ff9a52]">procurement?</span>
            </h2>
            <p className="mt-2 max-w-xl text-white/80">
              Send us the requirement — a product list, a seat count, or just
              the problem you are solving. We will come back with a consolidated
              quotation.
            </p>
          </div>
          <Link
            href="/enquiry"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[--radius-md] bg-[#c2530a] px-6 font-semibold text-white hover:bg-[#a64608] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Get Enterprise Quote {arrow}
          </Link>
        </div>
      </section>
    </>
  );
}
