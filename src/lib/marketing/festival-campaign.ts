/**
 * When the Diwali campaign stops.
 *
 * ## Why the end date is code rather than a note in a calendar
 *
 * A festive pop-up still greeting visitors in January is the ordinary fate of
 * this kind of thing, and no amount of intending to remove it prevents that.
 * The end date is therefore the mechanism: once it passes, the gate renders
 * nothing — no markup, no script, nothing for a crawler to read and nothing
 * for a visitor to dismiss — without anybody deploying anything.
 *
 * ## The instant, not the date
 *
 * The offer runs "until 10 November", so it ends at midnight between the
 * tenth and the eleventh, India time: this business and nearly all of its
 * customers are in India, and an offer advertised that way should not stop at
 * half past five in the evening because the server keeps UTC.
 *
 * Written as the instant rather than as a date to compare, because
 * `new Date("2026-11-10")` is midnight *UTC* — which is half past five on the
 * morning of the tenth in India, and would have ended the campaign most of a
 * day early.
 */
export const CAMPAIGN_ENDS_AT = Date.parse("2026-11-10T18:30:00Z");

/**
 * Whether the campaign is still running.
 *
 * `async` for a reason that is not about the work: it is read during a server
 * component's render, and `Date.now()` called straight from a render body is
 * an impure call — the React compiler says so, and it is right, because a
 * render that returns something different each time it runs is not a function
 * of its inputs. Awaiting it makes the impurity explicit and keeps it out of
 * the render path.
 *
 * `now` is injectable so the boundary can be tested from both sides without
 * waiting for November.
 */
export async function campaignIsRunning(now: number = Date.now()): Promise<boolean> {
  return now < CAMPAIGN_ENDS_AT;
}
