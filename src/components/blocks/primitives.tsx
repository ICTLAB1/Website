import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/section-header";

/**
 * Shared chrome for block renderers.
 *
 * Blocks alternate background automatically rather than each carrying its own,
 * so a page assembled in any order still reads as bands of content instead of
 * an undifferentiated column.
 */
export function BlockSection({
  children,
  tone = "plain",
  className,
}: {
  children: ReactNode;
  tone?: "plain" | "muted" | "dark";
  className?: string;
}) {
  const wrapper =
    tone === "dark"
      ? "bg-graphite-900"
      : tone === "muted"
        ? "border-y border-line bg-surface-muted"
        : "";

  return (
    <section className={cn(wrapper, className)}>
      <div className="container-page py-14 lg:py-18">{children}</div>
    </section>
  );
}

/** Heading shared by most blocks; omitted entirely when there is no heading. */
export function BlockHeading({
  eyebrow,
  heading,
  description,
  align = "left",
  onDark = false,
}: {
  eyebrow?: string;
  heading?: string;
  description?: string;
  align?: "left" | "center";
  onDark?: boolean;
}) {
  if (!eyebrow && !heading && !description) return null;

  if (onDark) {
    return (
      <div className={cn("mb-8 max-w-3xl", align === "center" && "mx-auto text-center")}>
        {eyebrow ? (
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-400">
            {eyebrow}
          </p>
        ) : null}
        {heading ? <h2 className="text-[1.75rem] text-white sm:text-[2rem]">{heading}</h2> : null}
        {description ? (
          <p className="mt-3 text-[15px] leading-relaxed text-graphite-200">{description}</p>
        ) : null}
      </div>
    );
  }

  return (
    <SectionHeader eyebrow={eyebrow} title={heading ?? ""} description={description} align={align} />
  );
}

export function BlockLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  // Authored hrefs are validated to be a path or a safe scheme before storage,
  // so an external target here is a deliberate https:// link.
  const external = href.startsWith("https://");
  if (external) {
    return (
      <a href={href} rel="noopener noreferrer" target="_blank" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
