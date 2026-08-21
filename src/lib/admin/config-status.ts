import "server-only";
import { getSiteConfig } from "@/lib/site-config";

/**
 * Business identity that has not been configured yet.
 *
 * This lives under `lib/admin` deliberately. It used to sit beside
 * `getSiteConfig`, and three public surfaces — the footer, the contact page and
 * the `COMPANY_INFO` block — grew warning panels from it that told any visitor
 * the site was half-configured and then named the environment variables to set.
 *
 * A visitor must never learn either fact. A detail that is not configured is
 * simply not rendered; the surrounding copy is written so its absence reads as
 * an editorial choice rather than a gap. Whether the deployment is complete is
 * an operator's question, so the answer belongs behind the admin login and
 * nowhere else. The import path is now the reminder, and
 * `config-status.test.ts` enforces it.
 */
export function getUnconfiguredIdentityKeys(): string[] {
  const config = getSiteConfig();
  const missing: string[] = [];
  if (!config.legalName) missing.push("COMPANY_LEGAL_NAME");
  if (!config.email.sales) missing.push("COMPANY_EMAIL_SALES");
  if (!config.email.support) missing.push("COMPANY_EMAIL_SUPPORT");
  if (!config.phone.sales) missing.push("COMPANY_PHONE_SALES");
  if (!config.hasAddress) missing.push("COMPANY_ADDRESS_LINE1 / COMPANY_CITY");
  if (!config.gstin) missing.push("COMPANY_GSTIN");
  // Publishing a named grievance officer is a legal requirement for an online
  // seller in India, not a nicety, so an unset one is listed alongside the rest.
  if (!config.grievance.name || !config.grievance.email) {
    missing.push("COMPANY_GRIEVANCE_OFFICER_NAME / COMPANY_GRIEVANCE_OFFICER_EMAIL");
  }
  return missing;
}
