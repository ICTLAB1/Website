"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { invalidate, tags } from "@/lib/cache";
import { MAX_UPLOAD_BYTES, storeUpload } from "@/lib/uploads";

/**
 * Putting a publisher's logo on a brand.
 *
 * The alternative was a terminal: `public/` is baked into the container image,
 * so a file copied onto a running server vanishes at the next rebuild, and the
 * only durable route was SSH and `scp`. That is not a reasonable thing to ask
 * of the person who runs this business.
 *
 * The upload is validated by reading it, not by believing it — see
 * `lib/uploads`. Everything a browser sends about a file (its name, its type,
 * its size) is written by whoever is sending it.
 */

const MAX_KILOBYTES = Math.floor(MAX_UPLOAD_BYTES / 1024);

export async function uploadBrandLogo(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const brandId = String(formData.get("brandId") ?? "").trim();
  if (!brandId) return { status: "error", message: "No brand specified." };

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, slug: true, name: true },
  });
  if (!brand) return { status: "error", message: "That brand no longer exists." };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a file to upload.", fieldErrors: { logo: ["Required"] } };
  }

  // Checked before reading, so an enormous upload is refused rather than
  // pulled into memory to be measured.
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      status: "error",
      message: `That file is ${Math.ceil(file.size / 1024)} KB. The limit is ${MAX_KILOBYTES} KB — a logo should be far smaller, so this is usually a photograph or an uncompressed export.`,
      fieldErrors: { logo: ["Too large"] },
    };
  }

  const stored = await storeUpload(Buffer.from(await file.arrayBuffer()));
  if (!stored) {
    return {
      status: "error",
      message:
        "That file is not an image this site can use. Accepted: SVG, PNG, WEBP, JPEG or AVIF. A file renamed to end in .png is still refused — the contents are what is checked.",
      fieldErrors: { logo: ["Not a usable image"] },
    };
  }

  await prisma.brand.update({ where: { id: brand.id }, data: { logoUrl: stored.url } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.brand_logo_uploaded",
    entityType: "brand",
    entityId: brand.id,
    metadata: { file: stored.name, type: stored.contentType },
    ip: await clientIp(),
  });

  invalidate(tags.brands, tags.catalogue, tags.brand(brand.slug), tags.pages);
  revalidatePath(`/admin/brands/${brand.id}`);

  return { status: "success", message: `${brand.name}'s logo is live on the site.` };
}

/**
 * Puts a brand back to its lettered wordmark.
 *
 * The file itself is left on disk. It is named after a digest of its contents,
 * so it is referenced by nothing once the column is cleared, and deleting it
 * would risk removing artwork another brand happens to share.
 */
export async function removeBrandLogo(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const brandId = String(formData.get("brandId") ?? "").trim();
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, slug: true, name: true },
  });
  if (!brand) return { status: "error", message: "That brand no longer exists." };

  await prisma.brand.update({ where: { id: brand.id }, data: { logoUrl: null } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.brand_logo_removed",
    entityType: "brand",
    entityId: brand.id,
    ip: await clientIp(),
  });

  invalidate(tags.brands, tags.catalogue, tags.brand(brand.slug), tags.pages);
  revalidatePath(`/admin/brands/${brand.id}`);

  return { status: "success", message: `${brand.name} is back to its lettered wordmark.` };
}
