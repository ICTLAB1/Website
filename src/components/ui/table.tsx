import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tables are always wrapped in their own horizontal scroller so a wide data
 * table never forces the page body to scroll sideways on a small screen.
 */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("scroll-x rounded-[--radius-lg] border border-line bg-white", className)}>
      {children}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <table className={cn("w-full min-w-[36rem] border-collapse text-sm", className)}>{children}</table>;
}

export function Th({
  children,
  className,
  scope = "col",
}: {
  children: ReactNode;
  className?: string;
  scope?: "col" | "row";
}) {
  return (
    <th
      scope={scope}
      className={cn(
        "border-b border-line bg-surface-muted px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-ink-600",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-line px-4 py-3 align-middle text-ink-700", className)}>
      {children}
    </td>
  );
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("last:[&>td]:border-b-0 hover:bg-surface-muted/60", className)}>{children}</tr>;
}
