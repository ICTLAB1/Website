import { describe, expect, it } from "vitest";

import * as schemas from "@/lib/validation";

/**
 * What a form shows a customer when they get something wrong.
 *
 * This exists because of one sentence, found by submitting the contact form
 * empty and reading the page rather than the schema:
 *
 *     Business email    String must contain at least 3 character(s)
 *
 * The email validator was the only one on that form with no message, so Zod
 * supplied its own — naming a programming type, counting characters instead of
 * saying what to do, and sitting beside messages that had been written for a
 * person. It was not one field: every `.max()` in the shared schemas was
 * messageless, and every `z.enum()` answered with a list of its internal
 * option names.
 *
 * So the rule is not "each validator has a message" — which is true today and
 * says nothing about the next schema somebody writes. The rule is that no
 * schema here can produce a sentence a validation library wrote, and it is
 * checked by submitting what a browser submits and reading what comes back.
 */

/**
 * The shapes Zod's own text takes. Matched on the phrasing rather than on an
 * issue code, because the thing being tested is what a reader sees: a message
 * that names `String` or recites `Expected 'A' | 'B'` has failed whether or not
 * the code that produced it was the one expected.
 */
const LIBRARY_DEFAULT =
  /\b(String|Number|Array|Boolean) must contain|\bmust contain at (least|most)\b|^Required$|^Invalid\b|Expected .*, received|Invalid enum value|Invalid literal/;

type Schema = {
  safeParse: (input: unknown) => {
    success: boolean;
    error?: { issues: { message: string; path: (string | number)[] }[] };
  };
};

const exported = Object.entries(schemas).filter(
  ([name, value]) =>
    name.endsWith("Schema") &&
    value &&
    typeof (value as Schema).safeParse === "function",
) as [string, Schema][];

/** The keys a schema declares, so a submission can carry all of them. */
function keysOf(schema: unknown): string[] {
  const shape = (schema as { _def?: { shape?: () => Record<string, unknown> } })._def?.shape;
  return typeof shape === "function" ? Object.keys(shape()) : [];
}

/**
 * What a browser actually posts.
 *
 * Every field it renders, always — empty, short, or far too long. Never a
 * missing key: an earlier version of this test fed each schema `{}` and
 * reported "Required" against sixteen of them, which is a message only a
 * hand-written API call can reach and not the thing being tested. Scalar
 * schemas take the same three values directly.
 */
function submissionsFor(schema: Schema): unknown[] {
  const keys = keysOf(schema);
  const values = ["", "x", "!".repeat(400)];
  if (keys.length === 0) return values;
  return values.map((value) => Object.fromEntries(keys.map((key) => [key, value])));
}

describe("validation messages", () => {
  it("covers the shared schemas", () => {
    // A drop here means the filter above stopped matching and every assertion
    // below is passing on an empty list.
    expect(exported.length).toBeGreaterThanOrEqual(15);
  });

  for (const [name, schema] of exported) {
    it(`${name} shows nothing a library wrote`, () => {
      const leaked = new Set<string>();

      for (const submission of submissionsFor(schema)) {
        const result = schema.safeParse(submission);
        if (result.success) continue;
        for (const issue of result.error?.issues ?? []) {
          if (LIBRARY_DEFAULT.test(issue.message)) {
            leaked.add(`${issue.path.join(".") || "(value)"}: ${issue.message}`);
          }
        }
      }

      expect([...leaked]).toEqual([]);
    });
  }

  /*
   * The enum case, asserted on its own because the failure is a disclosure as
   * well as a wording problem: the default message published the internal
   * identifiers of every option.
   */
  it("never recites an enum's internal option names", () => {
    const result = schemas.contactSchema.safeParse({
      name: "A Person",
      email: "person@example.com",
      message: "A long enough message to pass the minimum.",
      topic: "NOT_A_TOPIC",
    });

    expect(result.success).toBe(false);
    const messages = (result.error?.issues ?? []).map((issue) => issue.message).join(" ");
    expect(messages).not.toMatch(/ENTERPRISE|SALES|SUPPORT|GENERAL/);
    expect(messages).toMatch(/choose one of the options/i);
  });
});
