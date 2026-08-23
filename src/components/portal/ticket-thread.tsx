import { formatDateTime } from "@/lib/utils";

export type TicketMessageRow = {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: Date | string;
  user: { name: string } | null;
};

/**
 * A support ticket as a conversation.
 *
 * The opening message is passed in separately and rendered first, because it is
 * stored on the ticket rather than in the thread — it predates the thread by a
 * year of tickets, and backfilling it into `TicketMessage` would have rewritten
 * history to make the code tidier.
 *
 * The same component on both sides, for the same reason as the quotation
 * thread: a customer and a support engineer reading one conversation must see
 * the same messages in the same order.
 */
export function TicketThread({
  opening,
  messages,
  staffLabel = "Our team",
  customerHeading = "From you",
}: {
  opening: { body: string; createdAt: Date | string; author: string | null };
  messages: TicketMessageRow[];
  staffLabel?: string;
  /**
   * What to head a customer message with. "From you" on the customer's own
   * screen; "From the customer" on ours — the same message, read from two
   * different desks.
   */
  customerHeading?: string;
}) {
  return (
    <ol className="space-y-4">
      <li className="rounded-[--radius-md] border border-line bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-label font-semibold uppercase tracking-[0.08em] text-ink-500">
            Raised
          </span>
          <span className="text-label text-ink-500">
            {opening.author ?? "Someone"} · {formatDateTime(opening.createdAt)}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-line text-meta leading-relaxed text-ink-700">
          {opening.body}
        </p>
      </li>

      {messages.map((message) => (
        <li
          key={message.id}
          className={`rounded-[--radius-md] border p-4 ${
            message.fromStaff ? "border-accent-600/25 bg-accent-50/50" : "border-line bg-white"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-label font-semibold uppercase tracking-[0.08em] text-ink-500">
              {message.fromStaff ? "Reply" : customerHeading}
            </span>
            <span className="text-label text-ink-500">
              {message.user?.name ?? (message.fromStaff ? staffLabel : "Someone")} ·{" "}
              {formatDateTime(message.createdAt)}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-meta leading-relaxed text-ink-700">
            {message.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
