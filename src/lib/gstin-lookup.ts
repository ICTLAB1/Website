import "server-only";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { decryptSecret, secretHint } from "@/lib/secret-box";
import { isValidGstin, normaliseGstin } from "@/lib/gstin";
import { logger } from "@/lib/logger";

/**
 * Asking the GST system about a GSTIN.
 *
 * Two endpoints, both `GET` with `?gstin=&action=TP`, both plain JSON:
 *
 *   `tpstatus` — is this a real registration, and is it live? Five fields.
 *   `search`   — the same, plus the legal name, the trade name and the
 *                principal place of business.
 *
 * `search` is what makes "type a GSTIN and the details fill themselves in"
 * possible; `tpstatus` alone still catches the thing that actually costs money,
 * which is quoting a customer against a registration that was cancelled last
 * quarter. A deployment entitled to only the first gets the second half of the
 * feature and is told so.
 *
 * ## What this never does
 *
 * It never invents a taxpayer. There is no free public GSTN endpoint — access
 * runs through a GST Suvidha Provider whose host and credentials the business
 * holds — so with nothing configured this reports `not_configured` and the
 * screens say the lookup is not connected. A lookup that could not be made is
 * reported as a lookup that was not made, never as a lookup that found nothing.
 *
 * It also never throws. Every caller is a form somebody is filling in, and a
 * provider having a bad afternoon must degrade to "we could not check this
 * right now" rather than to a stack trace where a company name should be.
 */

const TIMEOUT_MS = 10_000;

export type GstinAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
};

export type GstinDetails = {
  gstin: string;
  /** The registration exists and the provider vouches for it. */
  valid: boolean;
  /** "Active", "Cancelled", "Suspended" — the provider's own word for it. */
  status: string | null;
  stateCode: string | null;
  stateName: string | null;
  /** Present only from `search`. */
  legalName: string | null;
  tradeName: string | null;
  address: GstinAddress | null;
  /** Constitution of business, e.g. "Private Limited Company". */
  constitution: string | null;
  /** Taxpayer type, e.g. "Regular". */
  taxpayerType: string | null;
  registeredOn: string | null;
  cancelledOn: string | null;
  /** Which endpoint answered, so a caller can say what it could not learn. */
  source: "search" | "status";
};

export type GstinLookup =
  | { ok: true; details: GstinDetails }
  | {
      ok: false;
      reason: "not_configured" | "malformed" | "not_found" | "unreachable" | "refused";
    };

type LookupConfig = {
  baseUrl: string;
  statusPath: string | null;
  searchPath: string | null;
  headers: Record<string, string>;
};

/**
 * The stored credentials, decrypted for the life of one request.
 *
 * React's `cache` rather than the persistent one, exactly as the mail settings
 * do: a decrypted secret should live for one request and no longer, and a
 * lookup happens a handful of times a day.
 */
export const getGstinLookupConfig = cache(async (): Promise<LookupConfig | null> => {
  let row;
  try {
    row = await prisma.gstinLookupSettings.findUnique({ where: { id: "singleton" } });
  } catch (error) {
    logger.warn(
      "gstin_lookup_settings_unreadable",
      error instanceof Error ? { message: error.message.split("\n")[0] } : {},
    );
    return null;
  }

  const baseUrl = row?.baseUrl?.trim();
  if (!baseUrl) return null;

  const headers: Record<string, string> = {};
  for (const [name, value] of [
    [row?.headerOneName, decryptSecret(row?.headerOneValue)],
    [row?.headerTwoName, decryptSecret(row?.headerTwoValue)],
    [row?.headerThreeName, decryptSecret(row?.headerThreeValue)],
  ] as Array<[string | null | undefined, string | null]>) {
    const key = name?.trim();
    if (key && value) headers[key] = value;
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    statusPath: row?.statusPath?.trim() || null,
    searchPath: row?.searchPath?.trim() || null,
    headers,
  };
});

/** Whether this deployment can look a GSTIN up at all. */
export async function gstinLookupConfigured(): Promise<boolean> {
  const config = await getGstinLookupConfig();
  return config !== null && Boolean(config.searchPath || config.statusPath);
}

/** Whether it can fill in a name and an address, rather than only verify. */
export async function gstinLookupReturnsDetails(): Promise<boolean> {
  const config = await getGstinLookupConfig();
  return Boolean(config?.searchPath);
}

/** Trims, and treats an empty string as absent — the providers send both. */
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * The principal place of business, assembled from the parts GSTN sends.
 *
 * Every part is optional in practice whatever the schema says: registrations
 * predate the current form, and a floor number or a building name is often
 * simply absent. So each line is whatever parts are present, joined — and null
 * when none are, rather than a stray comma.
 *
 * `city` comes from `loc`, the location field, because this response carries no
 * separate district. That is the closest true statement available, and guessing
 * a city out of a street would be worse than leaving the field for a person.
 */
function readAddress(pradr: unknown): GstinAddress | null {
  if (!pradr || typeof pradr !== "object") return null;
  const addr = (pradr as { addr?: unknown }).addr;
  if (!addr || typeof addr !== "object") return null;

  const part = (key: string) => text((addr as Record<string, unknown>)[key]);
  const join = (parts: Array<string | null>) => {
    const kept = parts.filter((value): value is string => Boolean(value));
    return kept.length > 0 ? kept.join(", ") : null;
  };

  const address = {
    line1: join([part("flno"), part("bno"), part("bnm")]),
    line2: join([part("st"), part("loc")]),
    city: part("loc"),
    state: part("stcd"),
    postcode: part("pncd"),
  };

  return Object.values(address).some(Boolean) ? address : null;
}

