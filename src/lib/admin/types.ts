/**
 * Shared admin action state.
 *
 * Kept in its own module so that `AdminForm` (a Client Component) and the
 * server-action files can both import the type without the client pulling in
 * server-only code.
 */
export type AdminActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};
