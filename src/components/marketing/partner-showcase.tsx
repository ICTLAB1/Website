import Link from "next/link";

import { currentPartnerBadges } from "@/components/layout/accreditation-strip";
import { cn } from "@/lib/utils";

/**
 * The programme badges this business may currently show, as a band of their own.
 *
 * Everything comes from `currentPartnerBadges`, so a badge appears only while its
 * brand record carries a designation that is confirmed, current and marked public;
 * when none does, this renders nothing. The artwork is shown exactly as the
 * publisher issued it, on white, at one height, each linking to that brand's page.
 */
export async function PartnerShowcase({
  className,
  heading = "Our partnerships",
  intro = "Programme designations we hold, shown as each publisher issued them.",
}: {
  className?: string;
  heading?: string;
  intro?: string;
}) {
  const partners = await currentPartnerBadges();
  if (partners.length === 0) return null;

  return (
    <section
      aria-labelledby="partner-showcase"
      className={cn("border-y border-line bg-white", className)}
    >
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-center lg:gap-10">
        <div>
          <h2
            id="partner-showcase"
            className="text-[1.5rem] font-bold leading-tight text-career-navy"
          >
            {heading}
          </h2>
          <span
            aria-hidden="true"
            className="mt-3 block h-[3px] w-12 bg-career-orange"
          />
          <p className="mt-4 text-body leading-relaxed text-ink-600">{intro}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-10 gap-y-6">
          {partners.map((partner) => (
            <li key={partner.slug}>
              <Link
                href={`/brands/${partner.slug}`}
                className="block rounded-(--radius-md) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-career-navy"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={partner.badge}
                  alt={`${partner.name} ${partner.label}`}
                  loading="lazy"
                  className="h-16 w-auto object-contain"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
