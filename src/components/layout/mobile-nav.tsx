"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { primaryNav, utilityNav, type NavColumn, type NavLink } from "@/lib/navigation";
import { SearchBox } from "@/components/layout/search-box";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation.
 *
 * Deliberately not a collapsed copy of the desktop menu: it is a drill-down
 * stack. Tapping a section slides in its own panel with a back control, so
 * deep vendor hierarchies stay reachable in one thumb-sized list at a time
 * rather than as a long nested accordion.
 */

type Panel =
  | { kind: "root" }
  | { kind: "section"; label: string; columns?: NavColumn[]; links?: NavLink[] }
  | { kind: "column"; label: string; parent: string; links: NavLink[] };

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState<Panel[]>([{ kind: "root" }]);
  const pathname = usePathname();

  // Any navigation closes the drawer and resets it to the root panel.
  useEffect(() => {
    setOpen(false);
    setStack([{ kind: "root" }]);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = stack[stack.length - 1] ?? { kind: "root" };

  function push(panel: Panel) {
    setStack((entries) => [...entries, panel]);
  }

  function pop() {
    setStack((entries) => (entries.length > 1 ? entries.slice(0, -1) : entries));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        className="inline-flex h-10 w-10 items-center justify-center rounded-[--radius-md] border border-line-strong text-navy-900 lg:hidden"
      >
        <span className="sr-only">Open menu</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M3 5h14v2H3zM3 9h14v2H3zM3 13h14v2H3z" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-[--shadow-overlay]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              {current.kind === "root" ? (
                <span className="text-sm font-semibold text-navy-900">Menu</span>
              ) : (
                <button
                  type="button"
                  onClick={pop}
                  className="-ml-1 inline-flex items-center gap-1.5 rounded-[--radius-sm] px-1 py-1 text-sm font-semibold text-navy-900"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M12.5 15.5 8 11l4.5-4.5v9z" />
                  </svg>
                  {current.kind === "column" ? current.parent : "Menu"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[--radius-sm] p-1.5 text-ink-500 hover:bg-surface-sunken"
              >
                <span className="sr-only">Close menu</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.3 5.3 5 6.6 8.4 10 5 13.4l1.3 1.3L9.7 11.3l3.4 3.4 1.3-1.3-3.4-3.4 3.4-3.4-1.3-1.3-3.4 3.4z" />
                </svg>
              </button>
            </div>

            <div className="border-b border-line px-4 py-3">
              <SearchBox placeholder="Search software and services" />
            </div>

            <nav className="flex-1 overflow-y-auto" aria-label="Mobile navigation">
              {current.kind === "root" ? (
                <ul className="divide-y divide-line">
                  {primaryNav.map((item) => (
                    <li key={item.label}>
                      {item.megaMenu || item.simpleMenu ? (
                        <button
                          type="button"
                          onClick={() =>
                            push({
                              kind: "section",
                              label: item.label,
                              columns: item.megaMenu,
                              links: item.simpleMenu,
                            })
                          }
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-navy-900"
                        >
                          {item.label}
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="text-ink-400">
                            <path d="M7.5 4.5 12 9l-4.5 4.5v-9z" />
                          </svg>
                        </button>
                      ) : (
                        <Link href={item.href} className="block px-4 py-3.5 text-[15px] font-medium text-navy-900">
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                  <li>
                    <Link href="/enterprise" className="block px-4 py-3.5 text-[15px] font-medium text-navy-900">
                      Enterprise
                    </Link>
                  </li>
                  <li className="bg-surface-muted">
                    <ul className="py-1">
                      {utilityNav.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} className="block px-4 py-2.5 text-sm text-ink-600">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link
                          href={signedIn ? "/account" : "/login"}
                          className="block px-4 py-2.5 text-sm text-ink-600"
                        >
                          {signedIn ? "My account" : "Sign in"}
                        </Link>
                      </li>
                    </ul>
                  </li>
                </ul>
              ) : current.kind === "section" ? (
                <>
                  <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    {current.label}
                  </p>
                  <ul className="divide-y divide-line">
                    {current.columns?.map((column) => (
                      <li key={column.heading}>
                        <button
                          type="button"
                          onClick={() =>
                            push({
                              kind: "column",
                              label: column.heading,
                              parent: current.label,
                              links: [{ label: `All ${column.heading}`, href: column.href }, ...column.links],
                            })
                          }
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-navy-900"
                        >
                          {column.heading}
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="text-ink-400">
                            <path d="M7.5 4.5 12 9l-4.5 4.5v-9z" />
                          </svg>
                        </button>
                      </li>
                    ))}
                    {current.links?.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="block px-4 py-3.5">
                          <span className="block text-[15px] font-medium text-navy-900">{link.label}</span>
                          {link.description ? (
                            <span className="mt-0.5 block text-[13px] text-ink-500">{link.description}</span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    {current.label}
                  </p>
                  <ul className="divide-y divide-line">
                    {current.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="block px-4 py-3.5 text-[15px] text-navy-900">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>

            <div className="border-t border-line p-4">
              <Link
                href="/enquiry"
                className={cn(
                  "flex h-12 w-full items-center justify-center rounded-[--radius-md]",
                  "bg-accent-700 text-sm font-semibold text-white",
                )}
              >
                Get Enterprise Quote
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
