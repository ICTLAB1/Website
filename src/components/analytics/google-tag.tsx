import { headers } from "next/headers";

import { analyticsEnabled, GA_MEASUREMENT_IDS } from "@/lib/analytics";

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

  return (
    <>
      <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${loader}`} />
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${GA_MEASUREMENT_IDS.map((id) => `gtag('config', '${id}');`).join("\n")}`,
        }}
      />
    </>
  );
}
