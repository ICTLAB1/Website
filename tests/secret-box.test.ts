import { beforeAll, describe, expect, it } from "vitest";

/**
 * The encryption around payment credentials.
 *
 * These matter more than most tests here, because every failure mode is silent.
 * A secret stored in plain text looks identical from the admin panel. A
 * ciphertext that decrypts to the wrong thing produces a payment failure with
 * no obvious cause. Nothing in the UI would reveal any of it.
 */

// Set before importing: the module derives its key from this at call time, but
// `authSecret()` throws if it is missing, and the import graph reaches it.
beforeAll(() => {
  process.env.AUTH_SECRET ??= "test-secret-of-sufficient-length-for-hkdf-derivation";
});

const load = async () => import("@/lib/secret-box");

describe("secret box", () => {
  it("round-trips a value", async () => {
    const { encryptSecret, decryptSecret } = await load();
    const secret = "rzp_live_secret_value_9f3a2b";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("never stores the plaintext", async () => {
    const { encryptSecret } = await load();
    const secret = "an-obviously-recognisable-secret";
    const stored = encryptSecret(secret);

    // The whole point. A database dump must not contain the credential, in any
    // encoding a casual reader would spot.
    expect(stored).not.toContain(secret);
    expect(Buffer.from(stored, "utf8").toString("base64")).not.toContain(
      Buffer.from(secret, "utf8").toString("base64"),
    );
  });

  it("produces different ciphertext each time", async () => {
    const { encryptSecret } = await load();
    // A fresh IV per encryption. Without one, identical secrets produce
    // identical columns, and anyone reading the table learns that two
    // deployments share a key without ever decrypting anything.
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("refuses a tampered ciphertext rather than returning wrong plaintext", async () => {
    const { encryptSecret, decryptSecret } = await load();
    const stored = encryptSecret("rzp_live_original");
    const [version, iv, tag, ciphertext] = stored.split(".");

    // Flip a byte of the ciphertext. GCM authenticates, so this must fail
    // rather than decrypt to something else — the property that makes the
    // stored value trustworthy and not merely obscured.
    const flipped = Buffer.from(ciphertext!, "base64url");
    flipped[0] = (flipped[0] ?? 0) ^ 0xff;

    const corrupted = [version, iv, tag, flipped.toString("base64url")].join(".");
    expect(decryptSecret(corrupted)).toBeNull();
  });

  it("refuses a value encrypted under a different key", async () => {
    const { encryptSecret } = await load();
    const stored = encryptSecret("rzp_live_secret");

    // Simulates rotating AUTH_SECRET. The old ciphertext genuinely is
    // unreadable, and must report that rather than throw — the site degrades to
    // purchase-order-only and an administrator re-enters the keys.
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "a-completely-different-secret-of-good-length";

    // No module reload needed: the key is derived inside each call rather than
    // at import, which is what makes rotation take effect immediately instead
    // of at the next restart.
    const { decryptSecret } = await load();
    expect(decryptSecret(stored)).toBeNull();

    // And the same value decrypts again once the original key is back, which
    // proves the failure above was the key and not the ciphertext.
    process.env.AUTH_SECRET = original;
    expect(decryptSecret(stored)).toBe("rzp_live_secret");
  });

  it("returns null for absent or malformed values", async () => {
    const { decryptSecret } = await load();
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret(undefined)).toBeNull();
    expect(decryptSecret("")).toBeNull();
    expect(decryptSecret("not-a-ciphertext")).toBeNull();
    expect(decryptSecret("v9.a.b.c")).toBeNull();
  });

  it("hints at a secret without revealing it", async () => {
    const { secretHint } = await load();
    const hint = secretHint("rzp_live_abcdefghijkl9f3a");

    expect(hint).toBe("••••••••9f3a");
    expect(hint).not.toContain("abcdefgh");
    // Short values reveal nothing at all rather than most of themselves.
    expect(secretHint("abc")).toBe("••••••••");
  });
});
