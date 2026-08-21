import type { Metadata } from "next";
import { CmsPage, cmsMetadata } from "@/lib/cms-route";

/** Content lives in the CMS under the "delivery-policy" slug, so counsel's edits need no deploy. */
export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata("delivery-policy", "/delivery-policy");
}

export default async function Page() {
  return <CmsPage slug="delivery-policy" />;
}
