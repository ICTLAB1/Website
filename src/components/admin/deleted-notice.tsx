/**
 * Confirms a permanent deletion on the list the operator lands on.
 *
 * A permanent delete redirects away from the record's own page, because that
 * page has nothing left to show. The success message cannot survive the
 * redirect, so the reference travels in the query string and is reported here —
 * otherwise the operator arrives at a list with one fewer row and no statement
 * that anything happened, which reads identically to a failure.
 *
 * The reference is attacker-supplied in the sense that anyone can put anything
 * in a query string. It is rendered as text, never as markup, and truncated:
 * the worst a crafted link achieves is a stranger showing themselves a sentence
 * of their own writing.
 */
export function DeletedNotice({
  reference,
  noun,
}: {
  reference: string | undefined;
  noun: string;
}) {
  if (!reference) return null;

  return (
    <p
      role="status"
      className="rounded-[--radius-md] border border-line-strong bg-surface-muted px-4 py-3 text-[13px] text-graphite-900"
    >
      The {noun} <span className="font-medium">{reference.slice(0, 120)}</span> has been
      permanently deleted.
    </p>
  );
}
