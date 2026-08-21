import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResourceForm } from "@/components/admin/resource-form";
import { AdminForm } from "@/components/admin/admin-form";
import { deleteResource } from "@/app/admin/resource-actions";
import { requireAdmin, requireStaff } from "@/lib/auth/guards";
import { resolveResource } from "@/lib/admin/resources";
import { getRecord, relationOptions, toFormValues } from "@/lib/admin/repository";
import type { SelectOption } from "@/lib/admin/fields";
import { formatDateTime } from "@/lib/utils";

type PageProps = { params: Promise<{ resource: string; id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { resource } = await params;
  const config = resolveResource(resource);
  return { title: config ? `Edit ${config.label.singular.toLowerCase()}` : "Admin" };
}

export default async function EditResourcePage({ params }: PageProps) {
  const { resource, id } = await params;
  const config = resolveResource(resource);
  if (!config) notFound();

  if (config.guard === "admin") await requireAdmin();
  else await requireStaff();

  const record = await getRecord(config, id);
  if (!record) notFound();

  const optionsByField: Record<string, SelectOption[]> = {};
  for (const field of config.fields) {
    if (field.kind === "relation") {
      // Exclude the record itself so a category cannot become its own parent.
      optionsByField[field.name] = await relationOptions(
        field.resource,
        field.resource === "category" ? id : undefined,
      );
    } else if (field.kind === "select") {
      optionsByField[field.name] = field.options;
    }
  }

  const values = toFormValues(config.fields, record);
  const archived = record.deletedAt !== null && record.deletedAt !== undefined;
  const slug = config.slugField ? String(record[config.slugField] ?? "") : null;

  const publicHref =
    config.key === "brands" && slug
      ? `/brands/${slug}`
      : config.key === "services" && slug
        ? `/services/${slug}`
        : config.key === "posts" && slug
          ? `/blog/${slug}`
          : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/admin/${config.key}`} className="text-[13px] text-accent-700 hover:underline">
            &larr; {config.label.plural}
          </Link>
          <h1 className="mt-2 text-2xl">
            {String(record.name ?? record.title ?? record.question ?? config.label.singular)}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-500">
            Last updated {formatDateTime(record.updatedAt as Date)}
            {archived ? " · archived" : ""}
            {publicHref ? (
              <>
                {" · "}
                <Link href={publicHref} className="text-accent-700 hover:underline">
                  View public page
                </Link>
              </>
            ) : null}
          </p>
        </div>

        <div className="w-full max-w-xs">
          <AdminForm
            action={deleteResource}
            submitLabel={
              config.softDelete
                ? archived
                  ? `Restore ${config.label.singular.toLowerCase()}`
                  : `Archive ${config.label.singular.toLowerCase()}`
                : `Delete ${config.label.singular.toLowerCase()}`
            }
            pendingLabel="Working…"
            variant={config.softDelete && archived ? "outline" : "danger"}
            hidden={{ __resource: config.key, __id: id }}
            compact
          />
        </div>
      </header>

      <div className="max-w-3xl">
        <ResourceForm
          resourceKey={config.key}
          singularLabel={config.label.singular}
          fields={config.fields}
          recordId={id}
          values={values}
          optionsByField={optionsByField}
        />
      </div>
    </div>
  );
}
