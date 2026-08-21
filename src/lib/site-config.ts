import "server-only";
import { appUrl, optionalEnv } from "@/lib/env";

/**
 * Business identity.
 *
 * Every field is sourced from configuration. Where a value has not been
 * configured we return `null` and the UI renders an explicit "not configured"
 * state - the application never substitutes invented company details such as a
 * fake address, phone number, GSTIN or email.
 *
 * These are public-facing, non-secret values (the kind printed on a letterhead).
 * They are read server-side and passed to client components as props, so no
 * configuration is inlined into the browser bundle.
 */
export type SiteConfig = ReturnType<typeof getSiteConfig>;

const FALLBACK_TRADING_NAME = "ICT Lab";

export function getSiteConfig() {
  const tradingName = optionalEnv("COMPANY_TRADING_NAME") ?? FALLBACK_TRADING_NAME;
  const legalName = optionalEnv("COMPANY_LEGAL_NAME") ?? null;

  const address = {
    line1: optionalEnv("COMPANY_ADDRESS_LINE1") ?? null,
    line2: optionalEnv("COMPANY_ADDRESS_LINE2") ?? null,
    city: optionalEnv("COMPANY_CITY") ?? null,
    state: optionalEnv("COMPANY_STATE") ?? null,
    postcode: optionalEnv("COMPANY_POSTCODE") ?? null,
    country: optionalEnv("COMPANY_COUNTRY") ?? "India",
  };

  const hasAddress = Boolean(address.line1 && address.city);

  return {
    tradingName,
    legalName,
    /** Name to use in legal copy; falls back to the trading name. */
    entityName: legalName ?? tradingName,
    tagline:
      optionalEnv("COMPANY_TAGLINE") ??
      "Multiple technology vendors. One procurement partner.",
    url: appUrl(),
    email: {
      sales: optionalEnv("COMPANY_EMAIL_SALES") ?? null,
      support: optionalEnv("COMPANY_EMAIL_SUPPORT") ?? null,
      enterprise: optionalEnv("COMPANY_EMAIL_ENTERPRISE") ?? null,
    },
    phone: {
      sales: optionalEnv("COMPANY_PHONE_SALES") ?? null,
      support: optionalEnv("COMPANY_PHONE_SUPPORT") ?? null,
    },
    /**
     * The grievance officer, whose name and contact the Consumer Protection
     * (E-Commerce) Rules 2020 require an online seller to publish. Kept in
     * configuration rather than in page content: it is a statutory appointment,
     * not marketing copy, and it must be the same on every page that states it.
     */
    grievance: {
      name: optionalEnv("COMPANY_GRIEVANCE_OFFICER_NAME") ?? null,
      email: optionalEnv("COMPANY_GRIEVANCE_OFFICER_EMAIL") ?? null,
      phone: optionalEnv("COMPANY_GRIEVANCE_OFFICER_PHONE") ?? null,
    },
    address,
    hasAddress,
    formattedAddress: hasAddress
      ? [
          address.line1,
          address.line2,
          // "New Delhi, Delhi 110034" — locality and region take a comma,
          // the PIN follows the region with a space, per Indian postal form.
          [
            [address.city, address.state].filter(Boolean).join(", "),
            address.postcode,
          ]
            .filter(Boolean)
            .join(" "),
          address.country,
        ]
          .filter(Boolean)
          .join(", ")
      : null,
    gstin: optionalEnv("COMPANY_GSTIN") ?? null,
    cin: optionalEnv("COMPANY_CIN") ?? null,
    supportHours: optionalEnv("COMPANY_SUPPORT_HOURS") ?? null,
  };
}

/** Configuration keys that must be filled in before the site goes live. */
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
