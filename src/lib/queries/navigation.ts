import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";

/**
 * Navigation reads.
 *
 * The tree is two levels deep in practice: a top-level item, then either a flat
 * list of links or a set of columns each holding links. It is fetched flat in
 * one query and assembled in memory rather than with nested includes, so adding
 * a level later costs nothing.
 *
 * The shapes returned here match what the header components already expected
 * from the compiled module, so the components did not need rewriting to consume
 * the database.
 */

export type NavLink = { label: string; href: string; description?: string };
export type NavColumn = { heading: string; href: string; links: NavLink[] };
export type PrimaryNavItem = {
  label: string;
  href: string;
  megaMenu?: NavColumn[];
  simpleMenu?: NavLink[];
};
export type FooterColumn = { heading: string; links: NavLink[] };

export type SiteNavigation = {
  primary: PrimaryNavItem[];
  utility: NavLink[];
  footer: FooterColumn[];
};

const loadNavigation = cached(
  async (): Promise<SiteNavigation> => {
    const rows = await prisma.navigationItem.findMany({
      where: { visible: true },
      orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
      select: {
        id: true,
        menu: true,
        label: true,
        href: true,
        description: true,
        parentId: true,
      },
    });

    const childrenOf = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.parentId) continue;
      const list = childrenOf.get(row.parentId) ?? [];
      list.push(row);
      childrenOf.set(row.parentId, list);
    }

    const toLink = (row: (typeof rows)[number]): NavLink => ({
      label: row.label,
      href: row.href ?? "#",
      ...(row.description ? { description: row.description } : {}),
    });

    const primary: PrimaryNavItem[] = rows
      .filter((row) => row.menu === "HEADER" && !row.parentId)
      .map((top) => {
        const children = childrenOf.get(top.id) ?? [];
        // A child that has children of its own is a column heading; a child
        // with none is a plain link. That distinction is what separates a mega
        // menu from a simple dropdown, and it is derived rather than stored.
        const columns = children.filter((child) => (childrenOf.get(child.id) ?? []).length > 0);

        if (columns.length > 0) {
          return {
            label: top.label,
            href: top.href ?? "#",
            megaMenu: columns.map((column) => ({
              heading: column.label,
              href: column.href ?? "#",
              links: (childrenOf.get(column.id) ?? []).map(toLink),
            })),
          };
        }

        return {
          label: top.label,
          href: top.href ?? "#",
          ...(children.length > 0 ? { simpleMenu: children.map(toLink) } : {}),
        };
      });

    const utility = rows.filter((row) => row.menu === "UTILITY" && !row.parentId).map(toLink);

    const footer: FooterColumn[] = rows
      .filter((row) => row.menu === "FOOTER" && !row.parentId)
      .map((column) => ({
        heading: column.label,
        links: (childrenOf.get(column.id) ?? []).map(toLink),
      }));

    return { primary, utility, footer };
  },
  ["site-navigation"],
  [tags.navigation],
);

export const getNavigation = cache(loadNavigation);

/** Paths worth including in the sitemap, taken from the navigation itself. */
export const getNavigationPaths = cache(async (): Promise<string[]> => {
  const nav = await getNavigation();
  const paths = new Set<string>();

  const add = (href: string | undefined) => {
    if (!href) return;
    // Query-string filter links point at a page already in the sitemap.
    if (!href.startsWith("/") || href.includes("?") || href.includes("#")) return;
    paths.add(href);
  };

  for (const item of nav.primary) {
    add(item.href);
    for (const column of item.megaMenu ?? []) {
      add(column.href);
      for (const link of column.links) add(link.href);
    }
    for (const link of item.simpleMenu ?? []) add(link.href);
  }
  for (const link of nav.utility) add(link.href);
  for (const column of nav.footer) for (const link of column.links) add(link.href);

  return [...paths].sort();
});
