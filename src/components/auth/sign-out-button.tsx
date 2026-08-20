"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/csrf-client";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
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
        "inline-flex h-10 items-center justify-center rounded-[--radius-md] border border-line-strong px-4 text-[13px] font-medium text-navy-900 hover:border-danger-600 hover:text-danger-700 disabled:opacity-60",
        className,
      )}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
