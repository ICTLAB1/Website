import { describe, expect, it } from "vitest";
import type { DealStage } from "@prisma/client";

import {
  CLOSED_STAGES,
  DEAL_STAGES,
  DEAL_STAGE_HINTS,
  DEAL_STAGE_LABELS,
  OPEN_STAGES,
  STAGE_CONFIDENCE,
  STALE_AFTER_DAYS,
  daysInStage,
  isClosed,
  isLoggableKind,
  isOutstanding,
  isOverdue,
  isOverdueTask,
  isStale,
  weightedValue,
  winRate,
} from "@/lib/crm/pipeline";

const at = (iso: string) => new Date(iso);
const NOW = at("2026-08-23T12:00:00Z");

describe("the stage list", () => {
  it("covers every stage exactly once", () => {
    expect(new Set(DEAL_STAGES).size).toBe(DEAL_STAGES.length);
    expect([...OPEN_STAGES, ...CLOSED_STAGES].sort()).toEqual([...DEAL_STAGES].sort());
  });

  it("has a label, a hint and a confidence for every stage", () => {
    // The three would otherwise drift apart the first time a stage is added,
    // and the failure mode is a board column with a blank heading.
    for (const stage of DEAL_STAGES) {
      expect(DEAL_STAGE_LABELS[stage], stage).toBeTruthy();
      expect(DEAL_STAGE_HINTS[stage], stage).toBeTruthy();
      expect(typeof STAGE_CONFIDENCE[stage], stage).toBe("number");
    }
  });

  it("orders the open stages by increasing confidence", () => {
    // Not cosmetic: a board where moving a deal rightwards could lower its
    // weighted value would make the forecast move the wrong way.
    const confidences = OPEN_STAGES.map((stage) => STAGE_CONFIDENCE[stage]);
    expect(confidences).toEqual([...confidences].sort((a, b) => a - b));
  });

  it("treats won and lost as closed and nothing else", () => {
    expect(isClosed("WON")).toBe(true);
    expect(isClosed("LOST")).toBe(true);
    for (const stage of OPEN_STAGES) expect(isClosed(stage), stage).toBe(false);
  });

  it("scores a won deal at full value and a lost one at nothing", () => {
    expect(STAGE_CONFIDENCE.WON).toBe(100);
    expect(STAGE_CONFIDENCE.LOST).toBe(0);
  });
});

describe("weighted value", () => {
  it("weights by the stage's confidence", () => {
    expect(weightedValue({ stage: "QUOTED", expectedValueMinor: 1_000_00 })).toBe(500_00);
  });

  it("is the full amount once won and nothing once lost", () => {
    expect(weightedValue({ stage: "WON", expectedValueMinor: 733_33 })).toBe(733_33);
    expect(weightedValue({ stage: "LOST", expectedValueMinor: 733_33 })).toBe(0);
  });

  it("never produces a fraction of a paisa", () => {
    // Money is minor units throughout this schema. A fractional one would be
    // summed into a total that cannot be printed.
    for (const stage of DEAL_STAGES) {
      const value = weightedValue({ stage, expectedValueMinor: 333_33 });
      expect(Number.isInteger(value), `${stage} → ${value}`).toBe(true);
    }
  });
});

describe("how long a deal has been sitting", () => {
  it("counts whole days since the stage last changed", () => {
    expect(daysInStage({ stageChangedAt: at("2026-08-20T12:00:00Z") }, NOW)).toBe(3);
  });

  it("never goes negative on a clock skew", () => {
    expect(daysInStage({ stageChangedAt: at("2026-08-25T12:00:00Z") }, NOW)).toBe(0);
  });

  it("calls an untouched open deal stale, at the boundary", () => {
    const stale = { stage: "QUOTED" as DealStage, stageChangedAt: at("2026-07-24T12:00:00Z") };
    expect(daysInStage(stale, NOW)).toBe(STALE_AFTER_DAYS);
    expect(isStale(stale, NOW)).toBe(true);
  });

  it("does not call a recent deal stale", () => {
    expect(isStale({ stage: "QUOTED", stageChangedAt: at("2026-08-20T12:00:00Z") }, NOW)).toBe(false);
  });

  it("never calls a closed deal stale, however old", () => {
    // A won deal from last year has stopped, which is the point of it. Marking
    // it as needing attention would fill the list with finished work.
    for (const stage of CLOSED_STAGES) {
      expect(isStale({ stage, stageChangedAt: at("2020-01-01T00:00:00Z") }, NOW), stage).toBe(false);
    }
  });
});

