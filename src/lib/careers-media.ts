/**
 * The photographs on the careers page, in one place.
 *
 * ## These are stock photographs, not our team
 *
 * Every file here is a licensed Adobe Stock photograph (ids in
 * `docs/image-licences.md`), saved at 800 to 1600 pixels wide so it stays sharp
 * on a high-density screen. They replace earlier crops taken from design mockups,
 * which were only a few hundred pixels wide and looked blurred. The people in
 * them are not TechZoid employees, so none of these may stay up as "life at
 * TechZoid" once real photographs exist. Replacing one is a one-file change: put the new JPEG in
 * `public/images/careers/`, keep the name (or change `src` here), update `alt`, and
 * delete `placeholder`.
 *
 * `alt` describes what is in the picture rather than claiming who is in it.
 */
export type CareersPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** True while the picture is a mockup crop, not a real photograph of the team. */
  placeholder: boolean;
};

export const CAREERS_PHOTOS = {
  hero: {
    src: "/images/careers/hero.jpg",
    width: 1600,
    height: 900,
    alt: "A team of businesspeople gathered around a meeting-room table with laptops",
    placeholder: true,
  },
  sales: {
    src: "/images/careers/cat-sales.jpg",
    width: 800,
    height: 1000,
    alt: "A professional working at a laptop beside an open notebook",
    placeholder: true,
  },
  tech: {
    src: "/images/careers/cat-tech.jpg",
    width: 800,
    height: 1000,
    alt: "A laptop on a desk beside printed charts and a calculator",
    placeholder: true,
  },
  operations: {
    src: "/images/careers/cat-ops.jpg",
    width: 800,
    height: 1000,
    alt: "A team of support agents with headsets working at their desks",
    placeholder: true,
  },
  corporate: {
    src: "/images/careers/cat-corp.jpg",
    width: 1000,
    height: 647,
    alt: "Colleagues meeting around a table in a bright, glass-walled office",
    placeholder: true,
  },
  life: {
    src: "/images/careers/life.jpg",
    width: 1600,
    height: 612,
    alt: "Colleagues meeting around a table in a bright, glass-walled office",
    placeholder: true,
  },
} as const satisfies Record<string, CareersPhoto>;
