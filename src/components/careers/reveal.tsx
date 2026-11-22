"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Fades and lifts its children in when they scroll into view.
 *
 * Content is in the server-rendered HTML and visible without JavaScript: the
 * hidden starting state is only applied once this has mounted and the browser
 * has said it is not already on screen, so a crawler, a slow connection or a
 * visitor who asks for reduced motion never sees an invisible section.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Milliseconds, to stagger siblings. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"visible" | "waiting" | "shown">("visible");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return; // already in view: leave it

    setState("waiting");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={state === "shown" ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-all duration-700 ease-out",
        state === "waiting" && "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
