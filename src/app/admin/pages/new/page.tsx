import Link from "next/link";
import type { Metadata } from "next";

import { ResourceForm } from "@/components/admin/resource-form";
import { requireAdmin } from "@/lib/auth/guards";
import { PAGE_FIELDS } from "@/lib/admin/page-fields";
import { relationOptions } from "@/lib/admin/repository";
import { savePage } from "@/app/admin/page-actions";
import type { SelectOption } from "@/lib/admin/fields";

export const metadata: Metadata = { title: "New page" };

export default async function NewPage() {
  await requireAdmin();

  const optionsByField: Record<string, SelectOption[]> = {
    brandId: await relationOptions("brand"),
  };
  for (const field of PAGE_FIELDS) {
    if (field.kind === "select") optionsByField[field.name] = field.options;
  }

  const values: Record<string, string | boolean> = {
    title: "",
    slug: "",
    description: "",
    keywords: "",
    brandId: "",
    faqTopic: "",
    // New pages start as drafts, so nothing reaches the public site by accident.
    status: "DRAFT",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/pages" className="text-[13px] text-accent-700 hover:underline">
          &larr; Pages
        </Link>
        <h1 className="mt-2 text-2xl">New page</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-600">
          Create the page first; content blocks are added on the next screen.
        </p>
      </div>

      <div className="max-w-3xl">
        <ResourceForm
          resourceKey="pages"
          singularLabel="Page"
          fields={PAGE_FIELDS}
          values={values}
          optionsByField={optionsByField}
          action={savePage}
        />
      </div>
    </div>
  );
}
