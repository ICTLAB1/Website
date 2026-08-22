import type { CompanyRole, UserRole } from "@prisma/client";

/**
 * What each role may do, declared once.
 *
 * Two separate questions, deliberately kept apart:
 *
 *   - `UserRole` is a job inside TechZoid. A salesperson quotes; accounts takes
 *     payment; support answers tickets. None of them is a rank, and none of
 *     them implies the others.
 *   - `CompanyRole` is a job inside a *customer's* organisation. To us every one
 *     of those people is a customer; to their own employer they are the
 *     procurement officer, the finance controller, or somebody who may only
 *     look.
 *
 * Both are expressed as capabilities rather than as role checks scattered
 * through the code, because "may this person send a quotation" is a question
 * with one answer, and a screen and its server action must not be able to
 * answer it differently. Adding a role then means adding a row here, not
 * hunting for every `role === "SALES"` in the codebase.
 */

export type Capability =
  /** Products, brands, categories and prices. */
  | "catalogue.write"
  /** Pages, navigation, banners, articles — what every visitor sees. */
  | "content.write"
  | "customers.read"
  | "customers.write"
  | "enquiries.read"
  | "enquiries.write"
  | "quotes.read"
  | "quotes.write"
  | "orders.read"
  | "orders.write"
  | "support.read"
  | "support.write"
  /** Creating accounts and changing what they may do. */
  | "users.manage"
  /** Business identity, payment and mail configuration. */
  | "settings.manage"
  | "reports.read"
  /** Internal cost, margin and commission. Never a customer capability. */
  | "margins.read";

const ALL: Capability[] = [
  "catalogue.write",
  "content.write",
  "customers.read",
  "customers.write",
  "enquiries.read",
  "enquiries.write",
  "quotes.read",
  "quotes.write",
  "orders.read",
  "orders.write",
  "support.read",
  "support.write",
  "users.manage",
  "settings.manage",
  "reports.read",
  "margins.read",
];

/**
 * Staff capabilities.
 *
 * `ADMIN` is the super administrator and holds everything. `CUSTOMER` holds
 * nothing here — a customer's rights come from `COMPANY_CAPABILITIES` and apply
 * only inside their own organisation.
 */
export const STAFF_CAPABILITIES: Record<UserRole, readonly Capability[]> = {
  ADMIN: ALL,

  // Management and approvals: sees everything the business is doing, including
  // the margin on it, and can approve a quotation — but does not administer
  // accounts or configuration, which is a separate job.
  DIRECTOR: [
    "customers.read",
    "enquiries.read",
    "quotes.read",
    "quotes.write",
    "orders.read",
    "support.read",
    "reports.read",
    "margins.read",
  ],

  SALES_MANAGER: [
    "customers.read",
    "customers.write",
    "enquiries.read",
    "enquiries.write",
    "quotes.read",
    "quotes.write",
    "orders.read",
    "support.read",
    "reports.read",
    "margins.read",
  ],

  SALES: [
    "customers.read",
    "customers.write",
    "enquiries.read",
    "enquiries.write",
    "quotes.read",
    "quotes.write",
    "orders.read",
    "support.read",
  ],

  // Sourcing: keeps the catalogue true and turns accepted quotations into
  // supplier orders. No access to what anything is being sold for.
  PROCUREMENT: [
    "catalogue.write",
    "customers.read",
    "enquiries.read",
    "quotes.read",
    "orders.read",
    "orders.write",
  ],

  OPERATIONS: ["customers.read", "quotes.read", "orders.read", "orders.write", "support.read"],

  ACCOUNTS: ["customers.read", "quotes.read", "orders.read", "orders.write", "reports.read"],

  SUPPORT: ["customers.read", "orders.read", "support.read", "support.write"],

  CUSTOMER: [],
};

/**
 * What a customer may do inside their own organisation.
 *
 * Reading is not on this list because reading is not role-dependent: everyone
 * in an organisation sees that organisation's records. That is the point of an
 * organisation account, and the alternative — a quotation only its raiser can
 * open — is what customers complain about. What the role decides is who may
 * *act*.
 */
export type CompanyCapability =
  /** The company profile, its addresses and its contacts. */
  | "company.manage"
  /** Inviting colleagues and setting what they may do. */
  | "people.manage"
  /** Raising and submitting requirements and enquiries. */
  | "enquiries.act"
  /** Accepting, rejecting or asking for a revision of a quotation. */
  | "quotes.act"
  /** Placing orders and uploading purchase orders. */
  | "orders.act"
  /** Paying, and everything on the invoice side. */
  | "payments.act"
  /** Licences, devices and support tickets. */
  | "service.act";

const COMPANY_ALL: CompanyCapability[] = [
  "company.manage",
  "people.manage",
  "enquiries.act",
  "quotes.act",
  "orders.act",
  "payments.act",
  "service.act",
];

export const COMPANY_CAPABILITIES: Record<CompanyRole, readonly CompanyCapability[]> = {
  ADMIN: COMPANY_ALL,
  PROCUREMENT: ["enquiries.act", "quotes.act", "orders.act", "service.act"],
  FINANCE: ["orders.act", "payments.act"],
  IT: ["enquiries.act", "service.act"],
  VIEWER: [],
};

/** Whether this account holds a staff capability. */
export function can(user: { role: UserRole } | null | undefined, capability: Capability): boolean {
  if (!user) return false;
  return STAFF_CAPABILITIES[user.role].includes(capability);
}

/**
 * Whether this account may act inside its organisation.
 *
 * An account with no company is treated as its own organisation of one and may
 * do everything within it — that is the sole trader who signed up on the
 * website, and there is nobody else for them to be restricted from.
 */
export function canInCompany(
  user: { companyId?: string | null; companyRole: CompanyRole } | null | undefined,
  capability: CompanyCapability,
): boolean {
  if (!user) return false;
  if (!user.companyId) return capability !== "people.manage";
  return COMPANY_CAPABILITIES[user.companyRole].includes(capability);
}

/** Human labels, for the screens that assign a role. */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  DIRECTOR: "Director",
  SALES_MANAGER: "Sales manager",
  SALES: "Salesperson",
  PROCUREMENT: "Procurement",
  OPERATIONS: "Operations",
  ACCOUNTS: "Accounts",
  SUPPORT: "Support",
  CUSTOMER: "Customer",
};

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  ADMIN: "Company administrator",
  PROCUREMENT: "Procurement",
  FINANCE: "Finance",
  IT: "IT",
  VIEWER: "Viewer (read-only)",
};

export const COMPANY_ROLE_HINTS: Record<CompanyRole, string> = {
  ADMIN: "Everything, including company details and who else has access.",
  PROCUREMENT: "Requirements, enquiries, quotations, orders and support.",
  FINANCE: "Orders, invoices and payments.",
  IT: "Licences, devices, support and raising requirements.",
  VIEWER: "Can see everything the company has, and change nothing.",
};
