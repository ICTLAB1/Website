import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import nextConfig from "../next.config";
import { legacyRedirects, PRODUCT_PAGE_REDIRECTS, POST_REDIRECTS } from "@/lib/legacy-redirects";
import { proxy } from "@/proxy";

/**
 * The 78 URLs Search Console reported as not found (17 Nov 2026), run through
 * the real redirect table in the order Next applies it — first match wins —
 * and then, for the ones nothing matches, through the real proxy.
 */
const REPORTED = [
  "/service-page/infrastructure-management",
  "/service-page/infrastructure-management-1",
  "/service-page/service-name-2",
  "/blog/categories/blog",
  "/blog/categories/autodesk",
  "/blog/categories/window",
  "/blog/categories/digital-license",
  "/blog/tags/microsoft-365-business",
  "/blog/tags/software-license-support-india",
  "/blog/tags/secure-software-licensing",
  "/blog/tags/software-subscription-india",
  "/blog/tags/it-solutions-provider-india",
  "/blog/tags/google-workspace-india",
  "/blog/tags/microsoft-license-reseller",
  "/blog/tags/business-software-subscription",
  "/blog/tags/office-tools-for-business",
  "/blog/tags/business-productivity-tools-1",
  "/blog/tags/software-for-teams-india",
  "/blog/tags/cloud-software-for-business",
  "/blog/tags/office-software-for-companies",
  "/blog/tags/microsoft-teams",
  "/blog/tags/onedrive-business",
  "/blog/tags/office-software-bundle-india",
  "/blog/tags/authorized-software-reseller-india",
  "/blog/tags/remote-work-software-india",
  "/blog/tags/buy-office-software-india",
  "/blog/tags/adobe-creative-cloud-india",
  "/blog/tags/genuine-software-licenses",
  "/blog/tags/autodesk-license-india",
  "/blog/tags/windows-11-pro-features",
  "/blog/tags/smb-cyber-security",
  "/post/best-cybersecurity-tools-for-businesses-in-2026",
  "/post/what-is-microsoft-defender-for-business-complete-guide-for-smb-security-2026",
  "/post/where-can-i-buy-a-discounted-annual-subscription-for-office-software-in-india",
  "/post/windows-10-vs-windows-11-should-businesses-upgrade-in-2026",
  "/post/why-buying-software-from-authorized-resellers-matters-in-2025",
  "/post/top-productivity-software-by-leading-tech-companies",
  "/post/windows-12-is-coming-should-you-buy-windows-11-in-2025",
  "/post/what-is-a-digital-license",
  "/post/microsoft-365-vs-microsoft-office-what-s-the-difference",
  "/post/windows-11-pro-vs-home-what-s-the-difference",
  "/post/why-civil-engineering-firms-need-autodesk-civil-3d-in-2026",
  "/post/secure-your-business-with-reliable-cybersecurity-solutions",
  "/product-page/windows-server-2022-datacenter-2-core-license",
  "/product-page/ms-office-2021-pro-plus-box-pack-for-windows",
  "/product-page/windows-10-11-pro-oem-key-stickers",
  "/product-page/microsoft-windows-server-2019-standard-x64-en-ipk-dsp-dvd-16core",
  "/product-page/microsoft-office-home-business-2021-one-time-purchase-for-1-pc-or-mac",
  "/product-page/microsoft-windows-10-professional-32bit-64bit-english-intl-for-1-pc-laptop-user",
  "/product-page/autodesk-alias-business-license",
  "/product-page/microsoft-teams-essentials",
  "/product-page/microsoft-sql-server-2022-enterprise",
  "/product-page/autocadspecializedtoolset1yearsubscription",
  "/product-page/microsoft-sharepoint-online-plan-2",
  "/product-page/windowsserver2022standard16corelicense",
  "/product-page/microsoft-defender-for-business",
  "/product-page/microsoft-sql-server-2022-standard",
  "/product-page/autodesk-bim-360-business-license",
  "/product-page/microsoft365businesspremiumannuallicense",
  "/product-page/microsoft-project-plan-1",
  "/product-page/microsoft-project-plan-3",
  "/product-page/microsoft-project-plan-5",
  "/product-page/inventor-business-license",
  "/product-page/microsoft-visual-studio-professional",
  "/product-page/microsoft-windows-10-home-english-intl-32-and-64-bits-on-usb-3-0-included-ful",
  "/product-page/microsoft-sharepoint-online-plan-1",
  "/product-page/m365-business-premium",
  "/product-page",
  "/ar/product-page/microsoft-windows-10-home-english-intl-32-and-64-bits-on-usb-3-0-included-ful",
  "/ar/product-page/microsoft-365-business-standard-annual-subscription",
  "/devopssolutions",
  "/book-online",
  "/trainingandprograms",
  "/roboticssolutions",
  "/refund",
  "/_api/one-app-session-web/v3/businesses",
  "/_api/v1/access-tokens",
  "/_api/v2/dynamicmodel",
];

