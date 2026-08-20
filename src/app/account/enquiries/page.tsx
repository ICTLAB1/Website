import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { listUserEnquiries } from "@/lib/queries/account";
import { formatDate, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiries" };

export default async function AccountEnquiriesPage() {
  const user = await requireUser("/account/enquiries");
  const enquiries = await listUserEnquiries(user.id);

  if (enquiries.length === 0) {
    return (
      <EmptyState
        title="No enquiries yet"
        description="Enquiries you submit while signed in appear here, with their reference and current status."
        action={<ButtonLink href="/products">Browse catalogue</ButtonLink>}
      />
    );
  }

  return (
    <section>
      <h2 className="mb-5 text-[1.15rem]">Enquiries</h2>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Reference</Th>
              <Th>Submitted</Th>
              <Th>Items</Th>
              <Th>Timeline</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((enquiry) => (
              <Tr key={enquiry.reference}>
                <Td>
                  <Link
                    href={`/account/enquiries/${enquiry.reference}`}
                    className="font-mono text-[13px] font-medium text-accent-700 hover:underline"
                  >
                    {enquiry.reference}
                  </Link>
                </Td>
                <Td>{formatDate(enquiry.createdAt)}</Td>
                <Td className="tabular-nums">{enquiry._count.items}</Td>
                <Td>{humanise(enquiry.timeline)}</Td>
                <Td>
                  <StatusBadge status={enquiry.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}
