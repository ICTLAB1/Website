import { formatDateTime } from "@/lib/utils";

export type ThreadMessage = {
  id: string;
  kind: string;
  body: string;
  fromStaff: boolean;
  createdAt: Date | string;
  user: { name: string } | null;
};

const KIND_LABELS: Record<string, string> = {
  QUESTION: "Question",
  REVISION_REQUEST: "Revision requested",
  REPLY: "Reply",
};

/**
 * The conversation about a quotation.
 *
 * Beside the quotation rather than in an inbox, which is the whole point: the
 * question, who asked it, when, and what was answered are all in one place, and
 * "we never received that" stops being a thing anybody can say.
 *
 * The same component on both sides. A customer and a salesperson looking at the
 * same thread must see the same messages in the same order — the alternative is
 * two accounts of one conversation.
 */
export function QuoteThread({
  messages,
  staffLabel = "Our team",
}: {
  messages: ThreadMessage[];
  /**
   * What to call us when a staff message has no author on it — because the
   * account was archived, or the message was written by an automation. "Someone"
   * is right for a customer-side gap and wrong here: the customer knows which
   * side it came from and should see that.
   */
  staffLabel?: string;
}) {
  if (messages.length === 0) {
    return <p className="text-meta text-ink-500">No questions have been raised on this quotation.</p>;
  }

  return (
    <ol className="space-y-4">
      {messages.map((message) => (
        <li
          key={message.id}
          className={`rounded-[--radius-md] border p-4 ${
            message.fromStaff
              ? "border-accent-600/25 bg-accent-50/50"
              : "border-line bg-white"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-label font-semibold uppercase tracking-[0.08em] text-ink-500">
              {KIND_LABELS[message.kind] ?? message.kind}
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

export type VersionRow = {
  reference: string;
  version: number;
  status: string;
  totalMinor: number;
  currency: string;
  revisionNote: string | null;
  sentAt: Date | string | null;
  createdAt: Date | string;
};
