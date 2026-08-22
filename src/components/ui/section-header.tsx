import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:mb-10",
        centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow ? (
          <p className="mb-2 text-label font-semibold uppercase tracking-[0.12em] text-accent-700">
            {eyebrow}
          </p>
        ) : null}
        <Heading
          className={cn(
            Heading === "h1"
              ? "text-title"
              : "text-section",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-3 text-body leading-relaxed text-ink-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
