import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ContactForm } from "@/components/marketing/contact-form";
import { buildMetadata } from "@/lib/seo";
import { getSiteConfig, getUnconfiguredIdentityKeys } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us",
  description:
    "Contact our sales, enterprise procurement and support teams about software licensing, cloud services and IT solutions.",
  path: "/contact",
});

export default function ContactPage() {
  const config = getSiteConfig();
  const missing = getUnconfiguredIdentityKeys();

  const channels = [
    {
      title: "Sales",
      body: "Product pricing, licensing questions and new requirements.",
      email: config.email.sales,
      phone: config.phone.sales,
    },
    {
      title: "Enterprise procurement",
      body: "Multi-vendor sourcing, consolidated quotations and volume licensing.",
      email: config.email.enterprise ?? config.email.sales,
      phone: config.phone.sales,
    },
    {
      title: "Support",
      body: "Existing orders, licence administration and technical issues.",
      email: config.email.support,
      phone: config.phone.support,
    },
  ];

  const anyChannelConfigured = channels.some((channel) => channel.email || channel.phone);

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Contact us</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Tell us what you need. You do not need a finished product list — a seat count, a
          renewal date or a description of the problem is enough to start.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <section aria-labelledby="contact-form-heading">
          <h2 id="contact-form-heading" className="mb-6 text-[1.25rem]">
            Send us a message
          </h2>
          <ContactForm />
        </section>

        <aside className="space-y-4">
          {anyChannelConfigured ? (
            channels.map((channel) => (
              <div key={channel.title} className="rounded-[--radius-lg] border border-line bg-white p-5">
                <h2 className="text-[15px] font-semibold text-navy-900">{channel.title}</h2>
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
          ) : (
            <div className="rounded-[--radius-lg] border border-warning-600/40 bg-warning-50 p-5">
              <h2 className="text-[15px] font-semibold text-warning-700">
                Direct contact details not configured
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
                Email addresses and telephone numbers are supplied through configuration and
                have not been set for this deployment. Rather than display placeholder contact
                details, they are omitted — the form on this page is fully functional and every
                message is recorded.
              </p>
              <p className="mt-3 font-mono text-[11px] text-ink-600">
                Set: {missing.join(", ")}
              </p>
            </div>
          )}

          {config.formattedAddress ? (
            <div className="rounded-[--radius-lg] border border-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-navy-900">Office</h2>
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

          {config.supportHours ? (
            <div className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
              <h2 className="text-[15px] font-semibold text-navy-900">Support hours</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{config.supportHours}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
