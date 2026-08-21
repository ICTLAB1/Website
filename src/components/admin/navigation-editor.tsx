"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Input } from "@/components/ui/form";
import {
  addNavigationItem,
  deleteNavigationItem,
  moveNavigationItem,
  saveNavigationItem,
} from "@/app/admin/navigation-actions";

/**
 * The navigation editor.
 *
 * Bespoke for the same reason the block editor is: ordering and nesting are
 * not something a flat field list can express.
 *
 * Every link is its own form, so a validation error on one never discards
 * edits to another — matching the block editor and the product variant screens.
 */

export type NavRow = {
  id: string;
  label: string;
  href: string | null;
  description: string | null;
  visible: boolean;
  children: NavRow[];
};

const HREF_HINT = "A path such as /products, or an https:, mailto: or tel: URL. Leave blank for a heading that is not itself a link.";

function ItemForm({ item, dense }: { item: NavRow; dense?: boolean }) {
  return (
    <AdminForm
      action={saveNavigationItem}
      submitLabel="Save"
      pendingLabel="Saving…"
      variant="outline"
      hidden={{ itemId: item.id }}
      compact
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label" name="label" required>
          <Input name="label" defaultValue={item.label} maxLength={120} required />
        </Field>
        <Field label="Link" name="href" hint={dense ? undefined : HREF_HINT}>
          <Input name="href" defaultValue={item.href ?? ""} maxLength={500} />
        </Field>
        <div className="sm:col-span-2">
          <Field
            label="Description"
            name="description"
            hint="Shown under the label in the header's mega menu."
          >
            <Input name="description" defaultValue={item.description ?? ""} maxLength={300} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Checkbox name="visible" label="Visible on the site" defaultChecked={item.visible} />
        </div>
      </div>
    </AdminForm>
  );
}

function RowControls({ item }: { item: NavRow }) {
  return (
    <div className="flex items-center gap-2">
      <AdminForm
        action={moveNavigationItem}
        submitLabel="↑"
        pendingLabel="…"
        variant="outline"
        hidden={{ itemId: item.id, direction: "up" }}
        compact
      />
      <AdminForm
        action={moveNavigationItem}
        submitLabel="↓"
        pendingLabel="…"
        variant="outline"
        hidden={{ itemId: item.id, direction: "down" }}
        compact
      />
      <AdminForm
        action={deleteNavigationItem}
        submitLabel="Remove"
        pendingLabel="Removing…"
        variant="danger"
        hidden={{ itemId: item.id }}
        compact
      />
    </div>
  );
}

function AddForm({
  menu,
  parentId,
  label,
}: {
  menu: string;
  parentId?: string;
  label: string;
}) {
  return (
    <AdminForm
      action={addNavigationItem}
      submitLabel={label}
      pendingLabel="Adding…"
      variant="outline"
      hidden={{ menu, ...(parentId ? { parentId } : {}) }}
      compact
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label" name="label" required>
          <Input name="label" maxLength={120} required />
        </Field>
        <Field label="Link" name="href" hint={HREF_HINT}>
          <Input name="href" maxLength={500} placeholder="/products" />
        </Field>
      </div>
      <input type="hidden" name="visible" value="on" />
    </AdminForm>
  );
}

export function NavigationEditor({
  menu,
  title,
  description,
  items,
}: {
  menu: string;
  title: string;
  description: string;
  items: NavRow[];
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-[1.05rem]">{title}</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-600">{description}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-[--radius-lg] border border-dashed border-line-strong px-5 py-8 text-center text-[14px] text-ink-500">
          This menu is empty.
        </p>
      ) : (
        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-[--radius-lg] border border-line bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-ink-400">{index + 1}</span>
                  <span className="text-[14px] font-semibold text-graphite-900">{item.label}</span>
                  <span className="font-mono text-[12px] text-ink-500">{item.href ?? "—"}</span>
                  {!item.visible ? (
                    <span className="rounded-[--radius-sm] bg-surface-sunken px-2 py-0.5 text-[11px] uppercase tracking-wide text-ink-500">
                      Hidden
                    </span>
                  ) : null}
                </div>
                <RowControls item={item} />
              </div>

              <div className="space-y-5 p-5">
                <ItemForm item={item} />

                <details className="border-t border-line pt-4">
                  <summary className="cursor-pointer text-[13px] font-medium text-ink-600">
                    {item.children.length === 0
                      ? "Add links beneath this item"
                      : `${item.children.length} link${item.children.length === 1 ? "" : "s"} beneath this item`}
                  </summary>

                  <div className="mt-4 space-y-4 border-l-2 border-line pl-5">
                    {item.children.map((child) => (
                      <div
                        key={child.id}
                        className="rounded-[--radius-md] border border-line bg-surface-muted p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[13px] font-semibold text-graphite-900">
                              {child.label}
                            </span>
                            <span className="font-mono text-[12px] text-ink-500">
                              {child.href ?? "—"}
                            </span>
                            {child.children.length > 0 ? (
                              <span className="text-[11px] uppercase tracking-wide text-ink-500">
                                {child.children.length} below
                              </span>
                            ) : null}
                          </div>
                          <RowControls item={child} />
                        </div>

                        <ItemForm item={child} dense />

                        {child.children.length > 0 ? (
                          <ul className="mt-4 space-y-3 border-l-2 border-line pl-4">
                            {child.children.map((leaf) => (
                              <li key={leaf.id} className="rounded-[--radius-md] bg-white p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                  <span className="text-[13px] text-graphite-900">{leaf.label}</span>
                                  <RowControls item={leaf} />
                                </div>
                                <ItemForm item={leaf} dense />
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="mt-4 border-t border-line pt-4">
                          <AddForm menu={menu} parentId={child.id} label="Add a link here" />
                        </div>
                      </div>
                    ))}

                    <div className="rounded-[--radius-md] border border-dashed border-line-strong p-4">
                      <AddForm menu={menu} parentId={item.id} label="Add beneath this item" />
                    </div>
                  </div>
                </details>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="rounded-[--radius-lg] border border-dashed border-line-strong p-5">
        <p className="mb-3 text-[13px] font-medium text-graphite-900">Add a top-level item</p>
        <AddForm menu={menu} label="Add to this menu" />
      </div>
    </section>
  );
}
