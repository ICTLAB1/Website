import { headers } from "next/headers";

import { analyticsEnabled, GA_MEASUREMENT_ID } from "@/lib/analytics";

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
   * The measurement ID is interpolated into a script, so it is checked rather
   * than trusted. It comes from this repository or from an environment
   * variable, neither of which a visitor controls — but a value that reaches a
   * `<script>` body gets validated on principle, because the day somebody
   * moves it into the settings table is not the day to remember this.
   */
  if (!/^G-[A-Z0-9]{6,20}$/.test(GA_MEASUREMENT_ID)) return null;

  return (
    <>
      <script
        async
        nonce={nonce}
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
        }}
      />
    </>
  );
}
