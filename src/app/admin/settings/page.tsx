import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/guards";
import { getSiteConfig, getSiteIdentity, getStoredSettings } from "@/lib/site-config";
import { SettingsForm } from "@/components/admin/settings-form";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";
import { TestEmailForm } from "@/components/admin/test-email-form";
import { getPaymentSettingsView } from "@/lib/payments/config";
import { getUnconfiguredIdentityKeys } from "@/lib/admin/config-status";
import { isMailConfigured } from "@/lib/mail";
import { crmConnection } from "@/lib/crm/outbox";
import { getMailConfig, getMailSettingsView } from "@/lib/mail-config";
import { MailSettingsForm } from "@/components/admin/mail-settings-form";
import { listAuditLog } from "@/lib/queries/admin";
import { formatDateTime, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

/**
 * Business identity, restricted to ADMIN.
 *
 * The contact details, address, statutory identifiers and grievance officer are
 * editable here and take effect on the public site immediately — no rebuild, no
 * redeploy. Three fields are not editable, and the page says which and why
 * rather than leaving an administrator hunting for them.
 *
 * No secret is displayed, in whole or in part: not the database URL, not the
 * auth secret, not the SMTP password, and not the bank details that reach order
 * emails. Those stay in server configuration precisely so that an administrator
 * account cannot read them.
 */
export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const [config, stored, missing, audit, payments, mail, mailReady, crmState] = await Promise.all([
    getSiteConfig(),
    getStoredSettings(),
    getUnconfiguredIdentityKeys(),
    listAuditLog(25),
    getPaymentSettingsView(),
    getMailSettingsView(),
    isMailConfigured(),
    crmConnection(),
  ]);
  // What the From header will actually say, after the stored-then-environment
  // fallback — not what is typed in the form, which may be blank and inheriting.
  const mailFrom = (await getMailConfig()).from;
  const identity = getSiteIdentity();


  /**
   * The three fields that stay in server configuration, and the reason.
   *
   * The name is read at module scope by every route's metadata, where nothing
   * can be awaited; and renaming a company is a rebrand rather than an edit.
   */
  const fixed: Array<[string, string | null]> = [
    ["Trading name", identity.tradingName],
    ["Registered legal name", identity.legalName],
    ["Canonical URL", identity.url],
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl">Settings</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Your contact details, registered address, GSTIN and grievance officer. Saving here
          updates the public site straight away — no rebuild and no redeploy. Secrets are never
          shown on this page.
        </p>
      </header>

      {missing.length > 0 ? (
        <div className="rounded-[--radius-lg] border border-warning-600/40 bg-warning-50 p-5">
          <h2 className="text-[15px] font-semibold text-warning-700">Still to fill in</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
            These are not set anywhere. The public site leaves the corresponding details out
            rather than inventing them, and says nothing to visitors about their absence.
            Everything except the name can be set in the form below.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {missing.map((key) => (
              <li key={key} className="rounded-[--radius-sm] bg-white px-2 py-1 font-mono text-[11px] text-ink-700">
                {key}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section>
        <h2 className="mb-4 text-[1.05rem]">Business identity</h2>
        <div className="max-w-2xl">
          <SettingsForm stored={stored} effective={config} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[1.05rem]">Payments</h2>
        <div className="max-w-2xl">
          <PaymentSettingsForm settings={payments} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[1.05rem]">Outbound email</h2>
        <p className="mb-4 max-w-2xl text-[13px] leading-relaxed text-ink-600">
          Enquiry confirmations, order confirmations, quotations and account verification links
          all go out over SMTP.{" "}
          {mailReady
            ? "A server is configured — but configured is not the same as working, and every one of those flows deliberately carries on if a message fails, so that a mail outage never costs you an order. That means a mailbox rejecting everything looks exactly like one that is fine. This is how you find out."
            : "No SMTP server is configured, so messages are written to the server log instead of sent. Enquiries and orders are still recorded and visible here; the customer simply hears nothing back."}
        </p>
        <div className="max-w-2xl space-y-6">
          <MailSettingsForm settings={mail} />
          <TestEmailForm address={admin.email} from={mailFrom} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[1.05rem]">Set in server configuration</h2>
        <p className="mb-4 max-w-2xl text-[13px] leading-relaxed text-ink-600">
          Not editable here. The site name is read when each page&rsquo;s metadata is built,
          before anything can be loaded from the database, so changing it needs a deploy —
          which is the right weight for a rebrand. Bank details are deliberately absent from
          this page altogether: they are payment credentials, they reach one outbound order
          email and no page, and no administrator account should be able to read them.
        </p>
        <TableWrap>
          <Table className="min-w-[36rem]">
            <thead>
              <tr>
                <Th>Setting</Th>
                <Th>Value</Th>
              </tr>
            </thead>
            <tbody>
              {fixed.map(([label, value]) => (
                <Tr key={label}>
                  <Td className="font-medium text-graphite-900">{label}</Td>
                  <Td>
                    {value ? (
                      <span className="break-words text-[13px] text-ink-700">{value}</span>
                    ) : (
                      <Badge tone="warning">Not set</Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </section>

      <section>
        <h2 className="mb-4 text-[1.05rem]">Integrations</h2>
        <TableWrap>
          <Table className="min-w-[36rem]">
            <thead>
              <tr>
                <Th>Integration</Th>
                <Th>State</Th>
                <Th>Effect</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td className="font-medium text-graphite-900">Outbound email (SMTP)</Td>
                <Td>
                  {mailReady ? (
                    <Badge tone="success">Configured</Badge>
                  ) : (
                    <Badge tone="warning">Not configured</Badge>
                  )}
                </Td>
                <Td className="text-[13px] text-ink-600">
                  {mailReady
                    ? "A server is set. Whether it accepts our messages is a different question — send a test email above to find out."
                    : "Messages are logged server-side instead of sent. Enquiries are still stored and visible here."}
                </Td>
              </Tr>
              <Tr>
                <Td className="font-medium text-graphite-900">
                  <Link href="/admin/settings/crm" className="text-accent-700 hover:underline">
                    CRM integration
                  </Link>
                </Td>
                <Td>
                  {crmState.connected ? (
                    <Badge tone="success">Connected</Badge>
                  ) : (
                    <Badge tone="warning">Not connected</Badge>
                  )}
                </Td>
                <Td className="text-[13px] text-ink-600">
                  {crmState.connected
                    ? "Pipeline events are being sent to the configured endpoint."
                    : crmState.detail}
                </Td>
              </Tr>
              <Tr>
                <Td className="font-medium text-graphite-900">Database</Td>
                <Td>
                  <Badge tone="success">Connected</Badge>
                </Td>
                <Td className="text-[13px] text-ink-600">
                  Connection details are held in configuration and never displayed.
                </Td>
              </Tr>
            </tbody>
          </Table>
        </TableWrap>
      </section>

      <section>
        <h2 className="mb-4 text-[1.05rem]">Audit log</h2>
        <p className="mb-4 max-w-2xl text-[13px] leading-relaxed text-ink-600">
          Append-only record of privileged and security-relevant actions. Metadata passes
          through the same redaction as the application logs, so no credential or token can be
          recorded here.
        </p>
        <TableWrap>
          <Table className="min-w-[40rem]">
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 ? (
                <Tr>
                  <Td className="text-ink-500">No recorded activity yet.</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                </Tr>
              ) : (
                audit.map((entry) => (
                  <Tr key={entry.id}>
                    <Td className="whitespace-nowrap text-[13px]">{formatDateTime(entry.createdAt)}</Td>
                    <Td className="text-[13px]">{entry.actor?.name ?? "System"}</Td>
                    <Td className="font-mono text-[12px]">{entry.action}</Td>
                    <Td className="text-[13px] text-ink-500">{humanise(entry.entityType)}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </section>
    </div>
  );
}
