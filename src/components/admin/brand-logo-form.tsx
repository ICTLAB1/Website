import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input } from "@/components/ui/form";
import { removeBrandLogo, uploadBrandLogo } from "@/app/admin/brand-logo-actions";
import { safeBrandLogo } from "@/lib/brand-logo";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";

/**
 * Putting a publisher's logo on a brand.
 *
 * A panel of its own rather than a field in the descriptor-driven form: that
 * form posts plain values and this needs a file, and giving the generic
 * framework a file field would complicate every resource for the benefit of one.
 *
 * Shows what is currently set, on both a light and a dark tile — a white
 * wordmark is invisible on the brand cards and a dark one disappears in the
 * footer, and the only reliable way to catch that is to look at it.
 */
export function BrandLogoForm({
  brandId,
  brandName,
  logoUrl,
}: {
  brandId: string;
  brandName: string;
  logoUrl: string | null;
}) {
  const current = safeBrandLogo(logoUrl);

  return (
    <section className="rounded-[--radius-lg] border border-line bg-white p-5">
      <h2 className="text-[15px] font-semibold text-graphite-900">Logo</h2>
      <p className="mt-2 text-meta leading-relaxed text-ink-600">
        Shown on the brand cards and in the header strip. Without one, {brandName} keeps the
        lettered tile. Take the file from {brandName}&rsquo;s own partner or brand-assets page —
        that is where the current artwork and the rules for using it live.
      </p>

      {current ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-[--radius-md] border border-line bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} alt={`${brandName} logo`} className="h-10 w-10 object-contain" />
            <span className="text-label text-ink-500">on white</span>
          </div>
          <div className="flex items-center gap-3 rounded-[--radius-md] border border-graphite-700 bg-graphite-900 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} alt="" className="h-10 w-10 object-contain" />
            <span className="text-label text-graphite-400">on charcoal</span>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-[--radius-md] border border-dashed border-line-strong bg-surface-muted px-4 py-3 text-meta text-ink-500">
          No logo set. {brandName} shows a lettered tile.
        </p>
      )}

      <div className="mt-5">
        <AdminForm
          action={uploadBrandLogo}
          submitLabel={current ? "Replace logo" : "Upload logo"}
          pendingLabel="Uploading…"
          hidden={{ brandId }}
          compact
        >
          <Field
            name="logo"
            label="Logo file"
            hint={`SVG, PNG, WEBP, JPEG or AVIF, up to ${Math.floor(MAX_UPLOAD_BYTES / 1024)} KB. SVG is best — it stays sharp at every size.`}
            required
          >
            <Input name="logo" type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg,image/avif" />
          </Field>
        </AdminForm>
      </div>

      {current ? (
        <div className="mt-4 border-t border-line pt-4">
          <AdminForm
            action={removeBrandLogo}
            submitLabel="Remove logo"
            pendingLabel="Removing…"
            variant="outline"
            hidden={{ brandId }}
            compact
          />
        </div>
      ) : null}
    </section>
  );
}
