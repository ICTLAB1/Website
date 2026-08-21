import type { Metadata } from "next";
import { CmsPage, cmsMetadata } from "@/lib/cms-route";

/**
 * The home page.
 *
 * Its content is a CMS page like any other — stored under the empty slug — so
 * an administrator builds and reorders it in the same editor as every other
 * page. This file only maps the route to that record.
 */
export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata("", "/");
}

export default async function HomePage() {
  return <CmsPage slug="" />;
}
