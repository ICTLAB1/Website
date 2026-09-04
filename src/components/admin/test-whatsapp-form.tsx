"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input } from "@/components/ui/form";
import { sendTestWhatsAppMessage } from "@/app/admin/settings/whatsapp-actions";

/**
 * "Is WhatsApp actually working?" — the WhatsApp counterpart to the mail test
 * buttons. Asks for a phone number rather than sending to the signed-in
 * administrator automatically, unlike the mail tests: an admin account has no
 * phone number on file, and Meta's test number can in any case only message
 * numbers explicitly added as testers in the app dashboard.
 */
export function TestWhatsAppForm() {
  return (
    <AdminForm action={sendTestWhatsAppMessage} submitLabel="Send a test WhatsApp message" pendingLabel="Sending…">
      <Field
        label="Send the test to"
        name="testPhone"
        hint="A 10-digit Indian mobile number, or one with its own country code. On Meta's free test number, this must already be added as a tester on the WhatsApp API Setup page."
      >
        <Input name="testPhone" type="tel" placeholder="98765 43210" autoComplete="off" />
      </Field>
      <p className="text-[13px] leading-relaxed text-ink-600">
        Sends the order_confirmation template with placeholder values. If it fails because the
        template is not yet approved, that is expected until Meta finishes reviewing it.
      </p>
    </AdminForm>
  );
}
