"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DISMISS_COOKIE,
  DISMISS_SESSION_COOKIE,
  parseDismissals,
  pickFor,
  serialiseDismissals,
  storageKey,
  type PublicCampaign,
} from "@/lib/campaigns";

/**
 * Shows the live campaigns: one banner and one pop-up at most, on the pages
 * each was written for.
 *
 * ## What it decides, and what it does not
 *
 * Whether a campaign is *running* was settled on the server. This only decides
 * which of the running ones applies to the page in front of the visitor, and
 * remembers what they close.
 *
 * ## The banner is in the page, not over it
 *
 * It sits in normal flow under the menu and is rendered by the server, so it
 * is part of the first paint and moves nothing. A pop-up cannot be, so it opens
 * after a delay, on the client only, and is a fixed overlay — it adds no layout
 * shift because it takes no space in the page.
 *
 * ## The pop-up blocks the page, and is bounded for that reason
 *
 * Focus moves into it and is held there, Escape and the backdrop close it, and
 * focus returns to where it came from. An overlay on arrival is what search
 * engines treat as an intrusive interstitial, so it waits several seconds,
 * keeps off every page where somebody is mid-task (`BUSY_PATHS`), and is shown
 * once per visitor per frequency, not once per page.
 */

type Event = "campaign_view" | "campaign_click" | "campaign_dismiss";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Reported to analytics, which holds it back unless the visitor has consented. */
function track(event: Event, campaign: PublicCampaign) {
  try {
    window.gtag?.("event", event, {
      campaign_id: campaign.id,
      campaign_format: campaign.format,
      page_path: window.location.pathname,
    });
  } catch {
    /* Measurement must never break the page. */
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function remember(campaign: PublicCampaign) {
  const session = campaign.frequency === "EVERY_VISIT";
  const name = session ? DISMISS_SESSION_COOKIE : DISMISS_COOKIE;
  const entries = parseDismissals(readCookie(name));
  entries[storageKey(campaign)] = Date.now();
  const lifetime = session ? "" : "; max-age=31536000";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(serialiseDismissals(entries))}; path=/; SameSite=Lax${lifetime}${secure}`;
}

const TONES = {
  INFO: "bg-graphite-900 text-white",
  PROMO: "bg-accent-700 text-white",
  WARNING: "bg-warning-50 text-warning-700 border-b border-warning-600/30",
} as const;

export function CampaignDisplay({
  campaigns,
  initiallyHidden,
}: {
  campaigns: PublicCampaign[];
  initiallyHidden: string[];
}) {
  const pathname = usePathname() ?? "/";
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set(initiallyHidden));

  const isHidden = useCallback((campaign: PublicCampaign) => hidden.has(campaign.id), [hidden]);
  const banner = pickFor(campaigns, "BANNER", pathname, isHidden);
  const modal = pickFor(campaigns, "MODAL", pathname, isHidden);

  const dismiss = useCallback((campaign: PublicCampaign) => {
    remember(campaign);
    track("campaign_dismiss", campaign);
    setHidden((current) => new Set(current).add(campaign.id));
  }, []);

  return (
    <>
      {banner ? <Banner campaign={banner} onDismiss={dismiss} /> : null}
      {modal ? <Modal key={modal.id} campaign={modal} onDismiss={dismiss} /> : null}
    </>
  );
}

function Banner({
  campaign,
  onDismiss,
}: {
  campaign: PublicCampaign;
  onDismiss: (campaign: PublicCampaign) => void;
}) {
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("campaign_view", campaign);
  }, [campaign]);

  const tone = TONES[campaign.tone];
  return (
    <section aria-label="Announcement" className={tone}>
      <div className="container-page flex items-center gap-3 py-2 text-[13px] leading-snug">
        <p className="min-w-0 flex-1 text-center sm:text-left">
          {campaign.message}
          {campaign.href && campaign.linkLabel ? (
            <>
              {" "}
              <Link
                href={campaign.href}
                onClick={() => track("campaign_click", campaign)}
                className="font-semibold underline underline-offset-2"
              >
                {campaign.linkLabel}
              </Link>
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => onDismiss(campaign)}
          aria-label="Close announcement"
          className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </section>
  );
}

function Modal({
  campaign,
  onDismiss,
}: {
  campaign: PublicCampaign;
  onDismiss: (campaign: PublicCampaign) => void;
}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<Element | null>(null);

  // Opens after the delay, on the client only. Cleared if the visitor moves to
  // a page it does not apply to first, because then this unmounts.
  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), campaign.delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [campaign.delaySeconds]);

  const close = useCallback(() => {
    setOpen(false);
    onDismiss(campaign);
  }, [campaign, onDismiss]);

  useEffect(() => {
    if (!open) return;

    track("campaign_view", campaign);
    restoreFocusTo.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusable = () => [
      ...(panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []),
    ];
    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const stops = focusable();
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      if (restoreFocusTo.current instanceof HTMLElement) restoreFocusTo.current.focus();
    };
    // `campaign` is stable for the life of this component (it is keyed by id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, close]);

  if (!open) return null;

  const headingId = `campaign-${campaign.id}-heading`;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-graphite-950/70" onClick={close} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={campaign.title ? headingId : undefined}
        aria-label={campaign.title ? undefined : "Announcement"}
        className="relative max-h-[92dvh] w-full max-w-md animate-scale-in overflow-y-auto overscroll-contain rounded-[--radius-lg] bg-white p-6 shadow-[--shadow-overlay] sm:p-8"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-ink-600 hover:bg-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span aria-hidden="true">×</span>
        </button>

        {campaign.title ? (
          <h2 id={headingId} className="pr-8 text-xl font-semibold leading-tight text-graphite-900">
            {campaign.title}
          </h2>
        ) : null}
        <p className={`${campaign.title ? "mt-3" : "pr-8"} text-[15px] leading-relaxed text-ink-700`}>
          {campaign.message}
        </p>

        {campaign.href && campaign.linkLabel ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={campaign.href}
              onClick={() => {
                track("campaign_click", campaign);
                close();
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-[--radius-md] bg-accent-700 px-5 text-sm font-semibold text-white hover:bg-accent-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {campaign.linkLabel}
            </Link>
            <button
              type="button"
              onClick={close}
              className="min-h-11 px-3 text-sm font-medium text-ink-600 underline underline-offset-2 hover:text-ink-900"
            >
              No thanks
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
