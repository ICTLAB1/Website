import { Badge } from "@/components/ui/badge";
import { WARRANTY_LABELS, warrantyState, type WarrantyState } from "@/lib/warranty";

/**
 * Warranty, as a badge.
 *
 * "Not recorded" is deliberately neutral rather than a warning. It is not a
 * problem with the device — it is a gap in what we hold, and colouring it red
 * would tell a customer their machine is out of cover when nobody has checked.
 */
const TONES: Record<WarrantyState, "neutral" | "success" | "warning" | "danger"> = {
  unknown: "neutral",
  active: "success",
  expiring: "warning",
  expired: "danger",
};

export function WarrantyBadge({
  device,
}: {
  device: { warrantyEndsAt?: Date | string | null };
}) {
  const state = warrantyState(device);
  return <Badge tone={TONES[state]}>{WARRANTY_LABELS[state]}</Badge>;
}
