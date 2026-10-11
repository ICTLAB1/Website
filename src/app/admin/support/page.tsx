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
import { isMailConfigured, salesInbox } from "@/lib/mail";
import { cn, formatDateTime, humanise } from "@/lib/utils";
import { DeletedNotice } from "@/components/admin/deleted-notice";

export const metadata: Metadata = { title: "Support" };

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

/**
 * The four topics the public contact form offers, which are also what a
 * message gets filed under here.
 *
 * Two of them are not support at all. A visitor who picks "Sales" or
 * "Enterprise" is a lead, and until now they landed in the same undivided list
 * as a customer reporting a broken licence — so a sales enquiry was something
 * you found by reading past the support queue, if you found it. The store is
 * right: one place for every inbound message means nothing is lost when email
 * is not configured. What was wrong is that this page never let anyone look at
 * one kind without the other.
 */
const CATEGORIES = ["SALES", "ENTERPRISE", "SUPPORT", "GENERAL"];

/** The two that are a lead rather than a support request. */
const LEAD_CATEGORIES = ["SALES", "ENTERPRISE"];

type PageProps = { searchParams: Promise<{ status?: string; category?: string; deleted?: string }> };

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
  const notifyTo = await salesInbox();
  const staff = await requireStaff();
  const params = await searchParams;
  const status = params.status && STATUSES.includes(params.status) ? params.status : undefined;
  const category =
    params.category && CATEGORIES.includes(params.category) ? params.category : undefined;

  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(status ? { status: status as "OPEN" } : {}),
      ...(category ? { category } : {}),
    },
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

  /*
   * Counted separately rather than filtered out of `openCount`, because the
   * two numbers answer different questions: one is "how much support is
   * outstanding", the other is "how many people asked to buy something and
   * have not been called back". Conflating them is how a lead waits a week.
   */
  const openLeads = await prisma.supportTicket.count({
    where: { status: { notIn: ["RESOLVED", "CLOSED"] }, category: { in: LEAD_CATEGORIES } },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Support</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {openCount} open {openCount === 1 ? "ticket" : "tickets"}
          {openLeads > 0 ? (
            <>
              {", of which "}
              <Link
                href="/admin/support?category=SALES"
                className="font-medium text-accent-700 hover:underline"
              >
                {openLeads} {openLeads === 1 ? "is a sales or enterprise enquiry" : "are sales or enterprise enquiries"}
              </Link>
            </>
          ) : null}
          . Messages from the contact form and from customer accounts both arrive here.
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

      {/*
        The second way staff hear nothing, and the one that leaves no trace.

        A working SMTP server with no address to notify is not a broken
        transport — every send succeeds, because none is attempted. The guard
        in the contact route and the enquiry service is `if (internal)`, so an
        address to notify means the staff copy is skipped silently while the
        customer's own acknowledgement still goes out. From the outside that is
        indistinguishable from working email, which is why it needs saying on
        the page somebody opens when they think mail is broken.

        Rarer than it was: with no notification address set, `salesInbox()` now
        falls back to the sales address the contact page publishes, so this
        only appears when the business has published no sales address either.
        That is why the fix offered below names both places.
      */}
      {mailReady && !notifyTo ? (
        <div className="rounded-[--radius-lg] border border-warning-600/40 bg-warning-50 p-5">
          <h2 className="text-[15px] font-semibold text-warning-700">
            Nobody is being notified of new messages
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
            Email is working — customers receive their acknowledgement — but there is no address
            to notify, so the copy that tells your team a message arrived is not sent to anyone.
            Set one under{" "}
            <Link href="/admin/settings" className="font-medium text-accent-700 hover:underline">
              Settings → Email
            </Link>
            , or fill in the sales address under{" "}
            <Link href="/admin/settings" className="font-medium text-accent-700 hover:underline">
              Settings → Contact
            </Link>{" "}
            and copies go there instead. Until then this queue is the only place a new enquiry
            appears.
          </p>
        </div>
      ) : null}

      <div className="scroll-x">
        <div className="flex min-w-max gap-1">
          <Link
            href={category ? `/admin/support?category=${category}` : "/admin/support"}
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
              href={`/admin/support?status=${entry}${category ? `&category=${category}` : ""}`}
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

      {/*
        The second row, and the one this page was missing.

        Separate from the status filter rather than folded into it: status and
        topic are independent questions — "what is still open" and "is this a
        lead or a fault" — and a single row of chips mixing them would make
        the two look like alternatives when they are meant to combine.
      */}
      <div className="flex flex-wrap items-center gap-1 rounded-[--radius-lg] bg-surface-muted p-1">
        <span className="px-2 text-[12px] uppercase tracking-wide text-ink-500">Topic</span>
        <Link
          href={status ? `/admin/support?status=${status}` : "/admin/support"}
          className={cn(
            "rounded-[--radius-md] px-3 py-2 text-[13px]",
            !category ? "bg-graphite-900 font-medium text-white" : "text-ink-600 hover:bg-white",
          )}
        >
          All
        </Link>
        {CATEGORIES.map((entry) => (
          <Link
            key={entry}
            href={`/admin/support?category=${entry}${status ? `&status=${status}` : ""}`}
            className={cn(
              "rounded-[--radius-md] px-3 py-2 text-[13px]",
              category === entry ? "bg-graphite-900 font-medium text-white" : "text-ink-600 hover:bg-white",
            )}
          >
            {humanise(entry)}
          </Link>
        ))}
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
                    <Td className="font-medium text-graphite-900">
                      <Link
                        href={`/admin/support/${ticket.reference}`}
                        className="underline underline-offset-2 hover:text-accent-700"
                      >
                        {ticket.subject}
                      </Link>
                    </Td>
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
