import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/guards";
import { listAdminProducts } from "@/lib/queries/admin";
import { formatDate, humanise } from "@/lib/utils";
import { DeletedNotice } from "@/components/admin/deleted-notice";

export const metadata: Metadata = { title: "Products" };

type PageProps = { searchParams: Promise<{ q?: string; page?: string; deleted?: string }> };

export default async function AdminProductsPage({ searchParams }: PageProps) {
  await requireStaff();
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const { items, total, totalPages } = await listAdminProducts({
    q: params.q,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Products</h1>
          <p className="mt-1.5 text-[14px] text-ink-600">
            {total} {total === 1 ? "product" : "products"} in the catalogue.
          </p>
        </div>
        <ButtonLink href="/admin/products/new">New product</ButtonLink>
      </header>

      <DeletedNotice reference={params.deleted} noun="product" />

      {/* GET form: the search term stays in the URL and can be shared. */}
      <form method="get" role="search" className="flex max-w-md gap-2">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by name, SKU or keyword"
          className="h-11 flex-1 rounded-[--radius-md] border border-line-strong bg-white px-3 text-sm"
        />
        <button
          type="submit"
          className="h-11 rounded-[--radius-md] bg-graphite-900 px-4 text-sm font-medium text-white hover:bg-graphite-800"
        >
          Search
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No products found"
          description={params.q ? `Nothing matches “${params.q}”.` : "Create the first product to populate the catalogue."}
          action={<ButtonLink href="/admin/products/new">New product</ButtonLink>}
        />
      ) : (
        <>
          <TableWrap>
            <Table className="min-w-[52rem]">
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Brand</Th>
                  <Th>Category</Th>
                  <Th>SKUs</Th>
                  <Th>Mode</Th>
                  <Th>Status</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <Tr key={product.id}>
                    <Td>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium text-accent-700 hover:underline"
                      >
                        {product.name}
                      </Link>
                      {product.featured ? (
                        <span className="ml-2 align-middle">
                          <Badge tone="brand">Featured</Badge>
                        </span>
                      ) : null}
                      <span className="mt-0.5 block font-mono text-[11px] text-ink-500">
                        /{product.slug}
                      </span>
                    </Td>
                    <Td>{product.brand.name}</Td>
                    <Td className="text-[13px]">{product.category.name}</Td>
                    <Td className="tabular-nums">{product._count.variants}</Td>
                    <Td className="text-[13px]">{humanise(product.purchaseMode)}</Td>
                    <Td>
                      <StatusBadge status={product.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-[13px]">{formatDate(product.updatedAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>

          <Pagination
            page={page > 0 ? page : 1}
            totalPages={totalPages}
            buildHref={(target) => {
              const query = new URLSearchParams();
              if (params.q) query.set("q", params.q);
              if (target > 1) query.set("page", String(target));
              const search = query.toString();
              return search ? `/admin/products?${search}` : "/admin/products";
            }}
          />
        </>
      )}
    </div>
  );
}
