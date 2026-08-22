import { AddToEnquiryButton } from "@/components/enquiry/add-to-enquiry-button";

/**
 * The builds a hardware model is sold in.
 *
 * This is the page. A workstation is not chosen by reading a paragraph — it is
 * chosen by finding the row whose processor, memory, graphics and warranty
 * match a requirement someone was handed, and then quoting that part number.
 * Everything above it on the page exists to get the reader here.
 *
 * ## The columns come from the data
 *
 * A laptop has an operating system and no RAID controller; a server has a RAID
 * controller, a management processor and no graphics worth naming. One fixed
 * set of columns would put an empty "Graphics" heading on every server and an
 * empty "System management" on every laptop — and an empty column reads as
 * missing information rather than as an attribute that does not apply. So a
 * column appears only where at least one build has a value for it.
 *
 * ## Why every row can be added on its own
 *
 * Because a real requirement is "eight of the 32 GB build and two with the
 * RTX 4000". A single button on the model would put a model in the basket and
 * leave the build to a follow-up email, which is the conversation this
 * catalogue exists to remove.
 *
 * ## Why there is no price column
 *
 * There is no price. Not "hidden", not "on request in this cell": the column
 * does not exist, and the component takes no value that could fill it.
 */

type Configuration = {
  id: string;
  sku: string;
  partNumber: string | null;
  processor: string | null;
  memory: string | null;
  storage: string | null;
  graphics: string | null;
  raidController: string | null;
  operatingSystem: string | null;
  systemManagement: string | null;
  opticalDrive: string | null;
  powerSupply: string | null;
  warranty: string | null;
  configNote: string | null;
};

type ColumnKey = Exclude<keyof Configuration, "id" | "sku" | "partNumber" | "configNote" | "opticalDrive">;

/**
 * The attribute columns, in reading order.
 *
 * Ordered as a spec sheet reads rather than as the database stores it: what
 * computes, what it remembers, what it keeps, what drives the display or the
 * disks, what it runs, how it is managed, how it is powered, and who fixes it.
 * The part number and the add button bracket these and are not in the list;
 * the optical drive rides under the part number, being a footnote rather than
 * a column anybody scans.
 */
const COLUMNS: Array<{ key: ColumnKey; label: string }> = [
  { key: "processor", label: "Processor" },
  { key: "memory", label: "Memory" },
  { key: "storage", label: "Storage" },
  { key: "graphics", label: "Graphics" },
  { key: "raidController", label: "RAID controller" },
  { key: "operatingSystem", label: "Operating system" },
  { key: "systemManagement", label: "System management" },
  { key: "powerSupply", label: "Power supply" },
  { key: "warranty", label: "Warranty" },
];

export function ConfigurationTable({
  configurations,
  productName,
  productSlug,
  brandName,
}: {
  configurations: Configuration[];
  productName: string;
  productSlug: string;
  brandName: string;
}) {
  if (configurations.length === 0) {
    return (
      <p className="max-w-3xl text-[15px] leading-relaxed text-ink-600">
        Configurations for this model are confirmed on the quotation, against the specification
        you need.
      </p>
    );
  }

  const columns = COLUMNS.filter((column) =>
    configurations.some((configuration) => configuration[column.key]),
  );

  return (
    <div>
      <p className="mb-4 max-w-3xl text-meta leading-relaxed text-ink-600">
        {configurations.length} {configurations.length === 1 ? "build" : "builds"} available. Add
        the ones you need — an enquiry can hold several, in different quantities, alongside any
        licensing that goes on them.
      </p>

      {/*
        Scrolls inside itself rather than pushing the page sideways. A server
        row is genuinely wide, and on a phone the choice is between this
        scrolling and the whole document scrolling. The minimum grows with the
        number of columns, so a four-column laptop table does not reserve the
        room a nine-column server table needs.
      */}
      <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
        <table
          className="w-full border-collapse text-[13px]"
          style={{ minWidth: `${Math.min(9 + columns.length * 6, 72)}rem` }}
        >
          <caption className="sr-only">Available configurations of {productName}</caption>
          <thead>
            <tr className="border-b border-line-strong text-left">
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-500">
                Part number
              </th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="py-3 pr-4 font-semibold text-ink-500">
                  {column.label}
                </th>
              ))}
              <th scope="col" className="py-3 font-semibold text-ink-500">
                <span className="sr-only">Add to enquiry</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {configurations.map((configuration) => (
              <tr key={configuration.id} className="border-b border-line align-top last:border-b-0">
                <td className="py-3 pr-4">
                  {configuration.partNumber ? (
                    <span className="font-mono text-graphite-900">{configuration.partNumber}</span>
                  ) : (
                    /* The source named none. Saying so is the only honest cell:
                       the internal key that makes this row addressable is not a
                       part number and must never be shown as one. */
                    <span className="text-ink-500">On request</span>
                  )}
                  {configuration.configNote ? (
                    <span className="mt-1 block text-label text-ink-500">
                      {configuration.configNote}
                    </span>
                  ) : null}
                  {configuration.opticalDrive ? (
                    <span className="mt-1 block text-label text-ink-500">
                      {configuration.opticalDrive}
                    </span>
                  ) : null}
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="py-3 pr-4 text-ink-700">
                    {configuration[column.key] ?? "—"}
                  </td>
                ))}
                <td className="py-3">
                  <AddToEnquiryButton
                    line={{
                      sku: configuration.sku,
                      productSlug,
                      productName,
                      brandName,
                      variantName:
                        configuration.partNumber ??
                        [configuration.processor, configuration.memory, configuration.storage]
                          .filter(Boolean)
                          .join(" · "),
                      // Null, always. What a build costs is put on the
                      // quotation by a person.
                      unitPriceMinor: null,
                      currency: "INR",
                    }}
                    label="Add"
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
