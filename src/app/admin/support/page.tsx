import type { Metadata } from "next";
import Link from "next/link";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { AdminForm } from "@/components/admin/admin-form";
import { Field, Select } from "@/components/ui/form";
import { updateSupportTicket } from "@/app/admin/quote-actions";
import { DangerZone } from "@/components/admin/danger-zone";
import { DELETABLE } from "@/lib/admin/deletable";
import { isAdmin, requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";
import { cn, formatDateTime, humanise } from "@/lib/utils";
import { DeletedNotice } from "@/components/admin/deleted-notice";

export const metadata: Metadata = { title: "Support" };

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

type PageProps = { searchParams: Promise<{ status?: string; deleted?: string }> };

/**
 * Inbound support and contact messages.
 *
 * Both the public contact form and the account support form write here, so this
 * is the authoritative queue. It matters most when SMTP is not configured:
 * notification email is best-effort, but nothing a customer sends is ever lost,
 * because it is stored before any mail is attempted.
 */
export default async function AdminSupportPage({ searchParams }: PageProps) {
  const mailReady = await isMailConfigured();
  const staff = await requireStaff();
  const params = await searchParams;
  const status = params.status && STATUSES.includes(params.status) ? params.status : undefined;

  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status: status as "OPEN" } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      reference: true,
      subject: true,
      category: true,
      message: true,
      status: true,
      priority: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
  });

  const openCount = await prisma.supportTicket.count({
    where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Support</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {openCount} open {openCount === 1 ? "ticket" : "tickets"}. Messages from the contact
          form and from customer accounts both arrive here.
        </p>
      </header>

      <DeletedNotice reference={params.deleted} noun="support ticket" />

      {!mailReady ? (
        <div className="rounded-[--radius-lg] border border-warning-600/40 bg-warning-50 p-5">
          <h2 className="text-[15px] font-semibold text-warning-700">
            Outbound email is not configured
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
            Notification emails are being logged rather than sent, so this queue is currently the
            only place inbound messages can be seen. Nothing is lost — every message is stored
            before any mail is attempted — but replies must be sent manually until SMTP is set.
          </p>
        </div>
      ) : null}

      <div className="scroll-x">
        <div className="flex min-w-max gap-1">
          <Link
            href="/admin/support"
            className={cn(
              "rounded-[--radius-md] px-3 py-2 text-[13px]",
              !status ? "bg-graphite-900 font-medium text-white" : "text-ink-600 hover:bg-white",
            )}
          >
            All
          </Link>
          {STATUSES.map((entry) => (
            <Link
              key={entry}
              href={`/admin/support?status=${entry}`}
              className={cn(
                "rounded-[--radius-md] px-3 py-2 text-[13px]",
                status === entry ? "bg-graphite-900 font-medium text-white" : "text-ink-600 hover:bg-white",
              )}
            >
              {humanise(entry)}
            </Link>
          ))}
        </div>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets"
          description="Messages from the contact form and from customer accounts appear here as they arrive."
        />
      ) : (
        <>
          <TableWrap>
            <Table className="min-w-[48rem]">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Subject</Th>
                  <Th>From</Th>
                  <Th>Category</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <Tr key={ticket.id}>
                    <Td className="font-mono text-[12px]">
                      {ticket.reference}
                      <span className="mt-0.5 block text-[11px] text-ink-500">
                        {formatDateTime(ticket.createdAt)}
                      </span>
                    </Td>
                    <Td className="font-medium text-graphite-900">{ticket.subject}</Td>
                    <Td className="text-[13px]">{ticket.user?.email ?? "Not signed in"}</Td>
                    <Td className="text-[13px]">{humanise(ticket.category)}</Td>
                    <Td>
                      <Badge
                        tone={
                          ticket.priority === "URGENT"
                            ? "danger"
                            : ticket.priority === "HIGH"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {humanise(ticket.priority)}
                      </Badge>
                    </Td>
                    <Td>
                      <StatusBadge status={ticket.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>

          <section className="grid gap-4 lg:grid-cols-2">
            {tickets.slice(0, 20).map((ticket) => (
              <details key={ticket.id} className="rounded-[--radius-lg] border border-line bg-white p-5">
                <summary className="cursor-pointer text-[14px] font-medium text-graphite-900">
                  {ticket.reference} — {ticket.subject}
                </summary>
                <div className="mt-4 space-y-5">
                  <p className="whitespace-pre-wrap rounded-[--radius-md] bg-surface-muted p-4 text-[13px] leading-relaxed text-ink-700">
                    {ticket.message}
                  </p>
                  <AdminForm
                    action={updateSupportTicket}
                    submitLabel="Update ticket"
                    pendingLabel="Updating…"
                    hidden={{ reference: ticket.reference }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Status" name="status" required>
                        <Select name="status" defaultValue={ticket.status}>
                          {STATUSES.map((entry) => (
                            <option key={entry} value={entry}>
                              {humanise(entry)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Priority" name="priority" required>
                        <Select name="priority" defaultValue={ticket.priority}>
                          {PRIORITIES.map((entry) => (
                            <option key={entry} value={entry}>
                              {humanise(entry)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  </AdminForm>

                  {isAdmin(staff) ? (
                    <DangerZone
                      config={DELETABLE.tickets}
                      id={ticket.id}
                      reference={ticket.reference}
                      className="rounded-[--radius-md] border border-danger-600/30 bg-danger-50/40 p-4"
                    />
                  ) : null}
                </div>
              </details>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
