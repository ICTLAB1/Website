import type { ContentMigration } from "./types";

/*
 * Brand pages for brands with no catalogue and no hub guide now return 404, so
 * the cloud-services post must not link to them. Exact-text replacement only:
 * a hand-edited body that no longer contains these links is left alone.
 */
const SLUG = "top-10-cloud-computing-services-india";
const LINKS = [/\[([^\]]+)\]\(\/brands\/(?:oracle|veeam|salesforce)\)/g];

export const unlinkUnsoldBrands: ContentMigration = {
  id: "2026-11-unlink-unsold-brands",
  describe: "the cloud services post no longer links to brand pages that do not exist",
  async apply(prisma) {
    const post = await prisma.blogPost.findUnique({ where: { slug: SLUG }, select: { id: true, body: true } });
    if (!post) return "post not found";
    let body = post.body;
    for (const re of LINKS) body = body.replace(re, "$1");
    if (body === post.body) return "nothing to do";
    await prisma.blogPost.update({ where: { id: post.id }, data: { body } });
    return "unlinked";
  },
};
