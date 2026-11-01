"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * The Diwali greeting, shown once when somebody arrives.
 *
 * ## It blocks the page, which nothing else here does
 *
 * The cookie notice three files away says, in its own comment, that it does
 * not block the page or trap focus — and that is the right default for
 * something a visitor did not ask for. This does both, because it was asked
 * for as a pop-up and a pop-up is what it is. The cost is real and worth
 * writing down rather than discovering: an overlay covering the page on
 * arrival is the pattern search engines treat as an intrusive interstitial,
 * and this site has had a good deal of work put into its technical SEO.
 *
 * So the harm is bounded everywhere it can be. Once per visit, not once per
 * page. A close button large enough to hit on a phone, plus the backdrop, plus
 * Escape. No second chance, no "are you sure", no countdown. And it removes
 * itself from the site entirely when the offer ends — see the gate beside this
 * file, which stops rendering it rather than relying on anything here.
 *
 * ## Once per visit, in sessionStorage
 *
 * `sessionStorage`, like the assistant's greeting and for the same reason: a
 * visitor who waved it away should not meet it again while browsing, and
 * somebody returning next week is a new visit. The key is written the moment
 * it is shown rather than when it is dismissed, so a visitor who navigates
 * away mid-greeting is not greeted again on the next page.
 *
 * Reads and writes are wrapped. A private window with site data blocked throws
 * on access, and a festive greeting is not worth a blank page.
 *
 * ## Focus
 *
 * Focus moves to the dialog and is held there while it is open, because a
 * modal that announces itself as one and then leaves focus behind it is worse
 * for a screen reader user than no modal at all — they are told the page is
 * inert and given nothing to act on. It goes back where it came from on close.
 */

const SEEN_KEY = "techzoid.diwali.2026.seen";

/**
 * The pages a greeting must not land on top of.
 *
 * Not a style preference — it was found by walking into it. The first version
 * suppressed the greeting on `/admin` and `/account`, copying the chat widget,
 * and `/login` is neither: an automated run trying to sign in spent thirty
 * seconds clicking a Sign in button that a festive backdrop was quietly
 * swallowing. A visitor would have dismissed it and carried on, mildly
 * annoyed, which is the version of this that nobody reports.
 *
 * So the rule is about what the visitor is doing rather than where they are.
 * Browsing — the catalogue, a product, the brand pages, anything editorial —
 * is a moment when an offer is welcome. Signing in, registering, resetting a
 * password, verifying an email, tracking an order, uploading a bill of
 * quantities, or filling in the enquiry form is a task, and a pop-up over a
 * task is an obstacle however well it is drawn. `/enquiry` earns its place
 * twice over: it is a form, and it is where this greeting's own button sends
 * people.
 */
const BUSY_PATHS = [
  "/admin",
  "/account",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/enquiry",
  "/buy",
  "/track-order",
  "/requirement",
  "/uploads",
];

function isBusy(pathname: string | null): boolean {
  if (!pathname) return true;
  return BUSY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function alreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    /* Blocked storage is not a reason to fail; the greeting simply repeats. */
    return false;
  }
}

function rememberSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* As above. */
  }
}

/*
 * "Are we past hydration yet", asked through an external store.
 *
 * Lifted from the cookie notice, which explains it at length: `typeof window
 * !== "undefined"` is true in the client's hydration render and false in the
 * server's, which is precisely a mismatch. A store that answers false to both
 * and true on the re-render React performs for stores is honest in all three.
 */
const never = () => () => {};

