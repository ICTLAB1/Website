/**
 * The photographs on the careers page, in one place.
 *
 * ## These are placeholders
 *
 * Every file here was cropped from two design mockups supplied for the page
 * redesign. The people in them look AI-generated and are not TechZoid
 * employees, so none of these may stay up as "life at TechZoid" once real
 * photographs exist. Replacing one is a one-file change: put the new JPEG in
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
    width: 1092,
    height: 614,
    alt: "Two colleagues smiling as they look at a laptop together in a bright office",
    placeholder: true,
  },
  sales: {
    src: "/images/careers/cat-sales.jpg",
    width: 472,
    height: 590,
    alt: "A colleague with glasses smiling beside a laptop",
    placeholder: true,
  },
  tech: {
    src: "/images/careers/cat-tech.jpg",
    width: 510,
    height: 640,
    alt: "A colleague smiling while pointing at a laptop screen",
    placeholder: true,
  },
  operations: {
    src: "/images/careers/cat-ops.jpg",
    width: 370,
    height: 462,
    alt: "Colleagues talking in a modern open-plan office",
    placeholder: true,
  },
  corporate: {
    src: "/images/careers/cat-corp.jpg",
    width: 464,
    height: 300,
    alt: "Two colleagues laughing together over a laptop",
    placeholder: true,
  },
  life: {
    src: "/images/careers/life.jpg",
    width: 640,
    height: 245,
    alt: "Four colleagues chatting and laughing on a sofa in a plant-filled office",
    placeholder: true,
  },
} as const satisfies Record<string, CareersPhoto>;
