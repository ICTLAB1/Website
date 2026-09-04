"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { sendTestAzureAcsEmail } from "@/app/admin/settings/mail-actions";

/**
 * "Is Azure actually working?" — `TestEmailForm`'s counterpart for the system
 * mail channel.
 *
 * Only rendered once Azure Communication Services is switched on: there is
 * nothing to test before then, and a button that always sends through the
 * mailbox above whenever Azure is unset would just be a second copy of the
 * other test button.
 */
export function TestAzureAcsEmailForm({ address, from }: { address: string; from: string }) {
  return (
    <AdminForm action={sendTestAzureAcsEmail} submitLabel="Send a test email via Azure" pendingLabel="Sending…">
      <div className="space-y-2 text-[13px] leading-relaxed text-ink-600">
        <p>
          <span className="text-ink-500">From</span>{" "}
          <strong className="text-graphite-900">{from}</strong>
          {" — the same address every verification code, order and payment confirmation, and status update comes from."}
        </p>
        <p>
          <span className="text-ink-500">To</span>{" "}
          <strong className="text-graphite-900">{address}</strong>
          {" — your own sign-in address, so a test cannot be sent to anyone else."}
        </p>
        <p className="pt-1">
          If it fails you will see exactly what Azure said, which is usually enough to fix it.
        </p>
      </div>
    </AdminForm>
  );
}
