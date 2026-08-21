import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { requireAdmin, requireStaff } from "@/lib/auth/guards";
import { resolveResource, RESOURCE_KEYS, type ResourceKey } from "@/lib/admin/resources";
import { listRecords, readPath } from "@/lib/admin/repository";
import { formatDate, humanise } from "@/lib/utils";

/**
 * Generic list screen for any registry-declared resource.
 *
 * `dynamicParams = false` with `generateStaticParams` over the registry keys
 * means an unknown /admin/{something} is a 404 from the route table rather than
 * a database lookup.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return RESOURCE_KEYS.map((resource) => ({ resource }));
}

type PageProps = {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ q?: string; page?: string; archived?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { resource } = await params;
  const config = resolveResource(resource);
  return { title: config ? config.label.plural : "Admin" };
}

function Cell({ value, format }: { value: unknown; format?: string }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-ink-400">—</span>;
  }

  switch (format) {
    case "boolean":
      return value ? <Badge tone="brand">Yes</Badge> : <span className="text-ink-400">No</span>;
    case "date":
      return <>{formatDate(value as Date)}</>;
    case "badge":
      return <StatusBadge status={String(value)} />;
    case "slug":
      return <span className="font-mono text-[12px] text-ink-500">{String(value)}</span>;
    case "number":
      return <span className="tabular-nums">{String(value)}</span>;
    default:
      return <>{String(value)}</>;
  }
}

export default async function ResourceListPage({ params, searchParams }: PageProps) {
  const { resource } = await params;
  const config = resolveResource(resource);
  if (!config) notFound();

  // The guard comes from the resolved config, so a resource declared
  // admin-only cannot be listed by a SALES account.
  if (config.guard === "admin") await requireAdmin();
  else await requireStaff();

  const query = await searchParams;
  const includeArchived = query.archived === "1";
  const { items, total, page, totalPages } = await listRecords(config, {
    q: query.q,
    page: Number(query.page) || 1,
    includeArchived,
  });

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    if (query.q) next.set("q", query.q);
    if (includeArchived) next.set("archived", "1");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    next.delete("page") ;
    const qs = next.toString();
    return `/admin/${config.key}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">{config.label.plural}</h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-ink-600">{config.description}</p>
        </div>
        <ButtonLink href={`/admin/${config.key}/new`}>New {config.label.singular.toLowerCase()}</ButtonLink>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {/* GET form: the search term stays in the URL and can be shared. */}
        <form method="get" className="flex gap-2">
          {includeArchived ? <input type="hidden" name="archived" value="1" /> : null}
          <input
            type="search"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder={`Search ${config.label.plural.toLowerCase()}`}
            aria-label={`Search ${config.label.plural.toLowerCase()}`}
            className="h-10 w-64 rounded-[--radius-md] border border-line-strong px-3 text-sm"
          />
          <button
            type="submit"
            className="h-10 rounded-[--radius-md] border border-line-strong px-4 text-[13px] font-medium hover:bg-white"
          >
            Search
          </button>
        </form>

        {config.softDelete ? (
          <Link
            href={buildHref({ archived: includeArchived ? undefined : "1" })}
            className="text-[13px] text-accent-700 hover:underline"
          >
            {includeArchived ? "Hide archived" : "Show archived"}
          </Link>
        ) : null}

        <span className="text-[13px] text-ink-500">
          {total} {total === 1 ? config.label.singular.toLowerCase() : config.label.plural.toLowerCase()}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={query.q ? "No matches" : `No ${config.label.plural.toLowerCase()} yet`}
          description={
            query.q
              ? "No records match that search."
              : `Create the first ${config.label.singular.toLowerCase()} to get started.`
          }
        />
      ) : (
        <>
          <TableWrap>
            <Table className="min-w-[48rem]">
              <thead>
                <tr>
                  {config.listColumns.map((column) => (
                    <Th key={column.header}>{column.header}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const id = String(row.id);
                  const archived = row.deletedAt !== null && row.deletedAt !== undefined;
                  return (
                    <Tr key={id}>
                      {config.listColumns.map((column) => {
                        const value = readPath(row, column.path);
                        return (
                          <Td key={column.header}>
                            {column.primary ? (
                              <>
                                <Link
                                  href={`/admin/${config.key}/${id}`}
                                  className="font-medium text-accent-700 hover:underline"
                                >
                                  {String(value ?? "Untitled")}
                                </Link>
                                {archived ? (
                                  <span className="ml-2 text-[11px] uppercase tracking-wide text-ink-400">
                                    Archived
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <Cell value={value} format={column.format} />
                            )}
                          </Td>
                        );
                      })}
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>

          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(target) => {
              const next = new URLSearchParams();
              if (query.q) next.set("q", query.q);
              if (includeArchived) next.set("archived", "1");
              if (target > 1) next.set("page", String(target));
              const qs = next.toString();
              return `/admin/${config.key}${qs ? `?${qs}` : ""}`;
            }}
          />
        </>
      )}

      <p className="text-[12px] text-ink-500">
        {humanise(config.guard === "admin" ? "ADMIN_ONLY" : "STAFF")} · changes here update the public
        site immediately.
      </p>
    </div>
  );
}

export type { ResourceKey };
