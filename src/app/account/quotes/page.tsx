import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { listUserQuotes } from "@/lib/queries/account";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotations" };

export default async function AccountQuotesPage() {
  const user = await requireUser("/account/quotes");
  const quotes = await listUserQuotes(user.id);

  if (quotes.length === 0) {
    return (
      <EmptyState
        title="No quotations yet"
        description="Quotations prepared against your enquiries appear here with their totals and validity dates."
        action={<ButtonLink href="/enquiry">Request a quotation</ButtonLink>}
      />
    );
  }

  return (
    <section>
      <h2 className="mb-2 text-[1.15rem]">Quotations</h2>
      <p className="mb-5 text-[14px] text-ink-600">
        Open a quotation to review its lines and accept or decline it.
      </p>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Reference</Th>
              <Th>Issued</Th>
              <Th>Valid until</Th>
              <Th>Lines</Th>
              <Th>Total (incl. GST)</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <Tr key={quote.reference}>
                <Td>
                  <Link
                    href={`/account/quotes/${quote.reference}`}
                    className="font-mono text-[13px] font-medium text-accent-700 hover:underline"
                  >
                    {quote.reference}
                  </Link>
                </Td>
                <Td>{formatDate(quote.createdAt)}</Td>
                <Td>{formatDate(quote.validUntil)}</Td>
                <Td className="tabular-nums">{quote._count.items}</Td>
                <Td className="tabular-nums font-medium text-graphite-900">
                  {formatMoney(quote.totalMinor, quote.currency)}
                </Td>
                <Td>
                  <StatusBadge status={quote.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}
