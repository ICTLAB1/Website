import { Testimonials } from "@/components/reviews/testimonials";
import { approvedReviews } from "@/lib/reviews-config";

/** "What customers say", from the reviews the owner approved in content/reviews.json. Renders nothing while there are none. */
export function CustomerSay({ productSlug, className }: { productSlug?: string; className?: string }) {
  const items = approvedReviews(productSlug);
  if (items.length === 0) return null;
  return (
    <section className={className ?? "container-page py-14"}>
      <Testimonials items={items} heading="What customers say" description="Reviews shared with their permission." />
    </section>
  );
}
