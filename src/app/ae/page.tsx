import type { Metadata } from "next";

import { UaePage } from "@/components/marketing/uae-page";
import { UAE_PAGES } from "@/lib/content/uae";
import { hreflangFor } from "@/lib/hreflang";
import { buildMetadata } from "@/lib/seo";

const copy = UAE_PAGES["home"];

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: copy.title,
    absoluteTitle: true,
    description: copy.description,
    path: copy.path,
    languages: hreflangFor(copy.path),
  });
}

export default function Page() {
  return <UaePage copy={copy} showOffice={true} />;
}
