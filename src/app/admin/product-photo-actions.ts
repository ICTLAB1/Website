"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { invalidate, tags } from "@/lib/cache";
import { MAX_PHOTO_BYTES, PHOTO_FORMATS, storeUpload } from "@/lib/uploads";

/**
 * Putting a photograph on a product.
 *
 * The same machinery as brand logos, over a different column and with three
 * deliberate differences.
 *
 * **A larger budget.** A logo that will not fit in half a megabyte is a mistake;
 * a photograph of a laptop at a usable resolution simply is a megabyte.
 *
 * **No SVG.** Vector artwork is the whole reason SVG is accepted for logos, and
 * the reason `app/uploads/[name]/route.ts` has to defang it — an SVG is a
 * document that can carry script. A product photograph has no such reason, so
 * the narrower surface is taken where it costs nothing.
 *
 * **Staff, not admin.** Brand logos are admin-only, because a publisher's mark
 * is site identity. A product photograph is catalogue data — the same class of
 * thing as the product's name, description and specification, all of which
 * `saveProduct` already lets a SALES account edit. Restricting the upload to an
 * administrator while leaving the `imageUrl` field editable in the form beside
 * it would not be a control, only an inconsistency.
 *
 * Everything else is the brand-logo contract, and holds for the same reasons:
 * the file is validated by reading its bytes rather than believing its name or
 * declared type, it is stored under a digest of its own contents so no part of
 * the caller's input reaches the filesystem, and it lives on a volume outside
 * the container so it survives a rebuild.
 *
 * ## What this replaces
 *
 * `Product.imageUrl` could already be typed into the product form as a path
 * under `/products/`, but only a file committed to the repository could be
 * there — which meant a developer, a commit and a deploy for every photograph.
 * The column is unchanged and accepts both; this simply makes the other kind of
 * value reachable from the panel.
 */

const MAX_MEGABYTES = (MAX_PHOTO_BYTES / (1024 * 1024)).toFixed(0);

async function findProduct(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) return null;

  return prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, slug: true, name: true, imageUrl: true },
  });
}

/**
 * Invalidates everywhere a product photograph is rendered.
 *
 * Broader than it looks, and deliberately so: the picture appears on the
 * product page, in every catalogue listing, on the brand pages and in the
 * homepage grids, and a photograph that appears in one of those and not the
 * others reads as a broken deployment.
 */
function invalidatePhoto(slug: string) {
  invalidate(tags.catalogue, tags.product(slug), tags.pages);
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/photos");
}

export async function uploadProductPhoto(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const product = await findProduct(formData);
  if (!product) return { status: "error", message: "That product no longer exists." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: "Choose a file to upload.",
      fieldErrors: { photo: ["Required"] },
    };
  }

  // Checked before reading, so an enormous upload is refused rather than pulled
  // into memory to be measured.
  if (file.size > MAX_PHOTO_BYTES) {
    return {
      status: "error",
      message: `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${MAX_MEGABYTES} MB — export it at around 1200 pixels wide and it will be a fraction of that, and look no different on the page.`,
      fieldErrors: { photo: ["Too large"] },
    };
  }

  const stored = await storeUpload(Buffer.from(await file.arrayBuffer()), {
    maxBytes: MAX_PHOTO_BYTES,
    allow: PHOTO_FORMATS,
  });
  if (!stored) {
    return {
      status: "error",
      message:
        "That file is not a photograph this site can use. Accepted: PNG, JPEG, WEBP or AVIF. SVG is not accepted for product photographs. A file renamed to end in .jpg is still refused — the contents are what is checked.",
      fieldErrors: { photo: ["Not a usable photograph"] },
    };
  }

  await prisma.product.update({ where: { id: product.id }, data: { imageUrl: stored.url } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.product_photo_uploaded",
    entityType: "product",
    entityId: product.id,
    // The previous value, because replacing a photograph is the change somebody
    // later wants to undo and the old digest is the only way back to the file.
    metadata: { file: stored.name, type: stored.contentType, replaced: product.imageUrl },
    ip: await clientIp(),
  });

  invalidatePhoto(product.slug);
  revalidatePath(`/admin/products/${product.id}`);

  return { status: "success", message: `${product.name} now shows its photograph.` };
}

/**
 * Takes the photograph off a product.
 *
 * The file itself stays on disk. It is named after a digest of its contents, so
 * once the column is cleared nothing references it — and deleting it would risk
 * removing a picture another product happens to share, which is not
 * hypothetical when two configurations of one model are photographed once.
 */
export async function removeProductPhoto(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const product = await findProduct(formData);
  if (!product) return { status: "error", message: "That product no longer exists." };

  await prisma.product.update({ where: { id: product.id }, data: { imageUrl: null } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.product_photo_removed",
    entityType: "product",
    entityId: product.id,
    metadata: { removed: product.imageUrl },
    ip: await clientIp(),
  });

  invalidatePhoto(product.slug);
  revalidatePath(`/admin/products/${product.id}`);

  return {
    status: "success",
    message: `${product.name} is back to a labelled frame until another photograph is added.`,
  };
}
