import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every role the staff screen can create, the staff screen can see.
 *
 * This exists because it was not true. `listAdminUsers` filtered on
 * `role: { in: ["ADMIN", "SALES"] }` while the create form offered nine roles,
 * so an administrator adding a colleague as Support or Accounts got an account
 * in the database, an audit entry and an emailed invitation — and a page that
 * showed nothing. The account could not then be found to change its role,
 * resend its invitation or archive it, because both of those controls are
 * populated from the same list. It was indistinguishable from the create
 * having failed.
 *
 * `isStaff` already says how to avoid this — "every role except CUSTOMER,
 * written that way so adding a role to the enum cannot silently leave it
 * locked out" — so what is pinned here is that rule rather than today's list
 * of roles. A tenth role added to the schema next year must not need this file
 * edited to become visible.
 */

const read = (file: string) => readFile(path.join(process.cwd(), file), "utf8");

describe("the staff screen shows everyone it can create", () => {
  it("selects staff by excluding customers, not by listing roles", async () => {
    const source = await read("src/lib/queries/admin.ts");
    const query = source.slice(source.indexOf("export async function listAdminUsers"));
    const body = query.slice(0, query.indexOf("\n}"));

    expect(body).toContain('role: { not: "CUSTOMER" }');

    /*
     * The specific shape that caused it. An allow-list is wrong here however
     * complete it looks on the day it is written, because the thing that
     * breaks it is a role added somewhere else entirely.
     */
    expect(body).not.toMatch(/role:\s*\{\s*in:/);
  });

  it("offers no role the database does not have", async () => {
    const schema = await read("prisma/schema.prisma");
    const enumBlock = schema.slice(schema.indexOf("enum UserRole"));
    const roles = new Set(
      enumBlock
        .slice(enumBlock.indexOf("{") + 1, enumBlock.indexOf("}"))
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    );

    const page = await read("src/app/admin/users/page.tsx");
    const offered = [...page.matchAll(/\{ value: "([A-Z_]+)"/g)].map((match) => match[1]);

    expect(offered.length).toBeGreaterThan(1);
    for (const role of offered) {
      expect(roles, `the form offers ${role}, which is not a UserRole`).toContain(role);
    }
  });

  it("tells the administrator where a customer went, since that one is hidden", async () => {
    /*
     * CUSTOMER is excluded from the list on purpose — this is the staff screen
     * and customers are administered elsewhere — which makes it the one role
     * that still creates an account the page will not show. Saying so is what
     * keeps that from looking like the bug above.
     */
    const source = await read("src/app/admin/user-actions.ts");
    expect(source).toContain('role === "CUSTOMER"');
    expect(source).toContain("appear under Customers");
  });
});
