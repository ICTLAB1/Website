import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AccountForm } from "@/components/account/account-form";
import { DocumentList } from "@/components/documents/document-list";
import { DeliveryPanel } from "@/components/portal/delivery-panel";
import { Field, Input } from "@/components/ui/form";
import { uploadPurchaseOrder } from "@/app/account/orders/actions";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { orgScope } from "@/lib/auth/scope";
import { prisma } from "@/lib/db";
import { ACCEPTED_DOCUMENTS, DOCUMENT_ACCEPT_ATTRIBUTE } from "@/lib/document-bytes";
import { formatMoney } from "@/lib/money";
import { formatDate, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

type PageProps = { params: Promise<{ reference: string }> };

/**
 * One order, as the customer sees it.
 *
 * Exists because a purchase order has to go somewhere. A PO number typed into a
 * field is a reference to a document nobody here holds; this is where the
 * document itself lands, and where the customer can see that it arrived and
 * whether it has been checked.
 */
export default async function AccountOrderPage({ params }: PageProps) {
  const { reference } = await params;
  const user = await requireUser(`/account/orders/${reference}`);

  // Scoped to the organisation in the lookup, like every other account read.
  const order = await prisma.order.findFirst({
    where: { reference, ...orgScope(user) },
    select: {
      reference: true,
      status: true,
      placedAt: true,
      currency: true,
      subtotalMinor: true,
      discountMinor: true,
      taxMinor: true,
      totalMinor: true,
      poNumber: true,
      billingName: true,
      billingGstin: true,
      billingAddress: true,
      courier: true,
      trackingNumber: true,
      trackingUrl: true,
      dispatchedAt: true,
      expectedAt: true,
      deliveredAt: true,
      deliveryNote: true,
      quote: { select: { reference: true } },
      items: {
        orderBy: { productName: "asc" },
        select: {
          id: true,
          productName: true,
          sku: true,
          quantity: true,
          unitPriceMinor: true,
          lineTotalMinor: true,
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          reference: true,
          kind: true,
          filename: true,
          bytes: true,
          note: true,
          verifiedAt: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!order) notFound();

  const mayUpload = canInCompany(user, "orders.act");
  const closed = order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/account/orders" className="text-[13px] text-accent-700 hover:underline">
          &larr; All orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-[1.35rem] text-graphite-900">{order.reference}</h2>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1.5 text-[13px] text-ink-500">
          Placed {formatDate(order.placedAt)}
          {order.quote ? ` · from quotation ${order.quote.reference}` : ""}
          {order.poNumber ? ` · your PO ${order.poNumber}` : ""}
        </p>
      </div>

      <section>
        <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">Ordered</h3>
        <TableWrap>
          <Table className="min-w-[34rem]">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Qty</Th>
                <Th>Unit price</Th>
                <Th>Line total</Th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <Tr key={item.id}>
                  <Td className="font-medium text-graphite-900">
                    {item.productName}
                    <span className="mt-0.5 block font-mono text-[11px] font-normal text-ink-500">
                      {item.sku}
                    </span>
                  </Td>
                  <Td className="tabular-nums">{item.quantity}</Td>
                  <Td className="tabular-nums">
                    {formatMoney(item.unitPriceMinor, order.currency)}
                  </Td>
                  <Td className="tabular-nums font-medium text-graphite-900">
                    {formatMoney(item.lineTotalMinor, order.currency)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>

        <dl className="mt-5 ml-auto max-w-xs space-y-2 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(order.subtotalMinor, order.currency)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">GST</dt>
            <dd className="tabular-nums">{formatMoney(order.taxMinor, order.currency)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-semibold text-graphite-900">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(order.totalMinor, order.currency)}</dd>
          </div>
        </dl>
      </section>

      <DeliveryPanel order={order} />

      <section>
        <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">Documents</h3>
        <DocumentList
          documents={order.documents}
          emptyMessage="Nothing has been attached to this order yet."
        />
      </section>

      {closed ? null : mayUpload ? (
        <section className="max-w-xl rounded-[--radius-lg] border border-line bg-white p-5">
          <h3 className="text-[15px] font-semibold text-graphite-900">Send your purchase order</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            {ACCEPTED_DOCUMENTS}, up to 10 MB. We check it against this order before confirming —
            uploading it does not confirm the order by itself.
          </p>

          <div className="mt-5">
            <AccountForm
              action={uploadPurchaseOrder}
              submitLabel="Upload purchase order"
              pendingLabel="Uploading…"
              hidden={{ reference: order.reference }}
            >
              <Field label="The file" name="document" required>
                <Input
                  name="document"
                  type="file"
                  required
                  accept={DOCUMENT_ACCEPT_ATTRIBUTE}
                  className="file:mr-3 file:rounded-[--radius-sm] file:border-0 file:bg-graphite-900 file:px-3 file:py-1.5 file:text-white"
                />
              </Field>
              <Field
                label="Purchase order number"
                name="poNumber"
                hint={
                  order.poNumber
                    ? `Already recorded as ${order.poNumber}. Tell us if that is wrong.`
                    : "Recorded on the order and printed on the invoice."
                }
              >
                <Input name="poNumber" maxLength={64} defaultValue={order.poNumber ?? ""} />
              </Field>
            </AccountForm>
          </div>
        </section>
      ) : (
        <p className="rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-600">
          Your access is read-only. A colleague with procurement or finance access can send the
          purchase order.
        </p>
      )}

      <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
        <h3 className="text-[15px] font-semibold text-graphite-900">Billing</h3>
        <dl className="mt-3 space-y-2 text-[13px]">
          {[
            ["Billed to", order.billingName],
            ["GSTIN", order.billingGstin],
            ["Address", order.billingAddress],
            ["Status", humanise(order.status)],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <dt className="w-24 shrink-0 text-ink-500">{label}</dt>
              <dd className="min-w-0 whitespace-pre-line break-words text-ink-700">
                {value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
