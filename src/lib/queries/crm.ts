import "server-only";

import type { DealStage } from "@prisma/client";

import { prisma } from "@/lib/db";
import { OPEN_STAGES, isStale, isOverdue, winRate } from "@/lib/crm/pipeline";

/**
 * Reading the pipeline.
 *
 * Uncached, deliberately, and it is worth saying why in a codebase that caches
 * almost everything else: this is a working screen. A salesperson who moves a
 * deal and sees the old stage for the next sixty seconds stops trusting the
 * board, and the whole value of a pipeline is that it is current. The rows are
 * few and the queries are indexed; there is nothing here worth a stale read.
 */

const DEAL_CARD = {
  id: true,
  reference: true,
  title: true,
  stage: true,
  source: true,
  stageChangedAt: true,
  expectedValueMinor: true,
  currency: true,
  expectedCloseOn: true,
  companyName: true,
  contactName: true,
  lostReason: true,
  closedAt: true,
  updatedAt: true,
  createdAt: true,
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, email: true } },
  enquiry: { select: { reference: true } },
} as const;

export type DealCard = Awaited<ReturnType<typeof listDeals>>[number];

export async function listDeals(
  filters: { stage?: DealStage; ownerId?: string; open?: boolean } = {},
) {
  return prisma.deal.findMany({
    where: {
      ...(filters.stage ? { stage: filters.stage } : {}),
      ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
      ...(filters.open ? { stage: { in: OPEN_STAGES } } : {}),
    },
    orderBy: [{ expectedCloseOn: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    select: DEAL_CARD,
  });
}

export async function getDeal(reference: string) {
  return prisma.deal.findUnique({
    where: { reference },
    select: {
      ...DEAL_CARD,
      contactEmail: true,
      contactPhone: true,
      notes: true,
      quotes: {
        orderBy: { createdAt: "desc" },
        select: {
          reference: true,
          documentNo: true,
          status: true,
          totalMinor: true,
          currency: true,
          createdAt: true,
        },
      },
      activities: {
        orderBy: [{ occurredAt: "desc" }],
        take: 100,
        select: {
          id: true,
          kind: true,
          subject: true,
          body: true,
          occurredAt: true,
          dueAt: true,
          completedAt: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
}

/**
 * The board: every open deal, grouped by the column it belongs in.
 *
 * Grouped here rather than in the page so the empty columns exist. A board that
 * silently omits a stage with nothing in it is a board that changes shape as
 * work moves through it, and the shape is the thing somebody reads.
 */
export async function pipelineBoard(ownerId?: string) {
  const deals = await listDeals({ open: true, ownerId });

  const columns = OPEN_STAGES.map((stage) => {
    const inStage = deals.filter((deal) => deal.stage === stage);
    return {
      stage,
      deals: inStage,
      count: inStage.length,
      valueMinor: inStage.reduce((total, deal) => total + deal.expectedValueMinor, 0),
    };
  });

  return { columns, total: deals.length };
}

/**
 * The numbers on the dashboard.
 *
 * One pass over the open deals rather than a query per figure. At this scale
 * the difference is not performance — it is that every number on the screen is
 * then computed from the same set of rows, and cannot disagree with the one
 * beside it.
 */
export async function pipelineSummary(now = new Date()) {
  const [open, won, lost] = await Promise.all([
    prisma.deal.findMany({
      where: { stage: { in: OPEN_STAGES } },
      select: {
        stage: true,
        expectedValueMinor: true,
        stageChangedAt: true,
        expectedCloseOn: true,
      },
    }),
    prisma.deal.count({ where: { stage: "WON" } }),
    prisma.deal.count({ where: { stage: "LOST" } }),
  ]);

  return {
    openCount: open.length,
    /*
     * The unweighted total. Shown alongside the weighted one rather than
     * instead of it: the raw number is what the business would bill if
     * everything landed, and the weighted number is what it should plan on.
     * Showing only one of them invites the wrong decision in either direction.
     */
    openValueMinor: open.reduce((total, deal) => total + deal.expectedValueMinor, 0),
    staleCount: open.filter((deal) => isStale(deal, now)).length,
    overdueCount: open.filter((deal) => isOverdue(deal, now)).length,
    wonCount: won,
    lostCount: lost,
    winRatePercent: winRate({ won, lost }),
  };
}

/**
 * Follow-ups that are outstanding, soonest first.
 *
 * Not scoped to one person by default. A follow-up nobody does is worse than
 * one on the wrong person's list, and a small team wants to see the lot.
 */
export async function outstandingFollowUps(options: { userId?: string; limit?: number } = {}) {
  return prisma.activity.findMany({
    where: {
      completedAt: null,
      dueAt: { not: null },
      ...(options.userId ? { userId: options.userId } : {}),
    },
    orderBy: { dueAt: "asc" },
    take: options.limit ?? 50,
    select: {
      id: true,
      subject: true,
      body: true,
      dueAt: true,
      /*
       * Selected even though the `where` above already pins it to null.
       *
       * `isOverdueTask` takes both fields and decides from them, and it must
       * keep doing so — it is also called on a deal's full timeline, where
       * completed entries are present. Handing it a row that merely happens to
       * be uncompleted, without saying so, means the caller has assumed the
       * filter rather than the row, and that assumption breaks silently the
       * first time this query grows a second use.
       */
      completedAt: true,
      kind: true,
      user: { select: { name: true, email: true } },
      deal: { select: { reference: true, title: true } },
      company: { select: { id: true, name: true } },
    },
  });
}

/** Every activity against one customer, whichever deal it belongs to. */
export async function companyTimeline(companyId: string, limit = 50) {
  return prisma.activity.findMany({
    where: { OR: [{ companyId }, { deal: { companyId } }] },
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      subject: true,
      body: true,
      occurredAt: true,
      dueAt: true,
      completedAt: true,
      user: { select: { name: true, email: true } },
      deal: { select: { reference: true, title: true } },
    },
  });
}

/** Staff who can own a deal. */
export async function dealOwners() {
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SALES"] }, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}
