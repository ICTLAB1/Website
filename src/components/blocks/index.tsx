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
  let banded = 0;

  return (
    <>
      {blocks.map((block) => {
        const tone: "plain" | "muted" = BANDED.has(block.type)
          ? banded++ % 2 === 0
            ? "plain"
            : "muted"
          : "plain";

        switch (block.type) {
          case "HERO":
            return <HeroBlock key={block.id} data={block.data} counts={resolved.counts} />;
          case "RICH_TEXT":
            return <RichTextBlock key={block.id} data={block.data} tone={tone} />;
          case "BULLETS":
            return <BulletsBlock key={block.id} data={block.data} tone={tone} />;
          case "CARDS":
            return <CardsBlock key={block.id} data={block.data} tone={tone} />;
          case "ICON_POINTS":
            return <IconPointsBlock key={block.id} data={block.data} tone={tone} />;
          case "LINK_LIST":
            return <LinkListBlock key={block.id} data={block.data} tone={tone} />;
          case "KEY_VALUE_LIST":
            return <KeyValueListBlock key={block.id} data={block.data} tone={tone} />;
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
        }
      })}
    </>
  );
}
