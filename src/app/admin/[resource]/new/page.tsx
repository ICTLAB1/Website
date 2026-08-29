import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResourceForm } from "@/components/admin/resource-form";
import { requireAdmin, requireStaff } from "@/lib/auth/guards";
import { resolveResource, RESOURCE_KEYS } from "@/lib/admin/resources";
import { relationOptions } from "@/lib/admin/repository";
import type { SelectOption } from "@/lib/admin/fields";

export const dynamicParams = false;

export function generateStaticParams() {
  return RESOURCE_KEYS.map((resource) => ({ resource }));
}

type PageProps = { params: Promise<{ resource: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { resource } = await params;
  const config = resolveResource(resource);
  return { title: config ? `New ${config.label.singular.toLowerCase()}` : "Admin" };
}

export default async function NewResourcePage({ params }: PageProps) {
  const { resource } = await params;
  const config = resolveResource(resource);
  if (!config) notFound();

  if (config.guard === "admin") await requireAdmin();
  else await requireStaff();

  const optionsByField: Record<string, SelectOption[]> = {};
  for (const field of config.fields) {
    if (field.kind === "relation") {
      optionsByField[field.name] = await relationOptions(field.resource);
    } else if (field.kind === "select") {
      optionsByField[field.name] = field.options;
    }
  }

  // Sensible starting values so a new record does not save with a blank state.
  const values: Record<string, string | boolean> = {};
  for (const field of config.fields) {
    // Declared by the field, not guessed from its name. See the note on
    // `defaultChecked` in lib/admin/fields.
    if (field.kind === "checkbox") values[field.name] = field.defaultChecked === true;
    else if (field.kind === "number" && field.name === "displayOrder") values[field.name] = "100";
    else if (field.kind === "select") values[field.name] = field.options[0]?.value ?? "";
    else values[field.name] = "";
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/${config.key}`} className="text-[13px] text-accent-700 hover:underline">
          &larr; {config.label.plural}
        </Link>
        <h1 className="mt-2 text-2xl">New {config.label.singular.toLowerCase()}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-600">{config.description}</p>
      </div>

      <div className="max-w-3xl">
        <ResourceForm
          resourceKey={config.key}
          singularLabel={config.label.singular}
          fields={config.fields}
          values={values}
          optionsByField={optionsByField}
        />
      </div>
    </div>
  );
}
