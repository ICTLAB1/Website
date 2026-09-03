import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { searchAuditLog } from "@/lib/queries/admin";
import { formatDateTime, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

type PageProps = {
  searchParams: Promise<{ actor?: string; entity?: string; q?: string; page?: string }>;
};

/**
 * Every recorded action, searchable.
 *
 * The dashboard's "Recent activity" panel is the ten newest entries and
 * nothing else — useful for "what just happened", useless for "what did
 * this person do" or "what happened to this record", which is what this
 * screen answers. Admin-only: who did what is itself sensitive.
 */
export default async function AdminAuditLogPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ items, total, pageSize, entityTypes }, actors] = await Promise.all([
    searchAuditLog({
      actorId: params.actor || undefined,
      entityType: params.entity || undefined,
      q: params.q || undefined,
      page,
    }),
    prisma.user.findMany({
      where: { deletedAt: null, role: { in: ["ADMIN", "SALES"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const query = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { actor: params.actor, entity: params.entity, q: params.q, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Audit log</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {total.toLocaleString("en-IN")} recorded action{total === 1 ? "" : "s"}.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3" action="/admin/audit-log">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-q" className="text-[13px] font-medium text-ink-800">
            Search
          </label>
          <input
            id="audit-q"
            type="text"
            name="q"
            defaultValue={params.q}
            placeholder="Action or entity id"
            className="h-10 min-w-[14rem] rounded-[--radius-md] border border-line-strong px-3 text-[14px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-actor" className="text-[13px] font-medium text-ink-800">
            Actor
          </label>
          <select
            id="audit-actor"
            name="actor"
            defaultValue={params.actor ?? ""}
            className="h-10 rounded-[--radius-md] border border-line-strong px-3 text-[14px]"
          >
            <option value="">Anyone</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-entity" className="text-[13px] font-medium text-ink-800">
            Record type
          </label>
          <select
            id="audit-entity"
            name="entity"
            defaultValue={params.entity ?? ""}
            className="h-10 rounded-[--radius-md] border border-line-strong px-3 text-[14px]"
          >
            <option value="">Any type</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {humanise(type)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-[--radius-md] border border-line-strong bg-white px-4 text-[14px] font-medium text-graphite-900 hover:border-graphite-400"
        >
          Filter
        </button>
        {params.q || params.actor || params.entity ? (
          <Link href="/admin/audit-log" className="text-[13px] text-accent-700 hover:underline">
            Clear filters
          </Link>
        ) : null}
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No matching activity"
          description="Nothing recorded matches this filter — try widening it."
        />
      ) : (
        <TableWrap>
          <Table className="min-w-[52rem]">
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Record</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <Tr key={entry.id}>
                  <Td className="whitespace-nowrap text-[13px]">{formatDateTime(entry.createdAt)}</Td>
                  <Td className="text-[13px]">
                    {entry.actor?.name ?? "System"}
                    {entry.actor?.email ? (
                      <span className="mt-0.5 block text-[11px] text-ink-500">{entry.actor.email}</span>
                    ) : null}
                  </Td>
                  <Td className="font-mono text-[12px]">{entry.action}</Td>
                  <Td className="text-[13px] text-ink-600">
                    {humanise(entry.entityType)}
                    {entry.entityId ? (
                      <span className="mt-0.5 block font-mono text-[11px] text-ink-500">{entry.entityId}</span>
                    ) : null}
                    {entry.metadata ? (
                      <span className="mt-0.5 block max-w-md truncate text-[11px] text-ink-400" title={JSON.stringify(entry.metadata)}>
                        {JSON.stringify(entry.metadata)}
                      </span>
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between text-[13px] text-ink-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-3">
            {page > 1 ? (
              <Link href={query({ page: String(page - 1) })} className="text-accent-700 hover:underline">
                &larr; Newer
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={query({ page: String(page + 1) })} className="text-accent-700 hover:underline">
                Older &rarr;
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
