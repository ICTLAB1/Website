import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResourceForm } from "@/components/admin/resource-form";
import { AdminForm } from "@/components/admin/admin-form";
import { BlockEditor } from "@/components/admin/block-editor";
import { deletePage, savePage } from "@/app/admin/page-actions";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PAGE_FIELDS } from "@/lib/admin/page-fields";
import { relationOptions } from "@/lib/admin/repository";
import { fromLines, type SelectOption } from "@/lib/admin/fields";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit page" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const page = await prisma.page.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      keywords: true,
      status: true,
      faqTopic: true,
      brandId: true,
      updatedAt: true,
      deletedAt: true,
      sections: {
        orderBy: { displayOrder: "asc" },
        select: { id: true, type: true, displayOrder: true, visible: true, data: true },
      },
    },
  });
  if (!page) notFound();

  const optionsByField: Record<string, SelectOption[]> = {
    brandId: await relationOptions("brand"),
  };
  for (const field of PAGE_FIELDS) {
    if (field.kind === "select") optionsByField[field.name] = field.options;
  }

  const values: Record<string, string | boolean> = {
    title: page.title,
    slug: page.slug,
    description: page.description,
    keywords: fromLines(page.keywords),
    brandId: page.brandId ?? "",
    faqTopic: page.faqTopic ?? "",
    status: page.status,
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/pages" className="text-[13px] text-accent-700 hover:underline">
            &larr; Pages
          </Link>
          <h1 className="mt-2 text-2xl">{page.title}</h1>
          <p className="mt-1.5 text-[13px] text-ink-500">
            <span className="font-mono">/{page.slug}</span> · updated{" "}
            {formatDateTime(page.updatedAt)}
            {page.deletedAt ? " · archived" : ""}
            {page.status === "PUBLISHED" && !page.deletedAt ? (
              <>
                {" · "}
                <Link href={`/${page.slug}`} className="text-accent-700 hover:underline">
                  View public page
                </Link>
              </>
            ) : null}
          </p>
        </div>

        <div className="w-full max-w-xs">
          <AdminForm
            action={deletePage}
            submitLabel={page.deletedAt ? "Restore page" : "Archive page"}
            pendingLabel="Working…"
            variant={page.deletedAt ? "outline" : "danger"}
            hidden={{ __id: page.id }}
            compact
          />
        </div>
      </header>

      <div className="max-w-3xl">
        <ResourceForm
          resourceKey="pages"
          singularLabel="Page"
          fields={PAGE_FIELDS}
          recordId={page.id}
          values={values}
          optionsByField={optionsByField}
          action={savePage}
        />
      </div>

      <div className="border-t border-line pt-8">
        <BlockEditor pageId={page.id} blocks={page.sections} />
      </div>
    </div>
  );
}
