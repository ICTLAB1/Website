import { appUrl } from "@/lib/env";

export type FaqEntry = { question: string; answer: string };

/**
 * FAQ list built on <details>, so it works without JavaScript and is keyboard
 * accessible by default. Emits matching FAQPage structured data when asked.
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
      <div className="divide-y divide-line rounded-[--radius-lg] border border-line bg-white">
        {items.map((item, index) => (
          <details key={index} className="group px-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium text-navy-900 marker:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-ink-500 transition-transform group-open:rotate-45"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 4h2v12H9z" />
                  <path d="M4 9h12v2H4z" />
                </svg>
              </span>
            </summary>
            <div className="pb-5 pr-8 text-sm leading-relaxed text-ink-600">{item.answer}</div>
          </details>
        ))}
      </div>
      {includeSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
    </>
  );
}
