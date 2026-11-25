"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  FormStateProvider,
  FormSuccess,
  Honeypot,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form";
import { postJson } from "@/lib/csrf-client";
import { SCREENING_EXPERIENCE, SCREENING_NOTICE } from "@/lib/validation";

/** The short first-round questionnaire on /careers. Answers go to HR as a message; it is not an application. */
export function ScreeningForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "");
    const result = await postJson<{ reference: string }>("/api/careers/screening", {
      name: get("name"),
      email: get("email"),
      phone: get("phone"),
      roleInterest: get("roleInterest"),
      experience: get("experience"),
      currentLocation: get("currentLocation"),
      noticePeriod: get("noticePeriod"),
      currentCtc: get("currentCtc"),
      expectedCtc: get("expectedCtc"),
      relevantExperience: get("relevantExperience"),
      whyTechzoid: get("whyTechzoid"),
      profileUrl: get("profileUrl"),
      website: get("website"),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }
    setReference(result.data.reference);
  }

  if (reference) {
    return (
      <FormSuccess>
        <strong className="font-semibold">Answers received.</strong> Your reference is{" "}
        <span className="font-mono">{reference}</span>. Our HR team will reply to your email address.
        To be considered for a listed role, apply to it above.
      </FormSuccess>
    );
  }

  return (
    <FormStateProvider fieldErrors={fieldErrors}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error ? <FormError>{error}</FormError> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Full name" required>
            <Input name="name" autoComplete="name" required />
          </Field>
          <Field name="email" label="Email" required>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field name="phone" label="Phone" required>
            <Input name="phone" type="tel" autoComplete="tel" required />
          </Field>
          <Field name="currentLocation" label="Current city" required>
            <Input name="currentLocation" autoComplete="address-level2" required />
          </Field>
          <Field name="roleInterest" label="Which role or area interests you?" required>
            <Input name="roleInterest" placeholder="e.g. IT sales, pre-sales, operations" required />
          </Field>
          <Field name="experience" label="Total experience" required>
            <Select name="experience" defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              {SCREENING_EXPERIENCE.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field name="noticePeriod" label="Notice period" required>
            <Select name="noticePeriod" defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              {SCREENING_NOTICE.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field name="profileUrl" label="LinkedIn or resume link" hint="Optional.">
            <Input name="profileUrl" type="url" autoComplete="url" />
          </Field>
          <Field name="currentCtc" label="Current CTC" hint="Optional.">
            <Input name="currentCtc" />
          </Field>
          <Field name="expectedCtc" label="Expected CTC" hint="Optional.">
            <Input name="expectedCtc" />
          </Field>
        </div>
        <Field
          name="relevantExperience"
          label="What work have you done that is relevant to this role?"
          required
        >
          <Textarea name="relevantExperience" rows={5} maxLength={1500} required />
        </Field>
        <Field name="whyTechzoid" label="Why do you want to work at TechZoid?" required>
          <Textarea name="whyTechzoid" rows={4} maxLength={1000} required />
        </Field>
        <Honeypot />
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Sending…" : "Send my answers"}
          </Button>
          <p className="text-label leading-relaxed text-ink-500">
            Used only by our HR team to reply to you. See our{" "}
            <Link href="/privacy" className="text-accent-700 underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </form>
    </FormStateProvider>
  );
}
