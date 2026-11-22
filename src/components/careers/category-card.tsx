"use client";

import Image from "next/image";

import type { CareersPhoto } from "@/lib/careers-media";

/**
 * A photographic category card that takes the visitor to the jobs list with the
 * search already filled in.
 *
 * It is an ordinary `#jobs` link, so it works with scripts off; the click also
 * tells the list what to search for. Nothing here claims a role is open: the
 * example roles are what the team hires for, and the list below shows what is
 * actually published.
 */
export function CategoryCard({
  title,
  description,
  roles,
  search,
  photo,
}: {
  title: string;
  description: string;
  roles: string[];
  search: string;
  photo: CareersPhoto;
}) {
  return (
    <a
      href="#jobs"
      onClick={() => window.dispatchEvent(new CustomEvent("careers:search", { detail: search }))}
      className="group relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-[1rem] bg-career-navy-dark text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-career-blue"
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 92vw"
        className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-career-navy-dark via-career-navy-dark/70 to-transparent"
      />
      <span className="p-6">
        <span className="block h-0.5 w-8 bg-career-orange transition-all duration-300 group-hover:w-14" />
        <span className="mt-3 block text-[1.25rem] font-semibold leading-tight">{title}</span>
        <span className="mt-2 block text-[14px] leading-relaxed text-white/80">{description}</span>
        <span className="mt-3 block text-[12px] leading-relaxed text-white/60">
          {roles.join(" · ")}
        </span>
        <span className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold">
          Explore opportunities
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
          >
            <path d="M4 10h12M11 5l5 5-5 5" />
          </svg>
        </span>
      </span>
    </a>
  );
}
