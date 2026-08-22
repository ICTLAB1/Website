import { createHash } from "node:crypto";

import { applyHardwareFile, hardwareFiles } from "../seed-data/hardware";
import type { ContentMigration } from "./types";

/**
 * The commercial hardware shipped with this release.
 *
 * Re-applied whenever the line cards change, unlike its neighbours, which run
 * once and never again. That is a deliberate exception to the rule the
 * mechanism exists to enforce, and it holds because of what the source is:
 * these models come from a manufacturer's line card kept in the repository,
 * not from copy somebody writes in the admin panel. A specification changing is
 * a new line card, committed — and the next deploy should carry it rather than
 * waiting for a migration named after the month it happened in.
 *
 * What that costs is narrow and worth naming. Editing a hardware model's
 * description in the panel will be overwritten on the next deploy; edit the
 * file instead. Everything the panel owns and the file does not — a photograph
 * uploaded there, a product's featured flag, its popularity — is untouched,
 * because the writer only sets the fields the file carries.
 *
 * The mechanism is the id: it carries a digest of the files, so a changed line
 * card is a different migration, applied once and recorded. A deploy that
 * changes no data file re-runs nothing, and the record keeps every version that
 * was ever applied and when.
 */

/**
 * A digest of what the files currently say.
 *
 * Computed from the parsed content rather than the bytes, so reformatting a
 * file — or the JSON writer changing its indentation — does not read as a new
 * catalogue.
 */
function contentDigest(): string {
  const files = hardwareFiles();
  const payload = JSON.stringify(files.map(({ name, file }) => [name, file]));
  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

export const hardwareModels: ContentMigration = {
  id: `hardware-models-${contentDigest()}`,
  describe: "commercial hardware models from the committed manufacturer line cards",

  async apply(prisma) {
    const files = hardwareFiles();
    if (files.length === 0) return "no hardware files shipped";

    const done: string[] = [];

    for (const { name, file } of files) {
      const result = await applyHardwareFile(prisma, file);
      done.push(
        `${name}: ${result.created} created, ${result.updated} updated, ` +
          `${result.configurations} configuration(s)` +
          (result.refused.length > 0 ? `, ${result.refused.length} consumer range(s) refused` : "") +
          (result.withoutPhotograph.length > 0
            ? `, ${result.withoutPhotograph.length} without a photograph`
            : ""),
      );
    }

    return done.join("; ");
  },
};
