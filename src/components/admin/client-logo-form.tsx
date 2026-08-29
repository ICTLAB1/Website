import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input } from "@/components/ui/form";
import { removeClientLogo, uploadClientLogo } from "@/app/admin/client-logo-actions";
import { safeClientLogo } from "@/lib/client-logo";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";

/**
 * Putting a customer's logo on a customer record.
 *
 * A panel of its own for the same reason the brand one is: the descriptor-driven
 * form posts plain values and this needs a file.
 *
 * What is different is the sentence under the heading. A brand logo panel can
 * say "take it from their brand-assets page" and be done; this one has to say
 * that uploading is not publishing, because the person here is one checkbox
 * away from putting somebody else's trademark on the internet and the form
 * should say so before they get there rather than after.
 */
export function ClientLogoForm({
  clientId,
  clientName,
  logoUrl,
  permissionConfirmedAt,
  published,
}: {
  clientId: string;
  clientName: string;
  logoUrl: string | null;
  permissionConfirmedAt: Date | null;
  published: boolean;
}) {
  const current = safeClientLogo(logoUrl);

  /*
   * The three conditions, shown as the state of each rather than as one
   * verdict. "Not shown" answers the wrong question: the person looking at
   * this screen wants to know which of the three is missing.
   */
  const conditions = [
    { label: "Artwork on file", met: current !== null },
    { label: "Permission confirmed", met: permissionConfirmedAt !== null },
    { label: "Published", met: published },
  ];
  const live = conditions.every((condition) => condition.met);

  return (
    <section className="rounded-[--radius-lg] border border-line bg-white p-5">
      <h2 className="text-[15px] font-semibold text-graphite-900">Logo</h2>
      <p className="mt-2 text-meta leading-relaxed text-ink-600">
        Uploading a file does not put it on the site. {clientName}&rsquo;s mark appears only once
        all three conditions below are met, so a half-finished record cannot publish a customer&rsquo;s
        trademark by accident. Use the artwork {clientName} supplies; do not recolour or crop it.
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {conditions.map((condition) => (
          <li
            key={condition.label}
            className={`inline-flex items-center gap-2 rounded-[--radius-md] border px-3 py-1.5 text-label ${
              condition.met
                ? "border-line bg-surface-muted text-graphite-900"
                : "border-dashed border-line-strong text-ink-500"
            }`}
          >
            <span aria-hidden="true">{condition.met ? "✓" : "—"}</span>
            {condition.label}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-label text-ink-500">
        {live
          ? `${clientName} is on the public logo strip.`
          : `${clientName} is not shown on the public site.`}
      </p>

      {current ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-[--radius-md] border border-line bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} alt={`${clientName} logo`} className="h-10 w-auto max-w-[8rem] object-contain" />
            <span className="text-label text-ink-500">on white</span>
          </div>
          <div className="flex items-center gap-3 rounded-[--radius-md] border border-graphite-700 bg-graphite-900 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} alt="" className="h-10 w-auto max-w-[8rem] object-contain" />
            <span className="text-label text-graphite-400">on charcoal</span>
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <AdminForm
          action={uploadClientLogo}
          submitLabel={current ? "Replace logo" : "Upload logo"}
          pendingLabel="Uploading…"
          hidden={{ clientId }}
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
            action={removeClientLogo}
            submitLabel="Remove logo"
            pendingLabel="Removing…"
            variant="outline"
            hidden={{ clientId }}
            compact
          />
        </div>
      ) : null}
    </section>
  );
}
