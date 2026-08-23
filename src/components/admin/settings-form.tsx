"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Fieldset, Input, Textarea } from "@/components/ui/form";
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
  quoteTerms: string | null;
  quoteNumberFormat: string | null;
  secondaryEntityName: string | null;
  secondaryEntityAddress: string | null;
  secondaryEntityPhone: string | null;
  secondaryEntityRegistrationLabel: string | null;
  secondaryEntityRegistrationNo: string | null;
  secondaryEntityTaxLabel: string | null;
  secondaryEntityTaxNo: string | null;
  tagline: string | null;
  usdRatePaise: number | null;
  aedRatePaise: number | null;
  profileUrls: string | null;
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

  /**
   * Only the text fields.
   *
   * The stored settings now carry numbers too — the exchange rates — and this
   * helper reads a stored value straight into an `<Input>` and into the
   * "inherited from the environment" hint, both of which are about strings. The
   * key type is narrowed rather than the value coerced, so passing a rate here
   * is a compile error instead of a rate rendered through a hint that was never
   * written for it.
   */
  type TextField = {
    [K in keyof NonNullable<StoredSettings>]: NonNullable<StoredSettings>[K] extends string | null
      ? K
      : never;
  }[keyof NonNullable<StoredSettings>];

  const text = (
    name: TextField,
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
        {text("gstin", "GSTIN", effective.gstin, { placeholder: "07AABCU9603R1ZP" })}
        {text("cin", "CIN", effective.cin, { placeholder: "U72900DL2019PTC123456" })}
      </Fieldset>

      <Fieldset
        legend="Prices in other currencies"
        description="Visitors can read the catalogue in US dollars or UAE dirhams. A currency is offered only once you set its rate here — nothing is guessed, and no live feed is used, so the figure a customer sees is one you chose. Revisit it when the market moves. Orders, quotations and invoices stay in rupees whatever a visitor is reading in."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="1 US dollar in rupees"
            name="usdRatePaise"
            hint="Leave blank to not offer dollars."
          >
            <Input
              name="usdRatePaise"
              type="number"
              step="0.01"
              min="1"
              defaultValue={stored?.usdRatePaise != null ? (stored.usdRatePaise / 100).toFixed(2) : ""}
              placeholder="83.50"
            />
          </Field>
          <Field
            label="1 UAE dirham in rupees"
            name="aedRatePaise"
            hint="Leave blank to not offer dirhams."
          >
            <Input
              name="aedRatePaise"
              type="number"
              step="0.01"
              min="1"
              defaultValue={stored?.aedRatePaise != null ? (stored.aedRatePaise / 100).toFixed(2) : ""}
              placeholder="22.75"
            />
          </Field>
        </div>
        <p className="-mt-2 text-[12px] leading-relaxed text-ink-500">
          A dollar or dirham price is the whole amount owed, GST included, shown as one figure. In
          rupees the site continues to show the price and the GST on it separately, which is what an
          Indian buyer needs for input credit.
        </p>
      </Fieldset>

      <Fieldset
        legend="Quotation terms"
        description="Printed at the foot of every quotation you send. One term per line. Left blank, quotations carry no terms of their own and point to your published terms page instead — deliberately, because payment terms and delivery commitments are yours to decide and nothing here will invent them for you."
      >
        <Field
          label="Terms and conditions"
          name="quoteTerms"
          hint="For example: how long the price holds, when payment is due, what delivery timeline applies, whether prices exclude freight."
        >
          <Textarea
            name="quoteTerms"
            rows={7}
            defaultValue={stored?.quoteTerms ?? ""}
            placeholder={"Prices are valid for 30 days from the date of this quotation.\nPayment is due within 30 days of invoice.\nLicences are provisioned within 2 working days of a confirmed order."}
          />
        </Field>
      </Fieldset>

      <Fieldset
        legend="Quotation numbering"
        description="The number printed at the top of every quotation. Separate from the reference in the web address, which stays unguessable so that nobody can read another customer's quotations by changing a digit."
      >
        <Field
          label="Numbering format"
          name="quoteNumberFormat"
          hint="Tokens: {SEQ} the counter, {SEQ:4} padded to four digits, {FY} the financial year short (2627), {FYYYY} long (2026-27), {YYYY}, {YY}, {MM}. Left blank, quotations show their internal reference as they do now."
        >
          <Input
            name="quoteNumberFormat"
            maxLength={60}
            defaultValue={stored?.quoteNumberFormat ?? ""}
            placeholder="TZ/QT/{FY}/{SEQ:4}"
          />
        </Field>
        <p className="text-[12px] leading-relaxed text-ink-500">
          The counter restarts whenever the part of the format outside {"{SEQ}"} changes, so a
          format with {"{FY}"} in it starts again each financial year. Numbers already issued keep
          the format they were issued under; changing this affects the next quotation, not the last
          one.
        </p>
      </Fieldset>

      <Fieldset
        legend="Strapline"
        description="The line under the wordmark — in the bar at the top of every page, and under your logo on quotations. Blank falls back to COMPANY_TAGLINE in the environment."
      >
        <Field label="Strapline" name="tagline">
          <Input
            name="tagline"
            maxLength={120}
            placeholder="Connect, Communicate & Collaborate"
            defaultValue={stored?.tagline ?? ""}
          />
        </Field>
      </Fieldset>

      <Fieldset
        legend="Second office or entity"
        description="An overseas office or a second registered company. Shown on the contact page, in the footer, in the Organization structured data search engines read, and under your letterhead on quotations. Leave the name and address blank if you trade from one place."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Entity name" name="secondaryEntityName">
            <Input
              name="secondaryEntityName"
              maxLength={120}
              defaultValue={stored?.secondaryEntityName ?? ""}
            />
          </Field>
          <Field
            label="Entity address"
            name="secondaryEntityAddress"
            hint="One line, or several separated by line breaks."
          >
            <Textarea
              name="secondaryEntityAddress"
              rows={3}
              maxLength={300}
              defaultValue={stored?.secondaryEntityAddress ?? ""}
            />
          </Field>
          <Field
            label="Telephone"
            name="secondaryEntityPhone"
            hint="Optional. Leave blank if this office is reached on the main number — nothing is shown rather than an empty row."
          >
            <Input
              name="secondaryEntityPhone"
              type="tel"
              maxLength={40}
              defaultValue={stored?.secondaryEntityPhone ?? ""}
            />
          </Field>
        </div>

        {/*
          The branch's own registrations, each as a label and a number.

          Asked for as a pair because a number with no label is unreadable on a
          document — "42287" beside an address tells a reader nothing — and
          because the right label depends on where the office is. A UAE free
          zone issues a Business License and a Tax Registration Number; a second
          Indian entity would have a CIN and a GSTIN. Neither is printed unless
          both halves are filled in.
        */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Registration label"
            name="secondaryEntityRegistrationLabel"
            hint="What the number is called where the office is, e.g. Business License."
          >
            <Input
              name="secondaryEntityRegistrationLabel"
              maxLength={60}
              placeholder="Business License"
              defaultValue={stored?.secondaryEntityRegistrationLabel ?? ""}
            />
          </Field>
          <Field label="Registration number" name="secondaryEntityRegistrationNo">
            <Input
              name="secondaryEntityRegistrationNo"
              maxLength={60}
              defaultValue={stored?.secondaryEntityRegistrationNo ?? ""}
            />
          </Field>
          <Field
            label="Tax registration label"
            name="secondaryEntityTaxLabel"
            hint="e.g. Tax Registration Number."
          >
            <Input
              name="secondaryEntityTaxLabel"
              maxLength={60}
              placeholder="Tax Registration Number"
              defaultValue={stored?.secondaryEntityTaxLabel ?? ""}
            />
          </Field>
          <Field label="Tax registration number" name="secondaryEntityTaxNo">
            <Input
              name="secondaryEntityTaxNo"
              maxLength={60}
              defaultValue={stored?.secondaryEntityTaxNo ?? ""}
            />
          </Field>
        </div>
      </Fieldset>

      <Fieldset
        legend="Profiles elsewhere"
        description="Where else this business appears online — your LinkedIn company page, GeM seller profile, Google Business Profile, a trade directory listing. These are published as sameAs in the structured data, which is how a search engine decides those pages and this site are one business rather than several. That is what makes a mention somewhere else count towards this site. One https:// URL per line, and only pages you have checked: this is an assertion that the page is yours, so a wrong one is a claim about somebody else's."
      >
        <Field
          label="Profile URLs"
          name="profileUrls"
          hint="One per line. Left blank, no sameAs is published at all — which is correct, and better than a guess."
        >
          <Textarea
            name="profileUrls"
            rows={5}
            maxLength={1200}
            spellCheck={false}
            defaultValue={stored?.profileUrls ?? ""}
            placeholder={"https://www.linkedin.com/company/…\nhttps://…"}
          />
        </Field>
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
