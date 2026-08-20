import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AdminForm } from "@/components/admin/admin-form";
import { Field, Select, Textarea } from "@/components/ui/form";
import { updateEnquiry } from "@/app/admin/actions";
import { requireStaff } from "@/lib/auth/guards";
import { getAdminEnquiry } from "@/lib/queries/admin";
import { formatMoney } from "@/lib/money";
import { formatDateTime, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiry" };

const STATUSES = ["NEW", "IN_REVIEW", "QUOTED", "WON", "LOST", "CLOSED"];

type PageProps = { params: Promise<{ reference: string }> };

export default async function AdminEnquiryDetailPage({ params }: PageProps) {
  await requireStaff();
  const { reference } = await params;

  const enquiry = await getAdminEnquiry(reference);
  if (!enquiry) notFound();

  // Indicative value from current catalogue prices; the actual quotation is
  // prepared separately and may differ.
  const indicativeMinor = enquiry.items.reduce(
    (sum, item) => sum + (item.variant?.listPriceMinor ?? 0) * item.quantity,
    0,
  );

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/enquiries" className="text-[13px] text-accent-700 hover:underline">
          &larr; Enquiries
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-mono text-2xl">{enquiry.reference}</h1>
          <StatusBadge status={enquiry.status} />
        </div>
        <p className="mt-1.5 text-[13px] text-ink-500">
          Received {formatDateTime(enquiry.createdAt)}
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-[1.05rem]">Requested products</h2>
            <TableWrap>
              <Table className="min-w-[38rem]">
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>SKU</Th>
                    <Th>Qty</Th>
                    <Th>Current list</Th>
                    <Th>Line (indicative)</Th>
                  </tr>
                </thead>
                <tbody>
                  {enquiry.items.map((item) => (
                    <Tr key={item.id}>
                      <Td className="font-medium text-navy-900">
                        {item.productName}
                        {item.note ? (
                          <span className="mt-1 block text-[12px] font-normal text-ink-500">
                            Note: {item.note}
                          </span>
                        ) : null}
                      </Td>
                      <Td className="font-mono text-[12px]">{item.sku}</Td>
                      <Td className="tabular-nums">{item.quantity}</Td>
                      <Td className="tabular-nums">
                        {item.variant && item.variant.listPriceMinor > 0
                          ? formatMoney(item.variant.listPriceMinor, item.variant.currency)
                          : "On quote"}
                      </Td>
                      <Td className="tabular-nums font-medium text-navy-900">
                        {item.variant && item.variant.listPriceMinor > 0
                          ? formatMoney(item.variant.listPriceMinor * item.quantity, item.variant.currency)
                          : "—"}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <p className="mt-3 text-[13px] text-ink-600">
              Indicative total at current list prices:{" "}
              <strong className="font-semibold text-navy-900">
                {indicativeMinor > 0 ? formatMoney(indicativeMinor) : "—"}
              </strong>{" "}
              <span className="text-ink-400">excl. GST</span>
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[1.05rem]">Requirements</h2>
            <div className="rounded-[--radius-lg] border border-line bg-white p-5">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-700">
                {enquiry.requirements || "No additional requirements were provided."}
              </p>
            </div>
          </section>

          {enquiry.quotes.length > 0 ? (
            <section>
              <h2 className="mb-4 text-[1.05rem]">Quotations</h2>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Reference</Th>
                      <Th>Total</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiry.quotes.map((quote) => (
                      <Tr key={quote.reference}>
                        <Td className="font-mono text-[12px]">{quote.reference}</Td>
                        <Td className="tabular-nums">{formatMoney(quote.totalMinor, quote.currency)}</Td>
                        <Td>
                          <StatusBadge status={quote.status} />
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
            <h2 className="text-[15px] font-semibold text-navy-900">Contact</h2>
            <dl className="mt-4 space-y-2.5 text-[13px]">
              {[
                ["Company", enquiry.companyName],
                ["Contact", enquiry.contactName],
                ["Email", enquiry.contactEmail],
                ["Phone", enquiry.contactPhone],
                ["GSTIN", enquiry.gstin ?? "—"],
                ["Location", [enquiry.city, enquiry.country].filter(Boolean).join(", ")],
                ["Users", enquiry.userCount ? String(enquiry.userCount) : "—"],
                ["Timeline", humanise(enquiry.timeline)],
                ["Account", enquiry.user ? enquiry.user.email : "Not signed in"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-20 shrink-0 text-ink-400">{label}</dt>
                  <dd className="min-w-0 break-words text-ink-700">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <a
                href={`mailto:${enquiry.contactEmail}?subject=${encodeURIComponent(`Your enquiry ${enquiry.reference}`)}`}
                className="inline-flex h-9 items-center rounded-[--radius-md] border border-line-strong px-3 text-[13px] font-medium text-navy-900 hover:bg-navy-50"
              >
                Reply by email
              </a>
            </div>
          </section>

          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-navy-900">Update</h2>
            <AdminForm
              action={updateEnquiry}
              submitLabel="Save"
              pendingLabel="Saving…"
              hidden={{ reference: enquiry.reference }}
            >
              <Field name="status" label="Status" required>
<Select name="status" defaultValue={enquiry.status}>
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {humanise(status)}
                          </option>
                        ))}
                      </Select>
</Field>
                  <Field name="internalNotes"
                    label="Internal notes"
                    hint="Visible to staff only. Never shown to the customer."
                  >
<Textarea
                        name="internalNotes"
                        rows={6}
                        maxLength={6000}
                        defaultValue={enquiry.internalNotes ?? ""}
                      />
</Field>
            </AdminForm>
          </section>
        </aside>
      </div>
    </div>
  );
}
