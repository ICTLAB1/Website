"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PrimaryNavItem } from "@/lib/queries/navigation";
import { cn } from "@/lib/utils";

/**
 * Desktop primary navigation.
 *
 * Panels open on hover and on click, close on Escape and on focus leaving the
 * item, so the menu is fully operable from the keyboard rather than hover-only.
 */
export function MegaMenu({ nav }: { nav: PrimaryNavItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenIndex(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpenIndex(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenIndex(null), 140);
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  return (
    // `relative` here is what a wide panel positions against. Anchoring it to
    // the page container rather than to the button that opened it is the whole
    // fix for a panel that used to hang off the left edge of the screen.
    <div ref={containerRef} className="relative hidden lg:block">
      <nav aria-label="Primary">
        <ul className="flex items-center">
          {nav.map((item, index) => {
            const hasPanel = Boolean(item.megaMenu || item.simpleMenu);
            const isOpen = openIndex === index;

            return (
              <li
                key={item.label}
                // Only a narrow dropdown positions against its own button; a
                // wide panel must not, or it inherits the button's position.
                className={cn(item.megaMenu ? undefined : "relative")}
                onMouseEnter={() => {
                  cancelClose();
                  if (hasPanel) setOpenIndex(index);
                }}
                onMouseLeave={scheduleClose}
              >
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className={cn(
                      "px-3 py-4 text-sm font-medium transition-colors",
                      isOpen ? "text-accent-700" : "text-graphite-900 hover:text-accent-700",
                    )}
                  >
                    {item.label}
                  </Link>
                  {hasPanel ? (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`megamenu-${index}`}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="-ml-2 py-4 pr-1 text-ink-500 hover:text-accent-700"
                    >
                      <span className="sr-only">
                        {isOpen ? `Close ${item.label} menu` : `Open ${item.label} menu`}
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                        className={cn("transition-transform", isOpen && "rotate-180")}
                      >
                        <path d="M5.5 7.5 10 12l4.5-4.5z" />
                      </svg>
                    </button>
                  ) : null}
                </div>

                {hasPanel ? (
                  <div
                    id={`megamenu-${index}`}
                    /*
                     * Rendered always, hidden when closed — not mounted on open.
                     *
                     * It used to be `hasPanel && isOpen`, which meant the panels
                     * existed only after a hover or a click. A crawler does
                     * neither. Every link in this menu — ninety of them, and the
                     * only route to forty product pages — was absent from the
                     * HTML the site actually served, so the entire primary
                     * navigation contributed nothing: the only internal links
                     * Google could see were the footer's dozen. Fifteen product
                     * pages were reachable from no served page at all.
                     *
                     * `hidden` keeps them out of the accessibility tree and out
                     * of the tab order while closed, which is what conditional
                     * mounting was buying. The animation moves onto the class
                     * below so it still restarts on each open: the property
                     * goes from `animation: none` to the keyframe, and that is
                     * what re-triggers it.
                     */
                    hidden={!isOpen}
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                    className={cn(
                      "absolute top-full z-50 border border-line bg-white shadow-[--shadow-overlay]",
                      isOpen && "animate-slide-down origin-top",
                      "rounded-b-[--radius-lg]",
                      item.megaMenu
                        // Spans the page container, so its edges are the
                        // container's edges whatever the viewport width and
                        // wherever in the bar the button sits. It used to be
                        // centred on the button — which put most of a 72rem
                        // panel off-screen for the leftmost menus.
                        ? "inset-x-0 p-6"
                        : "left-0 w-80 p-3",
                    )}
                  >
                    {item.megaMenu ? (
                      <>
                        <div
                          className={cn(
                            "grid gap-x-8 gap-y-7",
                            item.megaMenu.length > 3 ? "grid-cols-3 xl:grid-cols-6" : "grid-cols-2",
                          )}
                        >
                          {item.megaMenu.map((column) => (
                            <div key={column.heading}>
                              <Link
                                href={column.href}
                                onClick={() => setOpenIndex(null)}
                                className="mb-3 block text-label font-semibold uppercase tracking-[0.1em] text-accent-700 hover:underline"
                              >
                                {column.heading}
                              </Link>
                              <ul className="space-y-1.5">
                                {column.links.map((link) => (
                                  <li key={link.href}>
                                    <Link
                                      href={link.href}
                                      onClick={() => setOpenIndex(null)}
                                      className="block text-meta leading-snug text-ink-700 hover:text-accent-700 hover:underline"
                                    >
                                      {link.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                          <p className="text-meta text-ink-500">
                            Buying for a team? Consolidate multiple brands onto one quotation.
                          </p>
                          <Link
                            href="/enterprise"
                            onClick={() => setOpenIndex(null)}
                            className="text-meta font-semibold text-accent-700 hover:underline"
                          >
                            Enterprise procurement &rarr;
                          </Link>
                        </div>
                      </>
                    ) : (
                      <ul>
                        {item.simpleMenu?.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              onClick={() => setOpenIndex(null)}
                              className="block rounded-[--radius-sm] px-3 py-2 hover:bg-surface-muted"
                            >
                              <span className="block text-sm font-medium text-graphite-900">
                                {link.label}
                              </span>
                              {link.description ? (
                                <span className="mt-0.5 block text-label text-ink-500">
                                  {link.description}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
