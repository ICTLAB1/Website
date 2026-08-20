import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotes" };

export default async function AdminQuotesPage() {
  await requireStaff();
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reference: true,
      status: true,
      createdAt: true,
      validUntil: true,
      currency: true,
      totalMinor: true,
      enquiry: { select: { reference: true, companyName: true } },
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Quotes</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Quotations raised against enquiries. Quotations are prepared by the sales team and
          recorded here so the customer can see them in their account.
        </p>
      </header>

      {quotes.length === 0 ? (
        <EmptyState
          title="No quotes recorded"
          description="Quotations appear here once they are raised against an enquiry."
          action={<ButtonLink href="/admin/enquiries">View enquiries</ButtonLink>}
        />
      ) : (
        <TableWrap>
          <Table className="min-w-[46rem]">
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Company</Th>
                <Th>Enquiry</Th>
                <Th>Lines</Th>
                <Th>Total</Th>
                <Th>Valid until</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <Tr key={quote.id}>
                  <Td className="font-mono text-[12px] font-medium text-navy-900">
                    {quote.reference}
                    <span className="mt-0.5 block text-[11px] font-normal text-ink-400">
                      {formatDate(quote.createdAt)}
                    </span>
                  </Td>
                  <Td>{quote.enquiry?.companyName ?? "—"}</Td>
                  <Td className="font-mono text-[12px]">{quote.enquiry?.reference ?? "—"}</Td>
                  <Td className="tabular-nums">{quote._count.items}</Td>
                  <Td className="tabular-nums font-medium text-navy-900">
                    {formatMoney(quote.totalMinor, quote.currency)}
                  </Td>
                  <Td>{formatDate(quote.validUntil)}</Td>
                  <Td>
                    <StatusBadge status={quote.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
