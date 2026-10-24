import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Chat conversations" };

const PAGE_SIZE = 25;

type PageProps = { searchParams: Promise<{ page?: string }> };

/**
 * What visitors asked the assistant, including the times it went nowhere.
 *
 * The lead transcripts were always readable — `capture_lead` copies them onto
 * the deal as an activity. Those are the conversations that already worked.
 * This screen exists for the others: the question the assistant answered
 * badly, the product the catalogue does not carry, the visitor who got as far
 * as a price and closed the tab. None of that was recorded anywhere before,
 * and it is the half that says what to fix.
 *
 * Read-only by design. There is nothing here to edit — a transcript is a
 * record of something that happened — and a conversation is removed by the
 * published twelve-month retention sweep rather than by hand, so that what
 * the privacy policy promises and what the application does cannot drift.
 *
 * Admin-only, like the audit log and for the same reason: a visitor typed
 * these words expecting them to reach this business, not everybody in it.
 */
export default async function AdminConversationsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [rows, total] = await Promise.all([
    prisma.chatConversation.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        messages: true,
        leadReference: true,
        startedOn: true,
        startedAt: true,
        updatedAt: true,
      },
    }),
    prisma.chatConversation.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-section font-semibold text-graphite-900">Chat conversations</h1>
        <p className="mt-2 max-w-2xl text-meta leading-relaxed text-ink-600">
          Every conversation with the assistant, newest first — the ones that became leads and the
          ones that did not. Kept for twelve months and then deleted, as the privacy policy says.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Conversations appear here as visitors use the chat assistant."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            /*
             * Validated on the way in by the chat route's own schema, so this
             * is shaping known data rather than parsing unknown data — but it
             * is still a JSON column, and a column that was written by an
             * older version of the route is exactly the thing that would
             * crash a page that assumed otherwise.
             */
            const messages = Array.isArray(row.messages)
              ? (row.messages as Array<{ role?: unknown; content?: unknown }>)
              : [];

            return (
              <article key={row.id} className="rounded-[--radius-lg] border border-line bg-white p-5">
                <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-body font-semibold text-graphite-900">
                    {row.startedOn ?? "Unknown page"}
                  </h2>
                  <p className="text-label text-ink-500">
                    {formatDateTime(row.startedAt)} · {messages.length}{" "}
                    {messages.length === 1 ? "message" : "messages"}
                    {row.leadReference ? (
                      <>
                        {" · "}
                        <Link
                          href={`/admin/pipeline`}
                          className="font-semibold text-accent-700 hover:text-accent-800"
                        >
                          lead {row.leadReference}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </header>

                <dl className="mt-4 space-y-3">
                  {messages.map((message, index) => (
                    <div key={index} className="grid gap-1 sm:grid-cols-[6rem_1fr] sm:gap-4">
                      <dt className="text-label uppercase tracking-wide text-ink-500">
                        {message.role === "assistant" ? "Assistant" : "Visitor"}
                      </dt>
                      <dd className="whitespace-pre-wrap text-meta leading-relaxed text-ink-700">
                        {typeof message.content === "string" ? message.content : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          <p className="text-label text-ink-500">
            Page {page} of {totalPages} · {total} conversations
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/admin/conversations?page=${page - 1}`}
                className="rounded-[--radius-md] border border-line px-3 py-2 text-label font-semibold text-graphite-900 hover:bg-surface-muted"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/admin/conversations?page=${page + 1}`}
                className="rounded-[--radius-md] border border-line px-3 py-2 text-label font-semibold text-graphite-900 hover:bg-surface-muted"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
