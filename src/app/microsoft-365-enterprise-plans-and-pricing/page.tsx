import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlansPricingPage } from "@/components/marketing/plans-pricing-page";
import { PLANS_PAGES } from "@/lib/content/plans";
import { buildMetadata } from "@/lib/seo";

const SLUG = "microsoft-365-enterprise-plans-and-pricing";

export function generateMetadata(): Metadata {
  const page = PLANS_PAGES[SLUG];
  if (!page) return {};
  return buildMetadata({ title: page.title, absoluteTitle: true, description: page.description, path: `/${SLUG}` });
}

export default async function Page() {
  const page = PLANS_PAGES[SLUG];
  if (!page) notFound();
  return <PlansPricingPage page={page} />;
}
