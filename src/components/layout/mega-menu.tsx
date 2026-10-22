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
 *
 * ## The two delays, which are not the same delay
 *
 * Opening waits `OPEN_DELAY` before anything happens, and that is hover
 * intent rather than politeness. The nav bar sits across the full width of the
 * page, so a pointer travelling from the logo to the basket crosses every item
 * in it; without a delay that journey opened and shut six panels on the way
 * past. The delay applies only when nothing is open yet — once a panel is up,
 * moving along the bar switches to the next one immediately, because by then
 * the reader is plainly using the menu and waiting again would feel broken.
 *
 * Closing waits `CLOSE_DELAY`, which is the opposite problem: the gap between
 * the button and the panel below it is a few pixels of nothing, and a menu
 * that shuts the instant a pointer crosses it is a menu you cannot reach.
 */
const OPEN_DELAY = 110;
const CLOSE_DELAY = 140;

/**
 * How long the panel stays mounted after it stops being open.
 *
 * Must outlast `--animate-slide-up-out`, which runs for `--duration-fast`
 * (120ms). Twenty milliseconds of slack rather than an exact match, because a
 * timer that fires a frame early removes the element mid-fade and the close
 * reads as a snap.
 */
const EXIT_MS = 140;

export function MegaMenu({ nav }: { nav: PrimaryNavItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  /*
   * The panel that is no longer open but has not finished leaving.
   *
   * Kept apart from `openIndex` so the element can stay mounted and visible
   * for the length of its exit animation while being, as far as the keyboard
   * and the accessibility tree are concerned, already gone. See `inert` below.
   */
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /*
   * The current `closeNow`, for the two document-level listeners.
   *
   * They are registered once, on mount, because re-registering a `keydown`
   * handler on the document every render is work on every hover. A handler
   * bound once would otherwise capture the first render's `closeNow` and go on
   * reading that render's state for the life of the page; the ref is what
   * keeps a permanent listener pointed at a function that changes.
   */
  const closeRef = useRef<() => void>(() => {});

  /*
   * Every timer, cleared on unmount.
   *
   * Three pending callbacks that each call `setState` on a component that may
   * have navigated away is three React warnings and a small leak, and this
   * component unmounts on no route at all — which is exactly why it would
   * never have been noticed.
   */
  useEffect(
    () => () => {
      for (const timer of [openTimer, closeTimer, exitTimer]) {
        if (timer.current) clearTimeout(timer.current);
      }
    },
    [],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) closeRef.current();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function clearTimers() {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  /** Opens `index`, after the intent delay only when nothing is open yet. */
  function requestOpen(index: number) {
    clearTimers();
    if (openIndex === index) return;

    const commit = () => {
      /*
       * No exit animation when switching between panels. Both are absolutely
       * positioned over the same strip, so fading one out under the other
       * sliding in is two things moving in the same place — which reads as a
       * flicker, not a transition. A straight swap is what a reader moving
       * along the bar expects.
       */
      if (exitTimer.current) clearTimeout(exitTimer.current);
      setExitingIndex(null);
      setOpenIndex(index);
    };

    if (openIndex === null) {
      openTimer.current = setTimeout(commit, OPEN_DELAY);
    } else {
      commit();
    }
  }

  /**
   * Opens `index` now.
   *
   * For the chevron button, where the delay would be wrong: hover intent is
   * guesswork about whether somebody means to open a menu, and a click has
   * already answered that. It is also the keyboard's only way in, and a
   * keyboard has no pointer to accidentally sweep across the bar.
   */
  function requestOpenNow(index: number) {
    clearTimers();
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setExitingIndex(null);
    setOpenIndex(index);
  }

  /** Closes whatever is open, letting it animate out first. */
  function closeNow() {
    clearTimers();
    /*
     * Read from the render's own `openIndex` rather than from inside a
     * `setOpenIndex` updater. An updater must be pure: React is free to call
     * it twice — it does exactly that in StrictMode — and starting the exit
     * timer in there would schedule two of them, the second of which clears
     * `exitingIndex` for a panel that had already begun opening again. The ref
     * that carries this function to the document listeners is refreshed every
     * render, so what it reads here is never stale.
     */
    if (openIndex === null) return;
    setExitingIndex(openIndex);
    setOpenIndex(null);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setExitingIndex(null), EXIT_MS);
  }

  function scheduleClose() {
    clearTimers();
    closeTimer.current = setTimeout(closeNow, CLOSE_DELAY);
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  // Kept current every render, so the mount-once listeners above always call
  // the closure that can see today's state rather than the first one.
  useEffect(() => {
    closeRef.current = closeNow;
  });

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
            const isExiting = exitingIndex === index;

            return (
              <li
                key={item.label}
                // Only a narrow dropdown positions against its own button; a
                // wide panel must not, or it inherits the button's position.
                className={cn(item.megaMenu ? undefined : "relative")}
                onMouseEnter={() => {
                  cancelClose();
                  if (hasPanel) requestOpen(index);
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
                      onClick={() => (isOpen ? closeNow() : requestOpenNow(index))}
                      /*
                       * `min-w-6` is 24px, which is WCAG 2.2's minimum target
                       * size (2.5.8) — the chevron is 14px and the box around
                       * it was 18px wide, so this control failed the criterion
                       * on every page at desktop width. The icon is centred in
                       * the wider box rather than padded on one side, so it
                       * sits where it did.
                       *
                       * Height was never the problem: `py-4` already makes it
                       * 46px tall. It is the width a 14px glyph with 4px of
                       * padding gives you.
                       */
                      className="-ml-2 flex min-w-6 justify-center py-4 text-ink-500 hover:text-accent-700"
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
                    hidden={!isOpen && !isExiting}
                    /*
                     * Visible, but gone as far as anything that matters.
                     *
                     * `hidden` is what keeps a closed panel out of the tab
                     * order and the accessibility tree, and it cannot be
                     * animated — applying it is the snap this exit exists to
                     * remove. So for the 140ms the panel is leaving it stays
                     * unhidden and is made `inert` instead, which takes it out
                     * of both for exactly the same reason, without taking it
                     * off the screen. A reader tabbing the moment they press
                     * Escape lands after the menu, not inside a panel that is
                     * halfway through disappearing.
                     */
                    inert={isExiting}
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                    className={cn(
                      "absolute top-full z-50 border border-line bg-white shadow-[--shadow-overlay]",
                      isOpen && "animate-slide-down origin-top",
                      isExiting && "animate-slide-up-out origin-top",
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
                                onClick={closeNow}
                                className="mb-3 block text-label font-semibold uppercase tracking-[0.1em] text-accent-700 hover:underline"
                              >
                                {column.heading}
                              </Link>
                              <ul className="space-y-1.5">
                                {column.links.map((link) => (
                                  <li key={link.href}>
                                    <Link
                                      href={link.href}
                                      onClick={closeNow}
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
                            onClick={closeNow}
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
                              onClick={closeNow}
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
