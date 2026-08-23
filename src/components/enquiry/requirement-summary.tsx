import { Badge } from "@/components/ui/badge";
import { parseRequirement } from "@/lib/rfq";

type Detail = { label: string; value: string };

/**
 * A stored requirement, rendered.
 *
 * Shared by the customer's own view and the staff view, because the two must
 * agree: a salesperson quoting from a different reading of the requirement than
 * the customer wrote is the oldest failure in this business.
 *
 * Parsed on read rather than trusted. A payload written by an older version of
 * the form, or by an import, is skipped rather than half-rendered — the text
 * summary stored alongside it is still there, so nothing is lost.
 */
export function RequirementSummary({ value }: { value: unknown }) {
  const requirement = parseRequirement(value);
  if (!requirement) return null;

  const facts: Detail[] = [
    requirement.requiredBy ? { label: "Required by", value: requirement.requiredBy } : null,
    requirement.deliveryLocation
      ? { label: "Deliver to", value: requirement.deliveryLocation }
      : null,
    requirement.budgetNote
      ? { label: "Indicative budget", value: requirement.budgetNote }
      : null,
  ].filter((entry): entry is Detail => entry !== null);

  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {requirement.lines.map((line, index) => {
          const specs: Detail[] = [
            line.processor ? { label: "Processor", value: line.processor } : null,
            line.memory ? { label: "Memory", value: line.memory } : null,
            line.storage ? { label: "Storage", value: line.storage } : null,
            line.display ? { label: "Display", value: line.display } : null,
            line.graphics ? { label: "Graphics", value: line.graphics } : null,
            line.operatingSystem
              ? { label: "Operating system", value: line.operatingSystem }
              : null,
          ].filter((entry): entry is Detail => entry !== null);

          return (
            <li key={index} className="rounded-[--radius-md] border border-line bg-white p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-body font-semibold text-graphite-900">
                  {line.quantity} × {line.description}
                </span>
                {line.brands.length > 0 ? (
                  <span className="text-meta text-ink-600">{line.brands.join(", ")}</span>
                ) : null}
                {line.needsReview ? (
                  /*
                    Extraction is never trusted. A line that came out of an
                    uploaded document says so, on both sides, until a person has
                    confirmed it — a quotation built on a misread quantity is
                    worse than no quotation.
                  */
                  <Badge tone="warning">Needs review</Badge>
                ) : null}
              </div>

              {specs.length > 0 ? (
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-label sm:grid-cols-2">
                  {specs.map((spec) => (
                    <div key={spec.label} className="flex gap-2">
                      <dt className="w-28 shrink-0 text-ink-500">{spec.label}</dt>
                      <dd className="min-w-0 text-ink-700">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {line.note ? (
                <p className="mt-3 text-meta leading-relaxed text-ink-600">{line.note}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {facts.length > 0 ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-label sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-2">
              <dt className="w-32 shrink-0 text-ink-500">{fact.label}</dt>
              <dd className="min-w-0 text-ink-700">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {requirement.context ? (
        <div>
          <h3 className="text-label font-semibold uppercase tracking-[0.08em] text-ink-500">
            Context
          </h3>
          <p className="mt-2 whitespace-pre-line text-meta leading-relaxed text-ink-700">
            {requirement.context}
          </p>
        </div>
      ) : null}
    </div>
  );
}
