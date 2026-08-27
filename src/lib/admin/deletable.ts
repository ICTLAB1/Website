import "server-only";

import { tags } from "@/lib/cache";

/**
 * Every kind of record an administrator may remove.
 *
 * The content resources in `resources.ts` have had archive and delete since the
 * CRUD framework was built. The commercial records — customers, staff, orders,
 * quotes, enquiries, tickets — had none: they could be created and edited but
 * never removed, so a duplicate enquiry or a test order placed while setting the
 * site up stayed on the screen for good. This registry closes that.
 *
 * ## Two different removals
 *
 * **Archive** hides a record and is reversible. Used wherever the model carries
 * `deletedAt`. Nothing is destroyed, references keep resolving, and an accident
 * costs nothing.
 *
 * **Permanent delete** destroys the row and everything the schema cascades from
 * it. It is not reversible by any screen in this panel, so it asks the operator
 * to type the record's own reference back before it will run — not a confirm
 * dialog, which is dismissed reflexively, but the one thing a person cannot do
 * by accident.
 *
 * ## What it deliberately does not do
 *
 * Nothing here is refused on the grounds that a record looks important. An
 * administrator asked for the ability to delete anything and that is what this
 * is. The blockers below exist only where deletion would leave the system
 * broken rather than merely emptier — the last administrator, or your own
 * account, which would lock you out of the panel you are standing in.
 *
 * Retention is a business decision, not this file's: a paid order carries a tax
 * invoice that Indian law requires be kept, so the screen says so plainly before
 * the operator types the reference. It says it once and then does as it is told.
 */

export type DeletableKey =
  | "users"
  | "customers"
  | "orders"
  | "quotes"
  | "enquiries"
  | "tickets"
  | "products"
  | "variants"
  | "licences";

/** Prisma delegate names, kept narrow so a key cannot name an arbitrary model. */
export type DeletableModel =
  | "user"
  | "order"
  | "quote"
  | "enquiry"
  | "supportTicket"
  | "product"
  | "productVariant"
  | "licence";

export type DeletableConfig = {
  key: DeletableKey;
  model: DeletableModel;
  label: { singular: string; plural: string };
  /** Privilege required. Staff records and customers are administrator-only. */
  guard: "staff" | "admin";
  /** Whether the model carries `deletedAt` and can therefore be archived. */
  softDelete: boolean;
  /**
   * The column whose value must be typed back to confirm a permanent delete.
   * Chosen to be the thing shown on screen: a reference, an email, a SKU.
   */
  confirmField: "reference" | "email" | "sku" | "slug";
  /** Human name for that column, used in the prompt. */
  confirmLabel: string;
  /** What a permanent delete takes with it, listed for the operator. */
  cascades: string[];
  /**
   * Restricts which rows this key may act on.
   *
   * `users` and `customers` are the same table seen from two screens. Without
   * this, the customer screen's action would accept a staff member's id and the
   * staff screen's would accept a customer's — not a privilege escalation, since
   * both require an administrator, but it would let the wrong screen destroy the
   * wrong kind of account and report it in the wrong words. The scope is applied
   * to the lookup, so an out-of-scope id reads as "no longer exists".
   */
  scope?: Record<string, unknown>;
  /** Where to send the operator afterwards, and what to revalidate. */
  listPath: string;
  /** Cache tags invalidated by a removal. Empty for records with no public face. */
  tagsFor: (row: { slug?: string | null }) => string[];
};

const NO_PUBLIC_FACE: DeletableConfig["tagsFor"] = () => [];

