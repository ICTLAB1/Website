"use client";

import Link from "next/link";
import { useState } from "react";

import { CONVERSION_EVENTS } from "@/lib/analytics";
import { pushConversion } from "@/lib/analytics-events";
import { topicIsLead } from "@/lib/validation";

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

const TOPICS = [
  { value: "SALES", label: "Sales enquiry" },
  { value: "ENTERPRISE", label: "Enterprise procurement" },
  { value: "SUPPORT", label: "Technical support" },
  { value: "GENERAL", label: "General enquiry" },
];

export function ContactForm({ defaultTopic = "GENERAL" }: { defaultTopic?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setCorrelationId(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const result = await postJson<{ reference: string }>("/api/contact", {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      companyName: String(form.get("companyName") ?? ""),
      topic: String(form.get("topic") ?? "GENERAL"),
      message: String(form.get("message") ?? ""),
      website: String(form.get("website") ?? ""),
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      setCorrelationId(result.error.correlationId ?? null);
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }

    /*
     * Counted here, and only for a topic that is somebody asking to buy.
     *
     * This form was invisible to advertising: four of the five ways a lead
     * reaches this business pushed nothing, so a bidding strategy set to
     * maximise conversions was optimising against a fifth of the evidence.
     *
     * The topic gate is the point. A support request and a general question
     * are not conversions, and counting them would teach that strategy to bid
     * for a visitor with a broken licence as readily as for one who wants a
     * quotation. `topicIsLead` is shared with the admin queue, so the two
     * cannot drift into disagreeing about which is which.
     *
     * The same event as the other three forms, deliberately: they are one
     * intention and a bidding strategy optimises towards a conversion action,
     * so splitting them across several would starve each. Which form it was
     * travels alongside, for a report that wants to know.
     */
    const topic = String(form.get("topic") ?? "GENERAL");
    if (topicIsLead(topic)) {
      pushConversion(CONVERSION_EVENTS.quoteFormSubmit, result.data.reference, {
        form: "contact",
        topic,
      });
    }

    setReference(result.data.reference);
  }

  if (reference) {
    return (
      <FormSuccess>
        <strong className="font-semibold">Message received.</strong> Your reference is{" "}
        <span className="font-mono">{reference}</span>. We will respond to the email address you
        gave us — please quote the reference in any follow-up.
      </FormSuccess>
    );
  }

  return (
    <FormStateProvider fieldErrors={fieldErrors}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error ? (
        <FormError>
          {error}
          {correlationId ? (
            <span className="mt-1 block font-mono text-label">Reference: {correlationId}</span>
          ) : null}
        </FormError>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Full name" required>
<Input name="name" autoComplete="name" required />
</Field>
        <Field name="email" label="Business email" required>
<Input name="email" type="email" autoComplete="email" required />
</Field>
        <Field name="phone" label="Phone">
<Input name="phone" type="tel" autoComplete="tel" />
</Field>
        <Field name="companyName" label="Company">
<Input name="companyName" autoComplete="organization" />
</Field>
      </div>

      <Field name="topic" label="What is this about?" required>
<Select name="topic" defaultValue={defaultTopic}>
            {TOPICS.map((topic) => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </Select>
</Field>

      <Field name="message"
        label="Message"
        required
        hint="Include product names, seat counts or renewal dates if you have them — it speeds up the response."
      >
<Textarea name="message" rows={6} maxLength={4000} required />
</Field>

      {/* Honeypot */}
      <Honeypot />

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
        <p className="text-label leading-relaxed text-ink-500">
          We use these details only to respond to your message. See our{" "}
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
