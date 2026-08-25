"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { CONSENT_KEY, DENIED, GRANTED, type ConsentChoice } from "@/lib/analytics";

/**
 * Asking, and remembering the answer.
 *
 * ## Why there is a banner now
 *
 * There was not one, and the cookie policy explained at length why not: this
 * site set two strictly necessary cookies and nothing else, so there was
 * nothing to ask permission for. Analytics — and now Google Signals, which is
 * advertising — changed that, and the honest consequence of adding something
 * that needs consent is a place to give or refuse it.
 *
 * ## What it does not do
 *
 * It does not block the page, trap focus, or make refusing harder than
 * accepting. Both answers are one button in the same row, in the same weight;
 * a design where "reject" is a grey link three levels down is a design that
 * has decided what the answer should be. It does not reappear once answered,
 * and there is no third state where silence counts as yes — until a button is
 * pressed, everything stays denied.
 *
 * ## Where the answer lives
 *
 * `localStorage`, in the visitor's own browser. Not a cookie, because a cookie
 * would be sent on every request to record a preference the server has no use
 * for; and not the database, because a record of who refused tracking is
 * itself a record about a person.
 */

type Props = {
  /**
   * "banner" waits for an unanswered visitor; "manage" is the control on the
   * cookie policy, which always renders so an answer can be changed later —
   * which is the half of consent that most implementations quietly omit.
   */
  mode?: "banner" | "manage";
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/*
 * A browser with storage blocked reads as unanswered, which is the safe
 * reading: nothing is remembered, so nothing is granted.
 */
function read(stored: string | null): ConsentChoice | null {
  return stored === "granted" || stored === "denied" ? stored : null;
}

/*
 * Read through `useSyncExternalStore` rather than in an effect.
 *
 * The stored answer is state that lives outside React, and this is the hook
 * for exactly that: the server snapshot is null — the server cannot know what
 * is in somebody's browser — and the client snapshot is the stored value, so
 * hydration is honest and there is no render where the banner is shown to a
 * visitor who has already answered.
 */
const subscribe = (onChange: () => void) => {
  // Another tab answering is the one external change worth hearing about.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/*
 * "Are we past hydration yet", asked the same way.
 *
 * `typeof window !== "undefined"` is true during the client's hydration
 * render and false during the server's, which is precisely a hydration
 * mismatch — the server sends nothing and the client insists on a banner over
 * it. An external store is false for both, then true on the re-render React
 * performs for stores, which is the same mechanism that delivers the stored
 * answer a moment later.
 */
const never = () => () => {};

export function ConsentBanner({ mode = "banner" }: Props) {
  const [answered, setAnswered] = useState<ConsentChoice | null>(null);
  const stored = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(CONSENT_KEY),
    () => null,
  );

  const ready = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  const choice = answered ?? read(stored);

  const decide = (value: ConsentChoice) => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Storage refused. The update below still applies to this page view,
      // which is the most that can be honoured for a browser that will not
      // remember anything.
    }
    window.gtag?.("consent", "update", value === "granted" ? GRANTED : DENIED);
    setAnswered(value);
  };

  // Nothing renders until the stored answer is known, or every returning
  // visitor sees the banner flash before it disappears.
  if (!ready) return null;
  if (mode === "banner" && choice !== null) return null;

  const buttons = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => decide("granted")}
        className="h-9 rounded-[--radius-md] bg-graphite-900 px-4 text-[13px] font-medium text-white hover:bg-graphite-800"
      >
        Accept analytics
      </button>
      <button
        type="button"
        onClick={() => decide("denied")}
        className="h-9 rounded-[--radius-md] border border-graphite-400 bg-white px-4 text-[13px] font-medium text-graphite-900 hover:border-graphite-900"
      >
        Reject
      </button>
    </div>
  );

  if (mode === "manage") {
    return (
      <div className="rounded-[--radius-lg] border border-line bg-white p-5">
        <p className="text-meta text-ink-600">
          {choice === "granted"
            ? "You have accepted analytics on this browser."
            : choice === "denied"
              ? "You have refused analytics on this browser."
              : "You have not answered yet on this browser, so analytics is switched off."}{" "}
          Nothing about the site changes either way, and you can change this as often as you like.
        </p>
        <div className="mt-3">{buttons}</div>
      </div>
    );
  }

  return (
    /*
     * A region rather than a dialog. It does not take focus, does not cover
     * the page, and a reader can ignore it and carry on — a modal would make
     * an answer the price of reading a public page, which is the thing a
     * consent notice is not supposed to be.
     */
    <section
      aria-label="Cookies and analytics"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 backdrop-blur"
    >
      <div className="container-page flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-meta leading-relaxed text-ink-600">
          We use Google Analytics to see which pages and products are useful, and Google&rsquo;s
          advertising measurement alongside it. Neither runs until you accept, and neither runs on
          the pages you see once you are signed in. The{" "}
          <Link href="/cookie-policy" className="text-accent-700 underline underline-offset-2">
            cookie policy
          </Link>{" "}
          names every cookie involved.
        </p>
        {buttons}
      </div>
    </section>
  );
}
