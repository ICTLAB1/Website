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
  { href: "/account/reviews", label: "Reviews" },
  { href: "/account/support", label: "Support" },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-32">
      {/* Horizontal scroller on small screens, vertical list from lg up. */}
      <ul className="scroll-x flex gap-1 rounded-(--radius-lg) border border-line bg-white p-1.5 shadow-[0_8px_24px_-18px_rgba(11,42,91,0.35)] lg:flex-col lg:gap-0.5">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="shrink-0 lg:shrink">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-(--radius-md) border-l-[3px] px-3 py-2.5 text-body transition-colors",
                  active
                    ? "border-career-orange bg-career-navy font-medium text-white"
                    : "border-transparent text-ink-700 hover:bg-career-mist hover:text-graphite-900",
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
