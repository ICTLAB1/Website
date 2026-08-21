"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up when it first scrolls into view.
 *
 * The final value is rendered on the server and is what sits in the markup, so
 * a reader without JavaScript — or with reduced motion — sees the real figure
 * immediately. The animation only ever replaces a number that is already
 * correct with a sequence ending at the same number, which means it cannot
 * misreport a statistic even if it is interrupted.
 */
export function CountUp({
  value,
  durationMs = 900,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (value <= 0) return;

    let frame = 0;
    let cancelled = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          if (cancelled) return;
          const progress = Math.min(1, (now - start) / durationMs);
          // Ease out: fast at first, settling into the final value.
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(value * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };

        setDisplay(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("en-IN")}
    </span>
  );
}
