import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { PHOTOS } from "@/lib/page-photos";

/**
 * Shared framing for the authentication pages. Server-renderable: it takes only
 * serialisable props and children.
 *
 * Two panels on a wide screen, as on the rest of the site: the form on a white
 * card, and beside it a navy panel with a photograph behind the reasons to have
 * an account. On a phone the form comes first and the panel follows it.
 */
export function AuthLayout({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const photo = PHOTOS.team;

  return (
    <div className="bg-career-mist">
      <div className="container-page py-10 lg:py-16">
        <div
          className={`mx-auto grid max-w-5xl overflow-hidden rounded-(--radius-xl) border border-line bg-white shadow-[0_24px_60px_-32px_rgba(11,42,91,0.45)] ${
            aside ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "max-w-xl"
          }`}
        >
          <div className="p-6 sm:p-10">
            <h1 className="text-[1.85rem] font-bold leading-tight text-career-navy sm:text-[2.1rem]">
              {title}
            </h1>
            <span
              aria-hidden="true"
              className="mt-4 block h-[3px] w-12 bg-career-orange"
            />
            <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
              {description}
            </p>
            <div className="mt-8">{children}</div>
          </div>

          {aside ? (
            <aside className="relative isolate overflow-hidden bg-career-navy-dark p-6 text-white sm:p-10">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 32rem, 100vw"
                className="-z-20 object-cover"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-career-navy-dark/90"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-0 -z-10 h-16 w-56 bg-career-orange [clip-path:polygon(0_100%,100%_100%,0_30%)]"
              />
              <div className="pb-14">{aside}</div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AuthBenefits() {
  return (
    <>
      <h2 className="text-[1.3rem] font-bold text-white">
        Why create an account
      </h2>
      <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-white/90">
        {[
          "Track every enquiry and quotation in one place, with their references.",
          "See your licence position and upcoming renewal dates across publishers.",
          "Store your company details and GSTIN once, so every invoice carries them correctly.",
          "Reorder or renew without rebuilding the requirement from scratch.",
        ].map((item) => (
          <li key={item} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-career-orange"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
                className="text-white"
              >
                <path d="M4.7 8.6 2.2 6.1l.9-.9 1.6 1.6 4-4 .9.9z" />
              </svg>
            </span>
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-white/20 pt-5 text-[14px] text-white/80">
        You can request a quotation without an account.{" "}
        <Link
          href="/enquiry"
          className="font-semibold text-white underline underline-offset-2"
        >
          Go straight to an enquiry
        </Link>
        .
      </p>
    </>
  );
}
