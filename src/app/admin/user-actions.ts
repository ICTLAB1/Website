"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { hashPassword } from "@/lib/auth/password";
import { issueInvite, undeliveredMessage } from "@/lib/auth/invitations";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { emailSchema, fieldErrorsOf, phoneSchema } from "@/lib/validation";
import { ROLE_LABELS } from "@/lib/auth/capabilities";
import { logger } from "@/lib/logger";

/**
 * Creating accounts from the administration panel.
 *
 * Until now an account could only come into existence through public
 * registration, which meant the only way to give a colleague access was to ask
 * them to sign up and then promote them — two steps, one of which happens
 * outside the panel and neither of which an administrator could see the state
 * of.
 *
 * ## No password is set here
 *
 * The form asks for a name, an address and a role, and never for a password.
 * An administrator typing a password for somebody else means that password
 * exists in a second head, gets sent over WhatsApp, and is usually still in use
 * a year later. Instead the account is created with an unusable random hash and
 * the person is emailed a link to set their own. Nobody but them ever knows it.
 *
 * ## The address is proven, not asserted
 *
 * `emailVerified` is left null at creation even though an administrator vouched
 * for the address. Following the link proves control of the mailbox, which is
 * the only thing that actually establishes it — and it is set at that point, in
 * the reset-password route, so an invited colleague is not asked to verify
 * separately afterwards.
 */

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Enter their full name.").max(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  /*
   * Every role the business has. The list is the enum rather than a subset,
   * because a role that exists and cannot be assigned is a role nobody can
   * actually hold.
   */
  role: z.enum([
    "ADMIN",
    "DIRECTOR",
    "SALES_MANAGER",
    "SALES",
    "PROCUREMENT",
    "OPERATIONS",
    "ACCOUNTS",
    "SUPPORT",
    "CUSTOMER",
  ]),
});

export async function createUser(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const { name, email, phone, role } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true },
  });

  if (existing) {
    return {
      status: "error",
      message: existing.deletedAt
        ? "An archived account already uses that address. Restore it and change its role instead of creating a second one."
        : "An account already uses that address. Change its role instead of creating a second one.",
      fieldErrors: { email: ["Already in use"] },
    };
  }

  /*
   * A random hash nobody holds the input to.
   *
   * The column is not nullable, and leaving it empty or setting a known
   * placeholder would create an account that a password of "" or a guessed
   * constant could open. Hashing 32 random bytes produces a value that no input
   * verifies against, so the only route in is the emailed link.
   */
  const unusable = await hashPassword(randomBytes(32).toString("hex"));

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone ? phone : null,
      role,
      passwordHash: unusable,
    },
    select: { id: true, name: true, email: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.user_created",
    entityType: "User",
    entityId: user.id,
    metadata: { role },
    ip: await clientIp(),
  });

  const invite = await issueInvite(user);

  revalidatePath("/admin/users");
  revalidatePath("/admin/customers");

  if (!invite.delivered) {
    logger.warn("invite_not_emailed", { role });
    return { status: "error", message: undeliveredMessage(user.email, invite.link, "Check Settings → Outbound email if this keeps happening.") };
  }

  return {
    status: "success",
    message: `${user.name} has been added as ${ROLE_LABELS[role].toLowerCase()}. They have been emailed a link to choose a password.`,
  };
}

/**
 * Sends a fresh invitation to somebody who has not set a password yet, or who
 * has lost the email.
 *
 * Available for any account: it is the same mechanism as a password reset, and
 * an administrator asking for one on a colleague's behalf is the ordinary case
 * when somebody is locked out.
 */
export async function resendInvite(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return { status: "error", message: "Choose a user." };

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { status: "error", message: "That user no longer exists." };

  const invite = await issueInvite(user);

  await recordAudit({
    actorId: staff.id,
    action: "admin.invite_resent",
    entityType: "User",
    entityId: user.id,
    ip: await clientIp(),
  });

  if (!invite.delivered) {
    return { status: "error", message: undeliveredMessage(user.email, invite.link, "Check Settings → Outbound email if this keeps happening.") };
  }

  return {
    status: "success",
    message: `A new link has been emailed to ${user.email}. Any earlier link has stopped working.`,
  };
}
