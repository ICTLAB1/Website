import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";
import { ProductPhotoForm } from "@/components/admin/product-photo-form";
import { VariantForm } from "@/components/admin/variant-form";
import { AdminForm } from "@/components/admin/admin-form";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { archiveProduct } from "@/app/admin/actions";
import { DangerZone } from "@/components/admin/danger-zone";
import { DELETABLE } from "@/lib/admin/deletable";
import { isAdmin, requireStaff } from "@/lib/auth/guards";
import { getAdminProduct } from "@/lib/queries/admin";
import { prisma } from "@/lib/db";
import { formatMoney, formatTerm } from "@/lib/money";
import { humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit product" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminProductDetailPage({ params }: PageProps) {
  const staff = await requireStaff();
  const { id } = await params;

  const product = await getAdminProduct(id);
  if (!product) notFound();

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
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/products" className="text-[13px] text-accent-700 hover:underline">
            &larr; Products
          </Link>
          <h1 className="mt-2 text-2xl">{product.name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
            <span className="font-mono">/products/{product.slug}</span>
            <Link href={`/products/${product.slug}`} className="text-accent-700 hover:underline">
              View public page &rarr;
            </Link>
          </p>
        </div>
        <div className="max-w-xs">
          <AdminForm
            action={archiveProduct}
            submitLabel="Archive product"
            pendingLabel="Archiving…"
            variant="outline"
            hidden={{ productId: product.id }}
            compact
          />
        </div>
      </header>

      {/*
        Above the details form, not below it.

        The picture is the first thing a buyer sees on the card and the first
        thing missing from a listing that looks unfinished, so it is the first
        thing offered here. It is also the only part of this screen that cannot
        be done from the form below, which is exactly why it would otherwise be
        overlooked.
      */}
      <section className="max-w-3xl">
        <ProductPhotoForm
          productId={product.id}
          productName={product.name}
          imageUrl={product.imageUrl}
          formFactor={product.formFactor}
        />
      </section>

      <section className="max-w-3xl">
        <h2 className="mb-5 text-[1.15rem]">Product details</h2>
        <ProductForm
          brands={brands}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            parentName: category.parent?.name ?? null,
          }))}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            brandId: product.brandId,
            categoryId: product.categoryId,
            shortDescription: product.shortDescription,
            description: product.description,
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
            status: product.status,
            availability: product.availability,
            purchaseMode: product.purchaseMode,
            featured: product.featured,
            popularity: product.popularity,
            features: product.features,
            compatibility: product.compatibility,
            keywords: product.keywords,
            licensingNotes: product.licensingNotes,
            deliveryNotes: product.deliveryNotes,
            supportNotes: product.supportNotes,
            hsnCode: product.hsnCode,
            unitLabel: product.unitLabel,
          }}
        />
      </section>

      <section>
        <h2 className="mb-5 text-[1.15rem]">Licence options and pricing</h2>

        {product.variants.length === 0 ? (
          <p className="mb-6 rounded-[--radius-lg] border border-dashed border-line-strong bg-white px-5 py-6 text-[13px] text-ink-500">
            No licence options yet. A product without at least one SKU cannot be added to an
            enquiry.
          </p>
        ) : (
          <TableWrap className="mb-8">
            <Table className="min-w-[44rem]">
              <thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Option</Th>
                  <Th>Type</Th>
                  <Th>Term</Th>
                  <Th>Seats</Th>
                  <Th>List</Th>
                  <Th>Sale</Th>
                  <Th>GST</Th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <Tr key={variant.id}>
                    <Td className="font-mono text-[12px]">
                      {variant.sku}
                      {variant.isDefault ? (
                        <span className="ml-2 align-middle">
                          <Badge tone="accent">Default</Badge>
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-[13px]">{variant.name}</Td>
                    <Td className="text-[13px]">{humanise(variant.licenceType)}</Td>
                    <Td className="text-[13px]">{formatTerm(variant.termMonths)}</Td>
                    <Td className="tabular-nums">{variant.seats}</Td>
                    <Td className="tabular-nums">
                      {variant.listPriceMinor > 0 ? formatMoney(variant.listPriceMinor) : "On quote"}
                    </Td>
                    <Td className="tabular-nums">
                      {variant.salePriceMinor ? formatMoney(variant.salePriceMinor) : "—"}
                    </Td>
                    <Td className="tabular-nums">{variant.gstRatePercent}%</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {product.variants.map((variant) => (
            <details key={variant.id} className="rounded-[--radius-lg] border border-line bg-white p-5">
              <summary className="cursor-pointer text-[14px] font-medium text-graphite-900">
                Edit {variant.sku}
              </summary>
              <div className="mt-5">
                <VariantForm
                  productId={product.id}
                  variant={{
                    id: variant.id,
                    sku: variant.sku,
                    name: variant.name,
                    licenceType: variant.licenceType,
                    audience: variant.audience,
                    termMonths: variant.termMonths,
                    seats: variant.seats,
                    listPriceMinor: variant.listPriceMinor,
                    salePriceMinor: variant.salePriceMinor,
                    gstRatePercent: variant.gstRatePercent,
                    isDefault: variant.isDefault,
                    partNumber: variant.partNumber,
                    processor: variant.processor,
                    memory: variant.memory,
                    storage: variant.storage,
                    graphics: variant.graphics,
                    operatingSystem: variant.operatingSystem,
                    opticalDrive: variant.opticalDrive,
                    powerSupply: variant.powerSupply,
                    warranty: variant.warranty,
                    raidController: variant.raidController,
                    systemManagement: variant.systemManagement,
                    configNote: variant.configNote,
                  }}
                />
                {isAdmin(staff) ? (
                  <DangerZone
                    config={DELETABLE.variants}
                    id={variant.id}
                    reference={variant.sku}
                    className="mt-6 rounded-[--radius-md] border border-danger-600/30 bg-danger-50/40 p-4"
                  />
                ) : null}
              </div>
            </details>
          ))}

          <div className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h3 className="mb-5 text-[14px] font-medium text-graphite-900">Add a licence option</h3>
            <VariantForm productId={product.id} />
          </div>
        </div>
      </section>

      {isAdmin(staff) ? (
        <DangerZone
          config={DELETABLE.products}
          id={product.id}
          reference={product.slug}
          archived={product.deletedAt !== null}
          // The header already carries an archive button; see `showArchive`.
          showArchive={false}
        />
      ) : null}
    </div>
  );
}
