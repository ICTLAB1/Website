import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger" | "outline";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-graphite-100 text-graphite-800",
  accent: "bg-accent-50 text-accent-800",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  outline: "border border-line-strong text-ink-600",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[--radius-sm] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Maps a workflow status onto a consistent tone across the whole application. */
export function StatusBadge({ status }: { status: string }) {
  const tone: Tone = (() => {
    switch (status) {
      case "ACTIVE":
      case "WON":
      case "ACCEPTED":
      case "CONVERTED_TO_ORDER":
      case "FULFILLED":
      case "CONFIRMED":
      case "RENEWED":
      case "RESOLVED":
      case "PUBLISHED":
      case "IN_STOCK":
      case "CAPTURED":
        return "success";
      case "NEW":
      case "SENT":
      case "QUOTED":
      case "IN_REVIEW":
      case "SUBMITTED":
      case "UNDER_REVIEW":
      case "QUOTATION_SENT":
      case "IN_PROGRESS":
      case "PROVISIONING":
        return "accent";
      case "EXPIRING":
      case "UPCOMING":
      case "PENDING":
      case "WAITING_ON_CUSTOMER":
      // Both mean "somebody is waiting on somebody", which is the one thing a
      // procurement officer scanning a list needs to pick out.
      case "NEEDS_INFORMATION":
      case "QUOTATION_PREPARING":
      case "MADE_TO_ORDER":
      case "ON_REQUEST":
      // A gateway order exists and nobody has paid it yet — the same "waiting"
      // meaning as PENDING, and it must not look like a success.
      case "CREATED":
        return "warning";
      case "EXPIRED":
      case "LOST":
      case "DECLINED":
      case "REJECTED":
      case "CANCELLED":
      case "LAPSED":
      case "SUSPENDED":
      case "REFUNDED":
      case "DISCONTINUED":
      case "FAILED":
        return "danger";
      default:
        return "neutral";
    }
  })();

  return (
    <Badge tone={tone}>
      {status
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")}
    </Badge>
  );
}
