import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AdminForm } from "@/components/admin/admin-form";
import { Field, Select, Textarea } from "@/components/ui/form";
import { fulfilOrderAction, updateOrderStatus } from "@/app/admin/quote-actions";
import { DangerZone } from "@/components/admin/danger-zone";
import { DELETABLE } from "@/lib/admin/deletable";
import { isAdmin, requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { priceLine } from "@/lib/pricing";
import { formatDate, formatDateTime, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

const STATUSES = ["PENDING", "CONFIRMED", "PROVISIONING", "CANCELLED", "REFUNDED"];

type PageProps = { params: Promise<{ reference: string }> };

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const staff = await requireStaff();
  const { reference } = await params;

  const order = await prisma.order.findUnique({
    where: { reference },
    include: {
      items: { orderBy: { productName: "asc" } },
      quote: { select: { reference: true } },
      user: { select: { email: true, name: true } },
      company: { select: { name: true, gstin: true } },
      licences: { select: { reference: true, productName: true, seats: true, expiresAt: true } },
      /*
       * Every attempt, not only the successful one. "Why has this order not
       * been paid" is a question the support desk gets, and three declined
       * cards with the bank's reason against each answers it; a filtered view
       * showing nothing looks identical to a customer who never tried.
       */
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const isFulfilled = order.status === "FULFILLED";
  const canFulfil = !isFulfilled && order.status !== "CANCELLED" && order.status !== "REFUNDED";

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/orders" className="text-[13px] text-accent-700 hover:underline">
          &larr; Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-mono text-2xl">{order.reference}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1.5 text-[13px] text-ink-600">
          Placed {formatDateTime(order.placedAt)}
          {order.quote ? (
            <>
              {" · from quotation "}
              <Link
                href={`/admin/quotes/${order.quote.reference}`}
                className="font-mono text-accent-700 hover:underline"
              >
                {order.quote.reference}
              </Link>
            </>
          ) : (
            " · direct purchase"
          )}
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-[1.05rem]">Line items</h2>
            <TableWrap>
              <Table className="min-w-[40rem]">
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>Qty</Th>
                    <Th>Unit</Th>
                    <Th>Line total</Th>
                    <Th>GST</Th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const line = priceLine(item);
                    return (
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
                        <Td className="tabular-nums text-[13px]">
                          {item.gstRatePercent}% · {formatMoney(line.taxMinor, order.currency)}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          </section>

          {order.payments.length > 0 ? (
            <section>
              <h2 className="mb-4 text-[1.05rem]">Payments</h2>
              <TableWrap>
                <Table className="min-w-[42rem]">
                  <thead>
                    <tr>
                      <Th>When</Th>
                      <Th>Amount</Th>
                      <Th>Method</Th>
                      <Th>Gateway reference</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments.map((payment) => (
                      <Tr key={payment.id}>
                        <Td>{formatDateTime(payment.capturedAt ?? payment.createdAt)}</Td>
                        <Td className="tabular-nums font-medium text-graphite-900">
                          {formatMoney(payment.amountMinor, payment.currency)}
                        </Td>
                        <Td>{payment.method ? humanise(payment.method) : "—"}</Td>
                        <Td className="font-mono text-[12px] text-ink-600">
                          {payment.providerPaymentId ?? payment.providerOrderId}
                        </Td>
                        <Td>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={payment.status} />
                            {/*
                              * A test payment moved no money. Labelling it is
                              * the difference between a reconciliation that
                              * balances and one that does not.
                              */}
                            {payment.mode === "TEST" ? (
                              <span className="rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-medium text-warning-700">
                                Test mode — no real money
                              </span>
                            ) : null}
                          </div>
                          {payment.failureReason ? (
                            <p className="mt-1 text-[12px] text-ink-500">{payment.failureReason}</p>
                          ) : null}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </section>
          ) : null}

          {order.licences.length > 0 ? (
            <section>
              <h2 className="mb-4 text-[1.05rem]">Licences issued</h2>
              <TableWrap>
                <Table className="min-w-[34rem]">
                  <thead>
                    <tr>
                      <Th>Reference</Th>
                      <Th>Product</Th>
                      <Th>Seats</Th>
                      <Th>Expires</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.licences.map((licence) => (
                      <Tr key={licence.reference}>
                        <Td className="font-mono text-[12px]">{licence.reference}</Td>
                        <Td>{licence.productName}</Td>
                        <Td className="tabular-nums">{licence.seats}</Td>
                        <Td>{licence.expiresAt ? formatDate(licence.expiresAt) : "Perpetual"}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">Totals</h2>
            <dl className="mt-4 space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(order.subtotalMinor, order.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Discount</dt>
                <dd className="tabular-nums">
                  {order.discountMinor > 0
                    ? `− ${formatMoney(order.discountMinor, order.currency)}`
                    : "—"}
                </dd>
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

          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">Billing</h2>
            <dl className="mt-4 space-y-2.5 text-[13px]">
              {[
                ["Name", order.billingName],
                ["Email", order.billingEmail],
                ["Phone", order.billingPhone ?? "—"],
                ["GSTIN", order.billingGstin ?? "—"],
                ["PO number", order.poNumber ?? "—"],
                ["Account", order.user?.email ?? "Guest"],
                ["Company", order.company?.name ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-20 shrink-0 text-ink-500">{label}</dt>
                  <dd className="min-w-0 break-words text-ink-700">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {isFulfilled ? (
            <section className="rounded-[--radius-lg] border border-success-600/30 bg-success-50 p-5">
              <h2 className="text-[15px] font-semibold text-success-700">Fulfilled</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
                Fulfilled {formatDateTime(order.fulfilledAt)}. Licence and renewal records were
                created and are visible in the customer&rsquo;s account.
              </p>
            </section>
          ) : (
            <>
              <section className="rounded-[--radius-lg] border border-line bg-white p-5">
                <h2 className="mb-4 text-[15px] font-semibold text-graphite-900">Update</h2>
                <AdminForm
                  action={updateOrderStatus}
                  submitLabel="Save"
                  pendingLabel="Saving…"
                  hidden={{ reference: order.reference }}
                >
                  <Field label="Status" name="status" required>
                    <Select name="status" defaultValue={order.status}>
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {humanise(status)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Internal notes"
                    name="internalNotes"
                    hint="Staff only. Never shown to the customer."
                  >
                    <Textarea
                      name="internalNotes"
                      rows={5}
                      maxLength={4000}
                      defaultValue={order.internalNotes ?? ""}
                    />
                  </Field>
                </AdminForm>
              </section>

              {canFulfil ? (
                <section className="rounded-[--radius-lg] border border-accent-600/40 bg-accent-50 p-5">
                  <h2 className="text-[15px] font-semibold text-graphite-900">Fulfil this order</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
                    Creates a licence record for every line, and a renewal reminder for each
                    subscription term. This cannot be undone from here.
                  </p>
                  <div className="mt-4">
                    <AdminForm
                      action={fulfilOrderAction}
                      submitLabel="Mark fulfilled"
                      pendingLabel="Fulfilling…"
                      hidden={{ reference: order.reference }}
                      compact
                    />
                  </div>
                </section>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {isAdmin(staff) ? (
        <DangerZone
          config={DELETABLE.orders}
          id={order.id}
          reference={order.reference}
          retentionNote={
            order.payments.some((payment) => payment.status === "CAPTURED")
              ? "Money has been taken against this order. Indian law requires books of account and the tax invoices behind them to be kept for eight years, and deleting this removes the only record of the sale held here. Cancel or refund it instead unless you are certain it should never have existed."
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
