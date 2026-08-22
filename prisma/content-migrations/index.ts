import { brandLogos } from "./2026-08-brand-logos";
import { gemMark } from "./2026-08-gem-mark";
import { hardwareCatalogue } from "./2026-08-hardware-catalogue";
import { hardwareModels } from "./2026-08-hardware-models";
import { serverMenu } from "./2026-08-server-menu";
import { homepageAndCertifications } from "./2026-08-homepage-and-certifications";
import type { ContentMigration } from "./types";

/**
 * Every content migration, in the order they are applied.
 *
 * Append to the end. The order is the order they run in on a database that has
 * seen none of them, so a later migration may rely on an earlier one having
 * happened — the logos one, for instance, expects the brands the first one
 * creates to exist.
 */
export const contentMigrations: ContentMigration[] = [
  homepageAndCertifications,
  brandLogos,
  hardwareCatalogue,
  serverMenu,
  hardwareModels,
  gemMark,
];

export type { ContentMigration };
