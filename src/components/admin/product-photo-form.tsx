import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input } from "@/components/ui/form";
import { removeProductPhoto, uploadProductPhoto } from "@/app/admin/product-photo-actions";
import { safeProductImage } from "@/lib/product-image";
import { representativeImageFor } from "@/lib/representative-image";
import { MAX_PHOTO_BYTES, PHOTO_ACCEPT } from "@/lib/uploads";
import type { FormFactor } from "@prisma/client";

const MAX_MEGABYTES = (MAX_PHOTO_BYTES / (1024 * 1024)).toFixed(0);

/**
 * Putting a photograph on a product.
 *
 * A panel of its own rather than a field in the descriptor-driven product form,
 * for the same reason brand logos have one: that form posts plain values and
 * this needs a file, and teaching the generic framework about file fields would
 * complicate every resource for the benefit of two.
 *
 * ## Compact mode
 *
 * The same component serves the product edit screen and a row of the
 * missing-photographs worklist. They want different amounts of prose — the
 * worklist shows dozens at once and the explanation would be repeated dozens of
 * times — but they must not become two components, because then only one of
 * them gets the next fix.
 *
 * ## What the preview shows
 *
 * The photograph on white, at the shape the catalogue card uses. Products are
 * photographed on white and rendered on white, so a picture with a baked-in
 * light-grey background is invisible as a mistake anywhere except on the tile
 * it will actually sit on.
 *
 * When there is no photograph it says what the public page currently shows —
 * the category illustration for this form factor, or a labelled empty frame.
 * That is the question somebody is actually asking when they open this panel.
 */
export function ProductPhotoForm({
  productId,
  productName,
  imageUrl,
  formFactor,
  compact = false,
}: {
  productId: string;
  productName: string;
  imageUrl: string | null;
  formFactor?: FormFactor | null;
  compact?: boolean;
}) {
  const current = safeProductImage(imageUrl);
  const illustration = current ? null : representativeImageFor(formFactor);

  return (
    <div className={compact ? "" : "rounded-[--radius-lg] border border-line bg-white p-5"}>
      {compact ? null : (
        <>
          <h2 className="text-[15px] font-semibold text-graphite-900">Photograph</h2>
          <p className="mt-2 text-meta leading-relaxed text-ink-600">
            Shown on the product page and on every card that lists {productName}. Use a picture of
            this model: a buyer comparing two machines is looking at the photograph, and one that
            is not the product is worse than none.
          </p>
        </>
      )}

      <div className={compact ? "flex items-start gap-4" : "mt-4 flex items-start gap-4"}>
        <div className="shrink-0">
          {current ? (
            <div className="flex h-24 w-24 items-center justify-center rounded-[--radius-md] border border-line bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current}
                alt={`${productName} photograph`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : illustration ? (
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[--radius-md] border border-line bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={illustration} alt="" className="max-h-full max-w-full object-contain" />
              <span className="absolute bottom-1 right-1 rounded-[--radius-sm] bg-graphite-900/75 px-1 py-0.5 text-[9px] font-medium leading-none text-white">
                Illustration
              </span>
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-[--radius-md] border border-dashed border-line-strong bg-surface-muted px-2 text-center text-[10px] leading-tight text-ink-500">
              Photograph to follow
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {compact ? null : (
            <p className="mb-3 text-meta text-ink-500">
              {current
                ? "This product has its own photograph."
                : illustration
                  ? "No photograph. The public page shows the category illustration for this form factor, labelled as representative."
                  : "No photograph. The public page shows a labelled empty frame."}
            </p>
          )}

          <AdminForm
            action={uploadProductPhoto}
            submitLabel={current ? "Replace photograph" : "Upload photograph"}
            pendingLabel="Uploading…"
            hidden={{ productId }}
            compact
          >
            <Field
              name="photo"
              label={compact ? `Photograph for ${productName}` : "Photograph file"}
              hint={`PNG, JPEG, WEBP or AVIF, up to ${MAX_MEGABYTES} MB. Around 1200 pixels wide on a white background is right; larger only costs your visitors time.`}
              required
            >
              <Input name="photo" type="file" accept={PHOTO_ACCEPT} />
            </Field>
          </AdminForm>

          {current ? (
            <div className="mt-3">
              <AdminForm
                action={removeProductPhoto}
                submitLabel="Remove photograph"
                pendingLabel="Removing…"
                variant="outline"
                hidden={{ productId }}
                compact
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
