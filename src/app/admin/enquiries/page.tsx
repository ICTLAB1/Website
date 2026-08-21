import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/guards";
import { listAdminEnquiries } from "@/lib/queries/admin";
import { formatDate, humanise } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiries" };

const STATUSES = ["NEW", "IN_REVIEW", "QUOTED", "WON", "LOST", "CLOSED"];

type PageProps = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function AdminEnquiriesPage({ searchParams }: PageProps) {
  await requireStaff();
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const { items, total, totalPages } = await listAdminEnquiries({
    status: params.status,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Enquiries</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {total} {total === 1 ? "enquiry" : "enquiries"}
          {params.status ? ` with status ${humanise(params.status)}` : ""}.
        </p>
      </header>

      <div className="scroll-x">
        <div className="flex min-w-max gap-1">
          <Link
            href="/admin/enquiries"
            className={cn(
              "rounded-[--radius-md] px-3 py-2 text-[13px]",
              !params.status ? "bg-graphite-900 font-medium text-white" : "text-ink-600 hover:bg-white",
            )}
          >
            All
          </Link>
          {STATUSES.map((status) => (
            <Link
              key={status}
              href={`/admin/enquiries?status=${status}`}
              className={cn(
                "rounded-[--radius-md] px-3 py-2 text-[13px]",
                params.status === status
                  ? "bg-graphite-900 font-medium text-white"
                  : "text-ink-600 hover:bg-white",
              )}
            >
              {humanise(status)}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No enquiries"
          description="Enquiries submitted through the site appear here as soon as they arrive."
        />
      ) : (
        <>
          <TableWrap>
            <Table className="min-w-[52rem]">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Company</Th>
                  <Th>Contact</Th>
                  <Th>Items</Th>
                  <Th>Users</Th>
                  <Th>Timeline</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((enquiry) => (
                  <Tr key={enquiry.id}>
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
                    <Td className="font-medium text-graphite-900">{enquiry.companyName}</Td>
                    <Td className="text-[13px]">
                      {enquiry.contactName}
                      <span className="mt-0.5 block text-[12px] text-ink-500">
                        {enquiry.contactEmail}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{enquiry._count.items}</Td>
                    <Td className="tabular-nums">{enquiry.userCount ?? "—"}</Td>
                    <Td className="text-[13px]">{humanise(enquiry.timeline)}</Td>
                    <Td>
                      <StatusBadge status={enquiry.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>

          <Pagination
            page={page > 0 ? page : 1}
            totalPages={totalPages}
            buildHref={(target) => {
              const query = new URLSearchParams();
              if (params.status) query.set("status", params.status);
              if (target > 1) query.set("page", String(target));
              const search = query.toString();
              return search ? `/admin/enquiries?${search}` : "/admin/enquiries";
            }}
          />
        </>
      )}
    </div>
  );
}
