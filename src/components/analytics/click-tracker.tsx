"use client";

import { useEffect } from "react";

/**
 * Counts taps on phone and WhatsApp links.
 *
 * One listener for the whole page rather than a handler on each link, because
 * these links come from many places — the header, the footer, a CMS block, a
 * configured social link — and an editor can add another tomorrow. Fires only
 * on a click, never on load, and sends the page path and nothing else: not the
 * number, not the link, not who clicked.
 *
 * `gtag` exists only where the tag was loaded (public pages), so on a signed-in
 * path this does nothing, by design.
 */
const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com", "www.whatsapp.com"]);

function kindOf(href: string): "click_to_call" | "click_whatsapp" | null {
  const value = href.trim().toLowerCase();
  if (value.startsWith("tel:")) return "click_to_call";
  if (value.startsWith("whatsapp:")) return "click_whatsapp";
  try {
    const url = new URL(value, "https://placeholder.invalid");
    if (WHATSAPP_HOSTS.has(url.hostname)) return "click_whatsapp";
  } catch {
    // Not a URL; not ours.
  }
  return null;
}

export function ClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!link) return;
      const kind = kindOf(link.getAttribute("href") ?? "");
      if (!kind || typeof window.gtag !== "function") return;
      window.gtag("event", kind, { page_path: window.location.pathname });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
