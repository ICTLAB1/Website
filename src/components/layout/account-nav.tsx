"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/company", label: "Company" },
  { href: "/account/enquiries", label: "Enquiries" },
  { href: "/account/quotes", label: "Quotes" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/licences", label: "Licences" },
  { href: "/account/devices", label: "Devices" },
  { href: "/account/renewals", label: "Renewals" },
  { href: "/account/support", label: "Support" },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-32">
      {/* Horizontal scroller on small screens, vertical list from lg up. */}
      <ul className="scroll-x -mx-1 flex gap-1 border-b border-line px-1 pb-px lg:mx-0 lg:flex-col lg:gap-0.5 lg:border-b-0 lg:px-0">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="shrink-0 lg:shrink">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-[--radius-md] px-3 py-2.5 text-body transition-colors",
                  active
                    ? "bg-graphite-900 font-medium text-white"
                    : "text-ink-700 hover:bg-surface-muted hover:text-graphite-900",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
