"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { encryptSecret } from "@/lib/secret-box";
import { resetMailTransport } from "@/lib/mail";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Saving the outbound mail server.
 *
 * ADMIN only, and the same two rules as the payment credentials.
 *
 * A blank password field means "leave the stored one alone", never "clear it".
 * The form cannot show what is saved — that is the point of it being
 * write-only — so blank is the normal state of the page, and treating it as an
 * instruction to delete would wipe the password every time somebody corrected a
 * port number. Clearing is a separate, explicit checkbox.
 *
 * A blank *other* field means "fall back to the environment", which is how this
 * ships onto a running deployment without a moment where email stops: nothing
 * is stored at first, so every field falls through to the `.env` values that
 * were already working.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const blankToNull = (max: number) =>
  trimmed(max)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable();

const schema = z.object({
  host: blankToNull(200).refine(
    (value) => value === null || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value),
    { message: "That does not look like a server name. It should look like smtp.office365.com." },
  ),
  port: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? Number(value) : null))
    .refine((value) => value === null || (Number.isInteger(value) && value > 0 && value < 65536), {
      message: "A port is a whole number between 1 and 65535. Usually 587.",
    }),
  secure: z.coerce.boolean().default(false),
  username: blankToNull(200),
  password: blankToNull(300),
  clearPassword: z.coerce.boolean().default(false),
  fromAddress: blankToNull(200).refine((value) => value === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), {
    message: "Enter a single email address, with no name around it.",
  }),
  fromName: blankToNull(120),
  salesNotificationEmail: blankToNull(200).refine(
    (value) => value === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
    { message: "Enter a single email address." },
  ),
});

export async function saveMailSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`mailsettings:${admin.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  const parsed = schema.safeParse({
    host: formData.get("host") ?? "",
    port: formData.get("port") ?? "",
    secure: formData.get("secure") === "on",
    username: formData.get("username") ?? "",
    password: formData.get("password") ?? "",
    clearPassword: formData.get("clearPassword") === "on",
    fromAddress: formData.get("fromAddress") ?? "",
    fromName: formData.get("fromName") ?? "",
    salesNotificationEmail: formData.get("salesNotificationEmail") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;
  const existing = await prisma.mailSettings.findUnique({
    where: { id: "singleton" },
    select: { password: true },
  });

  const password = input.clearPassword
    ? null
    : input.password
      ? encryptSecret(input.password)
      : (existing?.password ?? null);

  /*
   * A server with no sender address cannot send anything, and the failure would
   * appear at the first enquiry rather than here. Refused where it can be fixed.
   */
  if (input.host && !input.fromAddress) {
    return {
      status: "error",
      message: "Add the address messages should come from. Most providers require it to be the same mailbox you sign in as.",
      fieldErrors: { fromAddress: ["Required when a mail server is set."] },
    };
  }

  const data = {
    host: input.host,
    port: input.port,
    secure: input.secure,
    username: input.username,
    password,
    fromAddress: input.fromAddress,
    fromName: input.fromName,
    salesNotificationEmail: input.salesNotificationEmail,
    updatedById: admin.id,
  };

  await prisma.mailSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  // The transport is keyed on these values and would rebuild on its own; this
  // makes the change immediate for the test button pressed straight afterwards.
  resetMailTransport();

  // What changed, never what it changed to.
  await recordAudit({
    actorId: admin.id,
    action: "settings.mail_saved",
    entityType: "MailSettings",
    entityId: "singleton",
    metadata: {
      hostSet: Boolean(input.host),
      passwordReplaced: Boolean(input.password),
      passwordCleared: input.clearPassword,
      port: input.port,
      secure: input.secure,
    },
    ip: await clientIp(),
  });

  return {
    status: "success",
    message: input.host
      ? "Saved. Send a test email below to confirm the server accepts it."
      : "Saved. With no server set, messages fall back to whatever is configured on the server itself.",
  };
}
