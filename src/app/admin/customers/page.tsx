import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/guards";
import { listAdminCustomers } from "@/lib/queries/admin";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

type PageProps = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  await requireStaff();
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const { items, total, totalPages } = await listAdminCustomers({
    q: params.q,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Customers</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {total} registered {total === 1 ? "customer" : "customers"}.
        </p>
      </header>

      <form method="get" role="search" className="flex max-w-md gap-2">
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <input
          id="customer-search"
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by name, email or company"
          className="h-11 flex-1 rounded-[--radius-md] border border-line-strong bg-white px-3 text-sm"
        />
        <button
          type="submit"
          className="h-11 rounded-[--radius-md] bg-graphite-900 px-4 text-sm font-medium text-white hover:bg-graphite-800"
        >
          Search
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={params.q ? `Nothing matches “${params.q}”.` : "Registered customers appear here."}
        />
      ) : (
        <>
          <TableWrap>
            <Table className="min-w-[48rem]">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Company</Th>
                  <Th>GSTIN</Th>
                  <Th>Enquiries</Th>
                  <Th>Orders</Th>
                  <Th>Last sign-in</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((customer) => (
                  <Tr key={customer.id}>
                    <Td className="font-medium text-graphite-900">{customer.name}</Td>
                    <Td className="text-[13px]">{customer.email}</Td>
                    <Td className="text-[13px]">{customer.company?.name ?? "—"}</Td>
                    <Td className="font-mono text-[12px]">{customer.company?.gstin ?? "—"}</Td>
                    <Td className="tabular-nums">{customer._count.enquiries}</Td>
                    <Td className="tabular-nums">{customer._count.orders}</Td>
                    <Td className="whitespace-nowrap text-[13px]">{formatDate(customer.lastLoginAt)}</Td>
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
              if (params.q) query.set("q", params.q);
              if (target > 1) query.set("page", String(target));
              const search = query.toString();
              return search ? `/admin/customers?${search}` : "/admin/customers";
            }}
          />
        </>
      )}
    </div>
  );
}
