import { PrismaClient } from "@prisma/client";

/**
 * Says who sells to whom.
 *
 * The site described Microsoft, Adobe, Autodesk, HP, Dell and Lenovo as "our
 * vendors", and headed a grid of their logos "Vendors we supply". Read plainly
 * that says this company supplies Microsoft, which is backwards. The chain runs
 * publishers and manufacturers → TechZoid → customers.
 *
 * "Vendor" is not banned, because it is not always wrong. It is replaced with
 * whichever word is actually true in that sentence:
 *
 *   publisher     a company that makes and licenses software
 *   manufacturer  a company that makes hardware
 *   supplier      a company the *customer* would otherwise buy from directly —
 *                 the consolidation argument, which is the one place the word
 *                 was doing real work and only needed disambiguating
 *   brand         a label on a catalogue facet or a logo grid
 *
 * Each edit names the page, the block and the exact string, and is checked
 * before it is written: a payload that has already been changed, or that no
 * longer contains the expected text, is reported rather than overwritten. Safe
 * to run twice.
 */

/** @type {Array<{page: string, order: number, path: string, from: string, to: string}>} */
const EDITS = [
  // ── Home ──────────────────────────────────────────────────────────────────
  {
    page: "",
    order: 0,
    path: "eyebrow",
    from: "Multiple technology vendors. One procurement partner.",
    to: "One procurement partner. Multiple technology brands.",
  },
  {
    page: "",
    order: 0,
    path: "stats.2.label",
    // The figure is a count of brands in the catalogue. "Vendors supplied" read
    // as a claim to supply those companies.
    from: "Vendors supplied",
    to: "Technology brands",
  },
  {
    page: "",
    order: 2,
    path: "items.1.detail",
    from: "Direct vendor relationships",
    to: "Authorised to resell, direct from the publisher",
  },
  {
    page: "",
    order: 3,
    path: "description",
    from: "Browse by what the software does rather than who publishes it — most procurement decisions start with a capability, not a vendor.",
    to: "Browse by what the software does rather than who publishes it — most procurement decisions start with a capability, not a publisher.",
  },
  {
    page: "",
    order: 5,
    path: "description",
    from: "A single technology refresh can involve four publishers, two hardware vendors and a services engagement. Handled directly, that is seven vendor relationships for one project.",
    to: "A single technology refresh can involve four software publishers, two hardware manufacturers and a services engagement. Bought directly, that is seven supplier relationships for one project.",
  },
  {
    page: "",
    order: 7,
    path: "items.0.title",
    from: "Multi-vendor sourcing",
    to: "Multi-brand sourcing",
  },
  {
    page: "",
    order: 7,
    path: "items.0.body",
    from: "One requirement covering Microsoft, Adobe, Autodesk, Zoho and infrastructure vendors, sourced together rather than chased separately.",
    to: "One requirement covering Microsoft, Adobe, Autodesk, Zoho and infrastructure manufacturers, sourced together rather than chased separately.",
  },
  {
    page: "",
    order: 7,
    path: "items.1.body",
    from: "A single itemised quotation across every vendor, with each line priced individually so nothing is hidden inside a bundle.",
    to: "A single itemised quotation across every brand, with each line priced individually so nothing is hidden inside a bundle.",
  },
  {
    page: "",
    order: 14,
    path: "items.1.body",
    from: "Across vendors, including the alternative you did not ask about if it fits better.",
    to: "Across brands, including the alternative you did not ask about if it fits better.",
  },
  {
    page: "",
    order: 15,
    path: "eyebrow",
    from: "Vendors",
    to: "Technology brands",
  },
  {
    page: "",
    order: 15,
    path: "heading",
    from: "Licensing across the vendors you already use",
    to: "Licensing across the technology brands you already use",
  },
  {
    page: "",
    order: 15,
    path: "action.label",
    from: "All vendors",
    to: "All brands",
  },
  {
    // The section the brief asks to make explicit: a grid of other companies'
    // logos says nothing about the direction of the relationship on its own.
    page: "",
    order: 15,
    path: "description",
    from: null,
    to: "These are the software publishers and hardware manufacturers we are authorised to resell. We source their products, licence them to you and support them — you hold one commercial relationship, with us.",
  },

  // ── Enterprise ────────────────────────────────────────────────────────────
  {
    page: "enterprise",
    order: 0,
    path: "subheadline",
    from: "A single technology refresh can involve four publishers, two hardware vendors and a services engagement. Handled directly, that is seven vendor relationships, seven quotation formats, seven purchase orders and seven sets of invoices — for one project.",
    to: "A single technology refresh can involve four software publishers, two hardware manufacturers and a services engagement. Bought directly, that is seven supplier relationships, seven quotation formats, seven purchase orders and seven sets of invoices — for one project.",
  },
  {
    page: "enterprise",
    order: 1,
    path: "heading",
    from: "Consolidating vendors including",
    to: "Consolidating procurement across brands including",
  },
  {
    page: "enterprise",
    order: 2,
    path: "items.0.title",
    from: "Multi-vendor procurement",
    to: "Multi-brand procurement",
  },
  {
    page: "enterprise",
    order: 2,
    path: "items.2.body",
    from: "Your finance team raises one PO covering the whole quotation rather than one per vendor, regardless of how many publishers it spans.",
    to: "Your finance team raises one PO covering the whole quotation rather than one per supplier, regardless of how many publishers it spans.",
  },
  {
    page: "enterprise",
    order: 2,
    path: "items.4.body",
    from: "Seat assignment and reclamation handled as staff join and leave, with a consolidated position across publishers rather than one portal per vendor.",
    to: "Seat assignment and reclamation handled as staff join and leave, with a consolidated position across publishers rather than one portal per publisher.",
  },
  {
    page: "enterprise",
    order: 3,
    path: "items.0",
    from: "Consolidation pays for itself where vendor count and administrative overhead have grown faster than the IT team.",
    to: "Consolidation pays for itself where supplier count and administrative overhead have grown faster than the IT team.",
  },
  {
    page: "enterprise",
    order: 3,
    path: "items.2",
    from: "Finance teams reconciling invoices across multiple vendors and currencies",
    to: "Finance teams reconciling invoices across multiple suppliers and currencies",
  },

  // ── About ─────────────────────────────────────────────────────────────────
  {
    page: "about",
    order: 0,
    path: "headline",
    from: "One procurement relationship for a multi-vendor technology stack",
    to: "One procurement relationship for a multi-brand technology stack",
  },
  {
    page: "about",
    order: 0,
    path: "subheadline",
    from: "We supply enterprise software licensing, cloud services and IT solutions across Microsoft, Adobe, Autodesk, Zoho and enterprise infrastructure vendors — and the deployment, licence management and support that make them work.",
    to: "We supply enterprise software licensing, cloud services and IT solutions across Microsoft, Adobe, Autodesk, Zoho and enterprise infrastructure manufacturers — and the deployment, licence management and support that make them work.",
  },
  {
    page: "about",
    order: 1,
    path: "markdown",
    from: "A single technology refresh can involve four publishers, two hardware vendors and a services engagement. Handled directly, that is seven vendor relationships, seven quotation formats and seven sets of invoices for one project.",
    to: "A single technology refresh can involve four software publishers, two hardware manufacturers and a services engagement. Bought directly, that is seven supplier relationships, seven quotation formats and seven sets of invoices for one project.",
    partial: true,
  },
  {
    // The worst of them: a grid of other companies' logos, headed as though
    // they were this company's customers.
    page: "about",
    order: 3,
    path: "heading",
    from: "Vendors we supply",
    to: "Technology brands we are authorised to resell",
  },
  {
    page: "about",
    order: 3,
    path: "description",
    from: "Licensing and solutions across the vendors most organisations already use.",
    to: "We buy from these publishers and manufacturers and supply their products to you — licensing and solutions across the technology brands most organisations already use.",
  },
  {
    page: "about",
    order: 3,
    path: "action.label",
    from: "All vendors",
    to: "All brands",
  },
  {
    page: "about",
    order: 4,
    path: "footnote",
    from: "Nothing here implies endorsement by, or affiliation with, those vendors beyond a commercial reselling relationship.",
    to: "Nothing here implies endorsement by, or affiliation with, those brand owners beyond a commercial reselling relationship.",
    partial: true,
  },

  // ── Terms ─────────────────────────────────────────────────────────────────
  {
    page: "terms",
    order: 7,
    path: "markdown",
    from: "Microsoft, Adobe, Autodesk, Zoho and every other vendor set their own",
    to: "Microsoft, Adobe, Autodesk, Zoho and every other publisher set their own",
    partial: true,
  },
  {
    page: "terms",
    order: 13,
    path: "markdown",
    from: "Where we describe ourselves as a partner of a vendor, that describes a reselling or programme relationship of the kind that vendor operates. It is not a claim to act as that vendor's agent, and we cannot bind a vendor.",
    to: "Where we describe ourselves as a partner of a publisher or manufacturer, that describes a reselling or programme relationship of the kind that company operates. It is not a claim to act as its agent, and we cannot bind it.",
    partial: true,
  },

  // ── Zoho pages ────────────────────────────────────────────────────────────
  {
    page: "zoho",
    order: 20,
    path: "markdown",
    from: "one vendor covering CRM, accounting, service desk and collaboration",
    to: "one publisher covering CRM, accounting, service desk and collaboration",
    partial: true,
  },
  {
    page: "zoho-workplace",
    order: 30,
    path: "items.3",
    from: "Companies wanting one vendor across business applications and collaboration",
    to: "Companies wanting one publisher across business applications and collaboration",
  },
];

