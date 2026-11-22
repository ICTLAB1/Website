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

const INDUSTRIES: Array<[string, string]> = [
  ["corporate-enterprise", "Corporate & Enterprise"],
  ["manufacturing", "Manufacturing"],
  ["infrastructure-construction", "Architecture & Construction"],
  ["education", "Education"],
  ["healthcare", "Healthcare"],
  ["banking-financial-services", "Financial Services"],
  ["government-psu", "Government & PSU"],
];

const SOFTWARE_AND_HARDWARE: Array<[string, string, string, string]> = [
  [
    "Software",
    "Business applications",
    "Microsoft 365, Windows, Office and server licensing",
    "/products?category=productivity-collaboration",
  ],
  [
    "Software",
    "Creative and design",
    "Adobe, Autodesk, CAD and BIM subscriptions",
    "/products?category=design-creative",
  ],
  [
    "Hardware",
    "Laptops and desktops",
    "Business-class computers from HP, Lenovo and Acer",
    "/hardware",
  ],
  [
    "Hardware",
    "Servers and storage",
    "Rack servers, storage arrays and backup",
    "/products?category=servers",
  ],
  [
    "Hardware",
    "Networking and workstations",
    "Switching, wireless and CAD workstations",
    "/enterprise-it-hardware",
  ],
];

export type HomeCopy = {
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    primaryCta: { href: string; label: string };
    secondaryCta?: { href: string; label: string };
    statLabels: string[];
  };
  industries: { eyebrow?: string; heading: string; description?: string };
  gem: {
    eyebrow?: string;
    heading: string;
    description?: string;
    tiles: string[];
    bullets: string[];
    bulletsIntro?: string;
  };
  certifications: { eyebrow?: string; heading: string; description?: string };
};

/** The page's own blocks, rendered in their original order around the designed bands. */
export type HomeSlots = Partial<
  Record<
    | "afterBrands"
    | "afterSolutions"
    | "afterCatalogue"
    | "afterProcurement"
    | "afterIndustries"
    | "afterGem"
    | "afterCertifications"
    | "beforeClose",
    React.ReactNode
  >
>;

export async function HomePage({
  copy,
  slots,
}: {
  copy: HomeCopy;
  slots: HomeSlots;
}) {
  const data = await getHomeData();
  const team = PHOTOS.team;
  const { hero } = copy;

  const values = [
    data.productCount.toLocaleString("en-IN"),
    data.skuCount.toLocaleString("en-IN"),
    data.brandCount.toLocaleString("en-IN"),
    "One",
  ];
  const stats: Array<[string, string]> = values.map((value, index) => [
    value,
    hero.statLabels[index] ?? "",
  ]);

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
                {hero.headline}
              </span>
              <span className="mt-5 block text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-graphite-900 sm:text-[3.25rem]">
                Technology. Simplified.
                <span className="block text-career-orange">
                  Business. Empowered.
                </span>
              </span>
            </h1>
            <p className="mt-4 text-label font-semibold uppercase tracking-[0.12em] text-[#b8480a]">
              {hero.eyebrow}
            </p>
            <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-600">
              {hero.subheadline}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={hero.primaryCta.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-[--radius-md] bg-[#c2530a] px-5 font-semibold text-white hover:bg-[#a64608] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
              >
                {hero.primaryCta.label} {arrow}
              </Link>
              {hero.secondaryCta ? (
                <Link
                  href={hero.secondaryCta.href}
                  className="inline-flex min-h-11 items-center rounded-[--radius-md] border border-graphite-900 bg-white px-5 font-semibold text-graphite-900 hover:bg-career-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
                >
                  {hero.secondaryCta.label}
                </Link>
              ) : null}
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
              key={label + index}
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

      {slots.afterBrands}

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
        id="home-software-hardware"
        title="Software and hardware, sourced together."
        intro="Licensing and the machines it runs on, quoted together, ordered on one purchase order and invoiced once."
        className="bg-career-mist"
      >
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {SOFTWARE_AND_HARDWARE.map(([kind, label, detail, href]) => (
            <li key={label}>
              <Link
                href={href}
                className="flex h-full min-h-36 flex-col justify-between rounded-[--radius-lg] border border-line bg-white p-4 hover:border-career-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-navy"
              >
                <span>
                  <span className="text-label font-semibold uppercase tracking-wide text-[#b8480a]">
                    {kind}
                  </span>
                  <span className="mt-1 block font-semibold text-graphite-900">
                    {label}
                  </span>
                </span>
                <span className="mt-3 flex items-end justify-between gap-2 text-label text-ink-600">
                  {detail}
                  <span className="text-career-orange">{arrow}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          <Link
            href="/hardware"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-career-navy hover:underline"
          >
            Browse IT hardware {arrow}
          </Link>
        </p>
      </Band>
      {slots.afterSolutions}
      {slots.afterCatalogue}
      {slots.afterProcurement}

      <Band
        id="home-industries"
        title={copy.industries.heading}
        intro={copy.industries.description}
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
      {slots.afterIndustries}

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
              {copy.gem.eyebrow ? (
                <p className="mb-2 text-label font-semibold uppercase tracking-[0.12em] text-[#b8480a]">
                  {copy.gem.eyebrow}
                </p>
              ) : null}
              <h2
                id="home-gem"
                className="text-[1.5rem] font-bold text-graphite-900"
              >
                {copy.gem.heading}
              </h2>
              {copy.gem.description ? (
                <p className="mt-3 text-body leading-relaxed text-ink-600">
                  {copy.gem.description}
                </p>
              ) : null}
              {copy.gem.bullets.length > 0 ? (
                <>
                  {copy.gem.bulletsIntro ? (
                    <p className="mt-4 text-meta font-semibold text-graphite-900">
                      {copy.gem.bulletsIntro}
                    </p>
                  ) : null}
                  <ul className="mt-2 grid gap-1.5 text-meta text-ink-600 sm:grid-cols-2">
                    {copy.gem.bullets.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Tick />
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <Link
                href="/gem-software-supplier"
                className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-career-navy hover:underline"
              >
                How we supply through GeM {arrow}
              </Link>
            </div>
            <ul className="flex flex-col justify-center gap-2.5 border-t border-line p-6 lg:border-l lg:border-t-0">
              {copy.gem.tiles.map((item) => (
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
      {slots.afterGem}

      {data.certifications.length > 0 ? (
        <Band
          id="home-certs"
          title={copy.certifications.heading}
          intro={copy.certifications.description}
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
      {slots.afterCertifications}
      {slots.beforeClose}
    </>
  );
}
