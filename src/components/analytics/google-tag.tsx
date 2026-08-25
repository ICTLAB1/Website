import { headers } from "next/headers";

import { ConsentBanner } from "@/components/analytics/consent-banner";
import {
  analyticsEnabled,
  CONSENT_DEFAULTS,
  CONSENT_KEY,
  GA_MEASUREMENT_IDS,
  GRANTED,
  GTM_CONTAINER_ID,
  GTM_ENABLED,
} from "@/lib/analytics";

/**
 * The Google tags, as Google issues them, under this site's content policy.
 *
 * One inline snippet that starts the queue, settles consent and configures the
 * analytics properties, then two loaders: gtag.js for GA4 and gtm.js for the
 * Tag Manager container. All three carry the per-request nonce, because
 * `script-src` here has no `'unsafe-inline'` and is not getting one — the
 * nonce is precisely the mechanism that lets a specific inline script run
 * without opening the page to every injected one.
 *
 * `strict-dynamic` then covers what those two load for themselves, which is why
 * nothing here has to enumerate Google's own script hosts, and why a tag added
 * to the container next month needs no change to the policy.
 *
 * ## The container's snippet, rewritten
 *
 * Google issues Tag Manager as a snippet that builds its own `<script>` element
 * at runtime. That version is here as a plain `<script src>` instead. The two
 * are equivalent — the snippet pushes `gtm.start` and appends the same URL —
 * but a tag written in the markup gets a real nonce, where one the page creates
 * for itself is trusted only by `strict-dynamic`. Where the browser can check
 * the stricter thing, let it.
 *
 * The `<noscript>` frame is `GoogleTagManagerNoScript`, below.
 *
 * Whether any of this renders is `analyticsEnabled`, which the proxy consults
 * for the same request when it builds the policy. See `lib/analytics` for why
 * the signed-in paths are excluded rather than merely uninteresting.
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
    /*
     * Last, and after the consent defaults for the same reason everything else
     * is: this is the event that starts the container, and a tag inside it
     * would otherwise be free to fire before the page had said what it allows.
     */
    ...(GTM_ENABLED
      ? ["dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});"]
      : []),
  ].join("\n");

  return (
    <>
      {/*
        Before the loaders, not after them. Both read the queue the moment they
        arrive, and a default pushed afterwards is a default that arrived too
        late to apply to the first thing measured.
      */}
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: consentScript }} />

      {/*
        `defer`, not `async`, and that is the whole of what keeps the order
        above true.

        React hoists a script marked `async` into <head> — a sensible
        optimisation that starts the download sooner, and one that here moved
        both loaders in front of the inline script they must follow. The
        emitted document had gtag.js at byte 1,838 and the consent defaults at
        byte 145,919. A deferred script is left where it is written, runs after
        the document is parsed, and runs in source order, so the queue is
        already correct before either loader touches it.
      */}
      {loader ? (
        <script defer nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${loader}`} />
      ) : null}

      {GTM_ENABLED ? (
        <script
          defer
          nonce={nonce}
          src={`https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`}
        />
      ) : null}

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

/**
 * Google's second Tag Manager snippet: the container in a frame, for a visitor
 * whose browser will not run the first one.
 *
 * ## What it cannot do
 *
 * Carry consent. Consent Mode is JavaScript — the defaults above, the banner,
 * and a returning visitor's stored answer all need it — so a tag that fires
 * through this frame fires with no consent signal at all, for the one class of
 * visitor who cannot be asked and for whom no denial can be recorded.
 *
 * Today nothing fires through it. The container holds a Conversion Linker,
 * which needs JavaScript, and an Ads conversion on a custom event, which needs
 * a `dataLayer` push that also needs JavaScript. Neither is reachable from
 * here. That is the reason this is acceptable rather than an argument that it
 * is harmless: the day somebody publishes an All Pages tag that writes a
 * cookie, it will write it for these visitors without asking, and the cookie
 * policy will be wrong until somebody notices.
 *
 * ## The policy it needs
 *
 * `frame-src` allows one Google host wherever analytics runs, which is a wider
 * policy than the site had. `frame-ancestors` stays `'none'` and is untouched:
 * what this page may frame and who may frame this page are different
 * questions, and only the first one moved.
 *
 * Written through `dangerouslySetInnerHTML` because a `<noscript>` body is not
 * parsed as markup by the client renderer, and the shipped bytes are the whole
 * point of an element only a non-JavaScript browser ever reads.
 */
export async function GoogleTagManagerNoScript() {
  const list = await headers();

  const enabled = analyticsEnabled({
    pathname: list.get("x-pathname") ?? "/",
    host: list.get("host"),
    isDevelopment: process.env.NODE_ENV === "development",
  });

  if (!enabled || !GTM_ENABLED) return null;

  return (
    <noscript
      dangerouslySetInnerHTML={{
        __html:
          `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}"` +
          ` height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
      }}
    />
  );
}
