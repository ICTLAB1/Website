import Link from "next/link";

import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";

export type TestimonialCard = {
  id: string;
  quote: string;
  authorName: string;
  authorRole: string | null;
  organisation: string | null;
  brand?: { name: string; slug: string } | null;
  service?: { name: string; slug: string } | null;
};

/**
 * A wall of customer quotes.
 *
 * ## It renders nothing when there is nothing
 *
 * Not an empty heading, not a placeholder card, not "Testimonials coming
 * soon" — nothing at all, so the block can be placed on a page before the
 * first quote exists and the page does not look broken in the meantime. That
 * is what makes it safe to ship this feature with an empty table, which is how
 * it ships: there is no seeded testimonial anywhere in this repository, because
 * a plausible quote attributed to a plausible customer is a fabricated
 * endorsement however well-intentioned, and it would be indistinguishable from
 * the real ones the moment somebody added those.
 *
 * `emptyText` overrides that when a page genuinely needs to say something in
 * the gap — a dedicated testimonials page, say, where an empty section is
 * stranger than a sentence.
 */
export function Testimonials({
  items,
  eyebrow,
  heading,
  description,
  emptyText,
  className,
}: {
  items: TestimonialCard[];
  eyebrow?: string;
  heading?: string;
  description?: string;
  emptyText?: string;
  className?: string;
}) {
  if (items.length === 0) {
    if (!emptyText) return null;
    return (
      <div className={cn("rounded-[--radius-lg] border border-line bg-surface-muted p-6", className)}>
        <p className="text-[15px] text-ink-600">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {heading ? (
        <SectionHeader
          title={heading}
          eyebrow={eyebrow}
          description={description}
          as="h2"
          className="mb-6"
        />
      ) : null}

      <ul
        className={cn(
          "grid gap-4",
          items.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {items.map((item) => (
          <li key={item.id} className="h-full">
            <figure className="flex h-full flex-col gap-4 rounded-[--radius-lg] border border-line bg-white p-5 sm:p-6">
              <QuoteMark />
              <blockquote className="flex-1 text-[15px] leading-relaxed text-ink-700">
                {item.quote}
              </blockquote>
              <figcaption className="border-t border-line pt-3.5 text-meta">
                <span className="block font-semibold text-graphite-900">{item.authorName}</span>
                {item.authorRole || item.organisation ? (
                  <span className="mt-0.5 block text-ink-500">
                    {[item.authorRole, item.organisation].filter(Boolean).join(", ")}
                  </span>
                ) : null}
                {item.brand ? (
                  <Link
                    href={`/brands/${item.brand.slug}`}
                    className="mt-1.5 inline-block text-accent-700 hover:underline"
                  >
                    On {item.brand.name}
                  </Link>
                ) : item.service ? (
                  <Link
                    href={`/services/${item.service.slug}`}
                    className="mt-1.5 inline-block text-accent-700 hover:underline"
                  >
                    On {item.service.name}
                  </Link>
                ) : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuoteMark() {
  return (
    <svg
      width="24"
      height="18"
      viewBox="0 0 24 18"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0 text-accent-600/40"
    >
      <path d="M0 18V9.6C0 4.3 3 .9 8.1 0l.9 2.5C6 3.4 4.4 5.2 4.3 7.8H8V18H0zm14 0V9.6c0-5.3 3-8.7 8.1-9.6l.9 2.5c-3 .9-4.6 2.7-4.7 5.3H22V18h-8z" />
    </svg>
  );
}