function readPath(object, path) {
  return path.split(".").reduce((value, key) => (value == null ? value : value[key]), object);
}

function writePath(object, path, next) {
  const keys = path.split(".");
  const last = keys.pop();
  const parent = keys.reduce((value, key) => value[key], object);
  parent[last] = next;
}

const prisma = new PrismaClient();

let applied = 0;
let alreadyDone = 0;
const problems = [];

// Grouped by page and block so each row is written once even when several
// strings on it change.
const byBlock = new Map();
for (const edit of EDITS) {
  const key = `${edit.page} ${edit.order}`;
  if (!byBlock.has(key)) byBlock.set(key, []);
  byBlock.get(key).push(edit);
}

for (const [key, edits] of byBlock) {
  const [slug, order] = key.split(" ");

  const page = await prisma.page.findUnique({
    where: { slug },
    select: { id: true, sections: { select: { id: true, displayOrder: true, data: true } } },
  });

  if (!page) {
    problems.push(`page "${slug}" not found`);
    continue;
  }

  const section = page.sections.find((s) => s.displayOrder === Number(order));
  if (!section) {
    problems.push(`page "${slug}" has no block at position ${order}`);
    continue;
  }

  const data = structuredClone(section.data);
  let changed = false;

  for (const edit of edits) {
    const current = readPath(data, edit.path);

    // An edit that adds a field where none existed.
    if (edit.from === null) {
      if (typeof current === "string" && current.length > 0) {
        if (current === edit.to) alreadyDone += 1;
        else problems.push(`${slug || "(home)"} #${order} ${edit.path}: already has other text`);
        continue;
      }
      writePath(data, edit.path, edit.to);
      changed = true;
      applied += 1;
      continue;
    }

    if (typeof current !== "string") {
      problems.push(`${slug || "(home)"} #${order} ${edit.path}: not a string`);
      continue;
    }

    // `partial` edits change a sentence inside a longer document; the rest
    // replace a whole field.
    const matches = edit.partial ? current.includes(edit.from) : current === edit.from;
    const done = edit.partial ? current.includes(edit.to) : current === edit.to;

    if (done) {
      alreadyDone += 1;
      continue;
    }
    if (!matches) {
      problems.push(`${slug || "(home)"} #${order} ${edit.path}: text has changed, left alone`);
      continue;
    }

    writePath(data, edit.path, edit.partial ? current.replace(edit.from, edit.to) : edit.to);
    changed = true;
    applied += 1;
  }

  if (changed) {
    await prisma.pageSection.update({ where: { id: section.id }, data: { data } });
  }
}

console.log(`${applied} string(s) rewritten, ${alreadyDone} already correct.`);
if (problems.length) {
  console.log("\nNOT APPLIED:");
  for (const problem of problems) console.log("  " + problem);
  process.exitCode = 1;
}

await prisma.$disconnect();
