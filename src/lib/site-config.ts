import "server-only";
import { cache } from "react";
import { appUrl, optionalEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";

/**
 * Business identity.
 *
 * Split across two sources, on purpose.
 *
 * Contact details, the registered address, the statutory identifiers and the
 * grievance officer live in the database and are edited at `/admin/settings`.
 * They change without the code changing — a new number, an office move, a newly
 * appointed officer — and none of that should need a rebuild and a redeploy.
 *
 * The trading name, legal name and tagline stay in environment configuration.
 * `buildMetadata` reads the trading name at module scope, in 46 route files
 * where nothing can be awaited; and renaming a company is a rebrand, not a
 * Tuesday afternoon edit. `getSiteIdentity` below is the synchronous accessor
 * for exactly those three.
 *
 * Where a value is not set anywhere we return `null` and the public UI renders
 * nothing at all for it. The application never substitutes invented company
 * details such as a fake address, phone number, GSTIN or email, and equally
 * never tells a visitor that a detail is missing or which setting would supply
 * it. Which fields are still unset is an operator's question, answered by
 * `lib/admin/config-status.ts` behind the admin login.
 *
 * These are public-facing, non-secret values — the kind printed on a letterhead.
 * They are read server-side and passed to client components as props, so none
 * is inlined into the browser bundle. Bank details are *not* here: they are
 * payment credentials, they reach one outbound order email and no page, and
 * they stay in the environment for that reason.
 */
export type SiteConfig = Awaited<ReturnType<typeof getSiteConfig>>;

const FALLBACK_TRADING_NAME = "ICT Lab";

/**
 * The three fields that stay in the environment, readable synchronously.
 *
 * Kept separate rather than duplicated, so there is one definition of what the
 * company is called and `getSiteConfig` cannot drift from the page titles.
 */
export function getSiteIdentity() {
  const tradingName = optionalEnv("COMPANY_TRADING_NAME") ?? FALLBACK_TRADING_NAME;
  const legalName = optionalEnv("COMPANY_LEGAL_NAME") ?? null;

  return {
    tradingName,
    legalName,
    /** Name to use in legal copy; falls back to the trading name. */
    entityName: legalName ?? tradingName,
    tagline:
      optionalEnv("COMPANY_TAGLINE") ??
      "One procurement partner. Multiple technology brands.",
    url: appUrl(),
  };
}

/**
 * The stored settings row, or null when nobody has saved one yet.
 *
 * Cached under its own tag and invalidated by the settings action, so an edit
 * is live on the public site immediately rather than after a redeploy. The
 * short window is the same reasoning as the CMS pages: a row written out of
 * band — a restore, psql — cannot invalidate anything, and this way it is stale
 * for a minute rather than an hour.
 */
const loadSettings = cached(
  async () => {
    /*
     * A settings row that cannot be read is not an error worth failing a page
     * for. Every field has a defined fallback — the environment variable it
     * came from before this table existed — so degrading to that is both
     * correct and invisible, where throwing would turn a transient database
     * problem into a 500 on every page of the site, header and footer included.
     *
     * It also matters at build time. `next build` evaluates every route with no
     * database and, in a Docker build, no `DATABASE_URL` at all, because
     * `.dockerignore` keeps `.env` out of the image. Without this the build
     * printed 296 Prisma errors while still succeeding — noise that hides a
     * real failure when one happens.
     */
    try {
      return await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    } catch (error) {
      console.warn(
        "[site-config] could not read stored settings; using environment values",
        error instanceof Error ? error.message.split("\n")[0] : error,
      );
      return null;
    }
  },
  ["site-settings"],
  [tags.settings],
  60,
);

/** Treats an empty or whitespace-only stored value as "not set". */
function stored(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Everything, database first and environment second.
 *
 * The per-field fallback is what makes this safe to deploy onto a running
 * installation: there is no settings row until somebody saves one, so every
 * field keeps coming from the environment exactly as before, and each one
 * switches over individually the moment it is filled in. Clearing a field in
 * the admin panel hands it back to the environment rather than blanking it.
 */
export const getSiteConfig = cache(async () => {
  const identity = getSiteIdentity();
  const row = await loadSettings();

  const address = {
    line1: stored(row?.addressLine1) ?? optionalEnv("COMPANY_ADDRESS_LINE1") ?? null,
    line2: stored(row?.addressLine2) ?? optionalEnv("COMPANY_ADDRESS_LINE2") ?? null,
    city: stored(row?.city) ?? optionalEnv("COMPANY_CITY") ?? null,
    state: stored(row?.state) ?? optionalEnv("COMPANY_STATE") ?? null,
    postcode: stored(row?.postcode) ?? optionalEnv("COMPANY_POSTCODE") ?? null,
    country: stored(row?.country) ?? optionalEnv("COMPANY_COUNTRY") ?? "India",
  };

  const hasAddress = Boolean(address.line1 && address.city);

  return {
    ...identity,
    email: {
      sales: stored(row?.emailSales) ?? optionalEnv("COMPANY_EMAIL_SALES") ?? null,
      support: stored(row?.emailSupport) ?? optionalEnv("COMPANY_EMAIL_SUPPORT") ?? null,
      enterprise: stored(row?.emailEnterprise) ?? optionalEnv("COMPANY_EMAIL_ENTERPRISE") ?? null,
    },
    phone: {
      sales: stored(row?.phoneSales) ?? optionalEnv("COMPANY_PHONE_SALES") ?? null,
      support: stored(row?.phoneSupport) ?? optionalEnv("COMPANY_PHONE_SUPPORT") ?? null,
    },
    /**
     * The grievance officer, whose name and contact the Consumer Protection
     * (E-Commerce) Rules 2020 require an online seller to publish. Held here
     * rather than in page content: it is a statutory appointment, not marketing
     * copy, and it must read the same on every page that states it.
     */
    grievance: {
      name: stored(row?.grievanceName) ?? optionalEnv("COMPANY_GRIEVANCE_OFFICER_NAME") ?? null,
      email: stored(row?.grievanceEmail) ?? optionalEnv("COMPANY_GRIEVANCE_OFFICER_EMAIL") ?? null,
      phone: stored(row?.grievancePhone) ?? optionalEnv("COMPANY_GRIEVANCE_OFFICER_PHONE") ?? null,
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
    gstin: stored(row?.gstin) ?? optionalEnv("COMPANY_GSTIN") ?? null,
    cin: stored(row?.cin) ?? optionalEnv("COMPANY_CIN") ?? null,
    supportHours: stored(row?.supportHours) ?? optionalEnv("COMPANY_SUPPORT_HOURS") ?? null,
    /*
     * The terms printed on every quotation.
     *
     * Stored only — no environment fallback and no default. These are
     * commercial and legal commitments, and a plausible-looking placeholder
     * mailed to a customer under this company's name would be worse than an
     * omission. Unset means the quotation links to the published terms page
     * and prints nothing of its own.
     */
    quoteTerms: stored(row?.quoteTerms) ?? null,
  };
});

/**
 * The stored row on its own, for the settings form.
 *
 * The form must show what is *stored*, not what is currently in effect — an
 * input pre-filled from the environment would make a value look saved when it
 * is not, and saving the form would then silently copy the environment into the
 * database. The page shows the effective value beside each empty field instead.
 */
export async function getStoredSettings() {
  return loadSettings();
}
