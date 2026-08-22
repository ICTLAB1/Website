import { describe, expect, it } from "vitest";
import type { CompanyRole, UserRole } from "@prisma/client";

import {
  can,
  canInCompany,
  COMPANY_CAPABILITIES,
  COMPANY_ROLE_LABELS,
  ROLE_LABELS,
  STAFF_CAPABILITIES,
} from "@/lib/auth/capabilities";
import { belongsToOrg, orgScope, orgScopeVia } from "@/lib/auth/scope";

/**
 * Access control is a matrix, and a matrix is exactly the kind of thing that
 * develops a hole nobody notices. These tests are the properties that must hold
 * whatever roles are added later, not a restatement of the table.
 */

const STAFF_ROLES = Object.keys(STAFF_CAPABILITIES) as UserRole[];
const COMPANY_ROLES = Object.keys(COMPANY_CAPABILITIES) as CompanyRole[];

describe("staff capabilities", () => {
  it("gives the administrator everything", () => {
    for (const role of STAFF_ROLES) {
      for (const capability of STAFF_CAPABILITIES[role]) {
        expect(can({ role: "ADMIN" }, capability)).toBe(true);
      }
    }
  });

  it("gives a customer nothing at all", () => {
    expect(STAFF_CAPABILITIES.CUSTOMER).toHaveLength(0);
    expect(can({ role: "CUSTOMER" }, "quotes.write")).toBe(false);
    expect(can({ role: "CUSTOMER" }, "settings.manage")).toBe(false);
  });

  it("keeps configuration and account administration to the administrator", () => {
    // Two capabilities that must never spread: one changes what every visitor
    // sees and how money is taken, the other changes who may do anything at all.
    for (const role of STAFF_ROLES) {
      if (role === "ADMIN") continue;
      expect(can({ role }, "settings.manage"), `${role} may configure`).toBe(false);
      expect(can({ role }, "users.manage"), `${role} may administer accounts`).toBe(false);
    }
  });

  it("keeps margin away from the roles that have no business seeing it", () => {
    for (const role of ["SALES", "PROCUREMENT", "OPERATIONS", "SUPPORT", "CUSTOMER"] as UserRole[]) {
      expect(can({ role }, "margins.read"), `${role} may see margin`).toBe(false);
    }
    for (const role of ["ADMIN", "DIRECTOR", "SALES_MANAGER"] as UserRole[]) {
      expect(can({ role }, "margins.read"), `${role} may not see margin`).toBe(true);
    }
  });

  it("never implies a write without the matching read", () => {
    // A role that may change orders and not list them can act on things it
    // cannot see, which is how an interface ends up lying about what happened.
    const pairs = [
      ["customers.write", "customers.read"],
      ["enquiries.write", "enquiries.read"],
      ["quotes.write", "quotes.read"],
      ["orders.write", "orders.read"],
      ["support.write", "support.read"],
    ] as const;

    for (const role of STAFF_ROLES) {
      for (const [write, read] of pairs) {
        if (can({ role }, write)) {
          expect(can({ role }, read), `${role} may ${write} but not ${read}`).toBe(true);
        }
      }
    }
  });

  it("has a label for every role", () => {
    for (const role of STAFF_ROLES) expect(ROLE_LABELS[role]).toBeTruthy();
  });

  it("refuses an absent account", () => {
    expect(can(null, "orders.read")).toBe(false);
    expect(can(undefined, "orders.read")).toBe(false);
  });
});

describe("capabilities inside a customer organisation", () => {
  const member = (companyRole: CompanyRole) => ({ companyId: "c1", companyRole });

  it("lets a company administrator do everything", () => {
    for (const capability of COMPANY_CAPABILITIES.ADMIN) {
      expect(canInCompany(member("ADMIN"), capability)).toBe(true);
    }
  });

  it("lets a viewer do nothing", () => {
    expect(COMPANY_CAPABILITIES.VIEWER).toHaveLength(0);
    expect(canInCompany(member("VIEWER"), "quotes.act")).toBe(false);
    expect(canInCompany(member("VIEWER"), "orders.act")).toBe(false);
    expect(canInCompany(member("VIEWER"), "company.manage")).toBe(false);
  });

  it("keeps managing the company and its people to the company administrator", () => {
    for (const role of COMPANY_ROLES) {
      if (role === "ADMIN") continue;
      expect(canInCompany(member(role), "company.manage"), `${role} may edit the company`).toBe(false);
      expect(canInCompany(member(role), "people.manage"), `${role} may invite`).toBe(false);
    }
  });

  it("treats an account with no company as its own organisation of one", () => {
    // The sole trader who signed up on the website. There is nobody for them to
    // be restricted from, so they may act — but "invite a colleague" is
    // meaningless without a company to invite into.
    const soleTrader = { companyId: null, companyRole: "VIEWER" as CompanyRole };
    expect(canInCompany(soleTrader, "quotes.act")).toBe(true);
    expect(canInCompany(soleTrader, "orders.act")).toBe(true);
    expect(canInCompany(soleTrader, "people.manage")).toBe(false);
  });

  it("has a label for every company role", () => {
    for (const role of COMPANY_ROLES) expect(COMPANY_ROLE_LABELS[role]).toBeTruthy();
  });
});

describe("organisation scope", () => {
  it("scopes a company member to the company and to their own records", () => {
    expect(orgScope({ id: "u1", companyId: "c1" })).toEqual({
      OR: [{ companyId: "c1" }, { userId: "u1" }],
    });
  });

  it("scopes an unattached account to itself alone", () => {
    expect(orgScope({ id: "u1", companyId: null })).toEqual({ userId: "u1" });
    expect(orgScope({ id: "u1" })).toEqual({ userId: "u1" });
  });

  it("never produces a filter matching every unattached record", () => {
    /*
     * The one mistake this module exists to prevent. `{ companyId: null }` in a
     * WHERE clause matches every record that belongs to no company — which is
     * every guest order ever placed.
     */
    const scope = orgScope({ id: "u1", companyId: null });
    expect(JSON.stringify(scope)).not.toContain("companyId");
  });

  it("applies the same rule through a relation", () => {
    expect(orgScopeVia("licence", { id: "u1", companyId: "c1" })).toEqual({
      licence: { OR: [{ companyId: "c1" }, { userId: "u1" }] },
    });
  });

  it("recognises a record from the same organisation, and refuses another's", () => {
    const user = { id: "u1", companyId: "c1" };
    expect(belongsToOrg(user, { userId: "u9", companyId: "c1" })).toBe(true);
    expect(belongsToOrg(user, { userId: "u9", companyId: "c2" })).toBe(false);
    expect(belongsToOrg(user, { userId: "u1", companyId: null })).toBe(true);
    expect(belongsToOrg(user, { userId: "u9", companyId: null })).toBe(false);
  });

  it("does not let two unattached accounts see each other", () => {
    const user = { id: "u1", companyId: null };
    expect(belongsToOrg(user, { userId: "u2", companyId: null })).toBe(false);
    expect(belongsToOrg(user, { userId: "u1", companyId: null })).toBe(true);
  });
});
