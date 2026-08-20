"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { primaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Desktop primary navigation.
 *
 * Panels open on hover and on click, close on Escape and on focus leaving the
 * item, so the menu is fully operable from the keyboard rather than hover-only.
 */
export function MegaMenu() {
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
    <div ref={containerRef} className="hidden lg:block">
      <nav aria-label="Primary">
        <ul className="flex items-center">
          {primaryNav.map((item, index) => {
            const hasPanel = Boolean(item.megaMenu || item.simpleMenu);
            const isOpen = openIndex === index;

            return (
              <li
                key={item.label}
                className="relative"
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
                      isOpen ? "text-accent-700" : "text-navy-900 hover:text-accent-700",
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

                {hasPanel && isOpen ? (
                  <div
                    id={`megamenu-${index}`}
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                    className={cn(
                      "absolute top-full z-50 border border-line bg-white shadow-[--shadow-overlay]",
                      "rounded-b-[--radius-lg]",
                      item.megaMenu
                        ? "left-1/2 w-[min(72rem,calc(100vw-4rem))] -translate-x-1/2 p-6"
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
                                className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700 hover:underline"
                              >
                                {column.heading}
                              </Link>
                              <ul className="space-y-1.5">
                                {column.links.map((link) => (
                                  <li key={link.href}>
                                    <Link
                                      href={link.href}
                                      onClick={() => setOpenIndex(null)}
                                      className="block text-[13px] leading-snug text-ink-700 hover:text-accent-700 hover:underline"
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
                          <p className="text-[13px] text-ink-500">
                            Buying for a team? Consolidate multiple vendors onto one quotation.
                          </p>
                          <Link
                            href="/enterprise"
                            onClick={() => setOpenIndex(null)}
                            className="text-[13px] font-semibold text-accent-700 hover:underline"
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
                              <span className="block text-sm font-medium text-navy-900">
                                {link.label}
                              </span>
                              {link.description ? (
                                <span className="mt-0.5 block text-[12px] text-ink-500">
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
