import { describe, expect, it } from "vitest";
import { describeMailFailure, hintFor } from "@/app/admin/settings/mail-hints";

/**
 * The sentence that turns a provider's error code into something an operator
 * can act on.
 *
 * Tested because it fails invisibly. If a match stopped working the error would
 * still be shown — just without the explanation — and nobody would notice
 * anything was missing. The rejections below are the real wording these two
 * providers use.
 */
describe("mail failure hints", () => {
  it("recognises Microsoft 365 refusing SMTP AUTH", () => {
    // The single most common reason outbound email does not work on a
    // Microsoft 365 mailbox: the protocol is disabled per mailbox by default,
    // so the credentials are right and the send still fails.
    const rejections = [
      "535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Tenant",
      "535 5.7.3 Authentication unsuccessful [BM1PR01CA0123.INDPRD01.PROD.OUTLOOK.COM]",
      "Basic authentication is disabled for this mailbox",
    ];

    for (const rejection of rejections) {
      const hint = hintFor(rejection);
      expect(hint).toContain("Authenticated SMTP");
      expect(hint).toContain("Manage email apps");
    }
  });

  it("mentions app passwords, because MFA breaks this separately", () => {
    // Enabling the protocol is not enough when the mailbox has multi-factor
    // authentication: its ordinary password will still be refused, and the
    // rejection looks identical.
    expect(hintFor("535 5.7.139 Authentication unsuccessful")).toContain("app password");
  });

  it("recognises a server refusing to send from the configured address", () => {
    const hint = hintFor("550 5.7.60 SMTP; Client does not have permissions to send as this sender");
    expect(hint).toContain("MAIL_FROM");
    expect(hint).toContain("SMTP_USER");
  });

  it("names the setting to fill in when nothing is configured", () => {
    // Safe here and nowhere else: this page is ADMIN-only, and the person
    // reading it is the person editing .env, who can search for the key.
    expect(describeMailFailure({ kind: "no_host" })).toContain("SMTP_HOST");
    expect(describeMailFailure({ kind: "no_from" })).toContain("MAIL_FROM");
  });

  it("carries the provider's own words through, with the hint appended", () => {
    const message = describeMailFailure({
      kind: "rejected_connection",
      detail: "535 5.7.139 Authentication unsuccessful",
    });
    // The raw rejection is the part that identifies the problem; the hint is
    // what makes it actionable. Both, in that order.
    expect(message).toContain("535 5.7.139");
    expect(message).toContain("Authenticated SMTP");
  });

  it("recognises nothing answering at all, and names the usual cause", () => {
    /*
     * The one that produced a button spinning forever. A blocked outbound port
     * blackholes packets rather than refusing them, so there is no rejection to
     * read — and it is the *normal* state of a new cloud server, not an
     * exotic misconfiguration. Without this the operator is told "timed out"
     * and left to guess.
     */
    for (const detail of [
      "Connection timeout",
      "Timed out waiting for the mail server.",
      "connect ETIMEDOUT 52.96.0.1:587",
      "connect ECONNREFUSED 127.0.0.1:587",
    ]) {
      const hint = hintFor(detail);
      expect(hint).toContain("block outbound mail ports");
      expect(hint).toContain("nc -vz");
    }
  });

  it("recognises the four ways a Microsoft app registration goes wrong", () => {
    /*
     * Each of these is a different mistake in the Azure setup, and Microsoft
     * reports all four as an opaque code. Without a hint the operator is told
     * "AADSTS7000215" and left to re-check whichever of the four fields they
     * happen to suspect — three of which look identical to each other.
     */
    expect(hintFor("AADSTS7000215: Invalid client secret provided.")).toContain("rather than its Value");
    expect(hintFor("AADSTS700016: Application with identifier was not found in the directory")).toContain(
      "tenant ID and client ID",
    );
    expect(hintFor("ErrorAccessDenied: Access is denied.")).toContain("Grant admin consent");
    expect(hintFor("MailboxNotEnabledForRESTAPI")).toContain("distribution list");
  });

  it("says which part of a Microsoft registration is missing", () => {
    expect(describeMailFailure({ kind: "graph_incomplete" })).toContain("client secret");
    expect(describeMailFailure({ kind: "graph_incomplete" })).toContain("mailbox to send from");
  });

  it("says Azure Communication Services is not fully configured", () => {
    expect(describeMailFailure({ kind: "acs_incomplete" })).toContain("Azure Communication Services");
  });

  it("adds nothing to a failure it does not recognise", () => {
    // Silence is correct here. A guess dressed up as advice sends somebody to
    // change a setting that was never the problem.
    expect(hintFor("getaddrinfo ENOTFOUND smtp.example.test")).toBe("");
    expect(hintFor("550 mailbox unavailable")).toBe("");
    expect(hintFor("")).toBe("");
  });

  it("matches regardless of case", () => {
    // Providers are inconsistent about capitalisation, and the same rejection
    // arrives differently cased from different relays.
    expect(hintFor("SMTPAUTH IS DISABLED")).toContain("Authenticated SMTP");
    expect(hintFor("smtpauth is disabled")).toContain("Authenticated SMTP");
  });
});
