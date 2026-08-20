"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * The B2B enquiry basket.
 *
 * Backed by localStorage through `useSyncExternalStore`, which is the correct
 * primitive for an external store: it renders an empty basket during
 * server-side rendering and hydration, then switches to the stored contents
 * without an effect that would cause a cascading render.
 *
 * Only `sku` and `quantity` are ever submitted to the server. The price and
 * name held here are a display cache; on submission the server re-resolves
 * every SKU from the database and recomputes pricing, so editing localStorage
 * cannot change what a customer is quoted.
 */

export type BasketLine = {
  sku: string;
  productSlug: string;
  productName: string;
  brandName: string;
  variantName: string;
  /** Display-only snapshot in minor units. Never trusted server-side. */
  unitPriceMinor: number | null;
  currency: string;
  quantity: number;
  note?: string;
};

const STORAGE_KEY = "ictlab.enquiry.basket.v1";
const MAX_LINES = 60;
const MAX_QUANTITY = 100_000;

const EMPTY: BasketLine[] = [];

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(value)));
}

function parseStored(raw: string | null): BasketLine[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const lines = parsed
      .filter(
        (line): line is BasketLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as BasketLine).sku === "string" &&
          typeof (line as BasketLine).quantity === "number",
      )
      .slice(0, MAX_LINES)
      .map((line) => ({ ...line, quantity: clampQuantity(line.quantity) }));
    return lines.length > 0 ? lines : EMPTY;
  } catch {
    return EMPTY;
  }
}

// ---------------------------------------------------------------------------
// External store
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

/** Cached so getSnapshot returns a stable reference until the data changes. */
let cachedRaw: string | null = null;
let cachedLines: BasketLine[] = EMPTY;

function readSnapshot(): BasketLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode, quota). Fall back to memory.
    return cachedLines;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parseStored(raw);
  }
  return cachedLines;
}

/** Server and hydration render an empty basket; the client store takes over after. */
function readServerSnapshot(): BasketLine[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Keeps multiple open tabs consistent.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(next: BasketLine[]) {
  cachedLines = next;
  cachedRaw = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // The basket still works for this page session without persistence.
  }
  for (const listener of listeners) listener();
}

// ---------------------------------------------------------------------------

type BasketContextValue = {
  lines: BasketLine[];
  totalQuantity: number;
  /** False during server render and hydration, true once the store is live. */
  ready: boolean;
  add: (line: Omit<BasketLine, "quantity">, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  setNote: (sku: string, note: string) => void;
  remove: (sku: string) => void;
  clear: () => void;
  has: (sku: string) => boolean;
};

const BasketContext = createContext<BasketContextValue | null>(null);

export function BasketProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, readSnapshot, readServerSnapshot);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const add = useCallback((line: Omit<BasketLine, "quantity">, quantity = 1) => {
    const safeQuantity = clampQuantity(quantity);
    const current = readSnapshot();
    const index = current.findIndex((entry) => entry.sku === line.sku);

    if (index >= 0) {
      const next = [...current];
      const existing = next[index]!;
      next[index] = { ...existing, quantity: clampQuantity(existing.quantity + safeQuantity) };
      write(next);
      return;
    }
    if (current.length >= MAX_LINES) return;
    write([...current, { ...line, quantity: safeQuantity }]);
  }, []);

  const setQuantity = useCallback((sku: string, quantity: number) => {
    write(
      readSnapshot().map((line) =>
        line.sku === sku ? { ...line, quantity: clampQuantity(quantity) } : line,
      ),
    );
  }, []);

  const setNote = useCallback((sku: string, note: string) => {
    write(
      readSnapshot().map((line) =>
        line.sku === sku ? { ...line, note: note.slice(0, 500) } : line,
      ),
    );
  }, []);

  const remove = useCallback((sku: string) => {
    write(readSnapshot().filter((line) => line.sku !== sku));
  }, []);

  const clear = useCallback(() => write(EMPTY), []);

  const value = useMemo<BasketContextValue>(
    () => ({
      lines,
      totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      ready,
      add,
      setQuantity,
      setNote,
      remove,
      clear,
      has: (sku: string) => lines.some((line) => line.sku === sku),
    }),
    [lines, ready, add, setQuantity, setNote, remove, clear],
  );

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket(): BasketContextValue {
  const context = useContext(BasketContext);
  if (!context) throw new Error("useBasket must be used inside a BasketProvider.");
  return context;
}

export const BASKET_LIMITS = { MAX_LINES, MAX_QUANTITY };

/** Exposed for unit tests; not used by the application. */
export const __basketInternals = { parseStored, clampQuantity, STORAGE_KEY, EMPTY };
