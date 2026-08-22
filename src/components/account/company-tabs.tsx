"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account/company", label: "Details", exact: true },
  { href: "/account/company/people", label: "People" },
  { href: "/account/company/addresses", label: "Addresses" },
];

/**
 * The three faces of one organisation.
 *
 * A second level of navigation rather than three entries in the account menu:
 * they are all "your company", and promoting each to the top level would push
 * the things people actually come here for — quotations, orders, renewals —
 * further down the list.
 */
export function CompanyTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Company" className="mt-6 border-b border-line">
      <ul className="scroll-x -mb-px flex gap-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block whitespace-nowrap border-b-2 px-4 py-2.5 text-meta transition-colors",
                  active
                    ? "border-accent-600 font-medium text-graphite-900"
                    : "border-transparent text-ink-600 hover:border-line-strong hover:text-graphite-900",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
