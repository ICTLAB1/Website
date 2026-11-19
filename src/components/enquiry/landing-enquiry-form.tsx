"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormError, FormStateProvider, Input, Select } from "@/components/ui/form";
import { submitRequirement } from "@/app/requirement/actions";
import type { RequirementState } from "@/lib/rfq";
import { AttributionFields } from "@/components/analytics/attribution-fields";
import { useRequirementConversion } from "@/components/enquiry/use-requirement-conversion";

/**
 * The seven-field enquiry form that opens a landing page.
 *
 * Company name, contact person, designation, corporate email, phone, the
 * product they are interested in, and roughly how many. Nothing else: this is
 * the form a buyer arriving from an advert or a search result fills in without
 * thinking about it, and every extra field is a reason to leave.
 *
 * ## It is the requirement form, not a second pipeline
 *
 * It posts to the same server action as `/requirement`, so an enquiry from here
 * is an ordinary enquiry: the same reference, the same notification to sales,
 * the same acknowledgement to the customer, the same conversion event. The
 * "product" is the one line of the requirement and the "quantity" is that
 * line's quantity. A second table for landing-page leads would split the sales
 * team's attention across two inboxes, which the requirement service's own
 * comment names as the thing not to do.
 *
 * ## Why every field is required
 *
 * Each of the seven is something sales needs to reply sensibly, and the labels
 * say what is wanted rather than leaving it to a placeholder. The server checks
 * the same things the browser does; the `form` field below is what tells it
 * this is the strict form.
 */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Sending…" : "Request a quotation"}
    </Button>
  );
}

export function LandingEnquiryForm({
  products,
  source,
}: {
  products: readonly string[];
  source: string;
}) {
  const [state, formAction] = useActionState<RequirementState, FormData>(submitRequirement, {
    status: "idle",
  });

  useRequirementConversion(state, source);

  /*
   * Controlled, because React clears an uncontrolled form after every action,
   * refusals included. A visitor told "enter your designation" would find the
   * other six fields emptied, and a form that does that loses the lead.
   */
  const [values, setValues] = useState<Record<string, string>>({});
  const bind = (name: string) => ({
    name,
    value: values[name] ?? "",
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  if (state.status === "success" && state.reference) {
    return (
      <div role="status" className="py-2">
        <h3 className="text-[1.25rem] font-semibold text-graphite-900">Thank you — we have your enquiry</h3>
        <p className="mt-3 text-body leading-relaxed text-ink-600">{state.message}</p>
        <p className="mt-4 text-meta leading-relaxed text-ink-600">
          We will come back to you with a written quotation. Nothing is ordered and nothing is
          charged at this stage.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Tells the server this is the strict form: designation and quantity required. */}
      <input type="hidden" name="form" value="landing" />
      <AttributionFields />

      {state.status === "error" && state.message ? <FormError>{state.message}</FormError> : null}

      <FormStateProvider fieldErrors={state.fieldErrors ?? {}}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" name="companyName" required>
            <Input {...bind("companyName")} required maxLength={160} autoComplete="organization" />
          </Field>
          <Field label="Contact person's name" name="contactName" required>
            <Input {...bind("contactName")} required maxLength={120} autoComplete="name" />
          </Field>
          <Field label="Designation" name="contactDesignation" required>
            <Input {...bind("contactDesignation")} required maxLength={120} autoComplete="organization-title" />
          </Field>
          <Field label="Corporate email" name="contactEmail" required>
            <Input {...bind("contactEmail")} type="email" required autoComplete="email" inputMode="email" />
          </Field>
          <Field label="Phone number" name="contactPhone" required>
            <Input {...bind("contactPhone")} type="tel" required autoComplete="tel" inputMode="tel" />
          </Field>
          <Field label="Product interested in" name="lines.0.description" required>
            <Select {...bind("lines.0.description")} required>
              <option value="" disabled>
                Choose one
              </option>
              {products.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Estimated quantity or number of licences"
            name="lines.0.quantity"
            required
            hint="A rough number is fine."
          >
            <Input
              {...bind("lines.0.quantity")}
              type="number"
              required
              min={1}
              max={100000}
              inputMode="numeric"
              autoComplete="off"
            />
          </Field>
        </div>
      </FormStateProvider>

      <div className="border-t border-line pt-5">
        <SubmitButton />
        <p className="mt-3 text-label text-ink-500">
          Sending this places no order and commits you to nothing.
        </p>
      </div>
    </form>
  );
}
