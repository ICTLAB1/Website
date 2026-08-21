import { NextResponse } from "next/server";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { normaliseQuery, searchProducts } from "@/lib/queries/search";
import { prisma } from "@/lib/db";

/**
 * Autocomplete suggestions.
 *
 * Read-only and unauthenticated by design, so it is rate limited per IP and
 * returns only fields that already appear on public pages.
 */
export const GET = withErrorHandling("search.suggest", async (request: Request) => {
  const limit = hit(`suggest:${ipFromRequest(request)}`, LIMITS.search.limit, LIMITS.search.windowSeconds);
  if (!limit.allowed) {
    return jsonError("rate_limited", "Too many searches. Please wait a moment and try again.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  const url = new URL(request.url);
  const term = normaliseQuery(url.searchParams.get("q"));
  if (term.length < 2) return jsonOk({ results: [] });

  const [products, brands, services] = await Promise.all([
    searchProducts(term, 6),
    prisma.brand.findMany({
      where: { deletedAt: null, name: { contains: term, mode: "insensitive" } },
      select: { slug: true, name: true, tagline: true },
      take: 2,
    }),
    prisma.service.findMany({
      where: {
        published: true,
        deletedAt: null,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { category: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { slug: true, name: true, category: true },
      take: 2,
    }),
  ]);

  const results = [
    ...products.map((product) => ({
      title: product.name,
      subtitle: product.shortDescription,
      href: `/products/${product.slug}`,
      badge: product.brand.name,
    })),
    ...brands.map((brand) => ({
      title: brand.name,
      subtitle: brand.tagline ?? "Brand",
      href: `/brands/${brand.slug}`,
      badge: "Brand",
    })),
    ...services.map((service) => ({
      title: service.name,
      subtitle: service.category,
      href: `/services/${service.slug}`,
      badge: "Service",
    })),
  ].slice(0, 8);

  const response = NextResponse.json({ ok: true as const, data: { results } });
  // Suggestions are public and identical for everyone with the same term.
  response.headers.set("cache-control", "public, max-age=60, stale-while-revalidate=300");
  return response;
});
