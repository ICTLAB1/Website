"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * The Diwali greeting, shown once when somebody arrives.
 *
 * ## Built from the supplied artwork rather than being it
 *
 * The design came as a finished poster. The obvious thing is to put that image
 * in the panel and be done, and it is the wrong thing: every word of it would
 * be pixels. A screen reader would read one alt attribute instead of the
 * offer, nobody could select the date, the browser could not translate it, it
 * would not reflow on a narrow phone, and the call to action inside it would
 * not be a button. So the layout, the palette and the wording are rebuilt here
 * in markup, and the one part that is genuinely a photograph — the lit diyas
 * and marigolds — is cropped out of the original and used as a band.
 *
 * The display face is the site's own serif in italic rather than the script in
 * the artwork. A script face means another font file on every public page for
 * two words that show for nine days, and the serif in deep red carries the
 * same warmth without that.
 *
 * ## It blocks the page, which nothing else here does
 *
 * The cookie notice says in its own comment that it does not block the page or
 * trap focus, and that is the right default for something a visitor did not
 * ask for. This does both, because a pop-up is what was asked for. The cost is
 * real: an overlay covering the page on arrival is the pattern search engines
 * treat as an intrusive interstitial, on a site with a lot of technical SEO
 * work behind it.
 *
 * So the harm is bounded everywhere it can be. Once per visit, not once per
 * page. Escape, the backdrop and a close button all dismiss it. And it stays
 * off the pages where somebody is mid-task — see `BUSY_PATHS`.
 *
 * ## Focus
 *
 * Focus moves into the dialog and is held there while it is open, because a
 * modal that announces itself as one and then leaves focus behind it is worse
 * for a screen reader user than no modal at all. It goes back where it came
 * from on close.
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
 * Browsing is a moment when an offer is welcome. Signing in, registering,
 * resetting a password, verifying an email, tracking an order, uploading a
 * bill of quantities or filling in the enquiry form is a task, and a pop-up
 * over a task is an obstacle however well it is drawn. `/enquiry` earns its
 * place twice over: it is a form, and it is where this greeting's own button
 * sends people.
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

/** What the business is offering, in its own words. */
const PROMISES = [
  { label: "Attractive bulk discounts", icon: "coins" },
  { label: "Personalised quotes", icon: "rosette" },
  { label: "Faster turnaround", icon: "bolt" },
  { label: "Dedicated support", icon: "headset" },
] as const;

export function FestivalGreeting({ tradingName }: { tradingName: string }) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<Element | null>(null);

  const suppressed = isBusy(pathname);

  /*
   * The stored flag, read the way the cookie notice reads its own. The server
   * snapshot is `true` — "already seen" — which renders nothing: the server
   * cannot know what is in somebody's browser, and a hydration render that
   * insisted on a greeting over markup that had none is the mismatch this
   * hook exists to avoid.
   */
  const seen = useSyncExternalStore(
    never,
    () => alreadySeen(),
    () => true,
  );

  const open = !suppressed && !seen && !dismissed;

  /*
   * Remembered when it is dismissed, in the handler — not when it is shown.
   * The flag is what this component reads to decide, so writing it during a
   * render or an effect means reading back, a beat later, the value just
   * written, and closing the greeting in the same breath it opened. Every way
   * out of this dialog goes through here.
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-graphite-950/70 animate-fade-in"
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diwali-greeting-heading"
        className="relative max-h-[92dvh] w-full max-w-[26rem] overflow-y-auto overscroll-contain rounded-[--radius-lg] border border-[#e3c98a] bg-[linear-gradient(175deg,#fffaf0_0%,#fdf3e0_45%,#f9e9cd_100%)] shadow-[--shadow-overlay] animate-scale-in"
      >
        <Mandala className="absolute left-0 top-0 h-20 w-20 text-[#c9a227]" />
        <Mandala className="absolute right-0 top-0 h-20 w-20 -scale-x-100 text-[#c9a227]" />
        {/*
          The right-hand lamp hangs further in than the left. Not a
          flourish — the close button lives in that corner, and symmetric
          lamps put a painted flame directly under the one control a visitor
          needs to find in a hurry.
        */}
        <Lantern className="absolute left-4 top-0 h-16 w-8" />
        <Lantern className="absolute right-14 top-0 h-20 w-8" />

        <div className="relative px-6 pb-6 pt-7 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={tradingName}
            className="mx-auto h-8 w-auto object-contain"
            width={512}
            height={128}
          />
          {/*
            No tagline line here. The supplied logo has one lettered into the
            artwork, and the configured tagline is a different sentence — two
            of them stacked read as a mistake rather than as branding.
          */}

          <p className="mt-6 font-serif text-[15px] text-[#6b4f1d]">Wishing you a</p>
          <h2
            id="diwali-greeting-heading"
            className="font-serif text-[2.4rem] italic leading-[1.05] text-[#9c1b2e]"
          >
            Happy Diwali
          </h2>

          <p className="mx-auto mt-3 max-w-[19rem] text-meta leading-relaxed text-ink-700">
            May the festival of lights bring{" "}
            <strong className="font-semibold text-graphite-900">
              health, happiness, prosperity
            </strong>{" "}
            and <strong className="font-semibold text-graphite-900">new opportunities</strong> for
            you, your team and your loved ones.
          </p>
        </div>

        {/*
          The one piece of the supplied poster that is a photograph rather
          than a layout, cropped out of it and used at its own aspect ratio.
          Decorative: the greeting above says everything it says.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/festive/diwali-diyas.webp"
          alt=""
          aria-hidden="true"
          className="block h-auto w-full"
          width={1199}
          height={177}
        />

        <div className="relative space-y-4 px-5 pb-6 pt-5">
          <div className="rounded-[--radius-md] border border-[#e0b85c] bg-[linear-gradient(135deg,#7b1526_0%,#a01b2f_55%,#7b1526_100%)] px-4 py-4 text-center">
            <p className="text-[1.05rem] font-semibold leading-tight text-[#f6d98a]">
              Festive savings on bulk orders
            </p>
            <p className="mt-1.5 text-label leading-relaxed text-white/85">
              Exclusive discounts across our products and solutions this festive season.
            </p>
            <p className="mt-2.5 inline-block rounded-full bg-[#f6d98a] px-3 py-1 text-label font-semibold text-[#7b1526]">
              Valid till 10 November
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {PROMISES.map((promise) => (
              <li key={promise.label} className="flex items-start gap-2 text-left">
                <PromiseIcon name={promise.icon} />
                <span className="text-label font-semibold leading-snug text-graphite-900">
                  {promise.label}
                </span>
              </li>
            ))}
          </ul>

          {/*
            What the discount comes to is not stated, and deliberately. A
            figure here would be a price commitment made by a pop-up, on a
            site whose pricing policy is that every figure is tentative until
            it is on a written quotation.
          */}
          <div className="space-y-2 pt-1">
            <Link
              href="/enquiry"
              onClick={close}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#e0b85c] bg-[linear-gradient(135deg,#7b1526_0%,#a01b2f_55%,#7b1526_100%)] px-5 text-body font-semibold text-[#f6d98a] transition-opacity hover:opacity-95"
            >
              Request your festive quotation
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <button
              type="button"
              onClick={close}
              className="flex min-h-11 w-full items-center justify-center text-meta font-semibold text-[#7a5a22] underline underline-offset-4 transition-colors hover:text-[#5a4005]"
            >
              Continue browsing
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={close}
          aria-label="Close the Diwali greeting"
          className="absolute right-2.5 top-2.5 rounded-full bg-white/70 p-2 text-[#7b1526] transition-colors hover:bg-white"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** A corner flourish, echoing the mandala corners of the supplied poster. */
