import type { ContentMigration } from "./types";
import { ENRICHMENTS } from "./product-enrichment.data";

/**
 * Product pages Google crawled and declined to index, and the dozens like them.
 *
 * Most of these records were a single sentence of description, no questions of
 * their own and, on the HP desktops, a description copied word for word across
 * four different models. A page with nothing on it that another page does not
 * also say is the page a search engine declines to keep.
 *
 * ## What it does
 *
 * 1. Appends, to each product in `ENRICHMENTS`, who it is for and how it differs
 *    from its siblings, under two headings the page now renders as subheadings.
 *    Keyed on a marker, so a description already carrying it, or one an editor
 *    has rewritten around it, is not touched twice.
 * 2. Gives the four HP Pro desktops a first paragraph of their own, written from
 *    the builds actually listed against each (processors, memory, storage,
 *    operating systems, warranties), replacing the identical boilerplate. The
 *    replacement happens only where the text is still exactly that boilerplate.
 * 3. Repairs specification rows whose value is the name of the field. The HP
 *    and HPE rows read "Processor: processor" because the import wrote the key
 *    where the value belonged. Each is replaced by the distinct values the
 *    product's builds really carry, or removed if there are none.
 * 4. Adds specification rows to software from its own variants (licence type,
 *    the options sold, seats per licence), and to the three shared-storage and
 *    switch records from facts already in their feature lists.
 * 5. Adds three or four questions to each product that has none of its own.
 *
 * ## What it does not do
 *
 * State a price or a technical figure the record does not already carry; prices
 * are shown by the page from the catalogue. It never overwrites a specification
 * row that already holds a real value, and it adds questions only to a product
 * with no questions.
 */

const MARKER = "## Who it is for and common uses in India";
const COMPARE = "## How it compares";

const PLACEHOLDERS = new Set([
  "processor",
  "memory",
  "storage",
  "graphics",
  "operatingSystem",
  "warranty",
  "raidController",
  "systemManagement",
  "powerSupply",
  "opticalDrive",
  "configNote",
  "partNumber",
]);

const PLACEHOLDER_FIELD: Record<string, "processor" | "memory" | "storage" | "graphics" | "operatingSystem" | "warranty" | "raidController" | "systemManagement" | "powerSupply" | "opticalDrive" | "configNote" | "partNumber"> = {
  processor: "processor",
  memory: "memory",
  storage: "storage",
  graphics: "graphics",
  operatingSystem: "operatingSystem",
  warranty: "warranty",
  raidController: "raidController",
  systemManagement: "systemManagement",
  powerSupply: "powerSupply",
  opticalDrive: "opticalDrive",
  configNote: "configNote",
  partNumber: "partNumber",
};

const HP_PRO_BOILERPLATE = /^The HP [^\n]+ sits in HP's commercial line rather than its consumer one[\s\S]*?listed against each one\.?/;

/** Rows for records that have none, drawn only from their existing feature lists. */
const SPEC_ROWS: Record<string, Array<[string, string]>> = {
  "hpe-aruba-networking-switch": [
    ["Type", "Managed network switch for access and aggregation"],
    ["Switching", "Layer 2 and Layer 3"],
    ["Power over Ethernet", "Supported, with a configurable budget"],
    ["Management", "Centralised, cloud or on-premises"],
    ["Access control", "Role-based access policy"],
    ["Stacking", "Supported, for simplified operation"],
    ["Port count and uplink speed", "Set per project against the device count"],
  ],
  "dell-powerstore-storage": [
    ["Type", "All-flash shared storage platform"],
    ["Architecture", "NVMe"],
    ["Services", "Block and file in one platform"],
    ["Data reduction", "Inline deduplication and compression"],
    ["Scaling", "Non-disruptive, scale-up and scale-out"],
    ["Replication", "Native asynchronous"],
  ],
  "hpe-msa-storage-array": [
    ["Type", "Shared block storage array"],
    ["Controllers", "Dual, redundant"],
    ["Media", "SSD and HDD with automated tiering"],
    ["Connectivity", "Fibre Channel, iSCSI and SAS"],
    ["Data services", "Snapshots, remote replication and thin provisioning"],
  ],
};

const LICENCE_LABEL: Record<string, string> = {
  SUBSCRIPTION_ANNUAL: "Annual subscription, named user",
  SUBSCRIPTION_MONTHLY: "Monthly subscription, named user",
  CSP: "Subscription through a Cloud Solution Provider, per user",
  VOLUME: "Volume licence",
  PERPETUAL: "Perpetual licence",
};

const distinct = (values: Array<string | null | undefined>) =>
  [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))];

function summarise(values: string[]): string | null {
  if (values.length === 0) return null;
  if (values.length <= 4) return values.join("; ");
  return `Varies by build: ${values.length} options listed, see Configurations`;
}

