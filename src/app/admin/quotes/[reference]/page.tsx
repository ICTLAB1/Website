import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input, Textarea } from "@/components/ui/form";
import {
  issueQuote,
  removeQuoteLine,
  updateQuoteLine,
  updateQuoteTerms,
} from "@/app/admin/quote-actions";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { priceLine } from "@/lib/pricing";
import { formatDate, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotation" };

type PageProps = { params: Promise<{ reference: string }> };

/** Rupees for the form; paise everywhere else. */
function toMajor(minor: number): string {
  return (minor / 100).toFixed(2).replace(/\.00$/, "");
}

export default async function AdminQuoteDetailPage({ params }: PageProps) {
  await requireStaff();
  const { reference } = await params;

  const quote = await prisma.quote.findUnique({
    where: { reference },
    include: {
      items: { orderBy: { productName: "asc" } },
      enquiry: {
        select: {
          reference: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          gstin: true,
        },
      },
      orders: { select: { reference: true, status: true } },
    },
  });
  if (!quote) notFound();

  const isDraft = quote.status === "DRAFT";

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/quotes" className="text-[13px] text-accent-700 hover:underline">
          &larr; Quotes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-mono text-2xl">{quote.reference}</h1>
          <StatusBadge status={quote.status} />
        </div>
        <p className="mt-1.5 text-[13px] text-ink-600">
          {quote.enquiry ? (
            <>
              For {quote.enquiry.companyName} · from enquiry{" "}
              <Link
                href={`/admin/enquiries/${quote.enquiry.reference}`}
                className="font-mono text-accent-700 hover:underline"
              >
                {quote.enquiry.reference}
              </Link>
            </>
          ) : (
            "Standalone quotation"
          )}
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-[1.05rem]">Line items</h2>
            <TableWrap>
              <Table className="min-w-[44rem]">
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>Qty</Th>
                    <Th>Unit</Th>
                    <Th>Discount</Th>
                    <Th>Line total</Th>
                    <Th>GST</Th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item) => {
                    const line = priceLine(item);
                    return (
                      <Tr key={item.id}>
                        <Td className="font-medium text-navy-900">
                          {item.productName}
                          <span className="mt-0.5 block font-mono text-[11px] font-normal text-ink-500">
                            {item.sku}
                          </span>
                        </Td>
                        <Td className="tabular-nums">{item.quantity}</Td>
                        <Td className="tabular-nums">
                          {formatMoney(item.unitPriceMinor, quote.currency)}
                        </Td>
                        <Td className="tabular-nums">
                          {item.discountMinor > 0
                            ? `− ${formatMoney(item.discountMinor, quote.currency)}`
                            : "—"}
                        </Td>
                        <Td className="tabular-nums font-medium text-navy-900">
                          {formatMoney(item.lineTotalMinor, quote.currency)}
                        </Td>
                        <Td className="tabular-nums text-[13px]">
                          {item.gstRatePercent}% · {formatMoney(line.taxMinor, quote.currency)}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>

            {isDraft ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {quote.items.map((item) => (
                  <details
                    key={item.id}
                    className="rounded-[--radius-lg] border border-line bg-white p-5"
                  >
                    <summary className="cursor-pointer text-[14px] font-medium text-navy-900">
                      Edit {item.sku}
                    </summary>
                    <div className="mt-5 space-y-5">
                      <AdminForm
                        action={updateQuoteLine}
                        submitLabel="Update line"
                        pendingLabel="Updating…"
                        hidden={{ itemId: item.id }}
                      >
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Field label="Quantity" name="quantity" required>
                            <Input
                              name="quantity"
                              type="number"
                              min={1}
                              max={100000}
                              defaultValue={item.quantity}
                              required
                            />
                          </Field>
                          <Field label="Unit price (₹)" name="unitPrice" required>
                            <Input
                              name="unitPrice"
                              inputMode="decimal"
                              defaultValue={toMajor(item.unitPriceMinor)}
                              required
                            />
                          </Field>
                          <Field
                            label="Discount (%)"
                            name="discountPercent"
                            hint="Applied before GST"
                          >
                            <Input
                              name="discountPercent"
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              defaultValue={
                                item.unitPriceMinor * item.quantity > 0
                                  ? (
                                      (item.discountMinor /
                                        (item.unitPriceMinor * item.quantity)) *
                                      100
                                    ).toFixed(2)
                                  : "0"
                              }
                            />
                          </Field>
                        </div>
                      </AdminForm>

                      <div className="border-t border-line pt-4">
                        <AdminForm
                          action={removeQuoteLine}
                          submitLabel="Remove line"
                          pendingLabel="Removing…"
                          variant="outline"
                          hidden={{ itemId: item.id }}
                          compact
                        />
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-600">
                This quotation has been issued, so its lines are frozen. The customer was given a
                stated validity period against these prices — raise a new quotation to change them.
              </p>
            )}
          </section>

          {quote.orders.length > 0 ? (
            <section>
              <h2 className="mb-4 text-[1.05rem]">Orders raised</h2>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Reference</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.orders.map((order) => (
                      <Tr key={order.reference}>
                        <Td>
                          <Link
                            href={`/admin/orders/${order.reference}`}
                            className="font-mono text-[12px] text-accent-700 hover:underline"
                          >
                            {order.reference}
                          </Link>
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
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-navy-900">Totals</h2>
            <dl className="mt-4 space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(quote.subtotalMinor, quote.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Discount</dt>
                <dd className="tabular-nums">
                  {quote.discountMinor > 0
                    ? `− ${formatMoney(quote.discountMinor, quote.currency)}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">GST</dt>
                <dd className="tabular-nums">{formatMoney(quote.taxMinor, quote.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-semibold text-navy-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(quote.totalMinor, quote.currency)}</dd>
              </div>
            </dl>
          </section>

          {quote.enquiry ? (
            <section className="rounded-[--radius-lg] border border-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-navy-900">Customer</h2>
              <dl className="mt-4 space-y-2.5 text-[13px]">
                {[
                  ["Company", quote.enquiry.companyName],
                  ["Contact", quote.enquiry.contactName],
                  ["Email", quote.enquiry.contactEmail],
                  ["GSTIN", quote.enquiry.gstin ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="w-20 shrink-0 text-ink-500">{label}</dt>
                    <dd className="min-w-0 break-words text-ink-700">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-navy-900">Terms</h2>
            <AdminForm
              action={updateQuoteTerms}
              submitLabel="Save terms"
              pendingLabel="Saving…"
              hidden={{ reference: quote.reference }}
            >
              <Field label="Valid until" name="validUntil" required>
                <Input
                  name="validUntil"
                  type="date"
                  required
                  defaultValue={quote.validUntil?.toISOString().slice(0, 10) ?? ""}
                />
              </Field>
              <Field label="Notes on the quotation" name="notes">
                <Textarea name="notes" rows={4} maxLength={4000} defaultValue={quote.notes ?? ""} />
              </Field>
            </AdminForm>
            <p className="mt-3 text-[12px] text-ink-500">
              Current validity: {formatDate(quote.validUntil)} · Status {humanise(quote.status)}
            </p>
          </section>

          {isDraft ? (
            <section className="rounded-[--radius-lg] border border-accent-600/40 bg-accent-50 p-5">
              <h2 className="text-[15px] font-semibold text-navy-900">Issue this quotation</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
                Sending emails the customer a link to review and accept it, and freezes these
                prices for the validity period.
              </p>
              <div className="mt-4">
                <AdminForm
                  action={issueQuote}
                  submitLabel="Send to customer"
                  pendingLabel="Sending…"
                  hidden={{ reference: quote.reference }}
                  compact
                />
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