type Rule = { source: string; destination: string; statusCode?: number };

/** `:slug` is one path segment, `:path*` is the rest. Enough for every rule in the file. */
function toRegExp(source: string): RegExp {
  const pattern = source
    .split("/")
    .map((part) => (part === ":path*" ? "(?:.*)" : part.startsWith(":") ? "[^/]+" : part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${pattern}$`);
}

async function firstMatch(pathname: string): Promise<Rule | undefined> {
  const rules = (await nextConfig.redirects?.()) as Rule[];
  return rules.find((rule) => toRegExp(rule.source).test(pathname));
}

async function answer(pathname: string) {
  const rule = await firstMatch(pathname);
  if (rule) return { status: rule.statusCode ?? 308, to: rule.destination };
  const response = proxy(new NextRequest(`https://techzoidtechnologies.com${pathname}`));
  return { status: response.status, to: null as string | null };
}

describe("the table itself", () => {
  it("never redirects to itself, off-site, or through another redirect", async () => {
    for (const rule of legacyRedirects) {
      expect(rule.destination.startsWith("/")).toBe(true);
      expect(rule.destination).not.toBe(rule.source);
      // A destination that is itself a source would be a chain: two hops where
      // the brief asks for one.
      const next = await firstMatch(rule.destination);
      expect(next, `${rule.source} -> ${rule.destination} is itself redirected`).toBeUndefined();
    }
  });

  it("has no source twice, in this table or against the rest of next.config.ts", async () => {
    const all = ((await nextConfig.redirects?.()) as Rule[]).map((rule) => rule.source);
    const dupes = all.filter((source, index) => all.indexOf(source) !== index);
    expect(dupes).toEqual([]);
  });

  it("emits every product under /ar/ as well, to the same place", () => {
    for (const [slug, destination] of Object.entries(PRODUCT_PAGE_REDIRECTS)) {
      const english = legacyRedirects.find((rule) => rule.source === `/product-page/${slug}`);
      const arabic = legacyRedirects.find((rule) => rule.source === `/ar/product-page/${slug}`);
      expect(english?.destination).toBe(destination);
      expect(arabic?.destination).toBe(destination);
    }
    expect(Object.keys(POST_REDIRECTS).length).toBeGreaterThan(0);
  });
});

describe("every reported URL", () => {
  it.each(REPORTED)("%s is answered, in one step", async (pathname) => {
    const result = await answer(pathname);
    if (pathname.startsWith("/_api/")) {
      expect(result.status).toBe(410);
    } else {
      expect(result.status).toBe(301);
      expect(result.to).toMatch(/^\//);
    }
  });
});

describe("the destinations the brief named", () => {
  it.each([
    ["/post/what-is-a-digital-license", "/blog/what-is-a-digital-licence"],
    ["/product-page/microsoft365businesspremiumannuallicense", "/products/microsoft-365-business-premium"],
    ["/product-page/m365-business-premium", "/products/microsoft-365-business-premium"],
    ["/ar/product-page/microsoft-365-business-standard-annual-subscription", "/products/microsoft-365-business-standard"],
    ["/refund", "/refund-policy"],
    ["/product-page", "/products"],
    ["/blog/tags/smb-cyber-security", "/blog"],
    ["/blog/categories/microsoft", "/blog"],
    ["/service-page/infrastructure-management-1", "/services"],
    // /contact-us is not a page on this site; /contact is.
    ["/book-online", "/contact"],
  ])("%s -> %s", async (from, to) => {
    expect((await answer(from)).to).toBe(to);
  });
});

describe("what is deliberately not redirected", () => {
  it("answers an unmapped retired product 410 rather than sending it to a catalogue page", async () => {
    expect((await answer("/product-page/some-product-nobody-mapped")).status).toBe(410);
    expect((await answer("/post/some-post-nobody-mapped")).status).toBe(410);
  });

  it("leaves a real product slug alone", async () => {
    expect(await firstMatch("/products/autocad")).toBeUndefined();
  });
});
