import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { FaqList } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { ContactForm } from "@/components/marketing/contact-form";
import { getFaqsByTopic } from "@/lib/queries/content";
import { getSessionUser } from "@/lib/auth/session";
import { buildMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Support Centre",
  description:
    "Raise a support ticket, reach the service desk, or find answers to common licensing, billing and renewal questions.",
  path: "/support",
});

export default async function SupportPage() {
  const [faqs, user] = await Promise.all([getFaqsByTopic("enterprise"), getSessionUser()]);
  const config = getSiteConfig();

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Support" }]} />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Support</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Licensing questions, billing queries, renewals and technical issues. If you have an
          account, raising a ticket there keeps everything against your record.
        </p>
      </header>

      <div className="mb-14 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-navy-900">Raise a ticket</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            {user
              ? "Raise a ticket against your account so it appears in your support history."
              : "Sign in to raise a ticket that is tracked against your account, with its history in one place."}
          </p>
          <ButtonLink href={user ? "/account/support" : "/login?next=/account/support"} size="sm" className="mt-4">
            {user ? "Raise a ticket" : "Sign in"}
          </ButtonLink>
        </div>

        <div className="rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-navy-900">Track an order</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            Check the status of an order or enquiry using its reference.
          </p>
          <ButtonLink href="/track-order" variant="outline" size="sm" className="mt-4">
            Track order
          </ButtonLink>
        </div>

        <div className="rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-navy-900">Contact the team</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            {config.email.support
              ? "Email the service desk directly."
              : "Use the form below — every message is recorded and answered."}
          </p>
          {config.email.support ? (
            <a
              href={`mailto:${config.email.support}`}
              className="mt-4 inline-block break-all text-[13px] font-medium text-accent-700 hover:underline"
            >
              {config.email.support}
            </a>
          ) : (
            <Link href="#support-form" className="mt-4 inline-block text-[13px] font-medium text-accent-700 underline underline-offset-2">
              Go to the form &darr;
            </Link>
          )}
        </div>
      </div>

      {faqs.length > 0 ? (
        <section className="mb-14 max-w-3xl">
          <SectionHeader title="Common questions" as="h2" className="mb-6" />
          <FaqList items={faqs} />
        </section>
      ) : null}

      <section id="support-form" className="max-w-2xl scroll-mt-32">
        <SectionHeader
          title="Send a support message"
          description="For anything not covered above. We respond to the email address you provide."
          as="h2"
          className="mb-6"
        />
        <ContactForm defaultTopic="SUPPORT" />
      </section>
    </div>
  );
}
