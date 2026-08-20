import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";

/** Brands, services, articles and FAQ reads shared across the public site. */

export const getBrands = cache(async () => {
  return prisma.brand.findMany({
    where: { deletedAt: null },
    orderBy: { displayOrder: "asc" },
    include: {
      _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
    },
  });
});

export const getBrandBySlug = cache(async (slug: string) => {
  return prisma.brand.findFirst({
    where: { slug, deletedAt: null },
    include: { faqs: { orderBy: { displayOrder: "asc" } } },
  });
});

/** Categories that actually contain products for a given brand. */
export async function getBrandCategories(brandId: string) {
  const grouped = await prisma.product.groupBy({
    by: ["categoryId"],
    where: { brandId, status: "ACTIVE", deletedAt: null },
    _count: { _all: true },
  });
  if (grouped.length === 0) return [];

  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((group) => group.categoryId) } },
    select: { id: true, slug: true, name: true, summary: true },
    orderBy: { displayOrder: "asc" },
  });

  return categories.map((category) => ({
    ...category,
    count: grouped.find((group) => group.categoryId === category.id)?._count._all ?? 0,
  }));
}

export const getServices = cache(async () => {
  return prisma.service.findMany({
    where: { published: true, deletedAt: null },
    orderBy: { displayOrder: "asc" },
  });
});

export const getServiceBySlug = cache(async (slug: string) => {
  return prisma.service.findFirst({
    where: { slug, published: true, deletedAt: null },
    include: { faqs: { orderBy: { displayOrder: "asc" } } },
  });
});

export type ServiceProcessStep = { step: number; title: string; description: string };

/** `process` is stored as JSON; validate its shape before rendering. */
export function parseProcess(value: unknown): ServiceProcessStep[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is ServiceProcessStep =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as ServiceProcessStep).step === "number" &&
      typeof (entry as ServiceProcessStep).title === "string" &&
      typeof (entry as ServiceProcessStep).description === "string",
  );
}

export const getPublishedPosts = cache(async (options: { limit?: number; category?: string } = {}) => {
  return prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      publishedAt: { lte: new Date() },
      ...(options.category ? { category: options.category } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: options.limit,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      tags: true,
      readMinutes: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
});

export const getPostBySlug = cache(async (slug: string) => {
  return prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null, publishedAt: { lte: new Date() } },
    include: { author: { select: { name: true } } },
  });
});

export async function getPostCategories() {
  const grouped = await prisma.blogPost.groupBy({
    by: ["category"],
    where: { status: "PUBLISHED", deletedAt: null },
    _count: { _all: true },
    orderBy: { category: "asc" },
  });
  return grouped.map((group) => ({ name: group.category, count: group._count._all }));
}

export async function getRelatedPosts(slug: string, category: string, limit = 3) {
  return prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      slug: { not: slug },
      publishedAt: { lte: new Date() },
    },
    orderBy: [{ category: category ? "asc" : "desc" }, { publishedAt: "desc" }],
    take: limit,
    select: { slug: true, title: true, excerpt: true, category: true, readMinutes: true, publishedAt: true },
  });
}

export const getFaqsByTopic = cache(async (topic: string) => {
  return prisma.faq.findMany({
    where: { topic },
    orderBy: { displayOrder: "asc" },
    select: { question: true, answer: true },
  });
});