function Mandala({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.45">
        {[14, 24, 34, 44].map((r) => (
          <path key={r} d={`M0 ${r}A${r} ${r} 0 0 0 ${r} 0`} />
        ))}
        {[0, 18, 36, 54, 72, 90].map((angle) => (
          <path
            key={angle}
            d="M8 8 l16 2 -2 -16 Z"
            transform={`rotate(${angle} 8 8)`}
            opacity="0.5"
          />
        ))}
      </g>
    </svg>
  );
}

/** A hanging lamp, of the kind strung either side of the supplied poster. */
function Lantern({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 70" className={className} aria-hidden="true" focusable="false">
      <line x1="12" y1="0" x2="12" y2="22" stroke="#c9a227" strokeWidth="1.2" />
      <path d="M7 22h10l-1.5 4h-7Z" fill="#b8860b" />
      <path
        d="M12 26c6 0 9 4.6 9 10.5S17 50 12 50s-9-7-9-13.5S6 26 12 26Z"
        fill="url(#lanternGlow)"
        stroke="#c9a227"
        strokeWidth="1.1"
      />
      <path d="M8 31q4 5.5 0 14M16 31q-4 5.5 0 14" stroke="#e8c877" strokeWidth="0.8" fill="none" />
      <path d="M9 50h6l-1 4h-4Z" fill="#b8860b" />
      <path d="M12 54v6" stroke="#c9a227" strokeWidth="1" />
      <defs>
        <radialGradient id="lanternGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="100%" stopColor="#e8a317" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** The four small marks beside what the business is offering. */
function PromiseIcon({ name }: { name: (typeof PROMISES)[number]["icon"] }) {
  const paths: Record<string, string> = {
    coins: "M10.6 2.6H16a1.4 1.4 0 0 1 1.4 1.4v5.4a2 2 0 0 1-.6 1.4l-6 6a1.4 1.4 0 0 1-2 0l-5.4-5.4a1.4 1.4 0 0 1 0-2l6-6a2 2 0 0 1 1.2-.8ZM13.6 6.4h.01M8.4 12.6l4-4",
    rosette: "M10 3.5l1.9 1.2 2.2-.4.6 2.2 1.7 1.5-1.4 1.8.2 2.2-2.2.4-1.6 1.6-2-1-2 1-1.6-1.6-2.2-.4.2-2.2L2.4 8l1.7-1.5.6-2.2 2.2.4Z",
    bolt: "M11 2.5 4.5 11h4l-1 6.5L15 9h-4l1-6.5Z",
    headset: "M3.5 12v-2a6.5 6.5 0 0 1 13 0v2m0 0v2a3 3 0 0 1-3 3h-2m5-5h-2.5v4H16m-12.5-4H6v4H3.5Z",
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      className="mt-px shrink-0 text-[#a01b2f]"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
