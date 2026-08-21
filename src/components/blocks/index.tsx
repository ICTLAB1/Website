import {
  BulletsBlock,
  CardsBlock,
  ChipListBlock,
  CompanyInfoBlock,
  CtaBannerBlock,
  FaqBlock,
  HeroBlock,
  IconPointsBlock,
  KeyValueListBlock,
  LinkListBlock,
  NoticeBlock,
  PlansBlock,
  RichTextBlock,
  SplitPanelBlock,
  StatBarBlock,
} from "@/components/blocks/content-blocks";
import { CollectionGridBlock, ProductGridBlock } from "@/components/blocks/collection-blocks";
import type { ParsedBlock } from "@/lib/blocks/schemas";
import type { ResolvedBlockData } from "@/lib/blocks/resolve";
import type { ProductListItem } from "@/lib/queries/catalogue";

/**
 * Renders a page's blocks in order.
 *
 * Background tone alternates automatically across the "banded" block types, so
 * a page assembled in any order still reads as distinct sections rather than
 * one undifferentiated column. Blocks that carry their own full-bleed
 * treatment — the hero and the call to action — are excluded from the
 * alternation and left to place themselves.
 */

/**
 * Prose blocks that run together as one document.
 *
 * Where one of these follows another, the second continues the first rather
 * than opening a new band — no fresh top padding, no change of background, no
 * rule between them. A page of numbered clauses is one document, and reading
 * it should feel like one.
 */
const FLOWS = new Set(["RICH_TEXT", "BULLETS", "CARDS", "KEY_VALUE_LIST"]);

/** Blocks whose background participates in the alternating rhythm. */
const BANDED = new Set([
  "RICH_TEXT",
  "BULLETS",
  "CARDS",
  "LINK_LIST",
  "KEY_VALUE_LIST",
  "CHIP_LIST",
  "SPLIT_PANEL",
  "PRODUCT_GRID",
  "COLLECTION_GRID",
  "PLANS",
  "STAT_BAR",
  "COMPANY_INFO",
]);

export function BlockRenderer({
  blocks,
  resolved,
}: {
  blocks: ParsedBlock[];
  resolved: ResolvedBlockData;
}) {
  // Worked out in one pass before rendering rather than while mapping: the
  // decision for a block depends on the block above it, and carrying that
  // state through the render callback would mean mutating a variable during
  // render.
  const layout = blocks.reduce<Array<{ tone: "plain" | "muted"; continues: boolean }>>(
    (accumulated, block, index) => {
      const previous = blocks[index - 1];
      const previousTone = accumulated[index - 1]?.tone ?? "plain";
      const continues =
        FLOWS.has(block.type) && previous !== undefined && FLOWS.has(previous.type);

      // A continuing block keeps the band it is continuing, and does not
      // advance the alternation — otherwise a run of prose becomes a zebra.
      if (continues) {
        accumulated.push({ tone: previousTone, continues });
        return accumulated;
      }

      if (!BANDED.has(block.type)) {
        accumulated.push({ tone: "plain", continues });
        return accumulated;
      }

      const banded = accumulated.filter(
        (entry, entryIndex) => !entry.continues && BANDED.has(blocks[entryIndex]!.type),
      ).length;
      accumulated.push({ tone: banded % 2 === 0 ? "plain" : "muted", continues });
      return accumulated;
    },
    [],
  );

  return (
    <>
      {blocks.map((block, index) => {
        const { tone, continues } = layout[index]!;

        switch (block.type) {
          case "HERO":
            return <HeroBlock key={block.id} data={block.data} counts={resolved.counts} />;
          case "RICH_TEXT":
            return <RichTextBlock key={block.id} data={block.data} tone={tone} continues={continues} />;
          case "BULLETS":
            return <BulletsBlock key={block.id} data={block.data} tone={tone} continues={continues} />;
          case "CARDS":
            return <CardsBlock key={block.id} data={block.data} tone={tone} continues={continues} />;
          case "ICON_POINTS":
            return <IconPointsBlock key={block.id} data={block.data} tone={tone} />;
          case "LINK_LIST":
            return <LinkListBlock key={block.id} data={block.data} tone={tone} />;
          case "KEY_VALUE_LIST":
            return <KeyValueListBlock key={block.id} data={block.data} tone={tone} continues={continues} />;
          case "CHIP_LIST":
            return <ChipListBlock key={block.id} data={block.data} tone={tone} />;
          case "SPLIT_PANEL":
            return <SplitPanelBlock key={block.id} data={block.data} tone={tone} />;
          case "STAT_BAR":
            return <StatBarBlock key={block.id} data={block.data} counts={resolved.counts} tone={tone} />;
          case "PRODUCT_GRID":
            return (
              <ProductGridBlock
                key={block.id}
                data={block.data}
                products={(resolved.products.get(block.id) ?? []) as ProductListItem[]}
                tone={tone}
              />
            );
          case "COLLECTION_GRID":
            return (
              <CollectionGridBlock
                key={block.id}
                data={block.data}
                rows={resolved.collections.get(block.id) ?? []}
                tone={tone}
              />
            );
          case "FAQ":
            return (
              <FaqBlock
                key={block.id}
                data={block.data}
                items={resolved.faqs.get(block.id) ?? []}
                tone={tone}
              />
            );
          case "CTA_BANNER":
            return <CtaBannerBlock key={block.id} data={block.data} />;
          case "PLANS":
            return <PlansBlock key={block.id} data={block.data} tone={tone} />;
          case "COMPANY_INFO":
            return <CompanyInfoBlock key={block.id} data={block.data} tone={tone} />;
          case "NOTICE":
            return <NoticeBlock key={block.id} data={block.data} tone={tone} />;
        }
      })}
    </>
  );
}