async function call(url: string, headers: Record<string, string>): Promise<unknown | "unreachable" | "refused"> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json", ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    // The host, not the GSTIN. Logged without the URL's query string, which
    // carries the taxpayer's number.
    logger.warn("gstin_lookup_unreachable", {
      message: error instanceof Error ? error.message.split("\n")[0] : String(error),
    });
    return "unreachable";
  }

  if (!response.ok) {
    logger.warn("gstin_lookup_refused", { status: response.status });
    return "refused";
  }

  try {
    return await response.json();
  } catch {
    logger.warn("gstin_lookup_unparseable", { status: response.status });
    return "refused";
  }
}

/**
 * Everything the configured provider will say about one GSTIN.
 *
 * `search` first where it is available, because it answers the status question
 * as well as the details one and a second call would only cost the customer a
 * wait. `tpstatus` is the fallback, and its answer is honestly labelled: a
 * caller can see from `source` that no name or address was ever going to come
 * back, and say so, rather than showing an empty field that looks like a
 * business with no name.
 *
 * The GSTIN is validated here before it is put in a URL — shape and check digit
 * both — so a malformed one costs no request, and nothing that is not fifteen
 * characters of `[0-9A-Z]` is ever interpolated.
 */
export async function lookupGstin(entered: string): Promise<GstinLookup> {
  const gstin = normaliseGstin(entered);
  if (!gstin || !isValidGstin(gstin)) return { ok: false, reason: "malformed" };

  const config = await getGstinLookupConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  const query = `?gstin=${encodeURIComponent(gstin)}&action=TP`;

  if (config.searchPath) {
    const payload = await call(`${config.baseUrl}${config.searchPath}${query}`, config.headers);
    if (payload !== "unreachable" && payload !== "refused") {
      const body = payload as Record<string, unknown>;
      const legalName = text(body.lgnm);
      const status = text(body.sts);

      /*
       * A response is an answer only if it names the taxpayer or states its
       * status. A GSP that replies 200 with an error envelope — which they do,
       * for an unregistered number — must read as "not found" rather than as a
       * company whose every field happens to be blank.
       */
      if (legalName || status) {
        return {
          ok: true,
          details: {
            gstin: text(body.gstin) ?? gstin,
            valid: true,
            status,
            stateCode: gstin.slice(0, 2),
            stateName: text(body.stj),
            legalName,
            tradeName: text(body.tradeNam),
            address: readAddress(body.pradr),
            constitution: text(body.ctb),
            taxpayerType: text(body.dty),
            registeredOn: text(body.rgdt),
            cancelledOn: text(body.cxdt),
            source: "search",
          },
        };
      }

      if (!config.statusPath) return { ok: false, reason: "not_found" };
    } else if (!config.statusPath) {
      return { ok: false, reason: payload };
    }
  }

  if (!config.statusPath) return { ok: false, reason: "not_configured" };

  const payload = await call(`${config.baseUrl}${config.statusPath}${query}`, config.headers);
  if (payload === "unreachable" || payload === "refused") return { ok: false, reason: payload };

  const body = payload as Record<string, unknown>;
  if (body.validGstin !== true) return { ok: false, reason: "not_found" };

  return {
    ok: true,
    details: {
      gstin: text(body.gstin) ?? gstin,
      valid: true,
      status: text(body.status),
      stateCode: text(body.stateCode) ?? gstin.slice(0, 2),
      stateName: text(body.stateName),
      legalName: null,
      tradeName: null,
      address: null,
      constitution: null,
      taxpayerType: null,
      registeredOn: null,
      cancelledOn: null,
      source: "status",
    },
  };
}

/**
 * Whether a status word means the registration is currently good to trade with.
 *
 * Compared case-insensitively against the one word that means yes, rather than
 * against a list of the words that mean no. A provider inventing a new failure
 * state should read as "not active" and prompt somebody to look, which is the
 * safe direction; a new *good* state is not a thing that happens.
 */
export function registrationIsActive(status: string | null): boolean {
  return status?.trim().toLowerCase() === "active";
}

/**
 * What the admin form is allowed to see.
 *
 * The header *values* never leave the server — only a masked hint, so an
 * administrator can tell a stored credential from an empty field without the
 * page ever carrying the credential itself. Exactly the rule the mail and
 * payment screens follow.
 */
export type GstinLookupView = {
  baseUrl: string;
  statusPath: string;
  searchPath: string;
  headerOneName: string;
  headerTwoName: string;
  headerThreeName: string;
  headerHints: Array<string | null>;
  connected: boolean;
  returnsDetails: boolean;
  updatedAt: Date | null;
};

export async function getGstinLookupView(): Promise<GstinLookupView> {
  const row = await prisma.gstinLookupSettings
    .findUnique({ where: { id: "singleton" } })
    .catch(() => null);

  const hint = (value: string | null | undefined) => (value ? secretHint(value) : null);

  return {
    baseUrl: row?.baseUrl ?? "",
    statusPath: row?.statusPath ?? "/commonapi/v1.0/tpstatus",
    searchPath: row?.searchPath ?? "/commonapi/v1.3/search",
    headerOneName: row?.headerOneName ?? "",
    headerTwoName: row?.headerTwoName ?? "",
    headerThreeName: row?.headerThreeName ?? "",
    headerHints: [hint(row?.headerOneValue), hint(row?.headerTwoValue), hint(row?.headerThreeValue)],
    connected: Boolean(row?.baseUrl?.trim() && (row?.searchPath?.trim() || row?.statusPath?.trim())),
    returnsDetails: Boolean(row?.baseUrl?.trim() && row?.searchPath?.trim()),
    updatedAt: row?.updatedAt ?? null,
  };
}
