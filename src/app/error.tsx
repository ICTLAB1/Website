"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Client error boundary.
 *
 * Only the digest is shown. Next.js replaces the real message and stack with
 * that opaque digest in production, and the full detail stays in the server
 * logs, so nothing about the internals reaches the browser.
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
        The problem has been recorded. Please try again, and if it continues, quote the
        reference below when you contact us.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-[12px] text-ink-500">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
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
