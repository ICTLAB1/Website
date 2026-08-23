import Link from "next/link";
import type { Metadata } from "next";

import { ProductPhotoForm } from "@/components/admin/product-photo-form";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { FormFactor } from "@prisma/client";
import { hardwareClassLabel } from "@/lib/catalogue/hardware";

export const metadata: Metadata = { title: "Product photographs" };

/**
 * Every product's photograph, on one screen, uploadable in place.
 *
 * ## Why this exists as well as the panel on the product page
 *
 * The panel on the edit screen makes uploading a photograph *possible*. This
 * makes doing it for the whole catalogue *practical*. The two are not the same
 * thing: filling in thirty-six hardware models through the edit screen is
 * thirty-six navigations, thirty-six page loads and thirty-six chances to lose
 * your place, and a task shaped like that does not get finished.
 *
 * The rule it is built around: the ones without a photograph come first. A
 * worklist that opens on the work already done is a worklist nobody uses.
 *
 * ## Not paginated
 *
 * A deliberate choice, and one to revisit rather than defend forever. The point
 * of the screen is to work through a backlog in one pass, and pagination puts
 * the end of that backlog behind a control. At a few hundred products this is
 * fine; past that it wants a filter by brand rather than a page number, because
 * photographs arrive from one manufacturer at a time.
 */
export default async function AdminProductPhotosPage() {
  await requireStaff();

  const products = await prisma.product.findMany({
    where: { deletedAt: null, status: { not: "ARCHIVED" } },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      formFactor: true,
      brand: { select: { name: true } },
    },
  });

  /*
   * Hardware only, and this is the substantive decision on the page.
   *
   * A licence has nothing to photograph. Listing Microsoft 365 here as
   * "missing a photograph" would put sixty rows of work on the screen that
   * nobody should ever do, and would bury the models that genuinely need one.
   * Software gets the brand-coloured tile on its product page, which is the
   * right answer for it.
   */
  const hardware = products.filter((product) => product.formFactor !== null);

  const missing = hardware.filter((product) => !product.imageUrl);
  const done = hardware.filter((product) => product.imageUrl);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/products" className="text-[13px] text-accent-700 hover:underline">
          &larr; Products
        </Link>
        <h1 className="mt-2 text-2xl">Product photographs</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Every hardware model in the catalogue. Upload a picture of the model itself — a buyer
          comparing two machines is looking at the photograph, and one that is not the product is
          worse than none. Licences are not listed here; there is nothing to photograph.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-600">
          <Badge tone={missing.length === 0 ? "success" : "warning"}>
            {done.length} of {hardware.length} photographed
          </Badge>
          {missing.length > 0 ? <span>{missing.length} still to do.</span> : null}
        </p>
      </header>

      {missing.length > 0 ? (
        <section>
          <h2 className="mb-4 text-[1.05rem]">Needs a photograph</h2>
          <ul className="space-y-4">
            {missing.map((product) => (
              <PhotoRow key={product.id} product={product} />
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-[--radius-lg] border border-line bg-surface-muted p-5 text-[14px] text-ink-600">
          Every hardware model has a photograph.
        </p>
      )}

      {done.length > 0 ? (
        <section>
          <h2 className="mb-4 text-[1.05rem]">Photographed</h2>
          <ul className="space-y-4">
            {done.map((product) => (
              <PhotoRow key={product.id} product={product} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

type Row = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  formFactor: FormFactor | null;
  brand: { name: string };
};

function PhotoRow({ product }: { product: Row }) {
  return (
    <li className="rounded-[--radius-lg] border border-line bg-white p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-graphite-900">{product.name}</p>
          <p className="text-meta text-ink-500">
            {product.brand.name}
            {product.formFactor ? ` · ${hardwareClassLabel(product.formFactor)}` : ""}
          </p>
        </div>
        <span className="flex shrink-0 gap-3 text-[13px]">
          <Link href={`/admin/products/${product.id}`} className="text-accent-700 hover:underline">
            Edit
          </Link>
          <Link href={`/products/${product.slug}`} className="text-accent-700 hover:underline">
            View
          </Link>
        </span>
      </div>
      <ProductPhotoForm
        productId={product.id}
        productName={product.name}
        imageUrl={product.imageUrl}
        formFactor={product.formFactor}
        compact
      />
    </li>
  );
}
