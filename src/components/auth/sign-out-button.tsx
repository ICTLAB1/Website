"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/csrf-client";
import { cn } from "@/lib/utils";

/**
 * `tone` rather than a colour in `className`.
 *
 * `cn` is a plain join, not tailwind-merge, so a `text-graphite-100` passed in
 * from outside does not displace the `text-graphite-900` baked in below —
 * both land in the class attribute and Tailwind's own stylesheet order picks
 * the darker one. The admin sidebar did exactly that and rendered this button
 * graphite-900 on graphite-800: a contrast ratio of 1.15, which is to say
 * invisible. Nothing had caught it because no suite audited a page behind the
 * login. Choosing the colour here, from a fixed set, is what makes that
 * impossible rather than merely fixed.
 */
export function SignOutButton({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "onDark";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        // The server revokes the session row; clearing the cookie alone would
        // leave a valid token in existence.
        await postJson("/api/auth/logout", {});
        router.push("/");
        router.refresh();
      }}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-[--radius-md] border px-4 text-[13px] font-medium disabled:opacity-60",
        tone === "onDark"
          ? "border-graphite-700 bg-graphite-800 text-graphite-100 hover:border-danger-600 hover:text-white"
          : "border-line-strong text-graphite-900 hover:border-danger-600 hover:text-danger-700",
        className,
      )}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
