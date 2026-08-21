import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pages" };

type PageProps = { searchParams: Promise<{ q?: string; archived?: string }> };

export default async function AdminPagesList({ searchParams }: PageProps) {
  await requireAdmin();
  const query = await searchParams;
  const includeArchived = query.archived === "1";
  const term = query.q?.trim();

  const pages = await prisma.page.findMany({
    where: {
      ...(includeArchived ? {} : { deletedAt: null }),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { slug: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ slug: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      updatedAt: true,
      deletedAt: true,
      _count: { select: { sections: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Pages</h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-ink-600">
            Marketing pages, built from content blocks. Editing one updates the public site
            immediately — no deploy is needed.
          </p>
        </div>
        <ButtonLink href="/admin/pages/new">New page</ButtonLink>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <form method="get" className="flex gap-2">
          {includeArchived ? <input type="hidden" name="archived" value="1" /> : null}
          <input
            type="search"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Search pages"
            aria-label="Search pages"
            className="h-10 w-64 rounded-[--radius-md] border border-line-strong px-3 text-sm"
          />
          <button
            type="submit"
            className="h-10 rounded-[--radius-md] border border-line-strong px-4 text-[13px] font-medium hover:bg-white"
          >
            Search
          </button>
        </form>
        <Link
          href={includeArchived ? "/admin/pages" : "/admin/pages?archived=1"}
          className="text-[13px] text-accent-700 hover:underline"
        >
          {includeArchived ? "Hide archived" : "Show archived"}
        </Link>
        <span className="text-[13px] text-ink-500">{pages.length} pages</span>
      </div>

      {pages.length === 0 ? (
        <EmptyState
          title={term ? "No matches" : "No pages yet"}
          description={term ? "No pages match that search." : "Create the first page to get started."}
        />
      ) : (
        <TableWrap>
          <Table className="min-w-[44rem]">
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Path</Th>
                <Th>Blocks</Th>
                <Th>Updated</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <Tr key={page.id}>
                  <Td>
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="font-medium text-accent-700 hover:underline"
                    >
                      {page.title}
                    </Link>
                    {page.deletedAt ? (
                      <span className="ml-2 text-[11px] uppercase tracking-wide text-ink-400">
                        Archived
                      </span>
                    ) : null}
                  </Td>
                  <Td className="font-mono text-[12px] text-ink-500">/{page.slug}</Td>
                  <Td className="tabular-nums">{page._count.sections}</Td>
                  <Td>{formatDate(page.updatedAt)}</Td>
                  <Td>
                    <StatusBadge status={page.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
