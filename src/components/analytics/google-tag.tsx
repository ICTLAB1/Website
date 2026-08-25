import { headers } from "next/headers";

import { ConsentBanner } from "@/components/analytics/consent-banner";
import {
  analyticsEnabled,
  CONSENT_DEFAULTS,
  CONSENT_KEY,
  GA_MEASUREMENT_IDS,
  GRANTED,
} from "@/lib/analytics";

/**
 * The Google tag, as Google issues it, under this site's content policy.
 *
 * Two scripts: the loader, and the inline snippet that starts the queue and
 * configures the property. Both carry the per-request nonce, because
 * `script-src` here has no `'unsafe-inline'` and is not getting one — the
 * nonce is precisely the mechanism that lets a specific inline script run
 * without opening the page to every injected one.
 *
 * `strict-dynamic` then covers what gtag.js loads for itself, which is why
 * nothing here has to enumerate Google's own script hosts.
 *
 * Whether it renders at all is `analyticsEnabled`, which the proxy consults for
 * the same request when it builds the policy. See `lib/analytics` for why the
 * signed-in paths are excluded rather than merely uninteresting.
 */
export async function GoogleTag() {
  const list = await headers();
  const nonce = list.get("x-nonce") ?? undefined;

  const enabled = analyticsEnabled({
    pathname: list.get("x-pathname") ?? "/",
    host: list.get("host"),
    isDevelopment: process.env.NODE_ENV === "development",
  });

  if (!enabled) return null;

  /*
   * One loader, then one `config` per property.
   *
   * gtag.js is fetched with the first ID and configures the rest itself — the
   * library is the same file whichever ID asks for it, so a second `<script
   * src>` would download an identical bundle and give the second property
   * nothing the config line does not.
   *
   * The IDs are validated in `lib/analytics` on the way into this list, which
   * is what makes them safe to interpolate into a script body here.
   */
  const [loader] = GA_MEASUREMENT_IDS;

  /*
   * The order here is the whole of Consent Mode.
   *
   * `consent default` must be pushed before anything that measures, or the
   * first page view of every visit is sent under whatever the tag assumed
   * rather than what this site promises. So: defaults, then the two redaction
   * settings, then a returning visitor's own answer read straight out of their
   * browser, and only then `js` and `config`.
   *
   * Reading localStorage synchronously in this script is deliberate. The
   * banner is a React component and cannot possibly mount before gtag.js
   * fetches; a visitor who accepted last week would otherwise spend the first
   * page view of every session being measured as though they had not.
   *
   * `ads_data_redaction` strips ad click identifiers while advertising consent
   * is denied, and does nothing once it is granted. `url_passthrough` carries
   * measurement between pages in the URL instead of a cookie while storage is
   * denied — it appends gclid and _gl to internal links, which is harmless
   * here because every canonical URL on this site is built from a fixed path
   * rather than from the request, so no query string can reach one.
   */
  const consentScript = [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    `gtag('consent', 'default', ${JSON.stringify(CONSENT_DEFAULTS)});`,
    "gtag('set', 'ads_data_redaction', true);",
    "gtag('set', 'url_passthrough', true);",
    `try{if(localStorage.getItem(${JSON.stringify(CONSENT_KEY)})==='granted'){gtag('consent','update',${JSON.stringify(
      GRANTED,
    )});}}catch(e){}`,
    "gtag('js', new Date());",
    ...GA_MEASUREMENT_IDS.map((id) => `gtag('config', '${id}');`),
  ].join("\n");

  return (
    <>
      {/*
        Before the loader, not after it. gtag.js reads the queue the moment it
        arrives, and a default pushed afterwards is a default that arrived too
        late to apply to the first thing measured.
      */}
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: consentScript }} />
      <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${loader}`} />

      {/*
        Rendered by the same component that decides the tag runs at all, so a
        page that measures nothing never asks — there is nothing to ask about
        on /admin or /account, and a notice there would be a lie about what
        that page does.
      */}
      <ConsentBanner />
    </>
  );
}
