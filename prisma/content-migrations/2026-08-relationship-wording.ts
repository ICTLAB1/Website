import type { ContentMigration } from "./types";

/**
 * Three places where the site describes its relationships imprecisely.
 *
 * ## "authorised to resell"
 *
 * The brands section read: "These are the software publishers and hardware
 * manufacturers we are authorised to resell." Sixty brands are listed and an
 * authorisation is a specific thing each publisher grants in writing, so the
 * sentence claims sixty documents. The brands index page had already been
 * corrected to say "supply" for exactly this reason, and its own comment says
 * so; the homepage kept the older wording. The rest of the sentence — sourcing,
 * licensing, supporting, one commercial relationship — is unchanged and true.
 *
 * ## "Verified GeM Reseller"
 *
 * The header strapline said "Verified GeM Reseller" while
 * /industries/government-psu says "registered GeM seller". GeM issues a seller
 * registration; "verified reseller" is not a status it grants, and two pages
 * describing the same registration differently is what a procurement officer
 * notices first. The registration is real — the site shows the GeM mark
 * against it — so this is a wording correction, not a retraction.
 *
 * The "Microsoft Authorised Partner" half is deliberately left alone. The
 * remediation document asked for "Microsoft Solutions Partner", which is a
 * specific designation in Microsoft's partner programme rather than a softer
 * way of saying the same thing — swapping one unverified designation for
 * another is the move this codebase does not make. It needs whoever holds the
 * Partner Center login to say which is true.
 *
 * ## The duplicated trademark notice
 *
 * A second, differently-worded trademark footnote lived in a homepage section
 * while the footer already carried one on every page. Two wordings of a legal
 * position invite the question of which one is the position. The footer's is
 * now the only one, and it has the reselling sentence appended to it.
 *
 * Every change is matched against the exact text it replaces.
 */

const RESELL_FROM =
  "These are the software publishers and hardware manufacturers we are authorised to resell. " +
  "We source their products, licence them to you and support them — you hold one commercial " +
  "relationship, with us.";
const RESELL_TO =
  "The software publishers and hardware manufacturers we supply. " +
  "We source their products, licence them to you and support them — you hold one commercial " +
  "relationship, with us.";

const EYEBROW_FROM = "Microsoft Authorised Partner | Verified GeM Reseller | Enterprise IT Solutions";
const EYEBROW_TO = "Microsoft Authorised Partner | Registered GeM Seller | Enterprise IT Solutions";

const FOOTNOTE_MARKER = "property of their respective owners";

export const relationshipWording: ContentMigration = {
  id: "2026-08-relationship-wording",
  describe: "three places describing a relationship more strongly than the evidence",

  async apply(prisma) {
    const done: string[] = [];

    const sections = await prisma.pageSection.findMany({
      select: { id: true, data: true },
    });

    for (const section of sections) {
      const data = section.data as Record<string, unknown> | null;
      if (!data) continue;

      if (data.description === RESELL_FROM) {
        await prisma.pageSection.update({
          where: { id: section.id },
          data: { data: { ...data, description: RESELL_TO } },
        });
        done.push('"authorised to resell" is now "we supply"');
        continue;
      }

      if (data.eyebrow === EYEBROW_FROM) {
        await prisma.pageSection.update({
          where: { id: section.id },
          data: { data: { ...data, eyebrow: EYEBROW_TO } },
        });
        done.push('"Verified GeM Reseller" is now "Registered GeM Seller"');
        continue;
      }

      if (typeof data.footnote === "string" && data.footnote.includes(FOOTNOTE_MARKER)) {
        const { footnote: _removed, ...rest } = data;
        void _removed;
        await prisma.pageSection.update({
          where: { id: section.id },
          data: { data: rest as Parameters<typeof prisma.pageSection.update>[0]["data"]["data"] },
        });
        done.push("the duplicated trademark notice is removed, leaving the footer's");
      }
    }

    if (done.length === 0) return "all three have already been changed — left alone";
    return done.join("; ");
  },
};
