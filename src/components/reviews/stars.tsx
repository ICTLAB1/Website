import { MAX_RATING, starFill } from "@/lib/reviews";
import { cn } from "@/lib/utils";

/**
 * A row of stars.
 *
 * Drawn with a clipped overlay rather than three different glyphs, so a half
 * star is an actual half and not the nearest character that looks like one.
 *
 * The number is always in the accessible name. A rating rendered only as shapes
 * is a rating a screen reader announces as nothing, and "four and a half out of
 * five" is the whole content of the component.
 */
export function Stars({
  rating,
  size = 16,
  className,
  label,
}: {
  rating: number;
  size?: number;
  className?: string;
  label?: string;
}) {
  const filled = starFill(rating);

  return (
    <span
      className={cn("inline-flex items-center gap-0.5 align-middle", className)}
      role="img"
      aria-label={label ?? `${rating} out of ${MAX_RATING}`}
    >
      {Array.from({ length: MAX_RATING }, (_, index) => {
        // How much of *this* star is filled: all, none, or the remainder.
        const portion = Math.min(1, Math.max(0, filled - index));
        return (
          <span
            key={index}
            aria-hidden="true"
            className="relative inline-block shrink-0"
            style={{ width: size, height: size }}
          >
            <Star size={size} className="text-graphite-200" />
            {portion > 0 ? (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${portion * 100}%` }}
              >
                <Star size={size} className="text-accent-600" />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

function Star({ size, className }: { size: number; className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={cn("block", className)}
    >
      <path d="M10 1.6l2.47 5.006 5.525.803-3.998 3.897.944 5.503L10 14.21l-4.941 2.599.944-5.503L2.005 7.41l5.525-.803z" />
    </svg>
  );
}

/**
 * The compact "4.3 (12)" form used on a product card.
 *
 * Renders nothing at all when there are no reviews — not "No reviews yet", and
 * certainly not zero stars. A card in a grid has no room to explain an absence,
 * and a row of empty stars reads as a bad product rather than an unrated one.
 */
export function RatingSummary({
  average,
  count,
  className,
}: {
  average: number | null;
  count: number;
  className?: string;
}) {
  if (average === null || count === 0) return null;

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-meta text-ink-600", className)}>
      <Stars rating={average} size={13} label={`${average} out of ${MAX_RATING}`} />
      <span className="tabular-nums">{average.toFixed(1)}</span>
      <span className="text-ink-500">
        ({count} {count === 1 ? "review" : "reviews"})
      </span>
    </span>
  );
}
