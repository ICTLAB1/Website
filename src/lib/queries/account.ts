import "server-only";
import { prisma } from "@/lib/db";

/**
 * Account reads.
 *
 * Every query in this module is scoped by `userId` in its WHERE clause. There
 * is no code path that fetches a record by id alone and checks ownership
 * afterwards, so an altered identifier in a URL cannot return another
 * customer's data - it simply matches nothing.
 */

export async function getAccountSummary(userId: string) {
  const [enquiries, quotes, orders, licences, renewals, tickets] = await Promise.all([
    prisma.enquiry.count({ where: { userId } }),
    prisma.quote.count({ where: { userId } }),
    prisma.order.count({ where: { userId } }),
    prisma.licence.count({ where: { userId, status: { in: ["ACTIVE", "EXPIRING"] } } }),
    prisma.renewal.count({
      where: { licence: { userId }, status: "UPCOMING", dueAt: { lte: addDays(90) } },
    }),
    prisma.supportTicket.count({ where: { userId, status: { notIn: ["CLOSED", "RESOLVED"] } } }),
  ]);

  return { enquiries, quotes, orders, licences, renewals, tickets };
}

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function listUserEnquiries(userId: string) {
  return prisma.enquiry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      reference: true,
      status: true,
      createdAt: true,
      companyName: true,
      timeline: true,
      _count: { select: { items: true } },
    },
  });
}

/** Ownership is part of the lookup, not a check performed after fetching. */
export async function getUserEnquiry(userId: string, reference: string) {
  return prisma.enquiry.findFirst({
    where: { userId, reference },
    select: {
      reference: true,
      status: true,
      createdAt: true,
      companyName: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      city: true,
      country: true,
      userCount: true,
      timeline: true,
      requirements: true,
      items: {
        select: { productName: true, sku: true, quantity: true, note: true },
      },
      quotes: {
        select: { reference: true, status: true, totalMinor: true, currency: true, validUntil: true },
      },
    },
  });
}

export async function listUserQuotes(userId: string) {
  return prisma.quote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      reference: true,
      status: true,
      createdAt: true,
      validUntil: true,
      currency: true,
      totalMinor: true,
      _count: { select: { items: true } },
    },
  });
}

export async function listUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    take: 100,
    select: {
      reference: true,
      status: true,
      placedAt: true,
      currency: true,
      totalMinor: true,
      poNumber: true,
      _count: { select: { items: true } },
      /*
       * Enough to say whether this order has been paid, and no more. A captured
       * payment is the only kind that changes what the customer is shown or
       * offered; failed and abandoned attempts are the account owner's own
       * history and belong on a detail view, not in a list of orders.
       */
      payments: {
        where: { status: "CAPTURED" },
        select: { capturedAt: true },
        take: 1,
      },
    },
  });
}

export async function listUserLicences(userId: string) {
  return prisma.licence.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { expiresAt: "asc" }],
    take: 200,
    select: {
      reference: true,
      status: true,
      productName: true,
      sku: true,
      seats: true,
      startsAt: true,
      expiresAt: true,
    },
  });
}

export async function listUserRenewals(userId: string) {
  return prisma.renewal.findMany({
    where: { licence: { userId } },
    orderBy: { dueAt: "asc" },
    take: 200,
    select: {
      reference: true,
      status: true,
      dueAt: true,
      seats: true,
      quotedMinor: true,
      licence: { select: { productName: true, sku: true } },
    },
  });
}

export async function listUserTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      reference: true,
      subject: true,
      category: true,
      status: true,
      priority: true,
      createdAt: true,
    },
  });
}
