import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  await requireStaff();
  const orders = await prisma.order.findMany({
    orderBy: { placedAt: "desc" },
    take: 100,
    select: {
      id: true,
      reference: true,
      status: true,
      placedAt: true,
      currency: true,
      totalMinor: true,
      poNumber: true,
      billingName: true,
      billingGstin: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Orders</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          Confirmed orders and their fulfilment status.
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders recorded"
          description="Orders raised against an accepted quotation appear here."
        />
      ) : (
        <TableWrap>
          <Table className="min-w-[46rem]">
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Customer</Th>
                <Th>PO number</Th>
                <Th>GSTIN</Th>
                <Th>Lines</Th>
                <Th>Total</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <Tr key={order.id}>
                  <Td className="font-mono text-[12px] font-medium text-navy-900">
                    {order.reference}
                    <span className="mt-0.5 block text-[11px] font-normal text-ink-400">
                      {formatDate(order.placedAt)}
                    </span>
                  </Td>
                  <Td>{order.billingName}</Td>
                  <Td className="text-[13px]">{order.poNumber ?? "—"}</Td>
                  <Td className="font-mono text-[12px]">{order.billingGstin ?? "—"}</Td>
                  <Td className="tabular-nums">{order._count.items}</Td>
                  <Td className="tabular-nums font-medium text-navy-900">
                    {formatMoney(order.totalMinor, order.currency)}
                  </Td>
                  <Td>
                    <StatusBadge status={order.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
