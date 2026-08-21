import type { Metadata } from "next";
import { CmsPage, cmsMetadata } from "@/lib/cms-route";

/** Content lives in the CMS under the "enterprise" slug. */
export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata("enterprise", "/enterprise");
}

export default async function Page() {
  return <CmsPage slug="enterprise" />;
}
