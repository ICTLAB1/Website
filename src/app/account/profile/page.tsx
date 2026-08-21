import type { Metadata } from "next";

import { AccountForm } from "@/components/account/account-form";
import { Field, Input } from "@/components/ui/form";
import { updateProfile } from "@/app/account/actions";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function AccountProfilePage() {
  const session = await requireUser("/account/profile");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    // The password hash is never selected, so it cannot reach a component.
    select: { name: true, email: true, phone: true, role: true, createdAt: true, lastLoginAt: true },
  });
  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-10">
      <section>
        <h2 className="text-[1.15rem]">Profile</h2>
        <p className="mt-2 text-[14px] text-ink-600">
          Your name and phone number as they appear on quotations and correspondence.
        </p>

        <div className="mt-6">
          <AccountForm action={updateProfile} submitLabel="Save changes" pendingLabel="Saving…">
            <Field label="Full name" name="name" required>
              <Input name="name" defaultValue={user.name} autoComplete="name" required />
            </Field>
            <Field label="Phone" name="phone">
              <Input name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" />
            </Field>
          </AccountForm>
        </div>
      </section>

      <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
        <h3 className="text-[15px] font-semibold text-graphite-900">Account details</h3>
        <dl className="mt-4 space-y-2.5 text-[13px]">
          <div className="flex gap-3">
            <dt className="w-32 shrink-0 text-ink-500">Email</dt>
            <dd className="break-all text-ink-700">{user.email}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-32 shrink-0 text-ink-500">Account type</dt>
            <dd className="text-ink-700">{user.role === "CUSTOMER" ? "Customer" : "Staff"}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-32 shrink-0 text-ink-500">Member since</dt>
            <dd className="text-ink-700">{formatDate(user.createdAt)}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-32 shrink-0 text-ink-500">Last sign-in</dt>
            <dd className="text-ink-700">{formatDate(user.lastLoginAt)}</dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-500">
          To change your email address, contact us — the change affects invoicing records and is
          made by our team. To change your password, sign out and use the password reset link.
        </p>
      </section>
    </div>
  );
}
