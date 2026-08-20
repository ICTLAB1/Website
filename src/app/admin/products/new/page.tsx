import Link from "next/link";
import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "New product" };

export default async function AdminNewProductPage() {
  await requireStaff();

  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ displayOrder: "asc" }],
      select: { id: true, name: true, parent: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <Link href="/admin/products" className="text-[13px] text-accent-700 hover:underline">
          &larr; Products
        </Link>
        <h1 className="mt-2 text-2xl">New product</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          Create the product record first. Licence options and pricing are added on the next
          screen.
        </p>
      </header>

      <ProductForm
        brands={brands}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          parentName: category.parent?.name ?? null,
        }))}
      />
    </div>
  );
}
