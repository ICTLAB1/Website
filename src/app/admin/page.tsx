import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth/guards";
import { getDashboardMetrics, listAuditLog } from "@/lib/queries/admin";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime, humanise } from "@/lib/utils";
import { getUnconfiguredIdentityKeys } from "@/lib/site-config";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireStaff();
  const [metrics, audit] = await Promise.all([getDashboardMetrics(), listAuditLog(10)]);
  const missingConfig = getUnconfiguredIdentityKeys();

  const tiles = [
    { label: "Fulfilled revenue", value: formatMoney(metrics.revenueMinor), href: "/admin/orders" },
    { label: "Orders", value: String(metrics.orderCount), href: "/admin/orders" },
    { label: "Enquiries", value: String(metrics.enquiryCount), href: "/admin/enquiries" },
    { label: "New enquiries", value: String(metrics.newEnquiries), href: "/admin/enquiries?status=NEW", highlight: metrics.newEnquiries > 0 },
    { label: "Open quotes", value: String(metrics.quoteCount), href: "/admin/quotes" },
    { label: "Customers", value: String(metrics.customerCount), href: "/admin/customers" },
    { label: "Active products", value: String(metrics.productCount), href: "/admin/products" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl">Dashboard</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          Current position across sales, catalogue and recent activity.
        </p>
      </header>

      {missingConfig.length > 0 ? (
        <div className="rounded-[--radius-lg] border border-warning-600/40 bg-warning-50 p-5">
          <h2 className="text-[15px] font-semibold text-warning-700">
            Business identity not fully configured
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
            The public site is rendering without the following values, which must be set before
            it goes live. Nothing is substituted with placeholder company information.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {missingConfig.map((key) => (
              <li key={key} className="rounded-[--radius-sm] bg-white px-2 py-1 font-mono text-[11px] text-ink-700">
                {key}
              </li>
            ))}
          </ul>
          <Link href="/admin/settings" className="mt-4 inline-block text-[13px] font-medium text-accent-700 hover:underline">
            View configuration &rarr;
          </Link>
        </div>
      ) : null}

      <section>
        <h2 className="sr-only">Key metrics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className={`rounded-[--radius-lg] border bg-white p-5 transition-colors hover:border-navy-300 ${
                tile.highlight ? "border-accent-600" : "border-line"
              }`}
            >
              <p className="text-[13px] text-ink-500">{tile.label}</p>
              <p className="mt-1.5 text-[22px] font-semibold leading-tight text-navy-900 tabular-nums">
                {tile.value}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[1.05rem]">Recent enquiries</h2>
            <Link href="/admin/enquiries" className="text-[13px] font-medium text-accent-700 hover:underline">
              View all
            </Link>
          </div>
          {metrics.recentEnquiries.length === 0 ? (
            <p className="rounded-[--radius-lg] border border-dashed border-line-strong bg-white px-5 py-8 text-center text-[13px] text-ink-500">
              No enquiries yet.
            </p>
          ) : (
            <TableWrap>
              <Table className="min-w-[30rem]">
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Company</Th>
                    <Th>Items</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentEnquiries.map((enquiry) => (
                    <Tr key={enquiry.reference}>
                      <Td>
                        <Link
                          href={`/admin/enquiries/${enquiry.reference}`}
                          className="font-mono text-[12px] font-medium text-accent-700 hover:underline"
                        >
                          {enquiry.reference}
                        </Link>
                        <span className="mt-0.5 block text-[11px] text-ink-500">
                          {formatDate(enquiry.createdAt)}
                        </span>
                      </Td>
                      <Td className="font-medium text-navy-900">{enquiry.companyName}</Td>
                      <Td className="tabular-nums">{enquiry._count.items}</Td>
                      <Td>
                        <StatusBadge status={enquiry.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[1.05rem]">Most requested products (30 days)</h2>
          {metrics.popularProducts.length === 0 ? (
            <p className="rounded-[--radius-lg] border border-dashed border-line-strong bg-white px-5 py-8 text-center text-[13px] text-ink-500">
              No enquiry activity in the last 30 days.
            </p>
          ) : (
            <TableWrap>
              <Table className="min-w-[28rem]">
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>SKU</Th>
                    <Th>Enquiries</Th>
                    <Th>Units</Th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.popularProducts.map((product) => (
                    <Tr key={product.sku}>
                      <Td className="font-medium text-navy-900">{product.productName}</Td>
                      <Td className="font-mono text-[12px]">{product.sku}</Td>
                      <Td className="tabular-nums">{product._count._all}</Td>
                      <Td className="tabular-nums">{product._sum.quantity ?? 0}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-[1.05rem]">Recent activity</h2>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 ? (
                <Tr>
                  <Td className="text-ink-500">No recorded activity yet.</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                </Tr>
              ) : (
                audit.map((entry) => (
                  <Tr key={entry.id}>
                    <Td className="whitespace-nowrap text-[13px]">{formatDateTime(entry.createdAt)}</Td>
                    <Td>{entry.actor?.name ?? "System"}</Td>
                    <Td className="font-mono text-[12px]">{entry.action}</Td>
                    <Td className="text-[13px] text-ink-500">{humanise(entry.entityType)}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </section>
    </div>
  );
}
