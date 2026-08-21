import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/guards";
import { getSiteConfig, getUnconfiguredIdentityKeys } from "@/lib/site-config";
import { isMailConfigured } from "@/lib/mail";
import { listAuditLog } from "@/lib/queries/admin";
import { formatDateTime, humanise } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

/**
 * Read-only configuration view, restricted to ADMIN.
 *
 * Deliberately shows only whether a value is configured, and only for
 * non-secret business identity fields. No secret - database URL, auth secret,
 * SMTP password - is ever displayed, in whole or in part.
 */
export default async function AdminSettingsPage() {
  await requireAdmin();
  const config = getSiteConfig();
  const missing = getUnconfiguredIdentityKeys();
  const mailReady = isMailConfigured();
  const audit = await listAuditLog(25);

  const identity: Array<[string, string | null]> = [
    ["Trading name", config.tradingName],
    ["Registered legal name", config.legalName],
    ["Tagline", config.tagline],
    ["Sales email", config.email.sales],
    ["Support email", config.email.support],
    ["Enterprise email", config.email.enterprise],
    ["Sales phone", config.phone.sales],
    ["Support phone", config.phone.support],
    ["Registered address", config.formattedAddress],
    ["GSTIN", config.gstin],
    ["CIN", config.cin],
    ["Support hours", config.supportHours],
    ["Canonical URL", config.url],
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl">Settings</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Business identity is supplied through environment configuration rather than stored in
          the database, so it can differ per deployment. Secrets are never displayed here.
        </p>
      </header>

      {missing.length > 0 ? (
        <div className="rounded-[--radius-lg] border border-warning-600/40 bg-warning-50 p-5">
          <h2 className="text-[15px] font-semibold text-warning-700">Review required before launch</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
            These values are unset. The public site omits the corresponding details rather than
            substituting placeholder company information.
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
        <TableWrap>
          <Table className="min-w-[36rem]">
            <thead>
              <tr>
                <Th>Setting</Th>
                <Th>Value</Th>
              </tr>
            </thead>
            <tbody>
              {identity.map(([label, value]) => (
                <Tr key={label}>
                  <Td className="font-medium text-graphite-900">{label}</Td>
                  <Td>
                    {value ? (
                      <span className="break-words text-[13px] text-ink-700">{value}</span>
                    ) : (
                      <Badge tone="warning">Not configured</Badge>
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
                    ? "Enquiry confirmations and password reset emails are delivered."
                    : "Messages are logged server-side instead of sent. Enquiries are still stored and visible here."}
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
