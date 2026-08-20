"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Modal dialog built on the native <dialog> element, which gives us the
 * top-layer, focus trapping and Escape-to-close behaviour for free rather than
 * reimplementing them.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size];

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes.
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "w-[calc(100vw-2rem)] rounded-[--radius-lg] border border-line bg-white p-0 shadow-[--shadow-overlay]",
        "backdrop:bg-navy-950/50 open:m-auto",
        width,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 id="dialog-title" className="text-base font-semibold text-navy-900">
            {title}
          </h2>
          {description ? <p className="mt-1 text-[13px] text-ink-500">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 rounded-[--radius-sm] p-1.5 text-ink-500 hover:bg-surface-sunken hover:text-ink-800"
        >
          <span className="sr-only">Close dialog</span>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.3 5.3 5 6.6 8.4 10 5 13.4l1.3 1.3L9.7 11.3l3.4 3.4 1.3-1.3-3.4-3.4 3.4-3.4-1.3-1.3-3.4 3.4z" />
          </svg>
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
