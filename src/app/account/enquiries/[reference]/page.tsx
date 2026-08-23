import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { RequirementSummary } from "@/components/enquiry/requirement-summary";
import { RFQ_STATUS_LABELS } from "@/lib/rfq";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { getUserEnquiry } from "@/lib/queries/account";
import { formatMoney } from "@/lib/money";
import { formatDate, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiry detail" };

type PageProps = { params: Promise<{ reference: string }> };

export default async function AccountEnquiryDetailPage({ params }: PageProps) {
  const { reference } = await params;
  const user = await requireUser(`/account/enquiries/${reference}`);

  /**
   * The lookup is scoped to this user, so a reference belonging to someone else
   * returns nothing and renders the same 404 as a reference that does not
   * exist. There is no fetch-then-compare step that could be forgotten.
   */
  const enquiry = await getUserEnquiry(user, reference);
  if (!enquiry) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/account/enquiries" className="text-[13px] text-accent-700 hover:underline">
          &larr; All enquiries
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-[1.35rem] text-graphite-900">{enquiry.reference}</h2>
          <span className="flex items-center gap-2">
            <StatusBadge status={enquiry.status} />
            <span className="text-[13px] text-ink-600">{RFQ_STATUS_LABELS[enquiry.status]}</span>
          </span>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-500">
          Submitted {formatDate(enquiry.createdAt)}
        </p>
      </div>

      {enquiry.requirement ? (
        <section>
          <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">
            {enquiry.kind === "BOQ" ? "What you uploaded" : "What you asked for"}
          </h3>
          <RequirementSummary value={enquiry.requirement} />
        </section>
      ) : null}

      <section className={enquiry.items.length === 0 ? "hidden" : undefined}>
        <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">Products requested</h3>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Quantity</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {enquiry.items.map((item) => (
                <Tr key={item.sku}>
                  <Td className="font-medium text-graphite-900">{item.productName}</Td>
                  <Td className="font-mono text-[12px]">{item.sku}</Td>
                  <Td className="tabular-nums">{item.quantity}</Td>
                  <Td className="text-[13px] text-ink-500">{item.note ?? "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-[--radius-lg] border border-line bg-white p-5">
          <h3 className="text-[15px] font-semibold text-graphite-900">Contact provided</h3>
          <dl className="mt-4 space-y-2.5 text-[13px]">
            {[
              ["Company", enquiry.companyName],
              ["Contact", enquiry.contactName],
              ["Email", enquiry.contactEmail],
              ["Phone", enquiry.contactPhone],
              ["Location", [enquiry.city, enquiry.country].filter(Boolean).join(", ")],
              ["Users", enquiry.userCount ? String(enquiry.userCount) : "—"],
              ["Timeline", humanise(enquiry.timeline)],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <dt className="w-24 shrink-0 text-ink-500">{label}</dt>
                <dd className="min-w-0 break-words text-ink-700">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-[--radius-lg] border border-line bg-white p-5">
          <h3 className="text-[15px] font-semibold text-graphite-900">Requirements</h3>
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-600">
            {enquiry.requirements || "No additional requirements were provided."}
          </p>
        </div>
      </section>

      {enquiry.quotes.length > 0 ? (
        <section>
          <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">Quotations</h3>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Valid until</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {enquiry.quotes.map((quote) => (
                  <Tr key={quote.reference}>
                    <Td>
                      <Link
                        href={`/account/quotes/${quote.reference}`}
                        className="font-mono text-[13px] text-accent-700 hover:underline"
                      >
                        {quote.reference}
                      </Link>
                    </Td>
                    <Td>{formatDate(quote.validUntil)}</Td>
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
      ) : (
        <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
          <h3 className="text-[15px] font-semibold text-graphite-900">Quotation pending</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            Our team is preparing your quotation. It will appear here and be sent to the email
            address on the enquiry.
          </p>
          <ButtonLink href="/contact" variant="outline" size="sm" className="mt-4">
            Chase this enquiry
          </ButtonLink>
        </section>
      )}
    </div>
  );
}
