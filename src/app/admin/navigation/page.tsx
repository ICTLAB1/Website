import type { Metadata } from "next";

import { NavigationEditor, type NavRow } from "@/components/admin/navigation-editor";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Navigation" };

/**
 * The navigation editor.
 *
 * Reads the tree directly rather than through `getNavigation()`, which returns
 * the shape the public header wants: only visible items, with headings and
 * links already collapsed into mega-menu columns. An editor has to show the
 * hidden items too, and has to show the tree as it is stored rather than as it
 * is presented — otherwise a link cannot be un-hidden once it is hidden.
 */

const MENUS = [
  {
    key: "HEADER",
    title: "Header",
    description:
      "The main site menu. A top-level item with children becomes a dropdown; if those children have children of their own it becomes a mega menu with one column per child. That shape is derived from the tree, not stored, so nesting a link one level deeper is what turns a dropdown into a mega menu.",
  },
  {
    key: "FOOTER",
    title: "Footer",
    description: "Each top-level item is a footer column heading; its children are the links in it.",
  },
  {
    key: "UTILITY",
    title: "Utility bar",
    description: "The small links above the header. Top level only — children are not rendered.",
  },
] as const;

export default async function AdminNavigationPage() {
  await requireAdmin();

  const rows = await prisma.navigationItem.findMany({
    orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    select: {
      id: true,
      menu: true,
      label: true,
      href: true,
      description: true,
      visible: true,
      parentId: true,
    },
  });

  // Assembled in one pass rather than with nested includes, matching the
  // public query — the tree is small and the depth is not fixed in the schema.
  const nodes = new Map<string, NavRow>();
  for (const row of rows) nodes.set(row.id, { ...row, children: [] });

  const roots: Record<string, NavRow[]> = { HEADER: [], FOOTER: [], UTILITY: [] };
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parentId) nodes.get(row.parentId)?.children.push(node);
    else roots[row.menu]?.push(node);
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl">Navigation</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-600">
          The header, footer and utility menus. Changes appear on the public site immediately — no
          deploy is needed. Removing an item also removes everything beneath it.
        </p>
      </header>

      {MENUS.map((menu) => (
        <NavigationEditor
          key={menu.key}
          menu={menu.key}
          title={menu.title}
          description={menu.description}
          items={roots[menu.key] ?? []}
        />
      ))}
    </div>
  );
}
