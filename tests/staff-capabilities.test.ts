import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { STAFF_CAPABILITIES, can, type Capability } from "@/lib/auth/capabilities";
import type { UserRole } from "@prisma/client";

/**
 * Who may do what, asserted against the matrix rather than against the roles
 * that happen to be convenient.
 *
 * The defect these cover: every admin server action asked `requireStaff()`,
 * which answers "is this person on the payroll". The capability matrix had
 * said for a long time that SUPPORT may read customers and write tickets and
 * nothing else; nothing consulted it, so SUPPORT could draft and issue a
 * quotation, move a deal to WON, rewrite a customer's organisation and
 * replace a product photograph.
 *
 * Two kinds of test here, because they fail in different ways:
 *
 *  - The table below is behavioural: for each sensitive operation, every role
 *    that should hold it and every role that should not. It fails when a
 *    capability is granted to the wrong role.
 *  - `every staff action names a capability` is structural: it reads the
 *    action files and fails when a *new* action is added that does not ask.
 *    The behavioural table cannot catch that, because an action nobody
 *    thought to list is an action nobody thought to test.
 */

const ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "SALES_MANAGER",
  "SALES",
  "PROCUREMENT",
  "OPERATIONS",
  "ACCOUNTS",
  "SUPPORT",
  "CUSTOMER",
];

/** Operation → the capability it now requires, and who should hold it. */
const OPERATIONS: Array<{
  operation: string;
  capability: Capability;
  allowed: UserRole[];
}> = [
  {
    operation: "create or edit a product, variant or specification",
    capability: "catalogue.write",
    allowed: ["ADMIN", "PROCUREMENT"],
  },
  {
    operation: "modify an enquiry, or move a deal through the pipeline",
    capability: "enquiries.write",
    allowed: ["ADMIN", "SALES_MANAGER", "SALES"],
  },
  {
    operation: "draft, price, issue or revise a quotation",
    capability: "quotes.write",
    allowed: ["ADMIN", "DIRECTOR", "SALES_MANAGER", "SALES"],
  },
  {
    operation: "fulfil an order, verify a purchase order, change an order status",
    capability: "orders.write",
    allowed: ["ADMIN", "PROCUREMENT", "OPERATIONS", "ACCOUNTS"],
  },
  {
    operation: "mark a payment refunded",
    capability: "payments.refund",
    allowed: ["ADMIN", "ACCOUNTS"],
  },
  {
    operation: "reply on a support ticket or change its state",
    capability: "support.write",
    allowed: ["ADMIN", "SUPPORT"],
  },
  {
    operation: "edit a customer organisation, address or contact",
    capability: "customers.write",
    allowed: ["ADMIN", "SALES_MANAGER", "SALES"],
  },
  {
    operation: "publish or reply to a review, edit pages and navigation",
    capability: "content.write",
    allowed: ["ADMIN"],
  },
  {
    operation: "create accounts and change what they may do",
    capability: "users.manage",
    allowed: ["ADMIN"],
  },
  {
    operation: "configure the payment gateway, mail and business identity",
    capability: "settings.manage",
    allowed: ["ADMIN"],
  },
];

describe("staff capabilities: who is allowed", () => {
  for (const { operation, capability, allowed } of OPERATIONS) {
    describe(operation, () => {
      for (const role of ROLES) {
        const shouldHold = allowed.includes(role);
        it(`${shouldHold ? "allows" : "refuses"} ${role}`, () => {
          expect(can({ role }, capability)).toBe(shouldHold);
        });
      }
    });
  }
});

describe("the shape of the matrix", () => {
  it("gives a customer no staff capability at all", () => {
    expect(STAFF_CAPABILITIES.CUSTOMER).toEqual([]);
  });

  it("gives the administrator every capability", () => {
    for (const { capability } of OPERATIONS) {
      expect(can({ role: "ADMIN" }, capability)).toBe(true);
    }
  });

  it("keeps refunds narrower than ordinary order work", () => {
    // The specific regression: before `payments.refund` existed, marking a
    // payment refunded needed nothing beyond being staff. Had it simply been
    // folded into orders.write, procurement and operations would have been
    // able to return money.
    expect(can({ role: "PROCUREMENT" }, "orders.write")).toBe(true);
    expect(can({ role: "PROCUREMENT" }, "payments.refund")).toBe(false);
    expect(can({ role: "OPERATIONS" }, "orders.write")).toBe(true);
    expect(can({ role: "OPERATIONS" }, "payments.refund")).toBe(false);
  });

  it("does not let support write outside support", () => {
    // The headline escalation, named explicitly so a future widening of the
    // SUPPORT row has to argue with this test.
    expect(can({ role: "SUPPORT" }, "support.write")).toBe(true);
    for (const capability of [
      "quotes.write",
      "orders.write",
      "enquiries.write",
      "customers.write",
      "catalogue.write",
      "content.write",
      "payments.refund",
    ] as Capability[]) {
      expect(can({ role: "SUPPORT" }, capability)).toBe(false);
    }
  });
});

