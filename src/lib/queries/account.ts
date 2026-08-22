import "server-only";
import { prisma } from "@/lib/db";
import { orgScope, orgScopeVia, type Scoped } from "@/lib/auth/scope";

/**
 * Account reads.
 *
 * Every query here carries the organisation scope in its WHERE clause. There is
 * no code path that fetches a record by id alone and checks ownership
 * afterwards, so an altered identifier in a URL cannot return another
 * organisation's data — it simply matches nothing.
 *
 * The scope is the organisation rather than the individual: see `lib/auth/scope`
 * for why, and for the one rule that makes it safe.
 */

export async function getAccountSummary(user: Scoped) {
  const scope = orgScope(user);
  const licenceScope = orgScopeVia("licence", user);

  const [enquiries, quotes, orders, licences, renewals, tickets] = await Promise.all([
    prisma.enquiry.count({ where: scope }),
    prisma.quote.count({ where: scope }),
    prisma.order.count({ where: scope }),
    prisma.licence.count({ where: { ...scope, status: { in: ["ACTIVE", "EXPIRING"] } } }),
    prisma.renewal.count({
      where: { ...licenceScope, status: "UPCOMING", dueAt: { lte: addDays(90) } },
    }),
    prisma.supportTicket.count({ where: { ...scope, status: { notIn: ["CLOSED", "RESOLVED"] } } }),
  ]);

  return { enquiries, quotes, orders, licences, renewals, tickets };
}

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Who raised a record, for the lists.
 *
 * Shown because an organisation view without it is confusing: four quotations
 * and no indication of which colleague asked for which is worse than no list.
 */
const raisedBy = { select: { name: true } } as const;

export async function listUserEnquiries(user: Scoped) {
  return prisma.enquiry.findMany({
    where: orgScope(user),
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      reference: true,
      status: true,
      createdAt: true,
      companyName: true,
      timeline: true,
      user: raisedBy,
      _count: { select: { items: true } },
    },
  });
}

/** The scope is part of the lookup, not a check performed after fetching. */
export async function getUserEnquiry(user: Scoped, reference: string) {
  return prisma.enquiry.findFirst({
    where: { ...orgScope(user), reference },
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
      user: raisedBy,
      items: {
        select: { productName: true, sku: true, quantity: true, note: true },
      },
      quotes: {
        select: { reference: true, status: true, totalMinor: true, currency: true, validUntil: true },
      },
    },
  });
}

export async function listUserQuotes(user: Scoped) {
  return prisma.quote.findMany({
    where: orgScope(user),
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      reference: true,
      status: true,
      createdAt: true,
      validUntil: true,
      currency: true,
      totalMinor: true,
      user: raisedBy,
      _count: { select: { items: true } },
    },
  });
}

export async function listUserOrders(user: Scoped) {
  return prisma.order.findMany({
    where: orgScope(user),
    orderBy: { placedAt: "desc" },
    take: 100,
    select: {
      reference: true,
      status: true,
      placedAt: true,
      currency: true,
      totalMinor: true,
      poNumber: true,
      user: raisedBy,
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

export async function listUserLicences(user: Scoped) {
  return prisma.licence.findMany({
    where: orgScope(user),
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

export async function listUserRenewals(user: Scoped) {
  return prisma.renewal.findMany({
    where: orgScopeVia("licence", user),
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

export async function listUserTickets(user: Scoped) {
  return prisma.supportTicket.findMany({
    where: orgScope(user),
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      reference: true,
      subject: true,
      category: true,
      status: true,
      priority: true,
      createdAt: true,
      user: raisedBy,
    },
  });
}
