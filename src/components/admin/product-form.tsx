"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Fieldset, Input, Select, Textarea } from "@/components/ui/form";
import { saveProduct } from "@/app/admin/actions";

type Option = { id: string; name: string };

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  status: string;
  availability: string;
  purchaseMode: string;
  featured: boolean;
  popularity: number;
  features: string[];
  compatibility: string[];
  keywords: string[];
  licensingNotes: string | null;
  deliveryNotes: string | null;
  supportNotes: string | null;
};

export function ProductForm({
  product,
  brands,
  categories,
}: {
  product?: ProductFormValues;
  brands: Option[];
  categories: Array<Option & { parentName?: string | null }>;
}) {
  return (
    <AdminForm
      action={saveProduct}
      submitLabel={product ? "Save product" : "Create product"}
      pendingLabel="Saving…"
      hidden={product?.id ? { productId: product.id } : undefined}
    >
      {({ fieldErrors }) => (
        <>
          <Fieldset legend="Identity">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" required error={fieldErrors.name?.[0]}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} name="name" defaultValue={product?.name} required aria-describedby={describedBy} invalid={invalid} />
                )}
              </Field>
              <Field
                label="URL slug"
                hint="Leave blank to derive it from the name. Changing it changes the public URL."
                error={fieldErrors.slug?.[0]}
              >
                {({ id, describedBy, invalid }) => (
                  <Input id={id} name="slug" defaultValue={product?.slug} placeholder="microsoft-365-business-standard" aria-describedby={describedBy} invalid={invalid} />
                )}
              </Field>
              <Field label="Brand" required error={fieldErrors.brandId?.[0]}>
                {({ id, describedBy, invalid }) => (
                  <Select id={id} name="brandId" defaultValue={product?.brandId ?? ""} required aria-describedby={describedBy} invalid={invalid}>
                    <option value="" disabled>
                      Choose a brand
                    </option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Category" required error={fieldErrors.categoryId?.[0]}>
                {({ id, describedBy, invalid }) => (
                  <Select id={id} name="categoryId" defaultValue={product?.categoryId ?? ""} required aria-describedby={describedBy} invalid={invalid}>
                    <option value="" disabled>
                      Choose a category
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.parentName ? `${category.parentName} → ${category.name}` : category.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend="Description">
            <Field
              label="Short description"
              required
              hint="One sentence. Appears on catalogue cards and in search results."
              error={fieldErrors.shortDescription?.[0]}
            >
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="shortDescription" rows={2} maxLength={300} defaultValue={product?.shortDescription} required aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Field
              label="Full description"
              required
              hint="Separate paragraphs with a blank line."
              error={fieldErrors.description?.[0]}
            >
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="description" rows={10} defaultValue={product?.description} required aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
          </Fieldset>

          <Fieldset legend="Structured detail" description="One item per line.">
            <Field label="Features" error={fieldErrors.features?.[0]}>
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="features" rows={6} defaultValue={product?.features.join("\n")} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Field label="Compatibility" error={fieldErrors.compatibility?.[0]}>
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="compatibility" rows={5} defaultValue={product?.compatibility.join("\n")} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Field
              label="Search keywords"
              hint="Comma separated. Used by catalogue and site search."
              error={fieldErrors.keywords?.[0]}
            >
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="keywords" defaultValue={product?.keywords.join(", ")} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
          </Fieldset>

          <Fieldset legend="Commercial notes">
            <Field label="Licensing notes" error={fieldErrors.licensingNotes?.[0]}>
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="licensingNotes" rows={5} defaultValue={product?.licensingNotes ?? ""} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Delivery notes" error={fieldErrors.deliveryNotes?.[0]}>
                {({ id, describedBy, invalid }) => (
                  <Textarea id={id} name="deliveryNotes" rows={4} defaultValue={product?.deliveryNotes ?? ""} aria-describedby={describedBy} invalid={invalid} />
                )}
              </Field>
              <Field label="Support notes" error={fieldErrors.supportNotes?.[0]}>
                {({ id, describedBy, invalid }) => (
                  <Textarea id={id} name="supportNotes" rows={4} defaultValue={product?.supportNotes ?? ""} aria-describedby={describedBy} invalid={invalid} />
                )}
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend="Publication">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Status" required error={fieldErrors.status?.[0]}>
                {({ id, describedBy, invalid }) => (
                  <Select id={id} name="status" defaultValue={product?.status ?? "DRAFT"} aria-describedby={describedBy} invalid={invalid}>
                    <option value="DRAFT">Draft — not publicly visible</option>
                    <option value="ACTIVE">Active — listed in the catalogue</option>
                    <option value="ARCHIVED">Archived — hidden</option>
                  </Select>
                )}
              </Field>
              <Field label="Availability" required error={fieldErrors.availability?.[0]}>
                {({ id, describedBy, invalid }) => (
                  <Select id={id} name="availability" defaultValue={product?.availability ?? "ON_REQUEST"} aria-describedby={describedBy} invalid={invalid}>
                    <option value="IN_STOCK">Available now</option>
                    <option value="MADE_TO_ORDER">Made to order</option>
                    <option value="ON_REQUEST">On request</option>
                    <option value="DISCONTINUED">Discontinued</option>
                  </Select>
                )}
              </Field>
              <Field label="Purchase mode" required error={fieldErrors.purchaseMode?.[0]}>
                {({ id, describedBy, invalid }) => (
                  <Select id={id} name="purchaseMode" defaultValue={product?.purchaseMode ?? "BOTH"} aria-describedby={describedBy} invalid={invalid}>
                    <option value="BOTH">Both — buy or enquire</option>
                    <option value="DIRECT">Direct purchase only</option>
                    <option value="ENQUIRY">Enquiry only — no price shown</option>
                  </Select>
                )}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Popularity"
                hint="0–1000. Higher values sort earlier in popular listings."
                error={fieldErrors.popularity?.[0]}
              >
                {({ id, describedBy, invalid }) => (
                  <Input id={id} name="popularity" type="number" min={0} max={1000} defaultValue={product?.popularity ?? 0} aria-describedby={describedBy} invalid={invalid} />
                )}
              </Field>
              <div className="flex items-end pb-2.5">
                <Checkbox name="featured" defaultChecked={product?.featured} label="Feature on the homepage and brand pages" />
              </div>
            </div>
          </Fieldset>
        </>
      )}
    </AdminForm>
  );
}
