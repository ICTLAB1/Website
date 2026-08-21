import "server-only";
import { appUrl, optionalEnv } from "@/lib/env";

/**
 * Business identity.
 *
 * Every field is sourced from configuration. Where a value has not been
 * configured we return `null` and the public UI renders nothing at all for it -
 * the application never substitutes invented company details such as a fake
 * address, phone number, GSTIN or email, and equally never tells a visitor that
 * a detail is missing or which environment variable would supply it. Which
 * fields are still unset is an operator's question, answered by
 * `lib/admin/config-status.ts` behind the admin login.
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
      "One procurement partner. Multiple technology brands.",
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
