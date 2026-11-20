"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { captureAttribution } from "@/lib/attribution-client";
import { contentName, isContentPath, META_EVENTS } from "@/lib/meta";
import { metaConsentGranted, newEventId, trackContact, trackMeta } from "@/lib/meta-client";

/**
 * The events that come from watching the page rather than from a form.
 *
 * - Keeps the ad's `utm_*` and `fbclid` for the forms to submit.
 * - A page view for each client-side navigation. The base code reports the
 *   first one itself; the App Router changes pages without reloading, so the
 *   rest would otherwise go unreported.
 * - `ViewContent` on the pages about something to buy.
 * - `Contact` on a click on a phone, email or WhatsApp link.
 *
 * Every report is gated on stored consent, and a visitor who accepts partway
 * through a page gets that page's `ViewContent` as soon as the pixel is ready.
 */
export function MetaEvents() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    captureAttribution();
  }, [pathname]);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;

    const report = (sendPageView: boolean) => {
      if (!metaConsentGranted()) return;
      if (sendPageView) window.fbq?.("track", "PageView");
      if (isContentPath(pathname)) {
        // Next updates the title just after the route changes.
        window.setTimeout(() => {
          trackMeta(META_EVENTS.viewContent, newEventId(), {
            content_name: contentName(document.title, pathname),
          });
        }, 150);
      }
    };

    // The first page's PageView is the base code's own; later ones are ours.
    report(!isFirst);

    // Consent accepted on this page: the pixel has just loaded and sent the PageView.
    const onReady = () => report(false);
    window.addEventListener("tz-meta-ready", onReady);
    return () => window.removeEventListener("tz-meta-ready", onReady);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      if (/^mailto:/i.test(href)) trackContact("email");
      else if (/^tel:/i.test(href)) trackContact("phone");
      else if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com)\//i.test(href)) {
        trackContact("whatsapp");
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
