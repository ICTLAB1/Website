import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { FaqList } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { SearchBox } from "@/components/layout/search-box";
import { BlockHeading, BlockLink, BlockSection } from "@/components/blocks/primitives";
import type { BlockData } from "@/lib/blocks/schemas";
import type { ResolvedBlockData } from "@/lib/blocks/resolve";
import { getSiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/** Text and layout blocks. Each renders one validated payload. */

export function HeroBlock({
  data,
  counts,
}: {
  data: BlockData<"HERO">;
  counts?: ResolvedBlockData["counts"];
}) {
  const dark = data.tone === "dark";
  return (
    <section className={dark ? "border-b border-graphite-800 bg-graphite-900" : "border-b border-line"}>
      <div className="container-page py-14 lg:py-20">
        <div className="max-w-3xl">
          {data.eyebrow ? (
            <p
              className={cn(
                "mb-4 inline-flex items-center gap-2 rounded-[--radius-sm] px-3 py-1 text-[12px] font-medium",
                dark
                  ? "border border-graphite-700 bg-graphite-800 text-graphite-200"
                  : "bg-accent-50 text-accent-800",
              )}
            >
              {dark ? <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden="true" /> : null}
              {data.eyebrow}
            </p>
          ) : null}

          <h1
            className={cn(
              "animate-rise text-[2rem] leading-[1.14] sm:text-[2.6rem] lg:text-[3rem]",
              dark ? "text-white" : "text-graphite-900",
            )}
          >
            {data.headline}
          </h1>

          {data.subheadline ? (
            <p
              className={cn(
                "mt-5 max-w-2xl animate-rise text-[16px] leading-relaxed lg:text-[17px]",
                dark ? "text-graphite-200" : "text-ink-600",
              )}
              style={{ animationDelay: "80ms" }}
            >
              {data.subheadline}
            </p>
          ) : null}

          {data.primaryCta || data.secondaryCta ? (
            <div className="mt-8 flex animate-rise flex-wrap gap-3" style={{ animationDelay: "160ms" }}>
              {data.primaryCta ? (
                <ButtonLink href={data.primaryCta.href} size="lg">
                  {data.primaryCta.label}
                </ButtonLink>
              ) : null}
              {data.secondaryCta ? (
                <ButtonLink
                  href={data.secondaryCta.href}
                  size="lg"
                  variant={dark ? "onDark" : "outline"}
                >
                  {data.secondaryCta.label}
                </ButtonLink>
              ) : null}
            </div>
          ) : null}

          {data.showSearch ? (
            <div className="mt-10 max-w-2xl animate-rise" style={{ animationDelay: "240ms" }}>
              <SearchBox
                size="lg"
                label="Search products and solutions"
                placeholder="What software or solution are you looking for?"
              />
              {data.searchTerms.length > 0 ? (
                <p className={cn("mt-3 text-[13px]", dark ? "text-graphite-300" : "text-ink-500")}>
                  Popular:{" "}
                  {data.searchTerms.map((term, index) => (
                    <span key={term}>
                      {index > 0 ? (
                        <span className={dark ? "text-graphite-600" : "text-ink-300"}> · </span>
                      ) : null}
                      <Link
                        href={`/search?q=${encodeURIComponent(term)}`}
                        className={cn(
                          "underline-offset-2 hover:underline",
                          dark ? "text-graphite-200 hover:text-white" : "text-accent-700",
                        )}
                      >
                        {term}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {data.stats.length > 0 ? (
          <dl
            className={cn(
              "mt-14 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-6 border-t pt-8 sm:grid-cols-4",
              dark ? "border-graphite-800" : "border-line",
            )}
          >
            {data.stats.map((item, index) => {
              const numeric = item.source !== "literal" ? (counts?.[item.source] ?? null) : null;
              return (
                <div key={index}>
                  <dt
                    className={cn(
                      "text-[12px] uppercase tracking-wide",
                      dark ? "text-graphite-400" : "text-ink-500",
                    )}
                  >
                    {item.label}
                  </dt>
                  <dd
                    className={cn(
                      "mt-1 text-2xl font-semibold",
                      dark ? "text-white" : "text-graphite-900",
                    )}
                  >
                    {numeric !== null ? <CountUp value={numeric} /> : (item.value ?? "—")}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
      </div>
    </section>
  );
}

export function RichTextBlock({
  data,
  tone,
  continues,
}: {
  data: BlockData<"RICH_TEXT">;
  tone?: "plain" | "muted";
  continues?: boolean;
}) {
  return (
    <BlockSection tone={tone} continues={continues}>
      <Reveal className="max-w-3xl">
        {data.heading ? <h2 className="mb-4 text-[1.5rem]">{data.heading}</h2> : null}
        <Markdown body={data.markdown} className="prose-content text-[15px]" />
      </Reveal>
    </BlockSection>
  );
}

export function BulletsBlock({
  data,
  tone,
  continues,
}: {
  data: BlockData<"BULLETS">;
  tone?: "plain" | "muted";
  continues?: boolean;
}) {
  return (
    <BlockSection tone={tone} continues={continues}>
      <Reveal className="max-w-3xl">
        {data.heading ? <h2 className="mb-4 text-[1.5rem]">{data.heading}</h2> : null}
        <ul className="space-y-2.5">
          {data.items.map((item, index) => (
            <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />
              {item}
            </li>
          ))}
        </ul>
      </Reveal>
    </BlockSection>
  );
}

export function CardsBlock({
  data,
  tone,
  continues,
}: {
  data: BlockData<"CARDS">;
  tone?: "plain" | "muted";
  continues?: boolean;
}) {
  const columns =
    data.columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : data.columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <BlockSection tone={tone} continues={continues}>
      <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />
      <Reveal className={cn("grid gap-4", columns)}>
        {data.items.map((item, index) => (
          <div key={index} className="rounded-[--radius-lg] border border-line bg-white p-5">
            {data.numbered && data.numberLabel ? (
              <span className="block text-[12px] font-semibold uppercase tracking-wide text-accent-700">
                {data.numberLabel} {index + 1}
              </span>
            ) : data.numbered ? (
              <span
                aria-hidden="true"
                className="mb-3 inline-grid h-7 w-7 place-items-center rounded-[--radius-sm] bg-graphite-900 text-[12px] font-semibold text-white"
              >
                {index + 1}
              </span>
            ) : null}
            <h3 className="mt-2 text-[15px] font-semibold text-graphite-900">{item.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{item.body}</p>
          </div>
        ))}
      </Reveal>
    </BlockSection>
  );
}

export function IconPointsBlock({ data, tone }: { data: BlockData<"ICON_POINTS">; tone?: "plain" | "muted" }) {
  return (
    <BlockSection tone={tone} className="!py-0">
      <div className="py-8">
        <BlockHeading eyebrow={data.eyebrow} heading={data.heading} />
        <Reveal as="ul" className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          {data.items.map((item, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700"
              >
                <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.2 13.6 4.6 10l1.3-1.3 2.3 2.3 5.9-5.9L15.4 6z" />
                </svg>
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-graphite-900">{item.label}</span>
                {item.detail ? <span className="block text-[12px] text-ink-500">{item.detail}</span> : null}
              </span>
            </li>
          ))}
        </Reveal>
      </div>
    </BlockSection>
  );
}

export function LinkListBlock({ data, tone }: { data: BlockData<"LINK_LIST">; tone?: "plain" | "muted" }) {
  return (
    <BlockSection tone={tone}>
      <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />

      {data.layout === "chips" ? (
        <Reveal as="ul" className="flex flex-wrap gap-x-3 gap-y-3">
          {data.items.map((item, index) => (
            <li key={index}>
              <BlockLink
                href={item.href}
                className="lift inline-block rounded-[--radius-md] border border-line bg-white px-4 py-2.5 text-[13px] font-medium text-ink-700 hover:border-graphite-300"
              >
                {item.label}
              </BlockLink>
            </li>
          ))}
        </Reveal>
      ) : data.layout === "inline" ? (
        <Reveal as="ul" className="flex flex-wrap gap-x-5 gap-y-2">
          {data.items.map((item, index) => (
            <li key={index}>
              <BlockLink
                href={item.href}
                className="underline-grow text-[14px] font-medium text-accent-700"
              >
                {item.label}
              </BlockLink>
            </li>
          ))}
        </Reveal>
      ) : (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item, index) => (
            <BlockLink
              key={index}
              href={item.href}
              className="lift group flex items-start justify-between gap-4 rounded-[--radius-lg] border border-line bg-white p-5 hover:border-graphite-300"
            >
              <span>
                <span className="block text-[15px] font-semibold text-graphite-900 group-hover:text-accent-700">
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-1 block text-[13px] text-ink-600">{item.description}</span>
                ) : null}
              </span>
              <span className="mt-1 shrink-0 text-[13px] font-medium text-ink-300 group-hover:text-accent-700">
                {data.itemAction ? `${data.itemAction} ` : null}
                <span aria-hidden="true">&rarr;</span>
              </span>
            </BlockLink>
          ))}
        </Reveal>
      )}
    </BlockSection>
  );
}

export function KeyValueListBlock({
  data,
  tone,
  continues,
}: {
  data: BlockData<"KEY_VALUE_LIST">;
  tone?: "plain" | "muted";
  continues?: boolean;
}) {
  return (
    <BlockSection tone={tone} continues={continues}>
      <BlockHeading eyebrow={data.eyebrow} heading={data.heading} />
      <Reveal as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-3 rounded-[--radius-md] border border-line bg-white px-4 py-3 text-[13px]"
          >
            <span className="font-medium text-graphite-900">{item.key}</span>
            <span className="text-ink-500">{item.value}</span>
          </li>
        ))}
      </Reveal>
    </BlockSection>
  );
}

export function ChipListBlock({ data, tone }: { data: BlockData<"CHIP_LIST">; tone?: "plain" | "muted" }) {
  return (
    <BlockSection tone={tone}>
      <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />
      <Reveal as="ul" className="flex flex-wrap gap-x-3 gap-y-3">
        {data.items.map((item, index) => (
          <li
            key={index}
            className="rounded-[--radius-md] border border-line bg-white px-4 py-2.5 text-[13px] font-medium text-ink-700"
          >
            {item}
          </li>
        ))}
      </Reveal>
      {data.footnote ? <p className="mt-6 text-[13px] text-ink-500">{data.footnote}</p> : null}
    </BlockSection>
  );
}

export function SplitPanelBlock({ data, tone }: { data: BlockData<"SPLIT_PANEL">; tone?: "plain" | "muted" }) {
  return (
    <BlockSection tone={tone ?? "muted"}>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          {data.eyebrow ? (
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-700">
              {data.eyebrow}
            </p>
          ) : null}
          <h2 className="text-[1.6rem] sm:text-[1.85rem]">{data.heading}</h2>
          {data.description ? (
            <p className="mt-4 text-[15px] leading-relaxed text-ink-600">{data.description}</p>
          ) : null}
          {data.bulletsIntro ? (
            <p className="mt-5 text-[15px] leading-relaxed text-ink-600">{data.bulletsIntro}</p>
          ) : null}
          {data.bullets.length > 0 ? (
            <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-[14px] text-ink-700 sm:grid-cols-2">
              {data.bullets.map((bullet, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-accent-600" />
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </Reveal>

        {data.tiles.length > 0 ? (
          <Reveal as="ul" className="grid grid-cols-2 gap-4" delay={80}>
            {data.tiles.map((tile, index) => (
              <li
                key={index}
                className="rounded-[--radius-lg] border border-line bg-white p-5 text-center"
              >
                <span className="text-[14px] font-semibold text-graphite-900">{tile}</span>
              </li>
            ))}
          </Reveal>
        ) : null}
      </div>
    </BlockSection>
  );
}

export function StatBarBlock({
  data,
  counts,
  tone,
}: {
  data: BlockData<"STAT_BAR">;
  counts: ResolvedBlockData["counts"];
  tone?: "plain" | "muted" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <BlockSection tone={tone}>
      <BlockHeading eyebrow={data.eyebrow} heading={data.heading} onDark={dark} />
      <Reveal as="dl" className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        {data.items.map((item, index) => {
          const numeric = item.source !== "literal" ? counts[item.source] : null;
          return (
            <div key={index}>
              <dt className={cn("text-[12px] uppercase tracking-wide", dark ? "text-graphite-400" : "text-ink-500")}>
                {item.label}
              </dt>
              <dd className={cn("mt-1 text-2xl font-semibold", dark ? "text-white" : "text-graphite-900")}>
                {numeric !== null ? <CountUp value={numeric} /> : (item.value ?? "—")}
              </dd>
            </div>
          );
        })}
      </Reveal>
    </BlockSection>
  );
}

export function FaqBlock({
  data,
  items,
  tone,
}: {
  data: BlockData<"FAQ">;
  items: Array<{ question: string; answer: string }>;
  tone?: "plain" | "muted";
}) {
  if (items.length === 0) return null;
  return (
    <BlockSection tone={tone ?? "muted"}>
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-6 text-[1.5rem]">{data.heading ?? "Frequently asked questions"}</h2>
        {/* FaqList also emits the FAQPage structured data. */}
        <FaqList items={items} />
      </div>
    </BlockSection>
  );
}

export async function CtaBannerBlock({ data }: { data: BlockData<"CTA_BANNER"> }) {
  const dark = data.tone === "dark";
  const config = await getSiteConfig();
  // Business identity lives in configuration, so the block records only that an
  // address belongs here. An unconfigured deployment renders no action at all
  // rather than a broken mailto.
  const contactEmail = data.showContactEmail
    ? (config.email.enterprise ?? config.email.sales ?? null)
    : null;
  return (
    <section className={dark ? "bg-graphite-900" : data.tone === "accent" ? "bg-accent-50" : "border-y border-line bg-surface-muted"}>
      <div className="container-page py-14 lg:py-18">
        <Reveal className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className={cn("text-[1.6rem] leading-tight sm:text-[1.9rem]", dark ? "text-white" : "text-graphite-900")}>
              {data.heading}
            </h2>
            {data.body ? (
              <p className={cn("mt-4 text-[15px] leading-relaxed", dark ? "text-graphite-200" : "text-ink-600")}>
                {data.body}
              </p>
            ) : null}
          </div>
          {data.primaryCta || data.secondaryCta || contactEmail ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {data.primaryCta ? (
                <ButtonLink href={data.primaryCta.href} size="lg">
                  {data.primaryCta.label}
                </ButtonLink>
              ) : null}
              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}`}
                  className={cn(
                    "inline-flex h-12 items-center justify-center rounded-[--radius-md] border px-6 text-[15px] font-medium",
                    dark
                      ? "border-white/30 text-white hover:bg-white/10"
                      : "border-line text-graphite-900 hover:bg-white",
                  )}
                >
                  {contactEmail}
                </a>
              ) : null}
              {data.secondaryCta ? (
                <ButtonLink href={data.secondaryCta.href} size="lg" variant={dark ? "onDark" : "outline"}>
                  {data.secondaryCta.label}
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}

export function PlansBlock({ data, tone }: { data: BlockData<"PLANS">; tone?: "plain" | "muted" }) {
  return (
    <BlockSection tone={tone}>
      <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />
      <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.items.map((plan, index) => (
          <div key={index} className="flex flex-col rounded-[--radius-lg] border border-line bg-white p-5">
            <h3 className="text-[15px] font-semibold text-graphite-900">{plan.name}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{plan.summary}</p>
            {plan.points.length > 0 ? (
              <ul className="mt-4 space-y-1.5">
                {plan.points.map((point, pointIndex) => (
                  <li key={pointIndex} className="flex gap-2 text-[13px] text-ink-600">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-600" />
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
            {plan.productSlug ? (
              <BlockLink
                href={`/products/${plan.productSlug}`}
                className="underline-grow mt-auto pt-4 text-[13px] font-medium text-accent-700"
              >
                View pricing
              </BlockLink>
            ) : null}
          </div>
        ))}
      </Reveal>
    </BlockSection>
  );
}

/**
 * The company identity panel.
 *
 * Unlike every other block, its values do not come from the stored payload:
 * they are read from server configuration at render time. Business identity —
 * legal name, registered address, GSTIN — deliberately does not live in the
 * CMS, so placing this block positions the panel without granting anyone the
 * ability to edit a registration number through a content form.
 *
 * Values that have not been configured are omitted rather than substituted, and
 * omitted without comment: a visitor is never told that a detail is missing,
 * and never shown the name of the setting that would supply it. The admin
 * dashboard is where launch readiness is reported.
 */
export async function CompanyInfoBlock({
  data,
  tone,
}: {
  data: BlockData<"COMPANY_INFO">;
  tone?: "plain" | "muted";
}) {
  const config = await getSiteConfig();

  const identity: Array<[string, string | null | undefined]> = [
    ["Trading name", config.tradingName],
    ["Registered legal name", config.legalName],
    ["Registered address", config.formattedAddress],
    ["GSTIN", config.gstin],
    ["CIN", config.cin],
    ["Sales", config.email.sales],
    ["Support", config.email.support],
    ["Telephone", config.phone.sales],
    ["Support hours", config.supportHours],
  ];

  const grievance: Array<[string, string | null | undefined]> = [
    ["Grievance officer", config.grievance.name],
    ["Email", config.grievance.email],
    ["Telephone", config.grievance.phone],
    ["Postal address", config.formattedAddress],
  ];

  const rows =
    data.fields === "grievance"
      ? grievance
      : data.fields === "all"
        ? [...identity, ...grievance]
        : identity;

  const configured = rows.some(([, value]) => Boolean(value));

  return (
    <BlockSection tone={tone}>
      <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />

      {/*
        No launch-readiness notice here. A visitor reading the grievance section
        must not be told the appointment is unconfigured, and must never be shown
        an environment variable name. An unset value is omitted, silently. The
        admin dashboard reports what is still missing.
      */}
      {!configured ? null : (
      <dl className="grid max-w-3xl gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows
          .filter(([, value]) => Boolean(value))
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12px] uppercase tracking-wide text-ink-500">{label}</dt>
              <dd className="mt-1 break-words text-[14px] text-ink-800">{value}</dd>
            </div>
          ))}
      </dl>
      )}

      {data.footnote ? (
        <p className="mt-8 max-w-3xl text-[13px] leading-relaxed text-ink-500">{data.footnote}</p>
      ) : null}
    </BlockSection>
  );
}

/**
 * A short highlighted statement placed within a page.
 *
 * `warning` is for something the reader needs before they act on the rest of
 * the page — a legal document still under review, a promotion that has ended.
 * `info` is for context. Both render the same Markdown subset as every other
 * block, so a notice can carry a link without carrying markup.
 */
export function NoticeBlock({ data, tone }: { data: BlockData<"NOTICE">; tone?: "plain" | "muted" }) {
  const warning = data.tone === "warning";
  return (
    <BlockSection tone={tone} className="!py-0">
      <div className="py-6">
        <div
          className={cn(
            "max-w-3xl rounded-[--radius-lg] border p-5",
            warning ? "border-warning-600/40 bg-warning-50" : "border-line bg-surface-muted",
          )}
        >
          {data.heading ? (
            <h2
              className={cn(
                "mb-2 text-[14px] font-semibold",
                warning ? "text-warning-700" : "text-graphite-900",
              )}
            >
              {data.heading}
            </h2>
          ) : null}
          <Markdown body={data.markdown} className="prose-content text-[13px] leading-relaxed" />
        </div>
      </div>
    </BlockSection>
  );
}
