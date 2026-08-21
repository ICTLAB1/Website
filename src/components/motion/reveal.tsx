"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveals its children as they scroll into view.
 *
 * Three things make this safe to use liberally on a content site:
 *
 *  - **No layout shift.** The element occupies its final space from the first
 *    paint; only `opacity` and `transform` change, so nothing reflows and the
 *    animation is composited off the main thread.
 *  - **Content is never hidden from a reader that cannot run it.** The initial
 *    hidden state is applied by an effect, not in the markup, so with
 *    JavaScript disabled the content simply renders visible. Animating content
 *    in is a decoration; making it depend on script would make it a barrier.
 *  - **It respects `prefers-reduced-motion`.** The check runs before the
 *    element is ever hidden, so a reader who has asked for less motion sees a
 *    plain, static page rather than a fast one.
 *
 * The observer disconnects after the first reveal: re-animating on every scroll
 * past is the thing that makes this pattern tiresome.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Stagger in milliseconds. Keep small; long chains feel sluggish. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    // Already in view on first paint (above the fold): leave it alone rather
    // than flashing it out and back in.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return;

    setShown(false);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      // Start slightly before the element reaches the viewport so the motion
      // finishes about when it arrives.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-revealed={shown ? "true" : "false"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal", className)}
    >
      {children}
    </Tag>
  );
}

/**
 * Staggers a list of children.
 *
 * The delay is capped so a long grid does not leave the last card waiting
 * noticeably after the first.
 */
export function RevealGroup({
  children,
  className,
  step = 60,
  max = 240,
}: {
  children: ReactNode[];
  className?: string;
  step?: number;
  max?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <Reveal key={index} delay={Math.min(index * step, max)}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
