/**
 * A product's specification table.
 *
 * Two columns, in the manufacturer's order. The label column is deliberately
 * not normalised — a source that calls a row "Platform" rather than "Processor"
 * is describing something slightly different, and rewriting it would be the
 * catalogue asserting a fact the manufacturer did not.
 *
 * Wrapped in its own scroll container. A specification value can be a long
 * string of connectivity ports, and on a narrow screen the choice is between
 * this table scrolling or the whole page scrolling sideways. It is the table.
 */
export function SpecTable({
  specs,
}: {
  specs: Array<{ id: string; label: string; value: string }>;
}) {
  if (specs.length === 0) {
    return (
      <p className="max-w-3xl text-[15px] leading-relaxed text-ink-600">
        Detailed specifications for this model are confirmed on the quotation, against the
        configuration you need.
      </p>
    );
  }

  return (
    <div className="max-w-3xl overflow-x-auto">
      <table className="w-full border-collapse text-[14px]">
        <caption className="sr-only">Specifications</caption>
        <tbody>
          {specs.map((spec) => (
            <tr key={spec.id} className="border-b border-line last:border-b-0">
              <th
                scope="row"
                className="w-44 py-3 pr-4 text-left align-top font-medium text-ink-500"
              >
                {spec.label}
              </th>
              <td className="py-3 align-top leading-relaxed text-ink-700">{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