describe("the shape of the actions", () => {
  /**
   * Structural, and the reason the guard's type has no "staff" level.
   *
   * A behavioural test only covers the actions somebody remembered to list.
   * This one reads every server action file and insists each exported action
   * reaches an authorisation call of some kind, so an action added next year
   * fails here rather than shipping open to every member of staff.
   */
  const files = globSync("src/app/admin/**/*.ts").filter((file) =>
    readFileSync(file, "utf8").includes('"use server"'),
  );

  it("finds the admin server action files", () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it("has no action left asking only whether the caller is staff", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      if (/guard\(\s*["']staff["']\s*\)/.test(source)) offenders.push(`${file}: guard("staff")`);
      if (/await requireStaff\(\)/.test(source)) offenders.push(`${file}: requireStaff()`);
    }
    expect(offenders).toEqual([]);
  });

  it("gives every exported action an authorisation call", () => {
    /*
     * Direct calls, and one level of indirection.
     *
     * Several files wrap the prelude in a local helper — `admin()` in
     * page-actions, `authorise()` in record-actions — so an action that is
     * properly guarded does not mention `guard` itself. Following that one
     * hop is the difference between a test that holds and a test somebody
     * deletes because it cries wolf; beyond one hop this would be writing a
     * call-graph analyser, and the convention in this codebase is a prelude
     * at the top of the action or one helper beside it.
     */
    const AUTHORISES =
      /guard\(\s*(?:"admin"|\{\s*capability|config\.guard)|requireAdmin\(|requireCapability\(/;
    const missing: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");

      // Local helpers that themselves authorise; calling one counts.
      const helpers = [...source.matchAll(/^(?:async )?function (\w+)\([\s\S]*?^}/gm)]
        .filter((match) => AUTHORISES.test(match[0]))
        .map((match) => match[1]);
      const viaHelper = helpers.length
        ? new RegExp(`\\b(?:${helpers.join("|")})\\(`)
        : null;

      const blocks = source.split(/^export async function /m).slice(1);
      for (const block of blocks) {
        const name = block.slice(0, block.indexOf("("));
        const body = block.split(/^export /m)[0] ?? block;
        if (AUTHORISES.test(body)) continue;
        if (viaHelper?.test(body)) continue;
        missing.push(`${file}:${name}`);
      }
    }

    expect(missing).toEqual([]);
  });

  /**
   * The mapping itself, read out of the source.
   *
   * The table above proves the matrix is right and the test before this
   * proves every action asks for *something*. Neither catches an action
   * asking for the wrong thing — `markPaymentRefunded` guarded by
   * `catalogue.write` would satisfy both and be nonsense. These are the
   * operations where a mix-up would matter most, pinned to the capability
   * they must name.
   */
  it("asks for the right capability, action by action", () => {
    const EXPECTED: Record<string, Record<string, string>> = {
      "src/app/admin/quote-actions.ts": {
        draftQuote: "quotes.write",
        issueQuote: "quotes.write",
        reviseQuotation: "quotes.write",
        verifyPurchaseOrder: "orders.write",
        updateOrderStatus: "orders.write",
        fulfilOrderAction: "orders.write",
        markPaymentRefunded: "payments.refund",
        updateSupportTicket: "support.write",
      },
      "src/app/admin/crm-actions.ts": {
        createDealAction: "enquiries.write",
        moveDealStageAction: "enquiries.write",
      },
      "src/app/admin/product-photo-actions.ts": {
        uploadProductPhoto: "catalogue.write",
      },
      "src/app/admin/actions.ts": {
        saveProduct: "catalogue.write",
        archiveProduct: "catalogue.write",
        updateEnquiry: "enquiries.write",
      },
      "src/app/admin/organisation-actions.ts": {
        saveCompany: "customers.write",
        deleteCompanyContact: "customers.write",
      },
    };

    const wrong: string[] = [];
    for (const [file, actions] of Object.entries(EXPECTED)) {
      const source = readFileSync(file, "utf8");
      for (const [action, capability] of Object.entries(actions)) {
        const declaration = `export async function ${action}(`;
        const at = source.indexOf(declaration);
        expect(at, `${file}:${action} not found`).toBeGreaterThan(-1);
        /*
         * From *after* the declaration, not from it: slicing at `export` and
         * then splitting on `^export` returns an empty first element, so
         * every action read as unguarded. The first version of this test did
         * exactly that and reported sixteen false failures.
         */
        const body = source.slice(at + declaration.length).split(/^export /m)[0] ?? "";
        const found =
          /guard\(\s*\{\s*capability:\s*"([a-z.]+)"/.exec(body)?.[1] ??
          /requireCapability\(\s*"([a-z.]+)"/.exec(body)?.[1] ??
          "(none)";
        if (found !== capability) wrong.push(`${file}:${action} asks ${found}, expected ${capability}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
