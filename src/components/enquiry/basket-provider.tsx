"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The B2B enquiry basket.
 *
 * Only `sku` and `quantity` are ever submitted to the server; the price and
 * name held here are a display cache. On submission the server re-resolves
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

type BasketContextValue = {
  lines: BasketLine[];
  totalQuantity: number;
  ready: boolean;
  add: (line: Omit<BasketLine, "quantity">, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  setNote: (sku: string, note: string) => void;
  remove: (sku: string) => void;
  clear: () => void;
  has: (sku: string) => boolean;
};

const BasketContext = createContext<BasketContextValue | null>(null);

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(value)));
}

function parseStored(raw: string | null): BasketLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line): line is BasketLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as BasketLine).sku === "string" &&
          typeof (line as BasketLine).quantity === "number",
      )
      .slice(0, MAX_LINES)
      .map((line) => ({ ...line, quantity: clampQuantity(line.quantity) }));
  } catch {
    return [];
  }
}

export function BasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate after mount so server and client markup match on first paint.
  useEffect(() => {
    setLines(parseStored(window.localStorage.getItem(STORAGE_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage can be unavailable (private mode, quota). The basket still
      // works for the current page session.
    }
  }, [lines, ready]);

  // Keep multiple open tabs consistent.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setLines(parseStored(event.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((line: Omit<BasketLine, "quantity">, quantity = 1) => {
    const safeQuantity = clampQuantity(quantity);
    setLines((current) => {
      const index = current.findIndex((entry) => entry.sku === line.sku);
      if (index >= 0) {
        const next = [...current];
        const existing = next[index]!;
        next[index] = { ...existing, quantity: clampQuantity(existing.quantity + safeQuantity) };
        return next;
      }
      if (current.length >= MAX_LINES) return current;
      return [...current, { ...line, quantity: safeQuantity }];
    });
  }, []);

  const setQuantity = useCallback((sku: string, quantity: number) => {
    setLines((current) =>
      current.map((line) =>
        line.sku === sku ? { ...line, quantity: clampQuantity(quantity) } : line,
      ),
    );
  }, []);

  const setNote = useCallback((sku: string, note: string) => {
    setLines((current) =>
      current.map((line) => (line.sku === sku ? { ...line, note: note.slice(0, 500) } : line)),
    );
  }, []);

  const remove = useCallback((sku: string) => {
    setLines((current) => current.filter((line) => line.sku !== sku));
  }, []);

  const clear = useCallback(() => setLines([]), []);

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
