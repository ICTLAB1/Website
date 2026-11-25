import type { ContentMigration } from "./types";
import { GENERATED_SERVICES } from "./services.generated";

/**
 * Managed Firewall Services, and the AutoCAD page's claim about three-year terms.
 *
 * ## The service
 *
 * Created once, from the copy in `content/seo/service-managed-firewall-services.json`,
 * and never touched again: a service that already exists under that slug is left
 * exactly as the admin panel has it. It files under the "Security" category beside
 * the cybersecurity service, so it sits with it on the services page.
 *
 * ## The AutoCAD page
 *
 * The page said a three-year term "costs less per year and locks the price against
 * increases". The catalogue holds annual prices only, so the page was describing a
 * discount this site cannot show. Both the section and the page description are
 * rewritten to say that the listed price is annual and longer terms are quoted on
 * request — each only while it still reads exactly as the original, so an edit made
 * in the admin panel is never overwritten.
 */

const OLD_TERMS_HEADING = "One year or three";
const OLD_TERMS_MARKDOWN =
  "The three-year term costs less per year and locks the price against increases across the term. It is the right choice where the seat count is stable.\n\nWhere headcount is uncertain, the annual term preserves the ability to reduce at renewal, and that flexibility is often worth more than the discount.";
const NEW_TERMS_HEADING = "Annual or longer terms";
const NEW_TERMS_MARKDOWN =
  "The prices on this site are for the annual subscription. A longer term can be quoted on request, and the written quotation states exactly what it costs against the annual price, so you compare the two on paper.\n\nWhere the seat count is stable, ask us to quote both. Where headcount is uncertain, the annual term keeps the ability to reduce seats at renewal.";

const OLD_DESCRIPTION =
  "AutoCAD subscriptions with all seven industry toolsets: 2D drafting, 3D design, web and mobile access, and one- or three-year terms priced side by side.";
const NEW_DESCRIPTION =
  "AutoCAD subscriptions with all seven industry toolsets: 2D drafting, 3D design, web and mobile access. Annual prices, with longer terms quoted on request.";

export const managedFirewallAndAutocadTerms: ContentMigration = {
  id: "2026-11-managed-firewall-and-autocad-terms",
  describe: "Managed Firewall Services page, and the AutoCAD page's three-year-term claim corrected",

  async apply(prisma) {
    const notes: string[] = [];

    for (const service of GENERATED_SERVICES) {
      if (await prisma.service.findUnique({ where: { slug: service.slug }, select: { id: true } })) continue;
      const created = await prisma.service.create({
        data: {
          slug: service.slug,
          name: service.name,
          category: "Security",
          summary: service.summary,
          heroHeadline: service.heroHeadline,
          problem: service.problem,
          solution: service.solution,
          benefits: service.benefits,
          process: service.process,
          technologies: service.technologies,
          displayOrder: 42,
          featured: false,
          published: true,
        },
        select: { id: true },
      });
      await prisma.faq.createMany({
        data: service.faqs.map((faq, index) => ({
          question: faq.question,
          answer: faq.answer,
          serviceId: created.id,
          displayOrder: (index + 1) * 10,
        })),
      });
      notes.push(`/services/${service.slug} created`);
    }

    const sections = await prisma.pageSection.findMany({
      where: { page: { slug: "autocad" }, type: "RICH_TEXT" },
      select: { id: true, data: true },
    });
    for (const section of sections) {
      const data = section.data as { heading?: string; markdown?: string };
      // The original text, possibly followed by a paragraph a later migration appended.
      if (data.markdown?.startsWith(OLD_TERMS_MARKDOWN)) {
        await prisma.pageSection.update({
          where: { id: section.id },
          data: {
            data: {
              ...(section.data as object),
              markdown: NEW_TERMS_MARKDOWN + data.markdown.slice(OLD_TERMS_MARKDOWN.length),
              ...(data.heading === OLD_TERMS_HEADING ? { heading: NEW_TERMS_HEADING } : {}),
            },
          },
        });
        notes.push("/autocad: terms section corrected");
      }
    }
    const page = await prisma.page.findUnique({ where: { slug: "autocad" }, select: { id: true, description: true } });
    if (page?.description === OLD_DESCRIPTION) {
      await prisma.page.update({ where: { id: page.id }, data: { description: NEW_DESCRIPTION } });
      notes.push("/autocad: description corrected");
    }

    return notes.length > 0 ? notes.join("; ") : "nothing to do";
  },
};
