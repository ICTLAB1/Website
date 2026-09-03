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
 * Putting a customer's logo on a customer record.
 *
 * The mechanics are the brand logo's — validate by reading the file, store it
 * under a digest of its own contents, write the path — and the reason for a
 * separate action rather than a shared one is what surrounds them: this writes
 * a different table, invalidates a different tag, and records a different audit
 * event. Displaying somebody else's trademark is the kind of thing an audit
 * trail exists for, and "admin.brand_logo_uploaded" against a customer id would
 * make that trail read wrong.
 *
 * Uploading does not publish. The row still needs a confirmed permission date
 * and `published` turned on before anything reaches a visitor — see
 * `lib/client-logo`, which is the only place that decides.
 */

const MAX_KILOBYTES = Math.floor(MAX_UPLOAD_BYTES / 1024);

async function findClient(formData: FormData) {
  const id = String(formData.get("clientId") ?? "").trim();
  if (!id) return null;
  return prisma.clientLogo.findUnique({ where: { id }, select: { id: true, name: true } });
}

export async function uploadClientLogo(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const client = await findClient(formData);
  if (!client) return { status: "error", message: "That customer no longer exists." };

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

  await prisma.clientLogo.update({ where: { id: client.id }, data: { logoUrl: stored.url } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.client_logo_uploaded",
    entityType: "clientLogo",
    entityId: client.id,
    metadata: { file: stored.name, type: stored.contentType },
    ip: await clientIp(),
  });

  invalidate(tags.clientLogos, tags.pages);
  revalidatePath(`/admin/clients/${client.id}`);

  return {
    status: "success",
    message: `${client.name}'s logo is on file. It appears on the site once permission is confirmed and the record is published.`,
  };
}

/**
 * Takes the artwork off a customer record.
 *
 * The file itself is left on disk. It is named after a digest of its contents,
 * so nothing references it once the column is cleared, and deleting it would
 * risk removing artwork another record happens to share.
 *
 * Removing the logo takes the customer off the public strip immediately —
 * there is no lettered fallback here, deliberately. A customer's name set in
 * type, in a strip captioned as customers, is a claim with nothing behind it.
 */
export async function removeClientLogo(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const client = await findClient(formData);
  if (!client) return { status: "error", message: "That customer no longer exists." };

  await prisma.clientLogo.update({ where: { id: client.id }, data: { logoUrl: null } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.client_logo_removed",
    entityType: "clientLogo",
    entityId: client.id,
    ip: await clientIp(),
  });

  invalidate(tags.clientLogos, tags.pages);
  revalidatePath(`/admin/clients/${client.id}`);

  return { status: "success", message: `${client.name} is off the logo strip.` };
}
