import { ATTRIBUTION_KEYS, type AttributionKey } from "@/lib/attribution";

/**
 * Remembering the ad a visitor arrived from, for the length of their visit.
 *
 * `sessionStorage`, not a cookie: it is read only by this site's own forms in
 * the same tab, there is no reason to send it to the server on every request,
 * and it disappears when the tab does. Overwritten only by a later arrival that
 * itself carries tags, so browsing around the site does not erase the campaign.
 */

const STORAGE_KEY = "techzoid.attribution";

export type StoredAttribution = Partial<Record<AttributionKey, string>> & { at?: number };

export function readAttribution(): StoredAttribution {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAttribution) : {};
  } catch {
    return {};
  }
}

/** Call once per page view: stores the URL's tags if it has any. */
export function captureAttribution(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const found: StoredAttribution = {};
    for (const key of ATTRIBUTION_KEYS) {
      if (key === "landing") continue;
      const value = params.get(key);
      if (value) found[key] = value.slice(0, 150);
    }
    if (Object.keys(found).length === 0) return;
    found.landing = window.location.pathname;
    found.at = Date.now();
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
  } catch {
    // Storage refused: the enquiry simply carries no campaign.
  }
}