export const DELETABLE: Record<DeletableKey, DeletableConfig> = {
  users: {
    key: "users",
    model: "user",
    label: { singular: "Staff user", plural: "Staff users" },
    guard: "admin",
    softDelete: true,
    confirmField: "email",
    confirmLabel: "email address",
    cascades: [
      "their sign-in sessions and any outstanding reset links",
      "their name on enquiries, quotes, orders and tickets, which become unassigned rather than being deleted",
    ],
    scope: { role: { in: ["ADMIN", "SALES"] } },
    listPath: "/admin/users",
    tagsFor: NO_PUBLIC_FACE,
  },

  customers: {
    key: "customers",
    model: "user",
    label: { singular: "Customer", plural: "Customers" },
    guard: "admin",
    softDelete: true,
    confirmField: "email",
    confirmLabel: "email address",
    cascades: [
      "their account, sign-in sessions and saved details",
      "their name on past orders, which keep the billing details recorded at the time",
    ],
    scope: { role: "CUSTOMER" },
    listPath: "/admin/customers",
    tagsFor: NO_PUBLIC_FACE,
  },

  orders: {
    key: "orders",
    model: "order",
    label: { singular: "Order", plural: "Orders" },
    guard: "admin",
    softDelete: false,
    confirmField: "reference",
    confirmLabel: "order reference",
    cascades: [
      "every line on the order",
      "its payment records, including any card capture",
      "the link from any licence issued against it",
    ],
    listPath: "/admin/orders",
    tagsFor: NO_PUBLIC_FACE,
  },

  quotes: {
    key: "quotes",
    model: "quote",
    label: { singular: "Quote", plural: "Quotes" },
    guard: "admin",
    softDelete: false,
    confirmField: "reference",
    confirmLabel: "quote reference",
    cascades: ["every line on the quote", "the link from any order raised against it"],
    listPath: "/admin/quotes",
    tagsFor: NO_PUBLIC_FACE,
  },

  enquiries: {
    key: "enquiries",
    model: "enquiry",
    label: { singular: "Enquiry", plural: "Enquiries" },
    guard: "admin",
    softDelete: false,
    confirmField: "reference",
    confirmLabel: "enquiry reference",
    cascades: ["the contact details submitted with it", "the link from any quote raised against it"],
    listPath: "/admin/enquiries",
    tagsFor: NO_PUBLIC_FACE,
  },

  tickets: {
    key: "tickets",
    model: "supportTicket",
    label: { singular: "Support ticket", plural: "Support tickets" },
    guard: "admin",
    // No `deletedAt` on this model, so there is nothing to archive to. Closing a
    // ticket is the reversible option; this is the other one.
    softDelete: false,
    confirmField: "reference",
    confirmLabel: "ticket reference",
    cascades: ["every message on the ticket"],
    listPath: "/admin/support",
    tagsFor: NO_PUBLIC_FACE,
  },

  products: {
    key: "products",
    model: "product",
    label: { singular: "Product", plural: "Products" },
    guard: "admin",
    softDelete: true,
    confirmField: "slug",
    confirmLabel: "URL slug",
    cascades: [
      "every variant, price record and FAQ attached to it",
      "its name on past order and quote lines, which keep the product name recorded at the time",
    ],
    listPath: "/admin/products",
    tagsFor: (row) => [tags.catalogue, ...(row.slug ? [tags.product(row.slug)] : [])],
  },

  variants: {
    key: "variants",
    model: "productVariant",
    label: { singular: "Variant", plural: "Variants" },
    guard: "admin",
    softDelete: true,
    confirmField: "sku",
    confirmLabel: "SKU",
    cascades: [
      "its price history",
      "its SKU on past order and quote lines, which keep the SKU recorded at the time",
    ],
    listPath: "/admin/products",
    tagsFor: () => [tags.catalogue],
  },

  licences: {
    key: "licences",
    model: "licence",
    label: { singular: "Licence", plural: "Licences" },
    guard: "admin",
    softDelete: false,
    confirmField: "reference",
    confirmLabel: "licence reference",
    cascades: ["the seat count and key recorded against it"],
    listPath: "/admin/orders",
    tagsFor: NO_PUBLIC_FACE,
  },
};

/**
 * Resolves an untrusted key from a form submission.
 *
 * Same contract as `resolveResource`: the key arrives in the request body and is
 * matched against this registry rather than used to index anything. The
 * privilege check that follows comes from the resolved config, so choosing a key
 * never means choosing the guard that protects it.
 */
export function resolveDeletable(key: unknown): DeletableConfig | null {
  if (typeof key !== "string") return null;
  return Object.hasOwn(DELETABLE, key) ? DELETABLE[key as DeletableKey] : null;
}

export const DELETABLE_KEYS = Object.keys(DELETABLE) as DeletableKey[];
