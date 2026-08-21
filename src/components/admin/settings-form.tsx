"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Fieldset, Input } from "@/components/ui/form";
import { saveSiteSettings } from "@/app/admin/settings/actions";
import type { SiteConfig } from "@/lib/site-config";

/**
 * The company's business identity, as an editable form.
 *
 * A client component, and it has to be: `Field` calls `Children.only` on its
 * child so it can clone an id and the aria attributes onto the control, and a
 * child that has crossed the server-to-client boundary is not a plain element
 * by the time it gets there. Rendering this on the server threw
 * "React.Children.only expected to receive a single React element child" and
 * returned a 500 for the whole page. Every other form in the admin panel is a
 * client component for the same reason.
 *
 * Each input is pre-filled from the *stored* value, never from the value
 * currently in effect. That distinction matters: a field still coming from
 * environment configuration must look empty, or the first save would silently
 * copy the environment into the database and the fallback would be gone for
 * good. Where a field is empty but something is nevertheless being shown to
 * visitors, the hint says so and prints it — which is also the only honest way
 * to explain why the public site shows a number this form does not.
 */

type StoredSettings = {
  emailSales: string | null;
  emailSupport: string | null;
  emailEnterprise: string | null;
  phoneSales: string | null;
  phoneSupport: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  gstin: string | null;
  cin: string | null;
  supportHours: string | null;
  grievanceName: string | null;
  grievanceEmail: string | null;
  grievancePhone: string | null;
} | null;

export function SettingsForm({
  stored,
  effective,
}: {
  stored: StoredSettings;
  /** What the public site is showing right now, stored value or environment. */
  effective: SiteConfig;
}) {
  /**
   * The hint under a field.
   *
   * Silent when the stored value is what is in effect — repeating it would be
   * noise. It speaks only when they differ, which is exactly when an
   * administrator would otherwise be confused about where the site's number is
   * coming from.
   */
  function inherited(storedValue: string | null, inEffect: string | null): string | undefined {
    if (storedValue) return undefined;
    if (!inEffect) return undefined;
    return `Currently showing “${inEffect}”, from the server configuration. Type here to override it; clear it again to go back.`;
  }

  const text = (
    name: keyof NonNullable<StoredSettings>,
    label: string,
    inEffect: string | null,
    options: { type?: string; placeholder?: string; hint?: string } = {},
  ) => {
    const storedValue = stored?.[name] ?? null;
    return (
      <Field
        key={name}
        label={label}
        name={name}
        hint={options.hint ?? inherited(storedValue, inEffect)}
      >
        <Input
          name={name}
          type={options.type ?? "text"}
          defaultValue={storedValue ?? ""}
          placeholder={options.placeholder}
          autoComplete="off"
        />
      </Field>
    );
  };

  return (
    <AdminForm
      action={saveSiteSettings}
      submitLabel="Save details"
      pendingLabel="Saving…"
    >
      <Fieldset
        legend="Contact"
        description="Shown in the footer, on the contact page and in the support centre. A blank field is not displayed at all — nothing invented, and no note about it being missing."
      >
        {text("emailSales", "Sales email", effective.email.sales, { type: "email" })}
        {text("emailSupport", "Support email", effective.email.support, { type: "email" })}
        {text("emailEnterprise", "Enterprise email", effective.email.enterprise, {
          type: "email",
          hint: stored?.emailEnterprise
            ? undefined
            : "Optional. Enterprise enquiries fall back to the sales address when this is blank.",
        })}
        {text("phoneSales", "Sales telephone", effective.phone.sales, { type: "tel" })}
        {text("phoneSupport", "Support telephone", effective.phone.support, { type: "tel" })}
        {text("supportHours", "Support hours", effective.supportHours, {
          placeholder: "Monday to Friday, 9:30am – 6:30pm IST",
        })}
      </Fieldset>

      <Fieldset
        legend="Registered address"
        description="Printed in the footer, on the contact page and on the legal pages. It appears only once both the first line and the city are filled in."
      >
        {text("addressLine1", "Address line 1", effective.address.line1)}
        {text("addressLine2", "Address line 2", effective.address.line2)}
        {text("city", "City", effective.address.city)}
        {text("state", "State", effective.address.state)}
        {text("postcode", "PIN code", effective.address.postcode)}
        {text("country", "Country", effective.address.country)}
      </Fieldset>

      <Fieldset
        legend="Statutory identifiers"
        description="Checked for shape before saving, because both are reproduced on invoices where a typo is a real problem rather than a cosmetic one."
      >
        {text("gstin", "GSTIN", effective.gstin, { placeholder: "07AABCU9603R1ZX" })}
        {text("cin", "CIN", effective.cin, { placeholder: "U72900DL2019PTC123456" })}
      </Fieldset>

      <Fieldset
        legend="Grievance officer"
        description="Publishing a named officer and their contact details is required of an online seller in India by the Consumer Protection (E-Commerce) Rules 2020. Until a name and an email are set, the grievance section of the legal pages renders nothing — silently, because a visitor must never be told the site is half-configured."
      >
        {text("grievanceName", "Name", effective.grievance.name)}
        {text("grievanceEmail", "Email", effective.grievance.email, { type: "email" })}
        {text("grievancePhone", "Telephone", effective.grievance.phone, { type: "tel" })}
      </Fieldset>
    </AdminForm>
  );
}
