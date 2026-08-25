import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import {
  addQuoteLine,
  issueQuote,
  removeQuoteLine,
  replyOnQuote,
  reviseQuotation,
  sendQuoteFollowUp,
  setQuoteFollowUpsPaused,
  updateQuoteLine,
  updateQuoteTerms,
} from "@/app/admin/quote-actions";
import { DangerZone } from "@/components/admin/danger-zone";
import { DELETABLE } from "@/lib/admin/deletable";
import { isAdmin, requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { quoteVersions } from "@/lib/quote-revision";
import {
  blockReason,
  dueStep,
  followUpBlock,
  getFollowUpSettings,
} from "@/lib/quotes/follow-ups";
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
      followUps: {
        orderBy: { sentAt: "desc" },
        select: {
          id: true,
          kind: true,
          step: true,
          toEmail: true,
          note: true,
          sentAt: true,
          delivered: true,
          sentBy: { select: { name: true } },
        },
      },
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

  /*
   * The catalogue, offered as type-ahead against the SKU field.
   *
   * A `<datalist>` rather than a `<select>`: the list filters as the person
   * types, which a native select does not do beyond its first letter, and a
   * SKU that is not on the list can still be typed — the action resolves it,
   * and says so plainly when it does not exist. That matters as the catalogue
   * grows past what is worth putting in one page.
   *
   * Bounded, and bounded honestly: past the cap the field still works, it
   * simply stops suggesting. Loading every variant into every quotation screen
   * is not a trade worth making for a list nobody scrolls.
   */
  const quotableVariants = isDraft
    ? await prisma.productVariant.findMany({
        where: { product: { status: "ACTIVE" } },
        orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
        take: 500,
        select: { sku: true, name: true, product: { select: { name: true } } },
      })
    : [];
  const versions = await quoteVersions(quote.rootId ?? quote.id);
  /*
   * Revising is offered on anything that has left the drafting stage and has
   * not been accepted. A draft is still editable in place — that is what a
   * draft is — and an accepted quotation is the agreement, so it is never
   * superseded by an edit.
   */
  const revisable = !isDraft && quote.status !== "ACCEPTED";

  /*
   * What the schedule would do with this quotation, right now.
   *
   * Computed with the same functions the scheduler uses rather than described
   * separately, so the panel cannot tell a salesperson the next chase goes out
   * on Thursday while the runner disagrees.
   */
  const followUpSettings = await getFollowUpSettings();
  const followUpState = {
    quote: {
      ...quote,
      status: quote.status as string,
      followUps: quote.followUps.map((row) => ({ step: row.step, sentAt: row.sentAt })),
      messages: quote.messages.filter((message) => !message.fromStaff).map((message) => ({
        createdAt: message.createdAt,
      })),
      owner: null,
    },
  };
  const manualBlock = followUpBlock(followUpState.quote, new Date());
  const automatic = dueStep(followUpState.quote, followUpSettings, new Date());

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/quotes" className="text-[13px] text-accent-700 hover:underline">
          &larr; Quotes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-mono text-2xl">{quote.documentNo ?? quote.reference}</h1>
          <span className="flex items-center gap-3">
            {/*
              A new tab, not a panel on this page.

              Embedding it would mean relaxing `frame-src` on the admin pages
              and the frame headers on the document route, to show a document
              in a box a fraction of its own size. A tab renders it at full
              width in the browser's own viewer, which is how somebody actually
              reads a two-page tax document before committing to it.
            */}
            <a
              href={`/account/quotes/${quote.reference}/pdf?inline=1`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-[--radius-md] border border-line-strong px-3.5 text-[13px] font-medium text-graphite-900 hover:border-graphite-400"
            >
              Preview PDF
            </a>
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
              <>
                {/*
                  Adding comes before editing, and is not folded away.

                  A quotation is drafted from what the customer asked for and
                  then grows — the licence they forgot, the migration service,
                  the freight. Making that the first thing on the screen matches
                  what the screen is for; hiding it behind a disclosure, next to
                  fifteen collapsed line editors, is how it went unnoticed.
                */}
                <section className="mt-6 rounded-[--radius-lg] border border-line-strong bg-surface-muted p-5">
                  <h3 className="text-[15px] font-semibold text-graphite-900">Add a line</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
                    Give a SKU and the catalogue fills in the rest. Leave it blank for a service,
                    a delivery charge or anything else with no catalogue entry — then the name and
                    price are yours to type.
                  </p>

                  <datalist id="catalogue-skus">
                    {quotableVariants.map((variant) => (
                      <option
                        key={variant.sku}
                        value={variant.sku}
                        label={`${variant.product.name} — ${variant.name}`}
                      />
                    ))}
                  </datalist>

                  <div className="mt-5">
                    <AdminForm
                      action={addQuoteLine}
                      submitLabel="Add line"
                      pendingLabel="Adding…"
                      hidden={{ reference: quote.reference }}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label="Catalogue SKU"
                          name="sku"
                          hint="Start typing a product or SKU. Blank adds a line of your own."
                        >
                          <Input
                            name="sku"
                            list="catalogue-skus"
                            maxLength={64}
                            autoComplete="off"
                            placeholder="MS-M365-BS-A1"
                          />
                        </Field>
                        <Field
                          label="Product name"
                          name="productName"
                          hint="Taken from the catalogue when you give a SKU. Required otherwise."
                        >
                          <Input name="productName" maxLength={200} />
                        </Field>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-4">
                        <Field label="Quantity" name="quantity" required>
                          <Input
                            name="quantity"
                            type="number"
                            min={1}
                            max={100000}
                            defaultValue={1}
                            required
                          />
                        </Field>
                        <Field
                          label="Unit price (₹)"
                          name="unitPrice"
                          hint="Blank takes today's catalogue price."
                        >
                          <Input name="unitPrice" inputMode="decimal" />
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
                            defaultValue="0"
                          />
                        </Field>
                        <Field
                          label="GST (%)"
                          name="gstRatePercent"
                          hint="Blank uses the catalogue rate, or 18% on a line of your own."
                        >
                          <Input name="gstRatePercent" type="number" min={0} max={100} />
                        </Field>
                      </div>

                      <details className="rounded-[--radius-md] border border-line bg-white p-4">
                        <summary className="cursor-pointer text-[13px] font-medium text-graphite-900">
                          Description, brand, HSN and unit
                        </summary>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Field
                            label="Description"
                            name="description"
                            hint="The sentence printed beside the name on the PDF."
                          >
                            <Input name="description" maxLength={300} />
                          </Field>
                          <Field label="Brand" name="brandName">
                            <Input name="brandName" maxLength={80} />
                          </Field>
                          <Field
                            label="HSN / SAC code"
                            name="hsnCode"
                            hint="Digits only. Left blank it prints a dash, never a guess."
                          >
                            <Input name="hsnCode" inputMode="numeric" maxLength={12} />
                          </Field>
                          <Field
                            label="Unit"
                            name="unitLabel"
                            hint="What the quantity counts: Users, Nos, Nodes, Project."
                          >
                            <Input name="unitLabel" maxLength={24} />
                          </Field>
                        </div>
                      </details>
                    </AdminForm>
                  </div>
                </section>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {quote.items.map((item) => (
                  <details
                    key={item.id}
                    className="rounded-[--radius-lg] border border-line bg-white p-5"
                  >
                    <summary className="cursor-pointer text-[14px] font-medium text-graphite-900">
                      {/*
                        A line added by hand has no SKU, and the em dash that
                        stands in for one on the printed document makes every
                        such line look identical here. Those are named instead.
                      */}
                      Edit {item.sku === "—" ? item.productName : item.sku}
                    </summary>
                    <div className="mt-5 space-y-5">
                      <AdminForm
                        action={updateQuoteLine}
                        submitLabel="Update line"
                        pendingLabel="Updating…"
                        hidden={{ itemId: item.id }}
                      >
                        {/*
                          First, and full width. It is the line — everything
                          below qualifies it — and it is what the customer reads
                          first on the printed quotation.

                          Editing it changes this quotation only. The line holds
                          its own copy of the name precisely so that the
                          catalogue and a document already sent to a customer can
                          never contradict each other.
                        */}
                        <Field
                          label="Product name"
                          name="productName"
                          hint="As printed on the quotation. Editing it here does not rename the catalogue product."
                          required
                        >
                          <Input
                            name="productName"
                            maxLength={200}
                            defaultValue={item.productName}
                            required
                          />
                        </Field>

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
              </>
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
              {/*
                The preview is repeated here, above the button that cannot be
                undone. It is the same link as the one in the header, and that
                duplication is the point: this is the moment somebody wants to
                check the document, and making them scroll back up to find it is
                how a quotation goes out unread.

                It opens the same route the customer's copy is built from, so
                what is checked here is the document itself rather than a
                rendering of it.
              */}
              <a
                href={`/account/quotes/${quote.reference}/pdf?inline=1`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-9 items-center rounded-[--radius-md] border border-graphite-400 bg-white px-3.5 text-[13px] font-medium text-graphite-900 hover:border-graphite-900"
              >
                Preview the PDF first
              </a>
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

      {/*
        Chasing, and what the schedule intends to do next.

        Shown on anything that has been sent — including a quotation that has
        been answered or has expired, because the record of what was sent to a
        customer does not stop being worth reading once the deal closed.
      */}
      {!isDraft ? (
        <section className="max-w-3xl">
          <h2 className="mb-4 text-[1.05rem]">Follow-ups</h2>

          <div className="rounded-[--radius-lg] border border-line bg-white p-5">
            <p className="text-meta text-ink-600">
              {!followUpSettings.enabled
                ? "Automatic follow-ups are switched off for the whole site. You can still send one by hand."
                : "blocked" in automatic
                  ? blockReason(automatic.blocked)
                  : `Follow-up ${automatic.step} of ${followUpSettings.schedule.length} is due and will go out on the next scheduled run.`}
            </p>

            {quote.followUps.length > 0 ? (
              <ul className="mt-4 space-y-3 border-t border-line pt-4">
                {quote.followUps.map((row) => (
                  <li key={row.id} className="text-meta">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-graphite-900">
                        {row.kind === "AUTOMATIC" ? `Automatic — step ${row.step}` : "Sent by hand"}
                      </span>
                      <span className="text-ink-500">
                        {formatDate(row.sentAt)} to {row.toEmail}
                        {row.sentBy ? ` · ${row.sentBy.name}` : ""}
                      </span>
                      {/*
                        Only the failure is called out. "Delivered" here means
                        the mail server accepted it, which is not the same as
                        the customer reading it, and a green tick claiming
                        otherwise would be read as more than it is.
                      */}
                      {row.delivered ? null : (
                        <span className="text-accent-700">not accepted by the mail server</span>
                      )}
                    </div>
                    {row.note ? (
                      <p className="mt-1 border-l-2 border-line pl-3 text-ink-600">{row.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-meta text-ink-500">Nothing has been sent yet.</p>
            )}

            {manualBlock === null ? (
              <div className="mt-5 border-t border-line pt-5">
                <AdminForm
                  action={sendQuoteFollowUp}
                  submitLabel="Send a follow-up now"
                  pendingLabel="Sending…"
                  variant="outline"
                  hidden={{ reference: quote.reference }}
                  compact
                >
                  <Field
                    label="Add a line of your own"
                    name="note"
                    hint="Printed at the top of the message, above the standard wording. Leave it empty to send the standard note."
                  >
                    <Textarea name="note" rows={2} maxLength={800} />
                  </Field>
                </AdminForm>

                <div className="mt-4 border-t border-line pt-4">
                  <AdminForm
                    action={setQuoteFollowUpsPaused}
                    submitLabel={
                      quote.followUpsPausedAt ? "Resume automatic follow-ups" : "Pause automatic follow-ups"
                    }
                    pendingLabel="Saving…"
                    variant="outline"
                    hidden={{
                      reference: quote.reference,
                      paused: quote.followUpsPausedAt ? "no" : "yes",
                    }}
                    compact
                  />
                  {quote.followUpsPausedAt ? (
                    <p className="mt-2 text-label text-ink-500">
                      Paused on {formatDate(quote.followUpsPausedAt)}. Sending one by hand still works.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 border-t border-line pt-4 text-meta text-ink-500">
                {blockReason(manualBlock)}
              </p>
            )}
          </div>
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
