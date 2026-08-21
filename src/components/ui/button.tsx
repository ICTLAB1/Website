import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "onDark";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[--radius-md] font-medium " +
  "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 whitespace-nowrap";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-700 text-white hover:bg-accent-800 active:bg-accent-900 focus-visible:outline-accent-700",
  secondary:
    "bg-graphite-900 text-white hover:bg-graphite-800 active:bg-graphite-950 focus-visible:outline-graphite-900",
  outline:
    "border border-line-strong bg-white text-graphite-900 hover:border-graphite-400 hover:bg-graphite-50 " +
    "focus-visible:outline-graphite-700",
  ghost: "text-graphite-800 hover:bg-graphite-50 focus-visible:outline-graphite-700",
  danger:
    "bg-danger-600 text-white hover:bg-danger-700 focus-visible:outline-danger-600",
  onDark:
    "border border-white/30 bg-transparent text-white hover:bg-white/10 focus-visible:outline-white",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  href,
  ...props
}: CommonProps & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      href={href}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...props}
    >
      {children}
    </Link>
  );
}
