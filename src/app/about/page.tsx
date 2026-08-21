import type { Metadata } from "next";
import { CmsPage, cmsMetadata } from "@/lib/cms-route";

/** Content lives in the CMS under the "about" slug. */
export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata("about", "/about");
}

export default async function Page() {
  return <CmsPage slug="about" />;
}
