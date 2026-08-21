"use client";

import { useId, useState } from "react";

import type { FaqEntry } from "@/components/ui/accordion";

/**
 * FAQ accordion, built as a WAI-ARIA disclosure.
 *
 * It used to be `<details>` and `<summary>`, chosen so it worked without
 * JavaScript. That reasoning was sound and the implementation still lost: in
 * Chromium the `<details>` is exposed as a plain `group` carrying the question
 * *and* the answer as one accessible name, and the `<summary>` carries no role
 * and no expanded state whatsoever. A screen reader user got no indication that
 * a row could be opened, or whether it was. Adding `aria-expanded` to a
 * `<summary>` would not have fixed it either — ARIA states are ignored on an
 * element with no role, and giving it `role="button"` to make them stick
 * suppresses the native behaviour that was the reason for using it.
 *
 * So: a real button, a real `aria-expanded`, and `aria-controls` pointing at a
 * real region. The cost is that the answers need JavaScript to open. That is
 * acceptable here — the page's FAQ structured data is rendered on the server by
 * `FaqSchema`, so search engines read the answers whatever happens, and every
 * other interactive part of this site is already a client component.
 *
 * Three details are deliberate:
 *
 *   The indicator is a plus that becomes a minus. It was a plus rotated 45
 *   degrees, which lands exactly on a multiplication sign — and a cross means
 *   "discard this", not "collapse this". The vertical stroke now scales away.
 *
 *   The whole row is the button, padding included. The padding used to sit on
 *   the wrapper, so the twenty pixels down each side of a row looked clickable
 *   and did nothing.
 *
 *   Focus does not use the global ring, which is a 2px amber outline offset
 *   from its element — around a full-width row inside a bordered card that
 *   reads as a text input. A focused row gets a solid bar down its leading edge
 *   and a tint instead. The bar is accent-600 on white, well past the 3:1 a
 *   focus indicator needs, and it says "row" rather than "field".
 */
export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  const baseId = useId();
  // Each row is independent: opening one does not close another, because these
  // are reference answers people compare rather than steps in a sequence.
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());

  if (items.length === 0) return null;

  function toggle(index: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  return (
    <div className="divide-y divide-line overflow-hidden rounded-[--radius-lg] border border-line bg-white">
      {items.map((item, index) => {
        const expanded = open.has(index);
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={index} className="faq-row">
            <h3 className="text-[15px]">
              <button
                type="button"
                id={buttonId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className="faq-trigger flex w-full cursor-pointer items-start justify-between gap-4 px-5 py-4 text-left font-medium text-graphite-900 transition-colors hover:bg-surface-muted"
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className={
                    "mt-0.5 shrink-0 transition-colors " +
                    (expanded ? "text-accent-700" : "text-ink-500")
                  }
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    {/* The stroke that collapses, turning the plus into a minus. */}
                    <path
                      className="faq-plus-stroke"
                      d="M9 4h2v12H9z"
                      style={expanded ? { transform: "scaleY(0)" } : undefined}
                    />
                    <path d="M4 9h12v2H4z" />
                  </svg>
                </span>
              </button>
            </h3>

            {/*
              The panel stays in the DOM and stays laid out; only its height is
              animated, from 0fr to 1fr on a grid row. That transitions smoothly
              in every browser, and needs no hard-coded max-height that would
              clip a long answer.

              A closed panel is hidden with `visibility`, not the `hidden`
              attribute: `hidden` means `display: none`, which cannot be
              transitioned, so it would have made every open and close instant.
              `visibility: hidden` takes the answer out of the accessibility
              tree and out of the focus order just as thoroughly, and does
              animate — it flips at the correct end of the transition on its
              own.
            */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={"faq-panel" + (expanded ? " faq-panel-open" : "")}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 pr-12 text-sm leading-relaxed text-ink-600">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
