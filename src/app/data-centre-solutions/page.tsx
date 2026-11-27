import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryGuidePage } from "@/components/marketing/category-guide";
import { CATEGORY_GUIDES } from "@/lib/content/guides";
import { buildMetadata } from "@/lib/seo";

const SLUG = "data-centre-solutions";

export function generateMetadata(): Metadata {
  const guide = CATEGORY_GUIDES[SLUG];
  if (!guide) return {};
  return buildMetadata({ title: guide.title, absoluteTitle: true, description: guide.description, path: `/${SLUG}` });
}

export default async function Page() {
  const guide = CATEGORY_GUIDES[SLUG];
  if (!guide) notFound();
  return <CategoryGuidePage guide={guide} />;
}
