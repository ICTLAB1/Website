import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const tables = { brand:p.brand, category:p.category, service:p.service, faq:p.faq, blogPost:p.blogPost, product:p.product };
const phrases = new Map();
for (const [name, t] of Object.entries(tables)) {
  for (const row of await t.findMany()) {
    for (const [field, value] of Object.entries(row)) {
      if (typeof value !== "string") continue;
      for (const m of value.matchAll(/.{0,45}vendor.{0,45}/gi)) {
        const key = `${name}.${field} :: ${m[0].replace(/\s+/g," ")}`;
        phrases.set(key, (phrases.get(key) ?? 0) + 1);
      }
    }
  }
}
for (const [k,v] of [...phrases].sort()) console.log(`(${v}) ${k}`);
await p.$disconnect();
