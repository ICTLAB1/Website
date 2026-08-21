import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { getAccountSummary, listUserEnquiries } from "@/lib/queries/account";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function AccountOverviewPage() {
  const user = await requireUser("/account");
  const [summary, enquiries] = await Promise.all([
    getAccountSummary(user.id),
    listUserEnquiries(user.id),
  ]);

  const tiles = [
    { label: "Enquiries", value: summary.enquiries, href: "/account/enquiries" },
    { label: "Quotations", value: summary.quotes, href: "/account/quotes" },
    { label: "Orders", value: summary.orders, href: "/account/orders" },
    { label: "Active licences", value: summary.licences, href: "/account/licences" },
    { label: "Renewals due (90 days)", value: summary.renewals, href: "/account/renewals" },
    { label: "Open tickets", value: summary.tickets, href: "/account/support" },
  ];

  const recent = enquiries.slice(0, 5);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="sr-only">Account summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-graphite-300"
            >
              <p className="text-[13px] text-ink-500">{tile.label}</p>
              <p className="mt-1.5 text-[26px] font-semibold leading-none text-graphite-900 tabular-nums">
                {tile.value}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[1.15rem]">Recent enquiries</h2>
          {enquiries.length > 0 ? (
            <Link href="/account/enquiries" className="text-[13px] font-medium text-accent-700 hover:underline">
              View all
            </Link>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No enquiries yet"
            description="Build an enquiry from the catalogue and request a consolidated quotation across every vendor you need."
            action={<ButtonLink href="/products">Browse catalogue</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-line rounded-[--radius-lg] border border-line bg-white">
            {recent.map((enquiry) => (
              <li key={enquiry.reference}>
                <Link
                  href={`/account/enquiries/${enquiry.reference}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-muted"
                >
                  <span>
                    <span className="block font-mono text-[13px] font-medium text-graphite-900">
                      {enquiry.reference}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-ink-500">
                      {enquiry._count.items} {enquiry._count.items === 1 ? "product" : "products"} ·{" "}
                      {formatDate(enquiry.createdAt)}
                    </span>
                  </span>
                  <StatusBadge status={enquiry.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-6">
        <h2 className="text-[1.1rem]">Need something?</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
          Add products to an enquiry for a consolidated quotation, or raise a support ticket if
          something is not working as expected.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/products">Browse catalogue</ButtonLink>
          <ButtonLink href="/account/support" variant="outline">
            Raise a ticket
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
