import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AccountForm } from "@/components/account/account-form";
import { Field, Input } from "@/components/ui/form";
import { decideQuote } from "@/app/account/actions";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { isQuoteExpired, priceLine } from "@/lib/pricing";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotation" };

type PageProps = { params: Promise<{ reference: string }> };

export default async function AccountQuoteDetailPage({ params }: PageProps) {
  const { reference } = await params;
  const user = await requireUser(`/account/quotes/${reference}`);

  /**
   * Scoped by userId, so another organisation's quotation returns nothing and
   * renders the same 404 as one that does not exist.
   *
   * A DRAFT quotation is excluded too: an unsent draft is internal working
   * material and must not be visible to the customer it concerns.
   */
  const quote = await prisma.quote.findFirst({
    where: { reference, userId: user.id, status: { not: "DRAFT" } },
    select: {
      reference: true,
      status: true,
      createdAt: true,
      sentAt: true,
      validUntil: true,
      notes: true,
      currency: true,
      subtotalMinor: true,
      discountMinor: true,
      taxMinor: true,
      totalMinor: true,
      enquiry: { select: { reference: true } },
      orders: { select: { reference: true, status: true } },
      items: {
        orderBy: { productName: "asc" },
        select: {
          id: true,
          productName: true,
          sku: true,
          quantity: true,
          unitPriceMinor: true,
          discountMinor: true,
          gstRatePercent: true,
          lineTotalMinor: true,
        },
      },
    },
  });
  if (!quote) notFound();

  const expired = isQuoteExpired(quote.validUntil);
  const decidable = quote.status === "SENT" && !expired;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/account/quotes" className="text-[13px] text-accent-700 hover:underline">
          &larr; All quotations
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-[1.35rem] text-graphite-900">{quote.reference}</h2>
          <StatusBadge status={expired && quote.status === "SENT" ? "EXPIRED" : quote.status} />
        </div>
        <p className="mt-1.5 text-[13px] text-ink-500">
          Issued {formatDate(quote.sentAt ?? quote.createdAt)}
          {quote.validUntil ? ` · valid until ${formatDate(quote.validUntil)}` : ""}
          {quote.enquiry ? ` · from enquiry ${quote.enquiry.reference}` : ""}
        </p>
      </div>

      <section>
        <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">Quoted items</h3>
        <TableWrap>
          <Table className="min-w-[38rem]">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Qty</Th>
                <Th>Unit price</Th>
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

        <dl className="mt-5 ml-auto max-w-xs space-y-2 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(quote.subtotalMinor, quote.currency)}</dd>
          </div>
          {quote.discountMinor > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Discount</dt>
              <dd className="tabular-nums text-success-700">
                − {formatMoney(quote.discountMinor, quote.currency)}
              </dd>
            </div>
          ) : null}
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

      {quote.notes ? (
        <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
          <h3 className="text-[15px] font-semibold text-graphite-900">Notes on this quotation</h3>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-700">
            {quote.notes}
          </p>
        </section>
      ) : null}

      {quote.orders.length > 0 ? (
        <section className="rounded-[--radius-lg] border border-success-600/30 bg-success-50 p-5">
          <h3 className="text-[15px] font-semibold text-success-700">Order raised</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
            This quotation has been accepted and order{" "}
            <Link href="/account/orders" className="font-mono text-accent-700 underline underline-offset-2">
              {quote.orders[0]!.reference}
            </Link>{" "}
            was raised against it.
          </p>
        </section>
      ) : decidable ? (
        <section className="max-w-xl rounded-[--radius-lg] border border-line bg-white p-5">
          <h3 className="text-[15px] font-semibold text-graphite-900">Respond to this quotation</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            Accepting raises an order against these prices. No payment is taken here — we invoice
            against your purchase order and confirm provisioning separately.
          </p>

          <div className="mt-5 space-y-6">
            <AccountForm action={decideQuote} submitLabel="Accept quotation" pendingLabel="Accepting…">
              <input type="hidden" name="reference" value={quote.reference} />
              <input type="hidden" name="decision" value="ACCEPTED" />
              <Field
                label="Your purchase order number"
                name="poNumber"
                hint="Optional. Recorded on the order and printed on the invoice."
              >
                <Input name="poNumber" maxLength={64} />
              </Field>
            </AccountForm>

            <div className="border-t border-line pt-5">
              <p className="mb-3 text-[13px] text-ink-600">
                Not proceeding? Letting us know stops the follow-ups.
              </p>
              <AccountForm
                action={decideQuote}
                submitLabel="Decline quotation"
                pendingLabel="Recording…"
              >
                <input type="hidden" name="reference" value={quote.reference} />
                <input type="hidden" name="decision" value="DECLINED" />
              </AccountForm>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
          <h3 className="text-[15px] font-semibold text-graphite-900">
            {expired ? "This quotation has expired" : "No action available"}
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            {expired
              ? "Prices move, so quotations carry a validity period. Ask us to re-price it and we will issue a fresh quotation."
              : "This quotation has already been responded to."}
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-block text-[13px] font-medium text-accent-700 underline underline-offset-2"
          >
            Request a new quotation
          </Link>
        </section>
      )}
    </div>
  );
}
