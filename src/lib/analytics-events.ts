import { CONVERSION_EVENTS } from "@/lib/analytics";

/**
 * Telling the tag that something worth counting happened.
 *
 * A push onto `dataLayer`, which is the only thing this file does. Whether a
 * tag then fires, and whether it may read a cookie while doing so, is settled
 * by the container and by Consent Mode — neither of which belongs at a call
 * site that knows about enquiries.
 *
 * ## Why the guard
 *
 * A conversion counted twice is worse than one counted late: it inflates the
 * number an advertising budget is set from, and nothing about the report says
 * it happened. The handler this is called from can plausibly run again — a
 * retry, a double submit that the server answers from the same request, React
 * re-running an effect in development — so every call names what makes this
 * occurrence distinct, and the same occurrence is refused a second time.
 *
 * `sessionStorage` rather than a variable, because a variable is reset by a
 * refresh and refreshing a confirmation page is a thing people do. It holds a
 * flag saying "this reference has been counted" and nothing about the visitor;
 * a browser that refuses storage falls back to the variable, which is the safe
 * direction to fail — worst case a refresh counts twice, where the alternative
 * is not counting at all.
 */

const firedThisPageLoad = new Set<string>();

function keyFor(event: string, once: string): string {
  return `techzoid.counted.${event}.${once}`;
}

function alreadyCounted(key: string): boolean {
  if (firedThisPageLoad.has(key)) return true;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function remember(key: string): void {
  firedThisPageLoad.add(key);
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Storage refused. The in-memory set still covers this page load, which is
    // the case that actually repeats.
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Pushes a conversion event once.
 *
 * @param event one of `CONVERSION_EVENTS` — the exact string a container
 *   trigger is configured against
 * @param once what makes this occurrence distinct, such as the reference the
 *   server issued. Two calls with the same pair push once.
 * @param details extra keys pushed alongside the event, for a container or a
 *   report that wants to tell these occurrences apart.
 *
 * ## Why `details` exists
 *
 * Four forms on this site produce the same thing — somebody asking to be
 * quoted — and they belong to one conversion action, because a conversion
 * action is what a bidding strategy optimises towards and splitting one
 * intention across several of them starves each. But "which form" is a real
 * question for a report, and the answer is lost if every push looks identical.
 *
 * So the event name stays the unit of counting and this carries the
 * distinction. A container can read it into a parameter without a code change,
 * and if one of these forms should later become a conversion action of its own,
 * that too is a container change rather than a deploy.
 */
export function pushConversion(
  event: (typeof CONVERSION_EVENTS)[keyof typeof CONVERSION_EVENTS],
  once: string,
  details?: Readonly<Record<string, string>>,
): void {
  // Called from event handlers, so this should never be false. It is checked
  // anyway: a push that throws during a server render would take the page with
  // it, to record a statistic.
  if (typeof window === "undefined") return;

  const key = keyFor(event, once);
  if (alreadyCounted(key)) return;
  remember(key);

  /*
   * Created here if the tag has not already made it. On a page where analytics
   * is switched off — a developer's machine, a signed-in path — this leaves an
   * array nobody reads, which is the correct amount of nothing to happen.
   */
  window.dataLayer = window.dataLayer ?? [];
  // `event` last, and deliberately: a container trigger reads it, and a detail
  // key colliding with it would silently fire the wrong tag — or none.
  window.dataLayer.push({ ...details, event });
}
