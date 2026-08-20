/**
 * Password policy constants.
 *
 * Kept free of `server-only` so the same numbers can be shown in the UI (the
 * hint under a password field) and enforced by the validation schema, without
 * a client module pulling in server code.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

/** Structural policy. Returns an empty array when the password passes. */
export function passwordPolicyErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Use at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
  if (!/[a-z]/.test(password)) errors.push("Include a lowercase letter.");
  if (!/[A-Z]/.test(password)) errors.push("Include an uppercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Include a number.");
  return errors;
}
