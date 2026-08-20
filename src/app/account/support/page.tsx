import type { Metadata } from "next";

import { AccountForm } from "@/components/account/account-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { createSupportTicket } from "@/app/account/actions";
import { requireUser } from "@/lib/auth/guards";
import { listUserTickets } from "@/lib/queries/account";
import { formatDate, humanise } from "@/lib/utils";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "Support" };

const CATEGORIES = [
  { value: "LICENSING", label: "Licensing question" },
  { value: "BILLING", label: "Billing or invoice" },
  { value: "TECHNICAL", label: "Technical issue" },
  { value: "RENEWAL", label: "Renewal" },
  { value: "OTHER", label: "Something else" },
];

export default async function AccountSupportPage() {
  const user = await requireUser("/account/support");
  const tickets = await listUserTickets(user.id);
  const config = getSiteConfig();

  return (
    <div className="space-y-10">
      <section className="max-w-2xl">
        <h2 className="text-[1.15rem]">Raise a support ticket</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
          We respond to the email address on your account. For anything urgent, contact us
          directly
          {config.phone.support ? (
            <>
              {" on "}
              <a href={`tel:${config.phone.support.replace(/\s/g, "")}`} className="font-medium text-accent-700 hover:underline">
                {config.phone.support}
              </a>
            </>
          ) : null}
          .
        </p>

        <div className="mt-6">
          <AccountForm action={createSupportTicket} submitLabel="Raise ticket" pendingLabel="Submitting…">
            <Field name="subject" label="Subject" required>
<Input name="subject" required maxLength={160} />
</Field>
                <Field name="category" label="Category" required>
<Select name="category" defaultValue="LICENSING" required>
                      {CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </Select>
</Field>
                <Field name="message"
                  label="Describe the issue"
                  required
                  hint="Include any reference numbers, error messages and what you have already tried."
                >
<Textarea name="message" rows={6} maxLength={4000} required />
</Field>
          </AccountForm>
        </div>
      </section>

      {tickets.length > 0 ? (
        <section>
          <h2 className="mb-5 text-[1.15rem]">Your tickets</h2>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Subject</Th>
                  <Th>Category</Th>
                  <Th>Raised</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <Tr key={ticket.reference}>
                    <Td className="font-mono text-[12px]">{ticket.reference}</Td>
                    <Td className="font-medium text-navy-900">{ticket.subject}</Td>
                    <Td>{humanise(ticket.category)}</Td>
                    <Td>{formatDate(ticket.createdAt)}</Td>
                    <Td>
                      <StatusBadge status={ticket.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </section>
      ) : null}
    </div>
  );
}
