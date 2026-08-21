import { appUrl } from "@/lib/env";
import { jsonLdHtml } from "@/lib/seo";
import { FaqAccordion } from "@/components/ui/faq-accordion";

export type FaqEntry = { question: string; answer: string };

/**
 * A list of questions and answers, plus its `FAQPage` structured data.
 *
 * Split in two because the halves need different environments. The accordion is
 * interactive and runs in the browser; the structured data must be rendered on
 * the server, both so search engines see it without executing anything and
 * because `appUrl()` reads configuration that never reaches the client bundle.
 *
 * Callers see one component, as they did when this was a single `<details>`
 * list, so the split is invisible from outside.
 */
export function FaqList({
  items,
  includeSchema = true,
}: {
  items: FaqEntry[];
  includeSchema?: boolean;
}) {
  if (items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: appUrl(),
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <FaqAccordion items={items} />
      {includeSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
      ) : null}
    </>
  );
}
