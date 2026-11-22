import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { PHOTOS } from "@/lib/page-photos";
import { getHomeData } from "@/lib/queries/home";

/**
 * The customer sign-in page.
 *
 * A split screen: a corporate photograph and the reasons to sign in on the
 * left, the form on a white card on the right. Below it, the brands the
 * business supplies and four service highlights. The form itself is
 * `LoginForm`, which still signs in with a business email and password; this
 * file only arranges the page around it.
 *
 * Palette from the brief: deep navy #101F3B, secondary navy #142544, orange
 * #F47716, white and light grey. Orange carries fills and rules; where it is
 * text on white, a darker orange is used so it stays readable.
 */

const ICON = {
  fill: "none",
  stroke: "#F47716",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const FEATURES: Array<{ title: string; body: string; icon: ReactNode }> = [
  {
    title: "Enquiries & Quotations",
    body: "Track your requests and quotations with reference numbers.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" {...ICON}>
        <path d="M7 3h8l4 4v14H7z" />
        <path d="M15 3v4h4M10 12h6M10 16h6" />
      </svg>
    ),
  },
  {
    title: "Licences & Renewals",
    body: "View your software licence positions and upcoming renewal dates.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" {...ICON}>
        <path d="m12 3 9 5-9 5-9-5z" />
        <path d="m3 13 9 5 9-5M3 17.5 12 22l9-4.5" />
      </svg>
    ),
  },
  {
    title: "Company & GST Details",
    body: "Save your company information and GSTIN for faster invoicing.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" {...ICON}>
        <path d="M5 21V4h9v17M14 9h5v12M3 21h18M8 8h2M8 12h2M8 16h2" />
      </svg>
    ),
  },
  {
    title: "Orders & Reordering",
    body: "Easily place repeat orders and renew existing licences.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" {...ICON}>
        <path d="M3 4h2.5l2.2 11h10.3l2-8H6.5" />
        <circle cx="9" cy="19.5" r="1.4" />
        <circle cx="17" cy="19.5" r="1.4" />
      </svg>
    ),
  },
];

const HIGHLIGHTS: Array<{ label: string; icon: ReactNode }> = [
  {
    label: "Genuine & Compliant Licences",
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" {...ICON}>
        <path d="M12 3 4.5 6v5.5c0 4.4 3 8 7.5 9.5 4.5-1.5 7.5-5.1 7.5-9.5V6z" />
        <path d="m8.8 12 2.4 2.4 4-4.4" />
      </svg>
    ),
  },
  {
    label: "Expert Licensing Support",
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" {...ICON}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M3 20c.4-3.5 2.8-5.5 6-5.5s5.6 2 6 5.5M15.5 14.6c2.6-.3 4.9 1.2 5.5 4.4" />
      </svg>
    ),
  },
  {
    label: "Renewals & Lifecycle Management",
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" {...ICON}>
        <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" />
      </svg>
    ),
  },
  {
    label: "Trusted by Enterprises & Government Organisations",
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" {...ICON}>
        <path d="M5 21V4h9v17M14 9h5v12M3 21h18M8 8h2M8 12h2M8 16h2" />
      </svg>
    ),
  },
];

const PARTNER_ORDER = [
  "microsoft",
  "adobe",
  "autodesk",
  "hp",
  "lenovo",
  "dell",
  "cisco",
];

