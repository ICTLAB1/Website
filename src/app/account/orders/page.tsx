import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { listUserOrders } from "@/lib/queries/account";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

export default async function AccountOrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await listUserOrders(user.id);

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Confirmed orders appear here with their reference, purchase order number and fulfilment status."
        action={<ButtonLink href="/products">Browse catalogue</ButtonLink>}
      />
    );
  }

  return (
    <section>
      <h2 className="mb-5 text-[1.15rem]">Orders</h2>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Reference</Th>
              <Th>Placed</Th>
              <Th>PO number</Th>
              <Th>Lines</Th>
              <Th>Total (incl. GST)</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Tr key={order.reference}>
                <Td className="font-mono text-[13px] font-medium text-navy-900">{order.reference}</Td>
                <Td>{formatDate(order.placedAt)}</Td>
                <Td>{order.poNumber ?? "—"}</Td>
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
    </section>
  );
}
