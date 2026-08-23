import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AccountForm } from "@/components/account/account-form";
import { Field, Input, Textarea } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { DocumentList } from "@/components/documents/document-list";
import { TicketThread } from "@/components/portal/ticket-thread";
import { attachToTicket, replyOnTicket } from "@/app/account/support/actions";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { getTicketFor, ticketIsClosed } from "@/lib/ticket-service";
import { ACCEPTED_DOCUMENTS, DOCUMENT_ACCEPT_ATTRIBUTE } from "@/lib/document-bytes";
import { formatDateTime, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Support ticket" };

type PageProps = { params: Promise<{ reference: string }> };

/**
 * One support ticket, as a conversation.
 *
 * Before this the customer could see that a ticket existed and what status it
 * had, and nothing about what was actually said — which meant the real
 * conversation happened in email, where neither side could find it a month
 * later. Everything is here now: the opening message, every reply, and the
 * files either side attached.
 */
export default async function AccountTicketPage({ params }: PageProps) {
  const { reference } = await params;
  const user = await requireUser(`/account/support/${reference}`);

  const ticket = await getTicketFor(user, reference);
  if (!ticket) notFound();

  const mayWrite = canInCompany(user, "service.act");
  const closed = ticketIsClosed(ticket.status);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/account/support" className="text-[13px] text-accent-700 hover:underline">
          &larr; All tickets
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[1.35rem] text-graphite-900">{ticket.subject}</h2>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="mt-1.5 text-[13px] text-ink-500">
          <span className="font-mono">{ticket.reference}</span> · {humanise(ticket.category)} ·
          raised {formatDateTime(ticket.createdAt)}
        </p>

        {ticket.device ? (
          <p className="mt-3 rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-700">
            About{" "}
            <Link
              href={`/account/devices/${ticket.device.reference}`}
              className="font-medium text-accent-700 underline underline-offset-2"
            >
              {ticket.device.brandName} {ticket.device.model}
            </Link>
            {ticket.device.serial ? ` · serial ${ticket.device.serial}` : " · serial not recorded"}
          </p>
        ) : null}
      </div>

      <section>
        <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">Conversation</h3>
        <TicketThread
          opening={{
            body: ticket.message,
            createdAt: ticket.createdAt,
            author: ticket.user?.name ?? null,
          }}
          messages={ticket.messages}
        />
      </section>

      {closed ? (
        <p className="rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] leading-relaxed text-ink-600">
          This ticket is {ticket.status === "RESOLVED" ? "resolved" : "closed"}. If the problem is
          back, please{" "}
          <Link href="/account/support" className="font-medium text-accent-700 hover:underline">
            raise a new ticket
          </Link>{" "}
          — a reply here would not reach anybody.
        </p>
      ) : mayWrite ? (
        <>
          <section className="max-w-2xl rounded-[--radius-lg] border border-line bg-white p-5">
            <h3 className="text-[15px] font-semibold text-graphite-900">Reply</h3>
            <div className="mt-5">
              <AccountForm
                action={replyOnTicket}
                submitLabel="Send reply"
                pendingLabel="Sending…"
                hidden={{ reference: ticket.reference }}
              >
                <Field label="Your message" name="body" required>
                  <Textarea name="body" rows={5} maxLength={4000} required />
                </Field>
              </AccountForm>
            </div>
          </section>

          <section className="max-w-xl rounded-[--radius-lg] border border-line bg-white p-5">
            <h3 className="text-[15px] font-semibold text-graphite-900">Attach a file</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              A screenshot of the error, a photograph of the damage, a log. {ACCEPTED_DOCUMENTS}, up
              to 10 MB.
            </p>
            <div className="mt-5">
              <AccountForm
                action={attachToTicket}
                submitLabel="Attach"
                pendingLabel="Uploading…"
                hidden={{ reference: ticket.reference }}
              >
                <Field label="The file" name="document" required>
                  <Input
                    name="document"
                    type="file"
                    required
                    accept={DOCUMENT_ACCEPT_ATTRIBUTE}
                    className="file:mr-3 file:rounded-[--radius-sm] file:border-0 file:bg-graphite-900 file:px-3 file:py-1.5 file:text-white"
                  />
                </Field>
              </AccountForm>
            </div>
          </section>
        </>
      ) : (
        <p className="rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-600">
          Your access is read-only. A colleague with support access can reply here.
        </p>
      )}

      <section>
        <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">Files</h3>
        <DocumentList
          documents={ticket.documents}
          emptyMessage="Nothing has been attached to this ticket."
        />
      </section>
    </div>
  );
}
