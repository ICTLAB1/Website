import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ContactForm } from "@/components/marketing/contact-form";
import { buildMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Contact Sales",
  description:
    "Talk to our sales and enterprise procurement teams about software licensing, cloud services and IT solutions. Existing orders and technical issues go to the support centre.",
  path: "/contact",
});

export default async function ContactPage() {
  const config = await getSiteConfig();

  /**
   * Sales only. Support used to be a third card here, which meant a customer
   * with a broken licence and a buyer asking for a quotation arrived at the
   * same form and the same inbox. Support has its own page, with ticketing and
   * order tracking behind it, and this page now points there instead.
   */
  const channels = [
    {
      title: "Sales",
      body: "Pricing, licensing questions and new requirements.",
      email: config.email.sales,
      phone: config.phone.sales,
    },
    {
      title: "Enterprise procurement",
      body: "Multi-brand sourcing, consolidated quotations and volume licensing.",
      email: config.email.enterprise ?? config.email.sales,
      phone: config.phone.sales,
    },
  ];

  const anyChannelConfigured = channels.some((channel) => channel.email || channel.phone);

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Talk to sales</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Tell us what you need. You do not need a finished product list — a seat count, a
          renewal date or a description of what you are trying to do is enough to start.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <section aria-labelledby="contact-form-heading">
          <h2 id="contact-form-heading" className="mb-6 text-[1.25rem]">
            Send us a message
          </h2>
          <ContactForm />
        </section>

        <aside className="min-w-0 space-y-4">
          {anyChannelConfigured ? (
            channels.map((channel) => (
              <div key={channel.title} className="rounded-[--radius-lg] border border-line bg-white p-5">
                <h2 className="text-[15px] font-semibold text-graphite-900">{channel.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{channel.body}</p>
                <div className="mt-3 space-y-1.5 text-[13px]">
                  {channel.email ? (
                    <a
                      href={`mailto:${channel.email}`}
                      className="block break-all font-medium text-accent-700 hover:underline"
                    >
                      {channel.email}
                    </a>
                  ) : null}
                  {channel.phone ? (
                    <a
                      href={`tel:${channel.phone.replace(/\s/g, "")}`}
                      className="block font-medium text-accent-700 hover:underline"
                    >
                      {channel.phone}
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          ) : null}

          {config.formattedAddress ? (
            <div className="rounded-[--radius-lg] border border-line bg-white p-5">
              {/*
                "India office" only once there is a second one to tell it apart
                from. On a business trading from one place the heading stays
                "Office", because naming a country there implies a network that
                may not exist.
              */}
              <h2 className="text-[15px] font-semibold text-graphite-900">
                {config.secondaryEntity ? "India office" : "Office"}
              </h2>
              <address className="mt-2 text-[13px] not-italic leading-relaxed text-ink-600">
                {config.formattedAddress}
              </address>
              {config.gstin ? (
                <p className="mt-3 border-t border-line pt-3 font-mono text-[12px] text-ink-500">
                  GSTIN {config.gstin}
                </p>
              ) : null}
            </div>
          ) : null}

          {config.secondaryEntity ? (
            <div className="rounded-[--radius-lg] border border-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-graphite-900">
                {config.secondaryEntity.name}
              </h2>
              <address className="mt-2 whitespace-pre-line text-[13px] not-italic leading-relaxed text-ink-600">
                {config.secondaryEntity.address}
              </address>
              {config.secondaryEntity.phone ? (
                <p className="mt-3 border-t border-line pt-3 text-[13px]">
                  <a
                    href={`tel:${config.secondaryEntity.phone.replace(/[^+\d]/g, "")}`}
                    className="text-accent-700 hover:underline"
                  >
                    {config.secondaryEntity.phone}
                  </a>
                </p>
              ) : null}
              {/*
                No GSTIN here. It is an Indian registration and belongs to the
                Indian entity; repeating it under an overseas address would
                attach a tax identifier to the wrong jurisdiction.
              */}
            </div>
          ) : null}

          {/*
            Support was removed from the channel list above, so this page has to
            say where it went. Without it, a customer with a licence problem
            would find only a sales form.
          */}
          <div className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">
              Already a customer?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              Existing orders, renewals, licence administration and technical issues are
              handled by the support centre, where they are tracked against your account.
            </p>
            {config.supportHours ? (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                {config.supportHours}
              </p>
            ) : null}
            <Link
              href="/support"
              className="mt-3 inline-block text-[13px] font-medium text-accent-700 hover:underline"
            >
              Go to support
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
