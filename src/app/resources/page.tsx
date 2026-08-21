import type { Metadata } from "next";
import { CmsPage, cmsMetadata } from "@/lib/cms-route";

/** Content lives in the CMS under the "resources" slug. */
export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata("resources", "/resources");
}

export default async function Page() {
  return <CmsPage slug="resources" />;
}
