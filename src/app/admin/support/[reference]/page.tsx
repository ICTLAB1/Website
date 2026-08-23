import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DocumentList } from "@/components/documents/document-list";
import { TicketThread } from "@/components/portal/ticket-thread";
import { replyToTicket } from "@/app/admin/service-actions";
import { requireStaff } from "@/lib/auth/guards";
import { can } from "@/lib/auth/capabilities";
import { firstReplyHours, getTicketForStaff, ticketIsClosed } from "@/lib/ticket-service";
import { TICKET_STATUSES } from "@/lib/support";
import { formatDateTime, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Support ticket" };

type PageProps = { params: Promise<{ reference: string }> };

/**
 * One ticket, from our side.
 *
 * The same thread the customer sees, in the same order, because two accounts of
 * one conversation is how a support desk loses an argument it should have won.
 *
 * The response-time line is stated from `firstReplyAt` and says "not yet"
 * rather than zero while nobody has answered — a queue that reports an
 * unanswered ticket as instant is a queue nobody should trust.
 */
export default async function AdminTicketPage({ params }: PageProps) {
  const staff = await requireStaff();
  const { reference } = await params;

  const ticket = await getTicketForStaff(reference);
  if (!ticket) notFound();

  const mayReply = can(staff, "support.write");
  const hours = firstReplyHours(ticket);
  const closed = ticketIsClosed(ticket.status);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/support" className="text-[13px] text-accent-700 hover:underline">
          &larr; Support
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl">{ticket.subject}</h1>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={ticket.status} />
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
          </div>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-600">
          <span className="font-mono">{ticket.reference}</span> · {humanise(ticket.category)} ·
          raised {formatDateTime(ticket.createdAt)}
          {ticket.company ? ` · ${ticket.company.name}` : ""}
        </p>
        <p className="mt-1 text-[13px] text-ink-500">
          {hours == null
            ? "Not yet answered."
            : `First answered after ${hours} ${hours === 1 ? "hour" : "hours"}.`}
          {ticket.resolvedAt ? ` Resolved ${formatDateTime(ticket.resolvedAt)}.` : ""}
        </p>

        {ticket.device ? (
          <p className="mt-3 rounded-[--radius-md] border border-line bg-white px-4 py-3 text-[13px] text-ink-700">
            About {ticket.device.brandName} {ticket.device.model}
            {ticket.device.serial ? ` · serial ${ticket.device.serial}` : " · serial not recorded"} ·{" "}
            <span className="font-mono">{ticket.device.reference}</span>
          </p>
        ) : null}
      </header>

      <section className="max-w-3xl">
        <h2 className="mb-4 text-[1.05rem]">Conversation</h2>
        <TicketThread
          opening={{
            body: ticket.message,
            createdAt: ticket.createdAt,
            author: ticket.user?.name ?? null,
          }}
          messages={ticket.messages}
          customerHeading="From the customer"
        />
      </section>

      {mayReply ? (
        <section className="max-w-3xl rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-[1.05rem]">Reply</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            Goes on the ticket and to the customer by email. Setting the status to
            &ldquo;waiting on you&rdquo; is what tells them the ball is in their court.
            {closed
              ? " This ticket is finished; replying will not reopen it unless you change the status too."
              : ""}
          </p>
          <div className="mt-5">
            <AdminForm
              action={replyToTicket}
              submitLabel="Send reply"
              pendingLabel="Sending…"
              hidden={{ reference: ticket.reference }}
            >
              <Field label="Your reply" name="body" required>
                <Textarea name="body" rows={6} maxLength={4000} required />
              </Field>
              <Field label="Set status to" name="status">
                <Select name="status" defaultValue={ticket.status}>
                  {TICKET_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label} — {status.detail}
                    </option>
                  ))}
                </Select>
              </Field>
            </AdminForm>
          </div>
        </section>
      ) : (
        <p className="max-w-3xl rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-600">
          Your account can read support tickets but not answer them.
        </p>
      )}

      <section className="max-w-3xl">
        <h2 className="mb-4 text-[1.05rem]">Files</h2>
        <DocumentList
          documents={ticket.documents}
          emptyMessage="Nothing has been attached to this ticket."
        />
      </section>
    </div>
  );
}
