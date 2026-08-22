"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Fieldset, Input, Select, Textarea } from "@/components/ui/form";
import { saveProduct } from "@/app/admin/actions";
import { FORM_FACTORS, formFactorLabel } from "@/lib/catalogue/hardware";

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

  // Hardware. Null on software, which is most of the catalogue.
  formFactor?: string | null;
  series?: string | null;
  partNumber?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  sourceCheckedAt?: Date | null;
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
      <Fieldset legend="Identity">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Product name" required>
<Input name="name" defaultValue={product?.name} required />
</Field>
              <Field name="slug"
                label="URL slug"
                hint="Leave blank to derive it from the name. Changing it changes the public URL."
              >
<Input name="slug" defaultValue={product?.slug} placeholder="microsoft-365-business-standard" />
</Field>
              <Field name="brandId" label="Brand" required>
<Select name="brandId" defaultValue={product?.brandId ?? ""} required>
                    <option value="" disabled>
                      Choose a brand
                    </option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </Select>
</Field>
              <Field name="categoryId" label="Category" required>
<Select name="categoryId" defaultValue={product?.categoryId ?? ""} required>
                    <option value="" disabled>
                      Choose a category
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.parentName ? `${category.parentName} → ${category.name}` : category.name}
                      </option>
                    ))}
                  </Select>
</Field>
            </div>
          </Fieldset>

          <Fieldset legend="Description">
            <Field name="shortDescription"
              label="Short description"
              required
              hint="One sentence. Appears on catalogue cards and in search results."
            >
<Textarea name="shortDescription" rows={2} maxLength={300} defaultValue={product?.shortDescription} required />
</Field>
            <Field name="description"
              label="Full description"
              required
              hint="Separate paragraphs with a blank line."
            >
<Textarea name="description" rows={10} defaultValue={product?.description} required />
</Field>
          </Fieldset>

          <Fieldset legend="Structured detail" description="One item per line.">
            <Field name="features" label="Features">
<Textarea name="features" rows={6} defaultValue={product?.features.join("\n")} />
</Field>
            <Field name="compatibility" label="Compatibility">
<Textarea name="compatibility" rows={5} defaultValue={product?.compatibility.join("\n")} />
</Field>
            <Field name="keywords"
              label="Search keywords"
              hint="Comma separated. Used by catalogue and site search."
            >
<Input name="keywords" defaultValue={product?.keywords.join(", ")} />
</Field>
          </Fieldset>

          {/*
            Hardware, and blank on everything else.
            Setting a form factor is what makes a product hardware — it moves
            the record into `/hardware`, puts a photograph on its card and
            replaces the licence rows with series and part number. Left empty,
            none of that happens and the product is a licence as before.
          */}
          <Fieldset
            legend="Hardware"
            description="Only for physical products. Leave the form factor blank for software licensing."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="formFactor"
                label="Form factor"
                hint="What the machine is. Setting this lists the product in the hardware catalogue."
              >
                <Select name="formFactor" defaultValue={product?.formFactor ?? ""}>
                  <option value="">Not hardware</option>
                  {FORM_FACTORS.map((value) => (
                    <option key={value} value={value}>
                      {formFactorLabel(value)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                name="series"
                label="Series"
                hint="The manufacturer's own family: EliteBook, ThinkPad T, TravelMate P."
              >
                <Input name="series" defaultValue={product?.series ?? ""} maxLength={60} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="partNumber"
                label="Part number"
                hint="The manufacturer's own. Searchable, and shown on the quote panel."
              >
                <Input name="partNumber" defaultValue={product?.partNumber ?? ""} maxLength={60} />
              </Field>
              <Field
                name="imageUrl"
                label="Product photograph"
                hint="A file in public/products/, or one uploaded from the panel. Blank shows a labelled empty frame — never a stand-in picture."
              >
                <Input
                  name="imageUrl"
                  defaultValue={product?.imageUrl ?? ""}
                  placeholder="/products/hp-elitebook-840.jpg"
                  maxLength={200}
                />
              </Field>
            </div>
            <Field
              name="sourceUrl"
              label="Manufacturer's page"
              hint="Where these specifications came from. Internal — not shown on the site, and the only way to re-check a figure later."
            >
              <Input
                name="sourceUrl"
                type="url"
                defaultValue={product?.sourceUrl ?? ""}
                maxLength={500}
              />
            </Field>
            {product?.sourceCheckedAt ? (
              <p className="text-label text-ink-500">
                Last reconciled against that page on{" "}
                {product.sourceCheckedAt.toISOString().slice(0, 10)}.
              </p>
            ) : null}
          </Fieldset>

          <Fieldset legend="Commercial notes">
            <Field name="licensingNotes" label="Licensing notes">
<Textarea name="licensingNotes" rows={5} defaultValue={product?.licensingNotes ?? ""} />
</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="deliveryNotes" label="Delivery notes">
<Textarea name="deliveryNotes" rows={4} defaultValue={product?.deliveryNotes ?? ""} />
</Field>
              <Field name="supportNotes" label="Support notes">
<Textarea name="supportNotes" rows={4} defaultValue={product?.supportNotes ?? ""} />
</Field>
            </div>
          </Fieldset>

          <Fieldset legend="Publication">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field name="status" label="Status" required>
<Select name="status" defaultValue={product?.status ?? "DRAFT"}>
                    <option value="DRAFT">Draft — not publicly visible</option>
                    <option value="ACTIVE">Active — listed in the catalogue</option>
                    <option value="ARCHIVED">Archived — hidden</option>
                  </Select>
</Field>
              <Field name="availability" label="Availability" required>
<Select name="availability" defaultValue={product?.availability ?? "ON_REQUEST"}>
                    <option value="IN_STOCK">Available now</option>
                    <option value="MADE_TO_ORDER">Made to order</option>
                    <option value="ON_REQUEST">On request</option>
                    <option value="DISCONTINUED">Discontinued</option>
                  </Select>
</Field>
              <Field name="purchaseMode" label="Purchase mode" required>
<Select name="purchaseMode" defaultValue={product?.purchaseMode ?? "BOTH"}>
                    <option value="BOTH">Both — buy or enquire</option>
                    <option value="DIRECT">Direct purchase only</option>
                    <option value="ENQUIRY">Enquiry only — no price shown</option>
                  </Select>
</Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="popularity"
                label="Popularity"
                hint="0–1000. Higher values sort earlier in popular listings."
              >
<Input name="popularity" type="number" min={0} max={1000} defaultValue={product?.popularity ?? 0} />
</Field>
              <div className="flex items-end pb-2.5">
                <Checkbox name="featured" defaultChecked={product?.featured} label="Feature on the homepage and brand pages" />
              </div>
            </div>
          </Fieldset>
    </AdminForm>
  );
}
