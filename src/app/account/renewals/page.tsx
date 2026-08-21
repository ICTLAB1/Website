import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { listUserRenewals } from "@/lib/queries/account";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Renewals" };

export default async function AccountRenewalsPage() {
  const user = await requireUser("/account/renewals");
  const renewals = await listUserRenewals(user.id);

  if (renewals.length === 0) {
    return (
      <EmptyState
        title="No renewals scheduled"
        description="Upcoming renewal dates appear here with a review window ahead of each one, so nothing renews at last year's count by default."
        action={<ButtonLink href="/services/licence-management">Licence management</ButtonLink>}
      />
    );
  }

  return (
    <section>
      <h2 className="mb-5 text-[1.15rem]">Renewals</h2>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Due</Th>
              <Th>Seats</Th>
              <Th>Quoted</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {renewals.map((renewal) => (
              <Tr key={renewal.reference}>
                <Td className="font-medium text-graphite-900">{renewal.licence.productName}</Td>
                <Td className="font-mono text-[12px]">{renewal.licence.sku}</Td>
                <Td>{formatDate(renewal.dueAt)}</Td>
                <Td className="tabular-nums">{renewal.seats}</Td>
                <Td className="tabular-nums">
                  {renewal.quotedMinor != null ? formatMoney(renewal.quotedMinor) : "—"}
                </Td>
                <Td>
                  <StatusBadge status={renewal.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}
