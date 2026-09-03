import "server-only";
import { prisma } from "@/lib/db";
import type { RelationSource, FieldDescriptor } from "@/lib/admin/fields";
import { fromLines } from "@/lib/admin/fields";
import type { ResourceConfig } from "@/lib/admin/resources";

/**
 * Database access for the generic admin resources.
 *
 * The Prisma client is indexed by the model name from the resource config,
 * never by anything from a request. `resolveResource` has already matched the
 * incoming key against the registry, so `config.model` is one of a fixed set of
 * literals by the time it reaches here.
 */

type Delegate = {
  findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
  findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  count: (args?: unknown) => Promise<number>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
};

export function delegateFor(config: ResourceConfig): Delegate {
  return prisma[config.model] as unknown as Delegate;
}

/** Relations included on list rows so a column can show a related name. */
function includeFor(config: ResourceConfig): Record<string, unknown> | undefined {
  switch (config.model) {
    case "brand":
      return { _count: { select: { products: { where: { deletedAt: null } } } } };
    case "category":
      return {
        parent: { select: { name: true } },
        _count: { select: { products: { where: { deletedAt: null } } } },
      };
    case "faq":
      return {
        brand: { select: { name: true } },
        service: { select: { name: true } },
        product: { select: { name: true } },
      };
    default:
      return undefined;
  }
}

export const ADMIN_PAGE_SIZE = 25;

export async function listRecords(
  config: ResourceConfig,
  options: { q?: string; page?: number; includeArchived?: boolean },
) {
  const delegate = delegateFor(config);
  const page = Math.max(1, options.page ?? 1);
  const term = options.q?.trim();

  const where: Record<string, unknown> = {};
  if (config.softDelete && !options.includeArchived) where.deletedAt = null;

  if (term) {
    // Parameterised by Prisma; the term is never interpolated into SQL.
    where.OR = config.searchFields.map((field) => ({
      [field]: { contains: term, mode: "insensitive" },
    }));
  }

  const [items, total] = await Promise.all([
    delegate.findMany({
      where,
      orderBy: config.orderBy,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: includeFor(config),
    }),
    delegate.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function getRecord(config: ResourceConfig, id: string) {
  return delegateFor(config).findUnique({ where: { id } });
}

/**
 * Options for a `relation` field.
 *
 * `excludeId` keeps a category out of its own parent list — selecting itself
 * would create a cycle the tree renderer cannot terminate.
 */
export async function relationOptions(
  source: RelationSource,
  excludeId?: string,
): Promise<Array<{ value: string; label: string }>> {
  const notSelf = excludeId ? { id: { not: excludeId } } : {};

  switch (source) {
    case "brand": {
      const rows = await prisma.brand.findMany({
        where: { deletedAt: null, ...notSelf },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return rows.map((row) => ({ value: row.id, label: row.name }));
    }
    case "category": {
      const rows = await prisma.category.findMany({
        where: { deletedAt: null, ...notSelf },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, parent: { select: { name: true } } },
      });
      return rows.map((row) => ({
        value: row.id,
        label: row.parent ? `${row.parent.name} → ${row.name}` : row.name,
      }));
    }
    case "service": {
      const rows = await prisma.service.findMany({
        where: { deletedAt: null, ...notSelf },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return rows.map((row) => ({ value: row.id, label: row.name }));
    }
    case "product": {
      const rows = await prisma.product.findMany({
        where: { deletedAt: null, ...notSelf },
        orderBy: { name: "asc" },
        take: 500,
        select: { id: true, name: true },
      });
      return rows.map((row) => ({ value: row.id, label: row.name }));
    }
    case "user": {
      const rows = await prisma.user.findMany({
        where: { deletedAt: null, role: { in: ["ADMIN", "SALES"] }, ...notSelf },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return rows.map((row) => ({ value: row.id, label: row.name }));
    }
  }
}

/**
 * Verifies that every relation id in a payload actually exists.
 *
 * Without this, a forged id in the form body would be written straight through
 * and only fail later at the foreign key — or, for a nullable relation, succeed
 * and leave a row pointing at nothing.
 */
export async function invalidRelations(
  fields: FieldDescriptor[],
  data: Record<string, unknown>,
): Promise<Record<string, string[]>> {
  const errors: Record<string, string[]> = {};

  for (const field of fields) {
    if (field.kind !== "relation") continue;
    const value = data[field.name];
    if (typeof value !== "string" || value === "") continue;

    const options = await relationOptions(field.resource);
    if (!options.some((option) => option.value === value)) {
      errors[field.name] = [`Choose a valid ${field.label.toLowerCase()}.`];
    }
  }

  return errors;
}

/** Turns a database row back into the string values a form expects. */
export function toFormValues(
  fields: FieldDescriptor[],
  row: Record<string, unknown> | null,
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  if (!row) return values;

  for (const field of fields) {
    const value = row[field.name];

    switch (field.kind) {
      case "checkbox":
        values[field.name] = Boolean(value);
        break;
      case "lines":
        values[field.name] = fromLines(value as string[] | null);
        break;
      case "date":
        values[field.name] =
          value instanceof Date ? value.toISOString().slice(0, 10) : "";
        break;
      case "number":
        values[field.name] = value === null || value === undefined ? "" : String(value);
        break;
      case "json":
        values[field.name] = value === null || value === undefined ? "" : JSON.stringify(value, null, 2);
        break;
      default:
        values[field.name] = value === null || value === undefined ? "" : String(value);
    }
  }

  return values;
}

/** Reads a possibly-nested value for a list column, e.g. "parent.name". */
export function readPath(row: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, row);
}
