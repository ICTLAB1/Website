import "server-only";

/**
 * Who a customer record belongs to.
 *
 * The unit of access on the customer side is the organisation, not the person.
 * A procurement officer raises a requirement, a colleague chases the quotation
 * while they are on leave, and finance pays the invoice — three people, one
 * company, one thread of work. Scoping by user would break that, and it is
 * exactly what customers complain about in portals that do it.
 *
 * Two rules, and they are the whole module:
 *
 *   1. An account with a company sees that company's records, plus anything it
 *      raised itself before joining (records from before the company existed
 *      carry no company, and losing them at the moment somebody is invited into
 *      an organisation would be indefensible).
 *   2. An account with no company sees only its own.
 *
 * The company branch is only ever added when there is a company id. A filter of
 * `{ companyId: null }` would match every unattached record in the table, which
 * is the one mistake this module exists to make impossible.
 */

export type Scoped = { id: string; companyId?: string | null };

/** A `where` fragment for a model carrying both `userId` and `companyId`. */
export function orgScope(user: Scoped): { OR: Array<{ userId: string } | { companyId: string }> } | { userId: string } {
  if (!user.companyId) return { userId: user.id };
  return { OR: [{ companyId: user.companyId }, { userId: user.id }] };
}

/**
 * The same rule for a model reached through a relation, e.g. a renewal, which
 * belongs to a licence rather than directly to a company.
 */
export function orgScopeVia<K extends string>(
  key: K,
  user: Scoped,
): Record<K, ReturnType<typeof orgScope>> {
  return { [key]: orgScope(user) } as Record<K, ReturnType<typeof orgScope>>;
}

/**
 * Whether a fetched record belongs to this account's organisation.
 *
 * A second line of defence for the few paths that must load a row before they
 * can scope it — a webhook resolving an order by gateway reference, say. Where
 * a query can carry the scope in its WHERE clause it should, because a filter
 * that matches nothing cannot leak; this is for where it genuinely cannot.
 */
export function belongsToOrg(
  user: Scoped,
  record: { userId?: string | null; companyId?: string | null },
): boolean {
  if (user.companyId && record.companyId) return record.companyId === user.companyId;
  return record.userId === user.id;
}
