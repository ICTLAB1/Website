import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
for (const s of await p.service.findMany()) {
  const hit = JSON.stringify(s).match(/.{0,90}vendor.{0,90}/gi);
  if (hit) console.log(s.slug, "\n  ", hit.join("\n   "));
}
console.log("--- which fields are JSON? ---");
const one = await p.service.findFirst();
for (const [k, v] of Object.entries(one)) console.log(" ", k, Array.isArray(v) ? "array" : typeof v);
await p.$disconnect();
