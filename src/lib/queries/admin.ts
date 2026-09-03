import "server-only";
import type { EnquiryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RFQ_STATUSES } from "@/lib/rfq";

/**
 * Admin reads.
 *
 * Nothing in this module performs its own authorisation - that is the caller's
 * responsibility, and every admin page and action calls requireStaff() or
 * requireAdmin() before reaching here. Keeping the check at the boundary rather
 * than scattered through queries means it cannot be half-applied.
 */

export async function getDashboardMetrics() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    revenue,
    orderCount,
    enquiryCount,
    newEnquiries,
    quoteCount,
    customerCount,
    productCount,
    recentEnquiries,
    recentOrders,
    popularProducts,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: ["CONFIRMED", "PROVISIONING", "FULFILLED"] } },
      _sum: { totalMinor: true },
    }),
    prisma.order.count(),
    prisma.enquiry.count(),
    // What has arrived and nobody has picked up. The dashboard's "needs
    // attention" number, so it counts the state that means exactly that.
    prisma.enquiry.count({ where: { status: "SUBMITTED" } }),
    prisma.quote.count({ where: { status: { in: ["DRAFT", "SENT"] } } }),
    prisma.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
    prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        reference: true,
        companyName: true,
        contactName: true,
        status: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 5,
      select: {
        reference: true,
        billingName: true,
        status: true,
        totalMinor: true,
        currency: true,
        placedAt: true,
      },
    }),
    prisma.enquiryItem.groupBy({
      by: ["sku", "productName"],
      _sum: { quantity: true },
      _count: { _all: true },
      orderBy: { _count: { sku: "desc" } },
      take: 8,
      where: { enquiry: { createdAt: { gte: thirtyDaysAgo } } },
    }),
  ]);

  return {
    revenueMinor: revenue._sum.totalMinor ?? 0,
    orderCount,
    enquiryCount,
    newEnquiries,
    quoteCount,
    customerCount,
    productCount,
    recentEnquiries,
    recentOrders,
    popularProducts,
  };
}

export async function listAdminProducts(options: { q?: string; page?: number } = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = 25;
  const term = options.q?.trim().toLowerCase();

  const where = {
    deletedAt: null,
    ...(term ? { searchText: { contains: term } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        availability: true,
        purchaseMode: true,
        featured: true,
        popularity: true,
        updatedAt: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminProduct(id: string) {
  return prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      brand: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      variants: { where: { deletedAt: null }, orderBy: { listPriceMinor: "asc" } },
      specs: { orderBy: [{ displayOrder: "asc" }, { label: "asc" }] },
    },
  });
}

export async function listAdminEnquiries(options: { status?: string; page?: number } = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = 25;
  const status =
    options.status && (RFQ_STATUSES as string[]).includes(options.status)
      ? (options.status as EnquiryStatus)
      : undefined;

  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        reference: true,
        companyName: true,
        contactName: true,
        contactEmail: true,
        status: true,
        timeline: true,
        userCount: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.enquiry.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminEnquiry(reference: string) {
  return prisma.enquiry.findUnique({
    where: { reference },
    include: {
      items: { include: { variant: { select: { sku: true, listPriceMinor: true, currency: true } } } },
      user: { select: { id: true, name: true, email: true } },
      company: { select: { name: true, gstin: true } },
      quotes: { select: { reference: true, status: true, totalMinor: true, currency: true } },
      /*
       * Whether this enquiry is already on the pipeline. One row is enough:
       * the screen offers to add it or links to what is there, and neither
       * needs the rest.
       */
      deals: { select: { reference: true, title: true, stage: true }, take: 1 },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          reference: true,
          kind: true,
          filename: true,
          bytes: true,
          note: true,
          verifiedAt: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
}

export async function listAdminCustomers(options: { q?: string; page?: number } = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = 25;
  const term = options.q?.trim();

  const where = {
    deletedAt: null,
    role: "CUSTOMER" as const,
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" as const } },
            { email: { contains: term, mode: "insensitive" as const } },
            { company: { name: { contains: term, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      // The password hash is never selected anywhere in the admin surface.
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
        company: { select: { name: true, gstin: true } },
        _count: { select: { enquiries: true, orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listAdminUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null, role: { in: ["ADMIN", "SALES"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function listAuditLog(limit = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });
}

/**
 * The full audit log, filterable and paginated.
 *
 * `listAuditLog` above serves the dashboard's own "recent activity" panel —
 * the ten newest entries, no filters, no paging. This is "everything this
 * user did" and "everything that happened to this record", the two
 * questions a fixed-length recent list cannot answer.
 */
export async function searchAuditLog(options: {
  actorId?: string;
  entityType?: string;
  q?: string;
  page?: number;
} = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = 50;

  const where = {
    ...(options.actorId ? { actorId: options.actorId } : {}),
    ...(options.entityType ? { entityType: options.entityType } : {}),
    ...(options.q
      ? {
          OR: [
            { action: { contains: options.q, mode: "insensitive" as const } },
            { entityId: { contains: options.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    // Distinct values for the filter dropdown — read once, not per row.
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    entityTypes: entityTypes.map((row) => row.entityType),
  };
}