export function FestivalGreeting({ tradingName }: { tradingName: string }) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<Element | null>(null);

  const suppressed = isBusy(pathname);

  /*
   * The stored flag, read the way the cookie notice reads its own.
   *
   * The server snapshot is `true` — "already seen" — which is the reading
   * that renders nothing. That is deliberate on two counts: the server cannot
   * know what is in somebody's browser, and a hydration render that insisted
   * on a greeting over markup that had none is exactly the mismatch this hook
   * exists to avoid. React re-renders with the real answer immediately after,
   * which is where the greeting actually appears.
   */
  const seen = useSyncExternalStore(
    never,
    () => alreadySeen(),
    () => true,
  );

  const open = !suppressed && !seen && !dismissed;

  /*
   * Remembered when it is dismissed, in the handler — not when it is shown.
   *
   * Writing on show would be marginally better (a visitor who leaves
   * mid-greeting would not meet it again), and it is not worth what it costs:
   * the flag is what this component reads to decide, so writing it during a
   * render or an effect means reading back, a beat later, the value just
   * written, and closing the greeting in the same breath it opened. Dismissal
   * is an event, events may have effects, and every way out of this dialog
   * goes through here.
   */
  const close = useCallback(() => {
    rememberSeen();
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      [...(panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [])];

    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;

      /*
       * The loop is written out rather than left to the browser: `inert` on
       * everything else would be tidier and is the thing this would use if the
       * rest of the page were one element, which it is not.
       */
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
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-graphite-950/60 animate-fade-in"
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diwali-greeting-heading"
        className="relative w-full max-w-md overflow-hidden rounded-[--radius-lg] bg-white shadow-[--shadow-overlay] animate-scale-in"
      >
        {/*
          The site's own gold, not a festive palette invented for the occasion.
          The accent here is already a warm gold — using it means the greeting
          reads as this business in a good mood rather than as an advert
          somebody else dropped onto the page.
        */}
        <div className="relative isolate overflow-hidden bg-graphite-900 px-6 pb-7 pt-8 text-center">
          <Diyas />
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent-300">
            {tradingName}
          </p>
          <h2 id="diwali-greeting-heading" className="mt-2 text-section font-semibold text-white">
            Happy Diwali
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-meta leading-relaxed text-white/80">
            Wishing you, your team and your families a bright and prosperous year ahead.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6 text-center">
          <div className="rounded-[--radius-md] border border-accent-200 bg-accent-50 px-4 py-4">
            <p className="text-body font-semibold text-graphite-900">
              Big discounts on quantity orders
            </p>
            <p className="mt-1 text-meta leading-relaxed text-ink-700">
              On through the festive season, until 10 November.
            </p>
            {/*
              What the discount actually is depends on the order, and this is
              not the place to put a number on it. A figure here would be a
              price commitment made by a pop-up, on a site whose whole pricing
              policy is that a figure is tentative until it is on a written
              quotation.
            */}
            <p className="mt-2 text-label leading-relaxed text-ink-500">
              How much depends on the quantity and the product — tell us what you need and we will
              put it in writing.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href="/enquiry"
              onClick={close}
              className="inline-flex min-h-11 items-center justify-center rounded-[--radius-md] bg-accent-700 px-5 text-body font-semibold text-white transition-colors hover:bg-accent-800"
            >
              Get a festive quotation
            </Link>
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 items-center justify-center rounded-[--radius-md] px-5 text-meta font-semibold text-ink-600 transition-colors hover:text-graphite-900"
            >
              Keep browsing
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={close}
          aria-label="Close the Diwali greeting"
          className="absolute right-3 top-3 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Three diyas along the bottom of the header, drawn rather than fetched.
 *
 * Inline SVG because it is a few hundred bytes against a request, and because
 * an image file would have to be chosen, licensed and sized for a decoration
 * that exists for nine days. `aria-hidden`: it says nothing the heading beside
 * it does not already say.
 */
function Diyas() {
  return (
    <svg
      viewBox="0 0 220 60"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-14 w-full opacity-70"
      aria-hidden="true"
      focusable="false"
    >
      {[30, 110, 190].map((x, index) => (
        <g key={x} transform={`translate(${x} ${index === 1 ? 6 : 14})`}>
          {/* The flame, and a soft halo behind it. */}
          <circle cx="0" cy="22" r="11" fill="var(--color-accent-400)" opacity="0.18" />
          <path
            d="M0 14c3.2 2.6 4.8 5 4.8 7.3 0 2.7-2.1 4.7-4.8 4.7s-4.8-2-4.8-4.7C-4.8 19 -3.2 16.6 0 14Z"
            fill="var(--color-accent-400)"
          />
          {/* The lamp. */}
          <path
            d="M-13 28h26c-1.6 5.6-6.6 9-13 9s-11.4-3.4-13-9Z"
            fill="var(--color-accent-600)"
          />
          <ellipse cx="0" cy="28" rx="13" ry="2.4" fill="var(--color-accent-500)" />
        </g>
      ))}
    </svg>
  );
}
