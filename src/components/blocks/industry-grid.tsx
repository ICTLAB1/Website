import Link from "next/link";

import { IndustryCard, type IndustryCardRow } from "@/components/marketing/industry-card";
import { BlockHeading, BlockSection } from "@/components/blocks/primitives";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/motion/reveal";
import type { BlockData } from "@/lib/blocks/schemas";

/**
 * The sectors this business supplies.
 *
 * ## The filter is links, not state
 *
 * Selecting a sector navigates to `?industry=<slug>` and the server renders the
 * narrowed grid. That is more work than toggling a class, and it buys three
 * things a client-side filter does not: the selection survives a reload and a
 * shared link, a crawler sees the same page a person does, and the component
 * ships no JavaScript. It also means the chips are ordinary anchors, so they
 * are keyboard-reachable and announce themselves without any ARIA.
 *
 * The narrowed view keeps every card and marks the chosen one rather than
 * hiding the other fifteen. A filter that empties a grid down to one card
 * strands the reader: they can see what they picked and nothing to pick next.
 */
export function IndustryGridBlock({
  data,
  rows,
  selected,
  tone,
}: {
  data: BlockData<"INDUSTRY_GRID">;
  rows: IndustryCardRow[];
  /** The `?industry=` slug, when one is set and names a real sector. */
  selected?: string;
  tone?: "plain" | "muted";
}) {
  if (rows.length === 0) return null;

  const industries = rows.slice(0, data.limit);
  const chosen = industries.find((industry) => industry.slug === selected);

  return (
    <BlockSection tone={tone}>
      {data.action ? (
        <SectionHeader
          eyebrow={data.eyebrow}
          title={data.heading ?? ""}
          description={data.description}
          action={
            <ButtonLink href={data.action.href} variant="outline" size="sm">
              {data.action.label}
            </ButtonLink>
          }
        />
      ) : (
        <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />
      )}

      {data.filterable && industries.length > 4 ? (
        <nav aria-label="Filter by sector" className="mb-6 flex flex-wrap gap-2">
          <FilterChip href="?" label="All" current={!chosen} />
          {industries.map((industry) => (
            <FilterChip
              key={industry.slug}
              href={`?industry=${encodeURIComponent(industry.slug)}`}
              label={industry.name}
              current={chosen?.slug === industry.slug}
            />
          ))}
        </nav>
      ) : null}

      {/*
        Staggered, and capped. `RevealGroup` holds the delay to 240ms across the
        whole grid, so the sixteenth card is not still arriving after the reader
        has finished reading the first — which is what an uncapped 60ms-per-card
        stagger does to a grid this size.
      */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {industries.map((industry, index) => (
          <Reveal key={industry.slug} delay={Math.min(index * 45, 240)}>
            <div
              /*
               * The chosen sector is marked with a ring rather than by hiding
               * the rest. `aria-current` carries the same fact to a screen
               * reader, because a ring is not information.
               */
              aria-current={chosen?.slug === industry.slug ? "true" : undefined}
              className={
                chosen?.slug === industry.slug
                  ? "h-full rounded-[--radius-lg] ring-2 ring-accent-500 ring-offset-2"
                  : "h-full"
              }
            >
              <IndustryCard industry={industry} />
            </div>
          </Reveal>
        ))}
      </div>
    </BlockSection>
  );
}

function FilterChip({ href, label, current }: { href: string; label: string; current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={
        current
          ? "rounded-[--radius-md] border border-graphite-900 bg-graphite-900 px-3 py-1.5 text-label font-medium text-white"
          : "rounded-[--radius-md] border border-line bg-white px-3 py-1.5 text-label font-medium text-ink-700 transition-colors hover:border-graphite-300 hover:text-graphite-900"
      }
    >
      {label}
    </Link>
  );
}
