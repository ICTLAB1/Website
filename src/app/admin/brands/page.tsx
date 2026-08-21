import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Brands" };

export default async function AdminBrandsPage() {
  await requireStaff();
  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      featured: true,
      displayOrder: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Brands</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Vendors whose products appear in the catalogue. Each brand has a public page at
          /brands/[slug].
        </p>
      </header>

      <TableWrap>
        <Table className="min-w-[42rem]">
          <thead>
            <tr>
              <Th>Brand</Th>
              <Th>Tagline</Th>
              <Th>Products</Th>
              <Th>Order</Th>
              <Th>Featured</Th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <Tr key={brand.id}>
                <Td>
                  <span className="font-medium text-graphite-900">{brand.name}</span>
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="mt-0.5 block font-mono text-[11px] text-accent-700 hover:underline"
                  >
                    /brands/{brand.slug}
                  </Link>
                </Td>
                <Td className="text-[13px]">{brand.tagline ?? "—"}</Td>
                <Td className="tabular-nums">{brand._count.products}</Td>
                <Td className="tabular-nums">{brand.displayOrder}</Td>
                <Td>{brand.featured ? <Badge tone="brand">Featured</Badge> : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
