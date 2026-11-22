import "server-only";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";

/**
 * The live figures and rows the home page shows.
 *
 * Counts, services, certifications, brand marks and the latest articles are
 * read from the same tables the rest of the site uses, so the page never
 * states a number or a credential that the catalogue and the certification
 * records do not.
 */
export const getHomeData = cached(
  async () => {
    const [
      productCount,
      skuCount,
      brandCount,
      services,
      certifications,
      brands,
      posts,
    ] = await Promise.all([
      prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.productVariant.count({ where: { deletedAt: null } }),
      prisma.brand.count({ where: { deletedAt: null } }),
      prisma.service.findMany({
        where: { published: true, deletedAt: null, featured: true },
        orderBy: { displayOrder: "asc" },
        take: 7,
        select: { slug: true, name: true },
      }),
      prisma.certification.findMany({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: [{ displayOrder: "asc" }, { standard: "asc" }],
        take: 4,
        select: { id: true, standard: true, title: true },
      }),
      prisma.brand.findMany({
        where: {
          deletedAt: null,
          logoUrl: { not: null },
          slug: {
            in: [
              "microsoft",
              "autodesk",
              "adobe",
              "hp",
              "lenovo",
              "dell",
              "cisco",
              "zoho",
            ],
          },
        },
        orderBy: { displayOrder: "asc" },
        select: { slug: true, name: true, logoUrl: true },
      }),
      prisma.blogPost.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          publishedAt: { lte: new Date() },
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
        select: { slug: true, title: true, category: true, readMinutes: true },
      }),
    ]);
    return {
      productCount,
      skuCount,
      brandCount,
      services,
      certifications,
      brands,
      posts,
    };
  },
  ["home-data"],
  [tags.catalogue, tags.brands, tags.services, tags.posts, tags.certifications],
  300,
);
