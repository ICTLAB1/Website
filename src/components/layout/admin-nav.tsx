"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS: Array<{ heading: string; links: Array<{ href: string; label: string; adminOnly?: boolean }> }> = [
  {
    heading: "Overview",
    links: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    heading: "Sales",
    links: [
      { href: "/admin/enquiries", label: "Enquiries" },
      { href: "/admin/quotes", label: "Quotes" },
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/support", label: "Support" },
    ],
  },
  {
    heading: "Catalogue",
    links: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories", adminOnly: true },
      { href: "/admin/brands", label: "Brands", adminOnly: true },
    ],
  },
  {
    heading: "Content",
    links: [
      { href: "/admin/services", label: "Services", adminOnly: true },
      { href: "/admin/faqs", label: "FAQs", adminOnly: true },
      { href: "/admin/banners", label: "Banners", adminOnly: true },
      { href: "/admin/posts", label: "Articles", adminOnly: true },
    ],
  },
  {
    heading: "Administration",
    links: [
      { href: "/admin/users", label: "Staff users", adminOnly: true },
      { href: "/admin/settings", label: "Settings", adminOnly: true },
    ],
  },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-6">
      <div className="scroll-x lg:overflow-visible">
        <div className="flex min-w-max gap-6 lg:min-w-0 lg:flex-col lg:gap-6">
          {SECTIONS.map((section) => {
            const links = section.links.filter((link) => !link.adminOnly || isAdmin);
            if (links.length === 0) return null;

            return (
              <div key={section.heading}>
                <p className="mb-2 hidden text-[11px] font-semibold uppercase tracking-[0.1em] text-graphite-400 lg:block">
                  {section.heading}
                </p>
                <ul className="flex gap-1 lg:flex-col lg:gap-0.5">
                  {links.map((link) => {
                    const active =
                      link.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block whitespace-nowrap rounded-[--radius-md] px-3 py-2 text-[13px] transition-colors",
                            active
                              ? "bg-accent-700 font-medium text-white"
                              : "text-graphite-200 hover:bg-graphite-800 hover:text-white",
                          )}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
