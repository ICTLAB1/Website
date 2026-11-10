"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Client error boundary.
 *
 * Only the digest is shown. Next.js replaces the real message and stack with
 * that opaque digest in production, and the full detail stays in the server
 * logs, so nothing about the internals reaches the browser.
 *
 * ## Why the first button reloads rather than retries
 *
 * It used to offer `reset()` first, which re-renders the same tree with the
 * same JavaScript already loaded. That is the right move for an error the
 * render itself caused — a failed fetch, a transient database hiccup — and it
 * is the wrong move for the commonest error a deployed site actually throws:
 *
 *   Failed to find Server Action "6032…". This request might be from an
 *   older or newer deployment.
 *
 * A Server Action's id comes from the build. Deploy, and every tab somebody
 * already had open is holding ids the running build no longer knows. The next
 * form they submit fails — and `reset()` cannot fix it, because the stale ids
 * are in the page that is already loaded. The button that looked like the
 * remedy was the one thing guaranteed not to work, which is how a member of
 * staff concludes that replying to a customer is broken. It happened on
 * 10 November, to a support reply, after three deploys in one afternoon.
 *
 * A full reload fetches the current build and fixes it. It also fixes stale
 * chunks after a deploy, and costs a round trip in the cases where `reset()`
 * would have been enough — so it leads, and `reset()` stays behind it for the
 * errors where re-rendering genuinely is the cheaper answer.
 *
 * The message cannot be sniffed to tell the two apart: production replaces it
 * with the digest before the browser sees it. So the copy covers both without
 * claiming to know which happened.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server has already logged the detail against this digest.
    console.error("A page-level error occurred.", error.digest ?? "");
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-danger-600">
        Something went wrong
      </p>
      <h1 className="mt-3 text-3xl sm:text-4xl">We could not load this page</h1>
      <p className="mt-4 max-w-lg text-[15px] text-ink-600">
        The problem has been recorded. This often means the site was updated while this
        page was open, in which case reloading fixes it and nothing you submitted was
        lost. If it continues, quote the reference below when you contact us.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-[12px] text-ink-500">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Reload the page</Button>
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <ButtonLink href="/" variant="outline">
          Back to home
        </ButtonLink>
        <ButtonLink href="/contact" variant="ghost">
          Contact support
        </ButtonLink>
      </div>
    </div>
  );
}
