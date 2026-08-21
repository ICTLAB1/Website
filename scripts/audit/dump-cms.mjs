import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.pageSection.findMany({
  include: { page: { select: { slug: true, title: true, status: true } } },
  orderBy: [{ pageId: "asc" }, { displayOrder: "asc" }],
});
const out = [];
for (const r of rows) {
  out.push({ slug: r.page.slug, status: r.page.status, order: r.displayOrder, type: r.type, id: r.id, data: r.data, visible: r.visible });
}
console.log(JSON.stringify(out, null, 1));
await p.$disconnect();
