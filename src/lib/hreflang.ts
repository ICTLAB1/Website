/**
 * India/UAE alternates.
 *
 * Only pages that have a counterpart in the other market declare one, and each
 * declares itself too, as hreflang requires. The India page is en-IN and the UAE
 * page is en-AE; x-default is the India page.
 */
const PAIRS: Record<string, string> = {
  "/": "/ae",
  "/microsoft-365": "/ae/microsoft-365",
  "/autodesk": "/ae/autodesk",
  "/adobe": "/ae/adobe",
};

/** The `languages` map for a page on either side of a pair, or undefined for a page with no counterpart. */
export function hreflangFor(path: string): Record<string, string> | undefined {
  const normal = path.length > 1 ? path.replace(/\/$/, "") : path;
  for (const [india, uae] of Object.entries(PAIRS)) {
    if (normal === india || normal === uae) return { "en-IN": india, "en-AE": uae, "x-default": india };
  }
  return undefined;
}
