import { headers } from "next/headers";

import { MetaEvents } from "@/components/analytics/meta-events";
import { analyticsEnabled, CONSENT_KEY } from "@/lib/analytics";
import { META_ENABLED, META_PIXEL_ID } from "@/lib/meta";

/**
 * The Meta pixel's base code, defined now and run only after consent.
 *
 * Meta's own snippet loads its script and sends a page view the moment it runs.
 * Here it is wrapped in a function, `window.tzMetaLoad`, which does nothing
 * until it is called, and it is called in exactly two places: right here if the
 * visitor accepted analytics on an earlier visit, and from the consent banner
 * the moment they accept on this one. A visitor who has not accepted never
 * downloads `fbevents.js`, never gets a Meta cookie and is never sent to
 * facebook.com.
 *
 * ## One copy
 *
 * The snippet guards on `window.fbq`, so a second call — a banner click after a
 * remembered acceptance — is a no-op. There is no other pixel in this codebase,
 * and none in the Tag Manager container (a second copy would double every
 * event).
 *
 * ## Automatic events are off
 *
 * `autoConfig` is switched off so Meta's script does not watch for button
 * clicks and form fields by itself. Every event this site reports is one it
 * names, with an id, which is what makes de-duplication against the server
 * possible and keeps form contents out of Meta's hands.
 *
 * Where it runs is `analyticsEnabled`, the same function the proxy uses to
 * decide whether the content policy admits Meta's hosts, so the two cannot
 * disagree.
 */
export async function MetaPixel() {
  if (!META_ENABLED) return null;

  const list = await headers();
  const nonce = list.get("x-nonce") ?? undefined;

  const enabled = analyticsEnabled({
    pathname: list.get("x-pathname") ?? "/",
    host: list.get("host"),
    isDevelopment: process.env.NODE_ENV === "development",
  });
  if (!enabled) return null;

  const script = [
    "window.tzMetaLoad=function(){",
    "if(window.fbq)return;",
    "!function(f,b,e,v,n,t,s){n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};",
    "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];",
    "t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}",
    "(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');",
    `fbq('set','autoConfig',false,${JSON.stringify(META_PIXEL_ID)});`,
    `fbq('init',${JSON.stringify(META_PIXEL_ID)});`,
    "fbq('track','PageView');",
    "window.dispatchEvent(new Event('tz-meta-ready'));",
    "};",
    `try{if(localStorage.getItem(${JSON.stringify(CONSENT_KEY)})==='granted'){window.tzMetaLoad();}}catch(e){}`,
  ].join("");

  return (
    <>
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} />
      {/* Only where the pixel runs, so a staff member's click in /admin reports nothing. */}
      <MetaEvents />
    </>
  );
}
