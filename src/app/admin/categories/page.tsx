import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireStaff();
  const categories = await prisma.category.findMany({
    where: { deletedAt: null, parentId: null },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      featured: true,
      displayOrder: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
      children: {
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          displayOrder: true,
          featured: true,
          _count: { select: { products: { where: { deletedAt: null } } } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Categories</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          A single global tree, two levels deep. Products carry both a brand and a category, so
          the catalogue can be browsed either way without duplicating the taxonomy per vendor.
        </p>
      </header>

      <TableWrap>
        <Table className="min-w-[38rem]">
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Slug</Th>
              <Th>Products</Th>
              <Th>Order</Th>
              <Th>Featured</Th>
            </tr>
          </thead>
          <tbody>
            {categories.flatMap((category) => [
              <Tr key={category.id}>
                <Td className="font-medium text-navy-900">{category.name}</Td>
                <Td className="font-mono text-[12px]">{category.slug}</Td>
                <Td className="tabular-nums">{category._count.products}</Td>
                <Td className="tabular-nums">{category.displayOrder}</Td>
                <Td>{category.featured ? <Badge tone="brand">Featured</Badge> : "—"}</Td>
              </Tr>,
              ...category.children.map((child) => (
                <Tr key={child.id}>
                  <Td className="pl-8 text-[13px] text-ink-700">↳ {child.name}</Td>
                  <Td className="font-mono text-[12px]">{child.slug}</Td>
                  <Td className="tabular-nums">{child._count.products}</Td>
                  <Td className="tabular-nums">{child.displayOrder}</Td>
                  <Td>{child.featured ? <Badge tone="accent">Featured</Badge> : "—"}</Td>
                </Tr>
              )),
            ])}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
