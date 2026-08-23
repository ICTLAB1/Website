import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import {
  issueQuote,
  removeQuoteLine,
  replyOnQuote,
  reviseQuotation,
  updateQuoteLine,
  updateQuoteTerms,
} from "@/app/admin/quote-actions";
import { DangerZone } from "@/components/admin/danger-zone";
import { DELETABLE } from "@/lib/admin/deletable";
import { isAdmin, requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { quoteVersions } from "@/lib/quote-revision";
import { QuoteThread } from "@/components/quotes/quote-thread";
import { QuoteVersions } from "@/components/quotes/quote-versions";
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
  const staff = await requireStaff();
  const { reference } = await params;

  /*
   * Who may be named on a quotation: anybody who works here.
   *
   * Listed rather than typed, because the name printed on the document is a
   * promise about who will answer the telephone when the customer rings it.
   */
  const colleagues = await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true },
  });

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
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kind: true,
          body: true,
          fromStaff: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!quote) notFound();

  const isDraft = quote.status === "DRAFT";
  const versions = await quoteVersions(quote.rootId ?? quote.id);
  /*
   * Revising is offered on anything that has left the drafting stage and has
   * not been accepted. A draft is still editable in place — that is what a
   * draft is — and an accepted quotation is the agreement, so it is never
   * superseded by an edit.
   */
  const revisable = !isDraft && quote.status !== "ACCEPTED";

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/quotes" className="text-[13px] text-accent-700 hover:underline">
          &larr; Quotes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-mono text-2xl">{quote.documentNo ?? quote.reference}</h1>
          <span className="flex items-center gap-3">
            <a
              href={`/account/quotes/${quote.reference}/pdf`}
              className="inline-flex h-9 items-center rounded-[--radius-md] border border-line-strong px-3.5 text-[13px] font-medium text-graphite-900 hover:border-graphite-400"
            >
              Download PDF
            </a>
            <StatusBadge status={quote.status} />
          </span>
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
                        <Td className="font-medium text-graphite-900">
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
                        <Td className="tabular-nums font-medium text-graphite-900">
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
                    <summary className="cursor-pointer text-[14px] font-medium text-graphite-900">
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

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field
                            label="Description"
                            name="description"
                            hint="The sentence printed beside the name on the PDF."
                          >
                            <Input
                              name="description"
                              maxLength={300}
                              defaultValue={item.description ?? ""}
                            />
                          </Field>
                          <Field label="Brand" name="brandName">
                            <Input
                              name="brandName"
                              maxLength={80}
                              defaultValue={item.brandName ?? ""}
                            />
                          </Field>
                          <Field
                            label="HSN / SAC code"
                            name="hsnCode"
                            hint="Digits only. Left blank it prints a dash, never a guess."
                          >
                            <Input
                              name="hsnCode"
                              inputMode="numeric"
                              maxLength={12}
                              defaultValue={item.hsnCode ?? ""}
                            />
                          </Field>
                          <Field
                            label="Unit"
                            name="unitLabel"
                            hint="What the quantity counts: Users, Nos, Nodes, Project."
                          >
                            <Input
                              name="unitLabel"
                              maxLength={24}
                              defaultValue={item.unitLabel ?? ""}
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
            <h2 className="text-[15px] font-semibold text-graphite-900">Totals</h2>
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
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-[15px] font-semibold text-graphite-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(quote.totalMinor, quote.currency)}</dd>
              </div>
            </dl>
          </section>

          {quote.enquiry ? (
            <section className="rounded-[--radius-lg] border border-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-graphite-900">Customer</h2>
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
            <h2 className="mb-4 text-[15px] font-semibold text-graphite-900">Terms</h2>
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
              <Field
                label="Their reference"
                name="customerReference"
                hint="The customer's own RFQ or tender number. Printed as the reference on the quotation, in place of ours."
              >
                <Input
                  name="customerReference"
                  maxLength={80}
                  defaultValue={quote.customerReference ?? ""}
                />
              </Field>
              <Field
                label="Payment terms"
                name="paymentTerms"
                hint="Printed on the document, e.g. 50% advance, balance on delivery. Blank prints no line."
              >
                <Input
                  name="paymentTerms"
                  maxLength={160}
                  defaultValue={quote.paymentTerms ?? ""}
                />
              </Field>
              <Field
                label="Sales executive"
                name="ownerId"
                hint="Named on the quotation. Whoever is chosen should expect the customer's call."
              >
                <Select name="ownerId" defaultValue={quote.ownerId ?? ""}>
                  <option value="">Nobody named</option>
                  {colleagues.map((colleague) => (
                    <option key={colleague.id} value={colleague.id}>
                      {colleague.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Notes on the quotation" name="notes">
                <Textarea name="notes" rows={4} maxLength={4000} defaultValue={quote.notes ?? ""} />
              </Field>
            </AdminForm>
            <p className="mt-3 text-[12px] text-ink-500">
              Current validity: {formatDate(quote.validUntil)} · Status {humanise(quote.status)}
            </p>
          </section>

          {revisable ? (
            <section className="rounded-[--radius-lg] border border-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-graphite-900">Revise</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                Raises version {(versions[0]?.version ?? quote.version) + 1} as a new draft with
                these lines copied in. This version is kept exactly as it is — the customer may be
                holding a copy of it.
              </p>
              <div className="mt-4">
                <AdminForm
                  action={reviseQuotation}
                  submitLabel="Raise a revision"
                  pendingLabel="Raising…"
                  variant="outline"
                  hidden={{ reference: quote.reference }}
                  compact
                >
                  <Field label="What changed" name="note" hint="Shown to the customer beside the version.">
                    <Input name="note" maxLength={600} />
                  </Field>
                </AdminForm>
              </div>
            </section>
          ) : null}

          {isDraft ? (
            <section className="rounded-[--radius-lg] border border-accent-600/40 bg-accent-50 p-5">
              <h2 className="text-[15px] font-semibold text-graphite-900">Issue this quotation</h2>
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

      {versions.length > 1 ? (
        <section>
          <h2 className="mb-4 text-[1.05rem]">Versions</h2>
          <QuoteVersions versions={versions} current={quote.reference} basePath="/admin/quotes" />
        </section>
      ) : null}

      <section className="max-w-3xl">
        <h2 className="mb-4 text-[1.05rem]">Questions from the customer</h2>
        <QuoteThread messages={quote.messages} />
        <div className="mt-5 rounded-[--radius-lg] border border-line bg-white p-5">
          <AdminForm
            action={replyOnQuote}
            submitLabel="Send reply"
            pendingLabel="Sending…"
            variant="outline"
            hidden={{ reference: quote.reference }}
            compact
          >
            <Field label="Reply" name="body" hint="The customer sees this on their copy of the quotation.">
              <Textarea name="body" rows={3} maxLength={4000} />
            </Field>
          </AdminForm>
        </div>
      </section>

      {isAdmin(staff) ? (
        <DangerZone config={DELETABLE.quotes} id={quote.id} reference={quote.reference} />
      ) : null}
    </div>
  );
}