export async function LoginExperience({
  next,
  registered,
}: {
  next?: string;
  registered: boolean;
}) {
  const photo = PHOTOS.workplace;
  const data = await getHomeData();
  const brands = PARTNER_ORDER.map((slug) =>
    data.brands.find((brand) => brand.slug === slug),
  ).filter((brand): brand is NonNullable<typeof brand> => Boolean(brand));

  return (
    <>
      <section className="relative isolate overflow-hidden bg-white">
        {/* Photograph and the white wash over its left side, wide screens only. */}
        <Image
          src={photo.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 hidden object-cover object-[75%_center] lg:block"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-white from-40% via-white/80 via-55% to-white/0 lg:block"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 -z-10 hidden h-24 w-[26rem] bg-[#F47716] [clip-path:polygon(0_100%,100%_100%,0_25%)] lg:block"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 -z-10 hidden h-12 w-[44rem] bg-[#101F3B] [clip-path:polygon(0_100%,100%_100%,0_55%)] lg:block"
        />

        <div className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_27rem] lg:items-center lg:gap-x-12 lg:gap-y-8 lg:py-16">
          <div className="lg:col-start-1 lg:row-start-1 lg:max-w-xl lg:self-end">
            <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#101F3B]">
              TechZoid Technologies
            </p>
            <span
              aria-hidden="true"
              className="mt-3 block h-[3px] w-12 bg-[#F47716]"
            />
            <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-[#101F3B] sm:text-[3.25rem]">
              Your business.
              <span className="block">Your software.</span>
              <span className="block text-[#E8650A]">One place.</span>
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ink-700">
              Sign in to manage your enquiries, quotations, software licences
              and renewals — all in one secure account.
            </p>

            {/* A picture for phones and tablets, where the wide background is not shown. */}
            <div className="relative mt-6 aspect-[16/8] overflow-hidden rounded-(--radius-lg) lg:hidden">
              <Image
                src={photo.src}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="relative order-2 overflow-hidden rounded-(--radius-xl) lg:col-start-2 lg:row-span-2 lg:row-start-1 border border-line bg-white p-6 shadow-[0_30px_70px_-34px_rgba(16,31,59,0.55)] sm:p-9">
            <span
              aria-hidden="true"
              className="absolute -right-12 -top-12 h-32 w-32 rotate-45 bg-[#F47716]"
            />
            <h2 className="text-[2rem] font-bold leading-tight text-[#101F3B]">
              Welcome back
            </h2>
            <p className="mt-1 text-[16px] text-ink-700">
              Sign in to your TechZoid account
            </p>
            <span
              aria-hidden="true"
              className="mt-3 block h-[3px] w-12 bg-[#F47716]"
            />

            {registered ? (
              <div
                role="status"
                className="mt-5 rounded-(--radius-md) border border-success-600/30 bg-success-50 px-4 py-3 text-[14px] text-success-700"
              >
                If that email address was available, your account is ready. Sign
                in below.
              </div>
            ) : null}

            <div className="mt-6">
              <LoginForm next={next} />
            </div>

            <div className="mt-6 flex items-center gap-3 text-[14px] font-semibold text-[#101F3B]">
              <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
              New to TechZoid?
              <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
            </div>
            <Link
              href="/register"
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-(--radius-md) border-2 border-[#F47716] bg-white px-6 text-[16px] font-bold text-[#b8480a] hover:bg-[#fff6ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#101F3B]"
            >
              Create an account
            </Link>
            <p className="mt-4 text-center">
              <Link
                href="/enquiry"
                className="inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-[#101F3B] underline underline-offset-2 hover:text-[#b8480a]"
              >
                Request a quotation without an account
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 10h12M11 5l5 5-5 5" />
                </svg>
              </Link>
            </p>

            <div className="mt-4 grid gap-4 rounded-(--radius-lg) bg-[#fff6ee] p-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <svg
                  aria-hidden="true"
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  className="shrink-0"
                  {...ICON}
                >
                  <path d="M12 3 4.5 6v5.5c0 4.4 3 8 7.5 9.5 4.5-1.5 7.5-5.1 7.5-9.5V6z" />
                  <path d="m8.8 12 2.4 2.4 4-4.4" />
                </svg>
                <p className="text-[13px] leading-snug text-ink-700">
                  Your data is secure with TechZoid
                </p>
              </div>
              <div className="flex items-center gap-3 sm:border-l sm:border-[#f3d4b4] sm:pl-4">
                <svg
                  aria-hidden="true"
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  className="shrink-0"
                  {...ICON}
                >
                  <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
                  <rect x="3" y="13" width="4" height="6" rx="1.5" />
                  <rect x="17" y="13" width="4" height="6" rx="1.5" />
                </svg>
                <p className="text-[13px] leading-snug text-ink-700">
                  Need help?{" "}
                  <Link
                    href="/support"
                    className="font-semibold text-[#b8480a] underline underline-offset-2"
                  >
                    Contact Support
                  </Link>
                </p>
              </div>
            </div>
          </div>
          <ul className="order-3 grid gap-5 sm:grid-cols-2 lg:col-start-1 lg:row-start-2 lg:max-w-xl lg:grid-cols-1 lg:self-start">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-(--radius-lg) bg-[#fdebd9]"
                >
                  {feature.icon}
                </span>
                <span>
                  <span className="block text-[16px] font-bold text-[#101F3B]">
                    {feature.title}
                  </span>
                  <span className="mt-0.5 block text-[14px] leading-snug text-ink-700">
                    {feature.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {brands.length > 0 ? (
        <section
          aria-labelledby="login-brands"
          className="border-y border-line bg-white"
        >
          <div className="container-page flex flex-wrap items-center gap-x-10 gap-y-5 py-7">
            <div className="shrink-0">
              <h2
                id="login-brands"
                className="text-[1.2rem] font-bold leading-tight text-[#101F3B]"
              >
                Technology brands
                <br />
                we supply
              </h2>
              <span
                aria-hidden="true"
                className="mt-2 block h-[3px] w-12 bg-[#F47716]"
              />
            </div>
            <ul className="flex min-w-0 basis-full flex-wrap lg:flex-1 lg:basis-0 items-center justify-between gap-x-8 gap-y-5">
              {brands.map((brand) => (
                <li key={brand.slug} className="flex items-center">
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="flex h-12 items-center rounded-(--radius-md) px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#101F3B]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={brand.logoUrl ?? ""}
                      alt={brand.name}
                      loading="lazy"
                      className="h-9 w-auto max-w-[8.5rem] object-contain"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section
        aria-label="Why customers sign in to TechZoid"
        className="-mb-20 bg-[#101F3B] text-white"
      >
        <ul className="container-page grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item, index) => (
            <li
              key={item.label}
              className={`flex items-center gap-4 ${index > 0 ? "lg:border-l lg:border-white/20 lg:pl-6" : ""}`}
            >
              <span aria-hidden="true" className="shrink-0">
                {item.icon}
              </span>
              <span className="text-[15px] font-semibold leading-snug">
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
