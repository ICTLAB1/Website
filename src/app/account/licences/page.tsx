import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { listUserLicences } from "@/lib/queries/account";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Licences" };

export default async function AccountLicencesPage() {
  const user = await requireUser("/account/licences");
  const licences = await listUserLicences(user);

  if (licences.length === 0) {
    return (
      <EmptyState
        title="No licences recorded"
        description="Licences supplied through us appear here with their seat counts and expiry dates, so your position is visible in one place rather than across several publisher portals."
        action={<ButtonLink href="/services/software-asset-management">Software asset management</ButtonLink>}
      />
    );
  }

  return (
    <section>
      <h2 className="mb-5 text-[1.15rem]">Licences</h2>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Seats</Th>
              <Th>Start</Th>
              <Th>Expires</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {licences.map((licence) => (
              <Tr key={licence.reference}>
                <Td className="font-medium text-graphite-900">{licence.productName}</Td>
                <Td className="font-mono text-[12px]">{licence.sku}</Td>
                <Td className="tabular-nums">{licence.seats}</Td>
                <Td>{formatDate(licence.startsAt)}</Td>
                <Td>{formatDate(licence.expiresAt)}</Td>
                <Td>
                  <StatusBadge status={licence.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}
