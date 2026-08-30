import type { ContentMigration } from "./types";

/**
 * Four words in four empty boxes, replaced by four that say something.
 *
 * The GeM panel's tiles read "GeM contracts", "CRAC support", "Timely delivery"
 * and "GST invoicing". Two of those were not worth the space they took:
 *
 *  - **"GeM contracts"** on a panel headed "Registered GeM seller", beside a
 *    GeM mark, under the eyebrow "Government e-Marketplace". A reader has been
 *    told three times before they reach it.
 *  - **"Timely delivery"** is a delivery promise with nothing behind it, and
 *    this site does not make those anywhere else — no SLA, no lead time, no
 *    "within 24 hours". A government buyer reads it as filler, because it is.
 *
 * What replaces them is what a public buyer actually needs to know before
 * raising an order: what can be bought, on one document, invoiced how, and
 * what happens to the entitlement afterwards. Every one is true and stated
 * elsewhere on the site.
 *
 * "CRAC support" survives because it is specific and real — the Consignee's
 * Receipt and Acceptance Certificate is a step every GeM order goes through,
 * and a seller who names it is telling a buyer they have done this before.
 * "GST invoicing" survives because the GSTIN is on file and on every invoice.
 *
 * The hollow boxes themselves were a layout bug, fixed in the renderer: the
 * tile grid was stretching to its column, so one-word labels rendered as
 * 250-pixel-tall boxes with nothing underneath.
 */

const WAS = ["GeM contracts", "CRAC support", "Timely delivery", "GST invoicing"];

const NOW = [
  "Software licensing",
  "Commercial hardware",
  "CRAC support",
  "GST invoicing",
];

export const gemPanelTiles: ContentMigration = {
  id: "2026-08-gem-panel-tiles",
  describe: "the GeM panel's four tiles, saying something worth the space",

  async apply(prisma) {
    const panels = await prisma.pageSection.findMany({
      where: { type: "SPLIT_PANEL" },
      select: { id: true, data: true },
    });

    const target = panels.find((row) => {
      const data = row.data as Record<string, unknown> | null;
      if (!data || data.heading !== "Registered GeM seller") return false;
      const tiles = Array.isArray(data.tiles) ? (data.tiles as string[]) : [];
      // Only while it still holds exactly what this release is correcting.
      return tiles.length === WAS.length && tiles.every((tile, at) => tile === WAS[at]);
    });

    if (!target) {
      const exists = panels.some(
        (row) => (row.data as Record<string, unknown> | null)?.heading === "Registered GeM seller",
      );
      return exists ? "the GeM panel's tiles have been edited — left alone" : "no GeM panel found";
    }

    await prisma.pageSection.update({
      where: { id: target.id },
      data: { data: { ...(target.data as Record<string, unknown>), tiles: NOW } },
    });

    return "the GeM panel names what can be ordered rather than promising delivery";
  },
};
