"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, Fieldset, FormError, FormStateProvider, Input, Textarea } from "@/components/ui/form";
import { submitRequirement } from "@/app/requirement/actions";
import type { RequirementState } from "@/lib/rfq";

/**
 * "Tell us what you need."
 *
 * Three line slots rather than an add-a-row control, and that is a deliberate
 * trade: repeatable rows need client-side array state, and this form is the one
 * a visitor reaches from an advert on a phone with a poor connection. Static
 * markup submits before hydration; a JavaScript-built list does not. Three
 * covers what people actually send — the laptops, the licensing that goes on
 * them, and one more thing — and anything longer belongs in the notes or in a
 * document.
 */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Sending…" : "Send my requirement"}
    </Button>
  );
}

function LineSlot({
  index,
  required,
}: {
  index: number;
  required: boolean;
}) {
  const name = (field: string) => `lines.${index}.${field}`;

  return (
    <Fieldset legend={index === 0 ? "What you need" : `Also needed (optional)`}>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field
          label="Description"
          name={name("description")}
          required={required}
          hint={index === 0 ? "In your own words — “laptops for the design team”, “Adobe Acrobat”." : undefined}
        >
          <Input
            name={name("description")}
            required={required}
            maxLength={200}
            autoComplete="off"
          />
        </Field>
        <Field label="Quantity" name={name("quantity")}>
          <Input
            name={name("quantity")}
            type="number"
            min={1}
            max={100000}
            defaultValue={index === 0 ? 1 : undefined}
            inputMode="numeric"
          />
        </Field>
      </div>

      <Field
        label="Preferred brands"
        name={name("brands")}
        hint="Comma separated, if you have a preference. Leave blank and we will recommend."
      >
        <Input name={name("brands")} maxLength={200} autoComplete="off" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Processor" name={name("processor")}>
          <Input name={name("processor")} maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Memory" name={name("memory")}>
          <Input name={name("memory")} maxLength={60} autoComplete="off" />
        </Field>
        <Field label="Storage" name={name("storage")}>
          <Input name={name("storage")} maxLength={60} autoComplete="off" />
        </Field>
        <Field label="Display" name={name("display")}>
          <Input name={name("display")} maxLength={60} autoComplete="off" />
        </Field>
        <Field label="Graphics" name={name("graphics")}>
          <Input name={name("graphics")} maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Operating system" name={name("operatingSystem")}>
          <Input name={name("operatingSystem")} maxLength={80} autoComplete="off" />
        </Field>
      </div>

      <Field label="Anything else about this line" name={name("note")}>
        <Textarea name={name("note")} rows={2} maxLength={600} />
      </Field>
    </Fieldset>
  );
}

export function RequirementForm({
  slots,
  defaults,
}: {
  slots: number;
  defaults: {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    companyName?: string;
    gstin?: string;
  };
}) {
  const [state, formAction] = useActionState<RequirementState, FormData>(submitRequirement, {
    status: "idle",
  });

  if (state.status === "success" && state.reference) {
    return (
      <div className="rounded-[--radius-lg] border border-line bg-white p-8">
        <h2 className="text-[1.25rem]">Requirement received</h2>
        <p className="mt-3 text-body leading-relaxed text-ink-600">{state.message}</p>
        <p className="mt-4 text-meta leading-relaxed text-ink-600">
          We will come back to you with options and a written quotation. Nothing is ordered and
          nothing is charged at this stage.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/account/enquiries"
            className="inline-flex h-11 items-center rounded-[--radius-md] bg-graphite-900 px-5 text-meta font-medium text-white hover:bg-graphite-800"
          >
            Track it in your account
          </Link>
          <Link
            href="/products"
            className="inline-flex h-11 items-center rounded-[--radius-md] border border-line-strong px-5 text-meta font-medium text-graphite-900 hover:border-graphite-400"
          >
            Browse the catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-10">
      {state.status === "error" && state.message ? <FormError>{state.message}</FormError> : null}

      <FormStateProvider fieldErrors={state.fieldErrors ?? {}}>
        <div className="space-y-8">
          {Array.from({ length: slots }, (_, index) => (
            <LineSlot key={index} index={index} required={index === 0} />
          ))}
        </div>

        <Fieldset legend="When and where">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Required by" name="requiredBy" hint="A date, or “end of Q3”.">
              <Input name="requiredBy" maxLength={80} autoComplete="off" />
            </Field>
            <Field label="Delivery location" name="deliveryLocation">
              <Input name="deliveryLocation" maxLength={200} autoComplete="off" />
            </Field>
          </div>
          <Field
            label="Indicative budget"
            name="budgetNote"
            hint="Optional, and in whatever form you have it. It helps us recommend sensibly rather than guess."
          >
            <Input name="budgetNote" maxLength={120} autoComplete="off" />
          </Field>
          <Field
            label="Anything else we should know"
            name="context"
            hint="Standards to meet, a tender to answer, what you are replacing."
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
            <Field label="City" name="city">
              <Input name="city" maxLength={80} autoComplete="address-level2" />
            </Field>
          </div>
        </Fieldset>
      </FormStateProvider>

      <div className="border-t border-line pt-6">
        <SubmitButton />
        <p className="mt-3 text-label text-ink-500">
          Sending this places no order and commits you to nothing.
        </p>
      </div>
    </form>
  );
}
