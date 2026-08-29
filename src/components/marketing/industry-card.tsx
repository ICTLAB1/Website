import Link from "next/link";

import { glyph } from "@/lib/glyphs";

export type IndustryCardRow = {
  slug: string;
  name: string;
  summary: string;
  icon: string;
  solutions: string[];
};

/**
 * One sector: what it is, what this business supplies to it, and a way in.
 *
 * The whole card is the link. A card with a "Explore solutions" anchor in the
 * corner gives a reader a 90×20 pixel target inside a 300×260 pixel thing that
 * looks clickable, and on a touch screen that is simply a card that does not
 * work. The corner text stays, as an affordance rather than as the hit area.
 *
 * ## The hover
 *
 * `wash` fills the card with the accent from the corner the pointer is nearest
 * to and inverts the content — see `globals.css`. It is a decoration and is
 * treated as one: under `prefers-reduced-motion` the fill does not run and the
 * card keeps a plain border change, and nothing the card says depends on it.
 *
 * Three solution chips, not six. The row exists to tell a reader they are in
 * the right place, and six labels wrapping onto three lines makes every card a
 * different height for no gain; the rest are on the sector's own page.
 */
export function IndustryCard({ industry }: { industry: IndustryCardRow }) {
  const shown = industry.solutions.slice(0, 3);
  const rest = industry.solutions.length - shown.length;

  return (
    <Link
      href={`/industries/${industry.slug}`}
      className="wash group flex h-full flex-col rounded-[--radius-lg] border border-line bg-white p-5"
    >
      <span
        aria-hidden="true"
        className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-accent-50 text-accent-700 transition-colors group-hover:bg-white/15 group-hover:text-white"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={glyph(industry.icon)} />
        </svg>
      </span>

      <span className="text-body font-semibold text-graphite-900 transition-colors group-hover:text-white">
        {industry.name}
      </span>
      <span className="mt-1.5 text-meta leading-relaxed text-ink-600 transition-colors group-hover:text-white/90">
        {industry.summary}
      </span>

      {shown.length > 0 ? (
        <span className="mt-4 flex flex-wrap gap-1.5">
          {shown.map((solution) => (
            <span
              key={solution}
              className="rounded-[--radius-sm] border border-line bg-surface-muted px-2 py-1 text-label text-ink-600 transition-colors group-hover:border-white/30 group-hover:bg-white/10 group-hover:text-white"
            >
              {solution}
            </span>
          ))}
          {rest > 0 ? (
            <span className="px-1 py-1 text-label text-ink-500 transition-colors group-hover:text-white/80">
              +{rest} more
            </span>
          ) : null}
        </span>
      ) : null}

      <span className="mt-auto pt-4 text-label font-semibold text-accent-700 transition-colors group-hover:text-white">
        Explore solutions &rarr;
      </span>
    </Link>
  );
}
