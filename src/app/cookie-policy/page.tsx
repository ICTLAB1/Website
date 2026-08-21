import type { Metadata } from "next";
import { CmsPage, cmsMetadata } from "@/lib/cms-route";

/** Content lives in the CMS under the "cookie-policy" slug, so counsel's edits need no deploy. */
export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata("cookie-policy", "/cookie-policy");
}

export default async function Page() {
  return <CmsPage slug="cookie-policy" />;
}
