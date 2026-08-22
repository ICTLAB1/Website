import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { listUserOrders } from "@/lib/queries/account";
import { cardPaymentsAvailable } from "@/lib/payments/config";
import { getSiteConfig } from "@/lib/site-config";
import { PayOrderButton } from "@/components/account/pay-order-button";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

export default async function AccountOrdersPage() {
  const user = await requireUser("/account/orders");
  const [orders, cardPayments, config] = await Promise.all([
    listUserOrders(user),
    cardPaymentsAvailable(),
    getSiteConfig(),
  ]);

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
              <Th>Payment</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Tr key={order.reference}>
                <Td className="font-mono text-[13px] font-medium text-graphite-900">{order.reference}</Td>
                <Td>{formatDate(order.placedAt)}</Td>
                <Td>{order.poNumber ?? "—"}</Td>
                <Td className="tabular-nums">{order._count.items}</Td>
                <Td className="tabular-nums font-medium text-graphite-900">
                  {formatMoney(order.totalMinor, order.currency)}
                </Td>
                <Td>
                  <StatusBadge status={order.status} />
                </Td>
                <Td>
                  {order.payments.length > 0 ? (
                    <span className="text-[13px] font-medium text-success-700">Paid</span>
                  ) : cardPayments && order.status === "PENDING" ? (
                    <PayOrderButton reference={order.reference} merchantName={config.tradingName} />
                  ) : (
                    /*
                     * Says what is true rather than nothing. An order with no
                     * card payment against it is being invoiced, which is the
                     * normal route here, not a gap.
                     */
                    <span className="text-[13px] text-ink-500">On invoice</span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}
