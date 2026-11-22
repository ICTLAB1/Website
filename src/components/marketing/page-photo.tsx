import Image from "next/image";

import type { SitePhoto } from "@/lib/page-photos";

/**
 * A page opening's photograph, laid behind its text.
 *
 * The picture fills the whole band and a navy wash runs across it: solid
 * where the headline sits, thinning to the right so the photograph shows. On a
 * phone the wash is even, because the text spans the width there. The parent
 * must be `relative isolate overflow-hidden`; the picture and the wash sit
 * below the content in the stacking order, so the content needs nothing extra.
 *
 * The photograph is cropped to fill, never stretched out of shape, and the
 * files are 1600 pixels wide so a full-width band stays sharp. Its alt text is
 * kept for the record but it is decorative here: the page's own heading says
 * what the page is about.
 */
export function PhotoBackdrop({
  photo,
  priority = true,
}: {
  photo: SitePhoto;
  priority?: boolean;
}) {
  return (
    <>
      <Image
        src={photo.src}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="-z-20 object-cover object-[85%_22%]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-career-navy-dark/85 lg:bg-transparent lg:bg-gradient-to-r lg:from-career-navy-dark lg:from-35% lg:via-career-navy-dark/85 lg:via-55% lg:to-career-navy-dark/10"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 hidden h-20 w-72 bg-career-orange [clip-path:polygon(0_100%,100%_100%,0_30%)] lg:block"
      />
    </>
  );
}

/**
 * A listing or index page's opening: breadcrumb above, then a full-width band
 * with the photograph behind the page's own heading and introduction.
 *
 * The children are the heading and its text; this adds the band and the
 * photograph. Used by the catalogue, hardware, brands, blog, contact, support
 * and industries pages.
 */
export function PhotoHeader({
  photo,
  children,
}: {
  photo: SitePhoto;
  children: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-y border-graphite-800 bg-graphite-900">
      <PhotoBackdrop photo={photo} />
      <div className="container-page relative py-12 lg:py-14">
        <header className="max-w-3xl lg:max-w-2xl">{children}</header>
      </div>
    </section>
  );
}
