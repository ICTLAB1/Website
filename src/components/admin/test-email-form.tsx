"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { sendTestEmail } from "@/app/admin/settings/mail-actions";

/**
 * "Is email actually working?"
 *
 * Sends one real message to the signed-in administrator's own address. No
 * recipient field, deliberately: an authenticated form that sends mail to an
 * arbitrary address is a spam relay with a login page in front of it.
 *
 * The result is the point. Every customer-facing flow swallows mail errors on
 * purpose — an enquiry is stored before it is acknowledged, a registration
 * succeeds whether or not the verification link goes out — so a mailbox
 * rejecting every message is indistinguishable from a working one until a
 * customer complains. This is the one place that says what the mail server
 * actually replied.
 */
export function TestEmailForm({ address }: { address: string }) {
  return (
    <AdminForm action={sendTestEmail} submitLabel="Send a test email" pendingLabel="Sending…">
      <p className="text-[13px] leading-relaxed text-ink-600">
        Sends one message to <strong className="text-graphite-900">{address}</strong>, the
        address you are signed in with. If it fails you will see exactly what the mail server
        said, which is usually enough to fix it.
      </p>
    </AdminForm>
  );
}