export const thinProductPages: ContentMigration = {
  id: "2026-11-thin-product-pages",
  describe: "unindexed product pages gain who-it-is-for and comparison text, real specification rows and their own questions; placeholder spec values are repaired",

  async apply(prisma) {
    const notes: string[] = [];
    let described = 0;
    let specsAdded = 0;
    let specsRepaired = 0;
    let faqsAdded = 0;

    /* 3. Repair specification rows holding the field's name instead of a value. */
    const broken = await prisma.productSpec.findMany({
      where: { value: { in: [...PLACEHOLDERS] } },
      select: { id: true, productId: true, value: true },
    });
    for (const row of broken) {
      const field = PLACEHOLDER_FIELD[row.value];
      if (!field) continue;
      const variants = await prisma.productVariant.findMany({
        where: { productId: row.productId, deletedAt: null },
        select: { processor: true, memory: true, storage: true, graphics: true, operatingSystem: true, warranty: true, raidController: true, systemManagement: true, powerSupply: true, opticalDrive: true, configNote: true, partNumber: true },
      });
      const text = summarise(distinct(variants.map((variant) => variant[field])));
      if (text) await prisma.productSpec.update({ where: { id: row.id }, data: { value: text } });
      else await prisma.productSpec.delete({ where: { id: row.id } });
      specsRepaired += 1;
    }

    for (const [slug, entry] of Object.entries(ENRICHMENTS)) {
      const product = await prisma.product.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          description: true,
          features: true,
          variants: {
            where: { deletedAt: null },
            select: { licenceType: true, name: true, seats: true, processor: true, memory: true, storage: true, operatingSystem: true, warranty: true, partNumber: true, sku: true },
          },
          _count: { select: { specs: true, faqs: true } },
        },
      });
      if (!product) continue;

      /* 1 and 2. The description. */
      let description = product.description;
      if (/^hp-pro-/.test(slug) && HP_PRO_BOILERPLATE.test(description)) {
        const parts: string[] = [];
        const count = product.variants.length;
        const processors = distinct(product.variants.map((variant) => variant.processor));
        const memory = distinct(product.variants.map((variant) => variant.memory));
        const storage = distinct(product.variants.map((variant) => variant.storage));
        const systems = distinct(product.variants.map((variant) => variant.operatingSystem));
        const warranties = distinct(product.variants.map((variant) => variant.warranty));
        parts.push(`The ${product.name} is listed here in ${count} build${count === 1 ? "" : "s"}, each with its own part number.`);
        if (processors.length) parts.push(`Processors: ${processors.join(", ")}.`);
        if (memory.length) parts.push(`Memory: ${memory.join(", ")}.`);
        if (storage.length) parts.push(`Storage: ${storage.join(", ")}.`);
        if (systems.length) parts.push(`Operating system: ${systems.join(", ")}.`);
        if (warranties.length) parts.push(`Warranty: ${warranties.join(", ")}.`);
        parts.push("It belongs to HP's commercial range, which is what makes it eligible for the standard-build, warranty and lifecycle terms a procurement department works to.");
        description = description.replace(HP_PRO_BOILERPLATE, parts.join(" "));
      }
      if (!description.includes(MARKER)) {
        const blocks = [description.trim()];
        if (entry.lead && !description.includes(entry.lead.slice(0, 40))) blocks.push(entry.lead);
        blocks.push(MARKER, entry.who);
        if (entry.diff) blocks.push(COMPARE, entry.diff);
        description = blocks.join("\n\n");
      }
      const features = entry.features?.filter((feature) => !product.features.includes(feature)) ?? [];
      if (description !== product.description || features.length > 0) {
        await prisma.product.update({
          where: { id: product.id },
          data: { description, ...(features.length > 0 ? { features: [...product.features, ...features] } : {}) },
        });
        described += 1;
      }

      /* 4. Specification rows for records that have none. */
      if (product._count.specs === 0) {
        let rows: Array<[string, string]> | undefined = SPEC_ROWS[slug];
        if (!rows && product.variants.length > 0 && !product.variants.some((variant) => variant.licenceType === "HARDWARE")) {
          const types = distinct(product.variants.map((variant) => LICENCE_LABEL[variant.licenceType] ?? variant.licenceType));
          const options = distinct(product.variants.map((variant) => variant.name));
          const seats = distinct(product.variants.map((variant) => String(variant.seats)));
          rows = [
            ["Licence type", types.join("; ")],
            ["Options sold", options.join("; ")],
            ["Seats per licence", seats.join("; ")],
            ["Delivery", "Digital, against a purchase order"],
            ["Invoice", "GST invoice, prices in rupees excluding GST"],
          ];
        }
        if (rows) {
          await prisma.productSpec.createMany({
            data: rows.map(([label, value], index) => ({ productId: product.id, label, value, displayOrder: index })),
            skipDuplicates: true,
          });
          specsAdded += rows.length;
        }
      }

      /* 5. Questions, only where the product has none. */
      if (product._count.faqs === 0) {
        await prisma.faq.createMany({
          data: entry.faqs.map(([question, answer], index) => ({ question, answer, productId: product.id, displayOrder: (index + 1) * 10 })),
        });
        faqsAdded += entry.faqs.length;
      }
    }

    notes.push(`${described} descriptions extended`, `${specsRepaired} placeholder spec rows repaired`, `${specsAdded} spec rows added`, `${faqsAdded} questions added`);
    return notes.join("; ");
  },
};
