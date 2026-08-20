import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { BuyNowForm } from "@/components/catalogue/buy-now-form";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { effectivePriceMinor } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Place an order",
  description: "Order a licence against your purchase order.",
  path: "/buy",
  noIndex: true,
});

type PageProps = { searchParams: Promise<{ sku?: string | string[] }> };

/**
 * Direct purchase.
 *
 * Reachable only for a SKU whose product permits direct purchase. An
 * enquiry-only or zero-priced SKU 404s here, and the API enforces the same rule
 * independently — the page check is for the customer's benefit, not the
 * security boundary.
 */
export default async function BuyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.sku) ? params.sku[0] : params.sku;
  const sku = raw?.trim().toUpperCase();
  if (!sku || sku.length > 64) notFound();

  const variant = await prisma.productVariant.findFirst({
    where: {
      sku,
      deletedAt: null,
      product: { status: "ACTIVE", deletedAt: null, purchaseMode: { in: ["DIRECT", "BOTH"] } },
    },
    select: {
      sku: true,
      name: true,
      currency: true,
      listPriceMinor: true,
      salePriceMinor: true,
      gstRatePercent: true,
      product: { select: { name: true, slug: true, brand: { select: { name: true } } } },
    },
  });
  if (!variant) notFound();

  const unitPriceMinor = effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor);
  // A zero price means the product is quoted in practice, whatever its mode.
  if (unitPriceMinor <= 0) notFound();

  const user = await getSessionUser();
  const [company, profile] = await Promise.all([
    user?.companyId
      ? prisma.company.findUnique({ where: { id: user.companyId }, select: { name: true } })
      : Promise.resolve(null),
    user
      ? prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="container-page pb-16">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          { label: variant.product.name, href: `/products/${variant.product.slug}` },
          { label: "Order" },
        ]}
      />

      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-[2.15rem]">Place an order</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            For {variant.product.brand.name} licensing bought against a purchase order. Buying
            for a larger team, or need several products on one quotation?{" "}
            <Link href="/enquiry" className="text-accent-700 underline underline-offset-2">
              Request an enterprise quote
            </Link>{" "}
            instead.
          </p>
        </header>

        <BuyNowForm
          sku={variant.sku}
          productName={variant.product.name}
          variantName={variant.name}
          unitPriceMinor={unitPriceMinor}
          gstRatePercent={variant.gstRatePercent}
          currency={variant.currency}
          prefill={{
            contactName: user?.name ?? "",
            contactEmail: user?.email ?? "",
            companyName: company?.name ?? user?.companyName ?? "",
            phone: profile?.phone ?? "",
          }}
        />
      </div>
    </div>
  );
}
