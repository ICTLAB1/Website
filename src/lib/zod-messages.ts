import { z } from "zod";

/**
 * Nothing a validation library wrote reaches a customer.
 *
 * Found by submitting the contact form empty and reading what came back:
 *
 *     Business email    String must contain at least 3 character(s)
 *
 * which names a programming type, counts characters instead of saying what to
 * do, and sits beside messages that were written for a person — "Enter your
 * full name.", "Tell us a little more (at least 10 characters)." It was the
 * one field whose validator had no message, so Zod supplied its own.
 *
 * It was not one field. Every `.max()` in the shared schemas was messageless,
 * so pasting a long value anywhere produced the same sentence, and every
 * `z.enum()` produced worse:
 *
 *     Invalid enum value. Expected 'SALES' | 'ENTERPRISE' | 'SUPPORT' |
 *     'GENERAL', received ''
 *
 * That one also publishes the internal names of the options, which is nobody's
 * business outside this codebase and tells the reader nothing about what to do
 * next.
 *
 * ## Why a global map rather than a message per validator
 *
 * Thirty-seven files define schemas. Adding a message to each validator in each
 * of them fixes today and nothing else: the next schema somebody writes has the
 * same gap, and nothing fails when they leave it. The map is the floor — a
 * validator with no message still produces a sentence written for a person.
 *
 * Explicit messages still win wherever one is set, and they should be set
 * wherever the generic cannot be specific: this map can say "use at least 10
 * characters", it cannot say "describe the issue in a little more detail".
 *
 * ## It is a floor, not an excuse
 *
 * `tests/validation-messages.test.ts` submits what a browser would submit to
 * every shared schema and fails on anything that reads like a library default.
 * Reverting this file fails it on sixteen of eighteen schemas.
 */

/**
 * A length is reported as a requirement, never as a type.
 *
 * The thresholds matter. A minimum of one, two or three characters is not a
 * length rule anybody cares about — it is how a schema says "this is
 * required", and that is what the reader needs to hear. Above that the number
 * is genuine information: "use at least 10 characters" tells somebody what to
 * type, where "this is required" would leave them guessing why their four-word
 * sentence was refused.
 */
function stringTooSmall(minimum: number): string {
  return minimum <= 3 ? "This cannot be left blank." : `Use at least ${minimum} characters.`;
}

/**
 * A maximum of zero is a honeypot — a field hidden from people and filled by
 * bots. "Use 0 characters or fewer" is nonsense to the rare human who reaches
 * it; "leave this blank" is at least true.
 */
function stringTooBig(maximum: number): string {
  return maximum === 0 ? "This must be left blank." : `Use ${maximum} characters or fewer.`;
}

const friendly: z.ZodErrorMap = (issue, context) => {
  switch (issue.code) {
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") return { message: stringTooSmall(Number(issue.minimum)) };
      if (issue.type === "number") return { message: `Enter ${issue.minimum} or more.` };
      if (issue.type === "array") return { message: "Add at least one item." };
      break;

    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: stringTooBig(Number(issue.maximum)) };
      if (issue.type === "number") return { message: `Enter ${issue.maximum} or less.` };
      if (issue.type === "array") return { message: `Remove some — ${issue.maximum} at most.` };
      break;

    // Deliberately does not list the options: they are internal identifiers,
    // and a reader choosing from a dropdown does not need their spelling.
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Choose one of the options." };

    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: "This is required." };
      }
      if (issue.received === "nan") return { message: "Enter a number." };
      return { message: "That is not the kind of value this field takes." };

    case z.ZodIssueCode.invalid_literal:
      return { message: "That value is not allowed here." };

    default:
      break;
  }

  /*
   * Everything else keeps Zod's text. `invalid_string` covers email, url and
   * regex, and every one of those in this codebase already carries a written
   * message — so overriding the default here would replace a specific sentence
   * with a vaguer one.
   */
  return { message: context.defaultError };
};

z.setErrorMap(friendly);

/**
 * Exported so a module can state the dependency rather than rely on having
 * been imported first. The map is global to the `zod` module, so one import
 * anywhere in the process is enough — but "enough in practice" is how an
 * ordering bug waits for the one route that imports no schema but its own.
 */
export const friendlyMessagesInstalled = true;
