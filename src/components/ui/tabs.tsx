"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: string; content: ReactNode };

/**
 * Tabs following the WAI-ARIA tabs pattern: roving tabindex, arrow-key
 * navigation, Home/End, and panels linked back to their tab.
 */
export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  const baseId = useId();
  const [active, setActive] = useState(items[0]?.id ?? "");
  if (items.length === 0) return null;

  function move(offset: number) {
    const index = items.findIndex((item) => item.id === active);
    const next = items[(index + offset + items.length) % items.length];
    if (next) {
      setActive(next.id);
      document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
    }
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label="Product information" className="scroll-x border-b border-line">
        <div className="flex min-w-max gap-1">
          {items.map((item) => {
            const selected = item.id === active;
            return (
              <button
                key={item.id}
                id={`${baseId}-tab-${item.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
                  if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
                  if (event.key === "Home") { event.preventDefault(); const first = items[0]; if (first) setActive(first.id); }
                  if (event.key === "End") { event.preventDefault(); const last = items[items.length - 1]; if (last) setActive(last.id); }
                }}
                className={cn(
                  "-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  selected
                    ? "border-accent-700 text-navy-900"
                    : "border-transparent text-ink-500 hover:border-line-strong hover:text-navy-800",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          id={`${baseId}-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          tabIndex={0}
          className="pt-6 focus-visible:outline-none"
        >
          {item.id === active ? item.content : null}
        </div>
      ))}
    </div>
  );
}
