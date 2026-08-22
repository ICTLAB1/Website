import { AddToEnquiryButton } from "@/components/enquiry/add-to-enquiry-button";

/**
 * The builds a hardware model is sold in.
 *
 * This is the page. A workstation is not chosen by reading a paragraph — it is
 * chosen by finding the row whose processor, memory, graphics and warranty
 * match a requirement someone was handed, and then quoting that part number.
 * Everything above it on the page exists to get the reader here.
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
export function ConfigurationTable({
  configurations,
  productName,
  productSlug,
  brandName,
}: {
  configurations: Array<{
    id: string;
    sku: string;
    partNumber: string | null;
    processor: string | null;
    memory: string | null;
    storage: string | null;
    graphics: string | null;
    operatingSystem: string | null;
    opticalDrive: string | null;
    powerSupply: string | null;
    warranty: string | null;
    configNote: string | null;
  }>;
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

  return (
    <div>
      <p className="mb-4 max-w-3xl text-meta leading-relaxed text-ink-600">
        {configurations.length} {configurations.length === 1 ? "build" : "builds"} available. Add
        the ones you need — an enquiry can hold several, in different quantities, alongside any
        licensing that goes on them.
      </p>

      {/*
        Narrow enough to fit the content column on a desktop and wide enough
        that the cells wrap rather than crush. It scrolls inside itself below
        that, because the alternative on a phone is the whole page scrolling
        sideways — and the "add" button is the last column, so a table that
        overflows on a desktop puts the action off-screen.
      */}
      <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[42rem] border-collapse text-[13px]">
          <caption className="sr-only">Available configurations of {productName}</caption>
          <thead>
            <tr className="border-b border-line-strong text-left">
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-500">
                Part number
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-500">
                Processor
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-500">
                Memory
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-500">
                Storage
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-500">
                Graphics
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-500">
                Operating system
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold text-ink-500">
                Warranty
              </th>
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
                  {configuration.powerSupply ? (
                    <span className="mt-1 block text-label text-ink-500">
                      {configuration.powerSupply} PSU
                    </span>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-ink-700">{configuration.processor}</td>
                <td className="py-3 pr-4 text-ink-700">{configuration.memory}</td>
                <td className="py-3 pr-4 text-ink-700">{configuration.storage}</td>
                <td className="py-3 pr-4 text-ink-700">{configuration.graphics}</td>
                <td className="py-3 pr-4 text-ink-700">
                  {configuration.operatingSystem}
                  {configuration.opticalDrive ? (
                    <span className="mt-1 block text-label text-ink-500">
                      {configuration.opticalDrive}
                    </span>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-ink-700">{configuration.warranty}</td>
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
