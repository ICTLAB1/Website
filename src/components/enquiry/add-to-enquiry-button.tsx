"use client";

import { useState } from "react";
import { useBasket, type BasketLine } from "@/components/enquiry/basket-provider";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Adds a SKU to the enquiry basket.
 *
 * The price passed here is a display convenience only. When the enquiry is
 * submitted, only SKU and quantity travel to the server, which re-reads the
 * catalogue - so nothing a user can edit in the browser affects pricing.
 */
export function AddToEnquiryButton({
  line,
  quantity = 1,
  compact = false,
  fullWidth = false,
  label = "Add to Enquiry",
  className,
}: {
  line: Omit<BasketLine, "quantity">;
  quantity?: number;
  compact?: boolean;
  fullWidth?: boolean;
  label?: string;
  className?: string;
}) {
  const { add, has } = useBasket();
  const { push } = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const alreadyInBasket = has(line.sku);

  function onAdd() {
    add(line, quantity);
    setJustAdded(true);
    push(
      `${line.productName} added to your enquiry${quantity > 1 ? ` (${quantity})` : ""}.`,
      "success",
    );
    setTimeout(() => setJustAdded(false), 2200);
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        "inline-flex items-center justify-center rounded-[--radius-md] font-medium transition-colors",
        "bg-graphite-900 text-white hover:bg-graphite-800",
        compact ? "h-10 flex-1 px-3 text-[13px]" : "h-11 px-5 text-sm",
        fullWidth && "w-full",
        className,
      )}
    >
      {justAdded ? "Added ✓" : alreadyInBasket ? "Add again" : label}
    </button>
  );
}
