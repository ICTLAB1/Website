import { REPRESENTATIVE_IMAGE_DISCLAIMER } from "@/lib/representative-image";

/**
 * The full disclaimer for a page showing category illustrations.
 *
 * The badge on the image says *that* it is an illustration; this says what
 * that means. Both are needed and neither replaces the other: a corner label
 * cannot carry six clauses, and a paragraph at the foot of a page is not seen
 * by somebody scanning a grid.
 *
 * Rendered only when an illustration is actually on the page. A disclaimer
 * standing over a page of real photographs would be a caveat about nothing,
 * which is its own kind of misleading — it teaches a reader to skip the notice
 * on the page where it counts.
 */
export function RepresentativeImageNotice({ className }: { className?: string }) {
  return (
    <p
      className={[
        "text-meta leading-relaxed text-ink-500",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {REPRESENTATIVE_IMAGE_DISCLAIMER}
    </p>
  );
}