describe("overdue deals", () => {
  it("is overdue once the expected close date has passed", () => {
    expect(isOverdue({ stage: "NEGOTIATION", expectedCloseOn: at("2026-08-01T00:00:00Z") }, NOW)).toBe(true);
  });

  it("is not overdue before it", () => {
    expect(isOverdue({ stage: "NEGOTIATION", expectedCloseOn: at("2026-09-01T00:00:00Z") }, NOW)).toBe(false);
  });

  it("is never overdue without a date", () => {
    expect(isOverdue({ stage: "NEGOTIATION", expectedCloseOn: null }, NOW)).toBe(false);
  });

  it("is never overdue once closed", () => {
    expect(isOverdue({ stage: "WON", expectedCloseOn: at("2020-01-01T00:00:00Z") }, NOW)).toBe(false);
  });

  it("is independent of staleness", () => {
    // A deal worked on yesterday can still be overdue, and it is the more
    // urgent of the two — the forecast it sits in is now definitely wrong.
    const worked = {
      stage: "NEGOTIATION" as DealStage,
      stageChangedAt: at("2026-08-22T12:00:00Z"),
      expectedCloseOn: at("2026-08-01T00:00:00Z"),
    };
    expect(isStale(worked, NOW)).toBe(false);
    expect(isOverdue(worked, NOW)).toBe(true);
  });
});

describe("win rate", () => {
  it("is won over everything closed", () => {
    expect(winRate({ won: 3, lost: 1 })).toBe(75);
  });

  it("is null rather than zero when nothing has closed", () => {
    // "0% win rate" and "no closed deals yet" look identical on a dashboard and
    // mean opposite things, and the first is the sort of number somebody makes
    // a decision on.
    expect(winRate({ won: 0, lost: 0 })).toBeNull();
  });

  it("is zero when everything closed was lost", () => {
    expect(winRate({ won: 0, lost: 4 })).toBe(0);
  });
});

describe("follow-ups", () => {
  it("is outstanding when it has a date and is not done", () => {
    expect(isOutstanding({ dueAt: at("2026-09-01T00:00:00Z"), completedAt: null })).toBe(true);
  });

  it("is not outstanding once completed", () => {
    expect(
      isOutstanding({ dueAt: at("2026-09-01T00:00:00Z"), completedAt: at("2026-08-22T00:00:00Z") }),
    ).toBe(false);
  });

  it("treats an entry with no due date as not a follow-up at all", () => {
    // The bug this guards against would put every note ever written onto
    // somebody's task list.
    expect(isOutstanding({ dueAt: null, completedAt: null })).toBe(false);
    expect(isOverdueTask({ dueAt: null, completedAt: null }, NOW)).toBe(false);
  });

  it("is overdue once its date has passed and it is still open", () => {
    expect(isOverdueTask({ dueAt: at("2026-08-01T00:00:00Z"), completedAt: null }, NOW)).toBe(true);
  });

  it("is not overdue once done, however late", () => {
    expect(
      isOverdueTask(
        { dueAt: at("2026-08-01T00:00:00Z"), completedAt: at("2026-08-22T00:00:00Z") },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("what a person may log", () => {
  it("accepts the human kinds", () => {
    for (const kind of ["CALL", "EMAIL", "MEETING", "NOTE", "TASK"]) {
      expect(isLoggableKind(kind), kind).toBe(true);
    }
  });

  it("refuses SYSTEM", () => {
    // A person able to author one could put a false "quotation sent" into a
    // history that exists to be evidence of what was done.
    expect(isLoggableKind("SYSTEM")).toBe(false);
  });

  it("refuses anything else", () => {
    expect(isLoggableKind("DROP TABLE")).toBe(false);
    expect(isLoggableKind("")).toBe(false);
  });
});
