"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Suggestion = { title: string; subtitle: string; href: string; badge?: string };

/**
 * Global product search with debounced autocomplete.
 *
 * Follows the combobox pattern: arrow keys move through suggestions, Enter
 * opens the active one (or runs a full search), Escape closes the list.
 */
export function SearchBox({
  placeholder = "What software or solution are you looking for?",
  size = "md",
  autoFocus = false,
  className,
  /** Distinguishes multiple search landmarks on the same page. */
  label = "Search products, brands and services",
}: {
  placeholder?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const queryIsSearchable = trimmedQuery.length >= 2;

  // Derived rather than stored: a short query simply shows nothing, instead of
  // an effect clearing state and triggering a cascading render.
  const visibleSuggestions = queryIsSearchable ? suggestions : [];

  useEffect(() => {
    if (trimmedQuery.length < 2) return;

    const controller = new AbortController();
    // The loading flag is raised inside the debounce callback rather than in
    // the effect body: setting state synchronously in an effect causes a
    // cascading render, and there is nothing to show until the request starts.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("suggest failed");
        const payload = (await response.json()) as { ok: boolean; data?: { results: Suggestion[] } };
        setSuggestions(payload.ok && payload.data ? payload.data.results : []);
        setActiveIndex(-1);
      } catch {
        // A failed suggestion request degrades to plain search; nothing to show.
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    const active = visibleSuggestions[activeIndex];
    if (active) {
      setOpen(false);
      router.push(active.href);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const height = size === "lg" ? "h-14 text-[15px]" : "h-11 text-sm";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form role="search" aria-label={label} onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          {label}
        </label>
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 3.4 9.83l3.14 3.13a1 1 0 0 0 1.41-1.41l-3.13-3.14A5.5 5.5 0 0 0 9 3.5M5.5 9a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            id={`${listId}-input`}
            type="search"
            role="combobox"
            aria-expanded={open && visibleSuggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
            autoComplete="off"
            autoFocus={autoFocus}
            value={query}
            placeholder={placeholder}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((index) => Math.min(index + 1, visibleSuggestions.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, -1));
              } else if (event.key === "Escape") {
                setOpen(false);
                setActiveIndex(-1);
              }
            }}
            className={cn(
              "w-full rounded-[--radius-md] border border-line-strong bg-white pl-10 pr-24 text-ink-900",
              "placeholder:text-ink-500 hover:border-ink-300 focus:border-accent-600",
              height,
            )}
          />
          <button
            type="submit"
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[--radius-sm] bg-accent-700 px-4 font-medium text-white hover:bg-accent-800",
              size === "lg" ? "h-11 text-sm" : "h-8 text-[13px]",
            )}
          >
            Search
          </button>
        </div>
      </form>

      {open && queryIsSearchable ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 overflow-hidden rounded-[--radius-lg] border border-line bg-white shadow-[--shadow-overlay]">
          {loading && visibleSuggestions.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-ink-500">Searching…</p>
          ) : visibleSuggestions.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-ink-500">
              No matches. Press Search to look across the whole site.
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search suggestions" className="max-h-96 overflow-y-auto">
              {visibleSuggestions.map((suggestion, index) => (
                <li key={suggestion.href} role="none">
                  <Link
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    href={suggestion.href}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex items-start gap-3 border-b border-line px-4 py-2.5 last:border-b-0",
                      index === activeIndex ? "bg-accent-50" : "hover:bg-surface-muted",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy-900">
                        {suggestion.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-ink-500">
                        {suggestion.subtitle}
                      </span>
                    </span>
                    {suggestion.badge ? (
                      <span className="mt-0.5 shrink-0 rounded-[--radius-xs] bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
                        {suggestion.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
