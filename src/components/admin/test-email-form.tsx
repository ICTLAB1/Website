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
export function TestEmailForm({ address, from }: { address: string; from: string | null }) {
  return (
    <AdminForm action={sendTestEmail} submitLabel="Send a test email" pendingLabel="Sending…">
      <div className="space-y-2 text-[13px] leading-relaxed text-ink-600">
        {/*
          * From and To, stated separately and unambiguously.
          *
          * The panel previously named only the recipient, and it was read as the
          * sender — a reasonable reading, and an alarming one if you think your
          * site is emailing customers from a personal mailbox. Every message the
          * site sends comes from the sender address configured above; the test is
          * the one exception in where it goes, not where it comes from.
          */}
        <p>
          <span className="text-ink-500">From</span>{" "}
          <strong className="text-graphite-900">{from ?? "not set"}</strong>
          {" — the same address every customer email comes from."}
        </p>
        <p>
          <span className="text-ink-500">To</span>{" "}
          <strong className="text-graphite-900">{address}</strong>
          {" — your own sign-in address, so a test cannot be sent to anyone else."}
        </p>
        <p className="pt-1">
          If it fails you will see exactly what the mail server said, which is usually enough to
          fix it.
        </p>
      </div>
    </AdminForm>
  );
}
