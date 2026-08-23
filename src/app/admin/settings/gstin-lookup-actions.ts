"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { encryptSecret } from "@/lib/secret-box";
import { lookupGstin } from "@/lib/gstin-lookup";
import { isValidGstin } from "@/lib/gstin";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Saving the GST provider's host and credentials, and proving they work.
 *
 * ADMIN only, and the same write-only rule as the mail and payment secrets: the
 * form cannot show a stored header value, so blank means "leave it alone"
 * rather than "delete it" — otherwise correcting a typo in the host would wipe
 * the credentials every time. Clearing is an explicit checkbox.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const blankToNull = (max: number) =>
  trimmed(max)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable();

/** A path under the host, not a second URL. */
const pathField = blankToNull(200).refine(
  (value) => value === null || /^\/[A-Za-z0-9._~\-/]*$/.test(value),
  { message: "A path beginning with /, e.g. /commonapi/v1.3/search." },
);

/**
 * A header name, restricted to what a header name may actually contain.
 *
 * RFC 7230 token characters. Not decoration: these values are put into an
 * outbound request, and a name carrying a newline is how a header injection
 * starts.
 */
const headerName = blankToNull(60).refine(
  (value) => value === null || /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(value),
  { message: "A header name, e.g. client-id. Letters, digits and - . _ only." },
);

const headerValue = blankToNull(400).refine(
  (value) => value === null || !/[\r\n]/.test(value),
  { message: "A header value cannot contain a line break." },
);

const schema = z.object({
  /*
   * `https` only, and no path.
   *
   * The paths are separate fields, so a host with one pasted in would produce
   * `https://host/commonapi/v1.3/search/commonapi/v1.3/search` and a puzzling
   * 404. Plain `http` is refused outright: this request carries the
   * credentials that authenticate as this business, and there is no version of
   * sending them in the clear that is acceptable.
   */
  baseUrl: blankToNull(200).refine(
    (value) => {
      if (value === null) return true;
      try {
        const url = new URL(value);
        return url.protocol === "https:" && (url.pathname === "" || url.pathname === "/");
      } catch {
        return false;
      }
    },
    { message: "The host only, over https, e.g. https://api.example.com — paths go below." },
  ),
  statusPath: pathField,
  searchPath: pathField,
  headerOneName: headerName,
  headerOneValue: headerValue,
  headerTwoName: headerName,
  headerTwoValue: headerValue,
  headerThreeName: headerName,
  headerThreeValue: headerValue,
  clearHeaderValues: z.coerce.boolean().default(false),
});

export async function saveGstinLookupSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`gstinsettings:${admin.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  const parsed = schema.safeParse({
    baseUrl: formData.get("baseUrl") ?? "",
    statusPath: formData.get("statusPath") ?? "",
    searchPath: formData.get("searchPath") ?? "",
    headerOneName: formData.get("headerOneName") ?? "",
    headerOneValue: formData.get("headerOneValue") ?? "",
    headerTwoName: formData.get("headerTwoName") ?? "",
    headerTwoValue: formData.get("headerTwoValue") ?? "",
    headerThreeName: formData.get("headerThreeName") ?? "",
    headerThreeValue: formData.get("headerThreeValue") ?? "",
    clearHeaderValues: formData.get("clearHeaderValues") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;

  /*
   * Blank keeps what is stored; the checkbox is the only way to remove it.
   *
   * The alternative — blank means clear — deletes the credentials whenever
   * somebody saves the form to change a path, which they will, because the
   * secret fields are empty every time the page loads.
   */
  const secret = (entered: string | null) =>
    input.clearHeaderValues ? null : entered ? encryptSecret(entered) : undefined;

  const data = {
    baseUrl: input.baseUrl,
    statusPath: input.statusPath,
    searchPath: input.searchPath,
    headerOneName: input.headerOneName,
    headerTwoName: input.headerTwoName,
    headerThreeName: input.headerThreeName,
    headerOneValue: secret(input.headerOneValue),
    headerTwoValue: secret(input.headerTwoValue),
    headerThreeValue: secret(input.headerThreeValue),
    updatedById: admin.id,
  };

  await prisma.gstinLookupSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  await recordAudit({
    actorId: admin.id,
    action: "admin.gstin_lookup_settings_saved",
    entityType: "GstinLookupSettings",
    entityId: "singleton",
    // Which fields were filled in, never their values: the audit log is
    // readable by any administrator and is not a second copy of the credentials.
    metadata: {
      host: Boolean(input.baseUrl),
      search: Boolean(input.searchPath),
      status: Boolean(input.statusPath),
      cleared: input.clearHeaderValues,
    },
    ip: await clientIp(),
  });

  return {
    status: "success",
    message: input.baseUrl
      ? "Saved. Try a GSTIN below to check the credentials."
      : "Saved. With no host set, GSTIN lookup stays off and the forms say so.",
  };
}

/**
 * A real lookup, run from the settings screen against a GSTIN an administrator
 * types.
 *
 * The only honest way to answer "are these credentials right?". A form that
 * merely saved them would report success for a wrong key and leave the first
 * failure to a customer filling in their company profile.
 *
 * It reports what came back, including which endpoint answered, because that is
 * the difference between "verification works" and "verification *and*
 * auto-fill work" — and an administrator who has paid for one and not the
 * other should be able to see which they have.
 */
export async function testGstinLookup(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`gstintest:${admin.id}`, 20, 600);
  if (!limit.allowed) {
    return { status: "error", message: "Too many lookups in a short period. Please wait a moment." };
  }

  const entered = String(formData.get("gstin") ?? "").trim().toUpperCase();
  if (!isValidGstin(entered)) {
    return {
      status: "error",
      message: "That is not a valid GSTIN — check the fifteen characters and try again.",
      fieldErrors: { gstin: ["Fails its own check digit."] },
    };
  }

  const result = await lookupGstin(entered);

  await recordAudit({
    actorId: admin.id,
    action: "admin.gstin_lookup_tested",
    entityType: "GstinLookupSettings",
    entityId: "singleton",
    metadata: { outcome: result.ok ? result.details.source : result.reason },
    ip: await clientIp(),
  });

  if (!result.ok) {
    const message =
      result.reason === "not_configured"
        ? "No host is set, so there is nothing to call. Fill in the host above and save."
        : result.reason === "unreachable"
          ? "The provider could not be reached. Check the host, and whether this server may make outbound calls to it."
          : result.reason === "refused"
            ? "The provider refused the call. That usually means a wrong or missing credential header."
            : result.reason === "not_found"
              ? "The provider answered, but has no record of that GSTIN. The credentials are working."
              : "That GSTIN is not well-formed.";
    return { status: "error", message };
  }

  const { details } = result;
  const found = [
    details.legalName,
    details.tradeName && details.tradeName !== details.legalName ? `(${details.tradeName})` : null,
    details.status ? `— ${details.status}` : null,
    details.stateName,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    status: "success",
    message:
      details.source === "search"
        ? `Working. ${found}. Names and addresses will fill in automatically.`
        : `Working, via the status endpoint only. ${found}. Verification works; names and addresses need the search endpoint.`,
  };
}
