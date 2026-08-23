"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, Fieldset, FormError, FormStateProvider, Input, Textarea } from "@/components/ui/form";
import { uploadRequirement } from "@/app/requirement/upload/actions";
import { ACCEPTED_DOCUMENTS, DOCUMENT_ACCEPT_ATTRIBUTE } from "@/lib/document-bytes";
import type { RequirementState } from "@/lib/rfq";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Uploading…" : "Upload my requirement"}
    </Button>
  );
}

/**
 * Uploading a bill of quantities.
 *
 * The promise is deliberately modest and stated on the form: the file is kept
 * and read by a person, and anything read out of it automatically is confirmed
 * before it is quoted. Promising more would be promising that a spreadsheet
 * nobody has seen was understood correctly.
 */
export function BoqUploadForm({
  defaults,
}: {
  defaults: {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    companyName?: string;
    gstin?: string;
  };
}) {
  const [state, formAction] = useActionState<RequirementState, FormData>(uploadRequirement, {
    status: "idle",
  });

  if (state.status === "success" && state.reference) {
    return (
      <div className="rounded-[--radius-lg] border border-line bg-white p-8">
        <h2 className="text-[1.25rem]">Requirement received</h2>
        <p className="mt-3 text-body leading-relaxed text-ink-600">{state.message}</p>
        <p className="mt-4 text-meta leading-relaxed text-ink-600">
          Nothing is ordered and nothing is charged at this stage. We will come back to you with a
          written quotation.
        </p>
        <div className="mt-6">
          <Link
            href="/account/enquiries"
            className="inline-flex h-11 items-center rounded-[--radius-md] bg-graphite-900 px-5 text-meta font-medium text-white hover:bg-graphite-800"
          >
            Track it in your account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-10" encType="multipart/form-data">
      {state.status === "error" && state.message ? <FormError>{state.message}</FormError> : null}

      <FormStateProvider fieldErrors={state.fieldErrors ?? {}}>
        <Fieldset legend="Your requirement">
          <Field
            label="The file"
            name="document"
            required
            hint={`${ACCEPTED_DOCUMENTS}, up to 10 MB. A CSV is read into lines for you to confirm; anything else is read by a person.`}
          >
            <Input
              name="document"
              type="file"
              required
              accept={DOCUMENT_ACCEPT_ATTRIBUTE}
              className="file:mr-3 file:rounded-[--radius-sm] file:border-0 file:bg-graphite-900 file:px-3 file:py-1.5 file:text-white"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Required by" name="requiredBy" hint="A date, or “end of Q3”.">
              <Input name="requiredBy" maxLength={80} autoComplete="off" />
            </Field>
            <Field label="Delivery location" name="deliveryLocation">
              <Input name="deliveryLocation" maxLength={200} autoComplete="off" />
            </Field>
          </div>

          <Field
            label="Anything we should know about it"
            name="context"
            hint="Which sheet or section to price, a tender number, a closing date."
          >
            <Textarea name="context" rows={4} maxLength={2000} />
          </Field>
        </Fieldset>

        <Fieldset legend="Who to come back to">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" name="contactName" required>
              <Input
                name="contactName"
                required
                maxLength={120}
                defaultValue={defaults.contactName}
                autoComplete="name"
              />
            </Field>
            <Field label="Work email" name="contactEmail" required>
              <Input
                name="contactEmail"
                type="email"
                required
                defaultValue={defaults.contactEmail}
                autoComplete="email"
              />
            </Field>
            <Field label="Phone" name="contactPhone" required>
              <Input
                name="contactPhone"
                type="tel"
                required
                defaultValue={defaults.contactPhone}
                autoComplete="tel"
              />
            </Field>
            <Field label="Organisation" name="companyName" required>
              <Input
                name="companyName"
                required
                maxLength={160}
                defaultValue={defaults.companyName}
                autoComplete="organization"
              />
            </Field>
            <Field label="GSTIN" name="gstin" hint="If you have one. It goes on the quotation.">
              <Input
                name="gstin"
                maxLength={15}
                className="uppercase"
                defaultValue={defaults.gstin}
                autoComplete="off"
              />
            </Field>
          </div>
        </Fieldset>
      </FormStateProvider>

      <div className="border-t border-line pt-6">
        <SubmitButton />
        <p className="mt-3 text-label text-ink-500">
          Your file is stored privately and is visible only to your organisation and to us.
        </p>
      </div>
    </form>
  );
}
