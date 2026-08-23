import { PrismaClient } from "@prisma/client";

/**
 * Verifies the CMS behaves correctly at the edges.
 *
 * The properties that matter are not "does a page render" — the content diff
 * covered that — but what happens around the edges: a page created after the
 * build, an unpublished page, and a block whose stored payload no longer
 * matches its schema.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const prisma = new PrismaClient();

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
const check = (name: string, ok: boolean, detail = "") => results.push({ name, ok, detail });

async function status(path: string): Promise<number> {
  const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return response.status;
}

async function body(path: string): Promise<string> {
  const response = await fetch(`${BASE}${path}`);
  return response.text();
}

/** The data cache holds misses briefly; poll rather than assume immediacy. */
async function waitForStatus(path: string, want: number, timeoutMs = 90_000): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let last = 0;
  while (Date.now() < deadline) {
    last = await status(path);
    if (last === want) return last;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return last;
}

async function main() {
  const stamp = Date.now().toString().slice(-6);
  const slug = `verify-cms-${stamp}`;

  check("an unknown slug 404s", (await status(`/${slug}`)) === 404);

  // ---------------------------------------- a page created after the build
  const page = await prisma.page.create({
    data: {
      slug,
      title: `Verify ${stamp}`,
      description: "Created by the CMS verification suite.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      keywords: [],
      breadcrumb: [{ label: "Home", href: "/" }],
      sections: {
        create: [
          {
            type: "HERO",
            displayOrder: 10,
            data: { headline: `Created after the build ${stamp}`, tone: "dark", showSearch: false },
          },
          { type: "RICH_TEXT", displayOrder: 20, data: { markdown: `Body copy ${stamp}.` } },
        ],
      },
    },
    select: { id: true },
  });

  const created = await waitForStatus(`/${slug}`, 200);
  check("a page created after the build renders on demand", created === 200, `status ${created}`);
  if (created === 200) {
    const html = await body(`/${slug}`);
    check("its blocks render", html.includes(`Created after the build ${stamp}`) && html.includes(`Body copy ${stamp}`));
  }

  // ---------------------------------------------- a draft page is not public
  await prisma.page.update({ where: { id: page.id }, data: { status: "DRAFT" } });
  const drafted = await waitForStatus(`/${slug}`, 404);
  check("an unpublished page 404s rather than leaking", drafted === 404, `status ${drafted}`);
  await prisma.page.update({ where: { id: page.id }, data: { status: "PUBLISHED" } });
  await waitForStatus(`/${slug}`, 200);

  // ------------------------- a corrupt block costs a section, not the page
  const section = await prisma.pageSection.findFirst({
    where: { pageId: page.id, type: "RICH_TEXT" },
    select: { id: true },
  });
  if (section) {
    // Simulates a row written by an older version of the application.
    await prisma.pageSection.update({
      where: { id: section.id },
      data: { data: { body: ["an old shape the renderer does not know"] } },
    });

    const deadline = Date.now() + 90_000;
    let html = "";
    while (Date.now() < deadline) {
      html = await body(`/${slug}`);
      if (!html.includes(`Body copy ${stamp}`)) break;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    check(
      "a block with an unrecognised payload is skipped, not fatal",
      (await status(`/${slug}`)) === 200 && html.includes(`Created after the build ${stamp}`),
      `page still 200 and the valid hero still renders`,
    );
    check("the invalid block itself does not render", !html.includes("an old shape"));
  }

  /*
   * Delete it, and delete any that an earlier run abandoned.
   *
   * This ran only if everything above it succeeded, so a failed assertion or a
   * slow response left a PUBLISHED page behind — and a published page is in the
   * sitemap, which means it was being submitted to Google. One had been sitting
   * there since 21 August: six words of fixture text, indexed as real content.
   *
   * The sweep is what makes this self-healing rather than merely correct from
   * now on. `verify-cms-` is this suite's own prefix and nothing else uses it.
   */
  await prisma.page.delete({ where: { id: page.id } });
  const abandoned = await prisma.page.deleteMany({
    where: { slug: { startsWith: "verify-cms-" } },
  });
  if (abandoned.count > 0) {
    console.log(`    (removed ${abandoned.count} page(s) left by an earlier run)`);
  }
  check("cleanup removed the test page", (await prisma.page.count({ where: { slug } })) === 0);
  check(
    "and no fixture page is left published anywhere",
    (await prisma.page.count({ where: { slug: { startsWith: "verify-cms-" } } })) === 0,
  );

  /*
   * Every curated product grid still has products in it.
   *
   * A PRODUCT_GRID with `source: "manual"` names its products by slug. Archive
   * one — which a catalogue import does, replacing sample data with real —
   * and the grid quietly renders "No products to show" on a live landing page.
   * That happened: importing the Microsoft price list emptied eleven pages,
   * including /windows-server and /sql-server entirely, and nothing failed.
   *
   * This is the check that would have caught it in the same minute.
   */
  const manualGrids = await prisma.pageSection.findMany({
    where: { type: "PRODUCT_GRID" },
    select: { data: true, page: { select: { slug: true, status: true } } },
  });

  const live = new Set(
    (
      await prisma.product.findMany({
        where: { status: "ACTIVE", deletedAt: null },
        select: { slug: true },
      })
    ).map((product) => product.slug),
  );

  const broken: string[] = [];
  for (const grid of manualGrids) {
    if (grid.page.status !== "PUBLISHED") continue;
    const data = grid.data as { source?: string; slugs?: string[] } | null;
    if (data?.source !== "manual") continue;
    const slugs = data.slugs ?? [];
    if (slugs.length === 0) continue;
    const missing = slugs.filter((entry) => !live.has(entry));
    if (missing.length === slugs.length) {
      broken.push(`/${grid.page.slug} — every product is gone (${missing.join(", ")})`);
    } else if (missing.length > 0) {
      broken.push(`/${grid.page.slug} — ${missing.length}/${slugs.length}: ${missing.join(", ")}`);
    }
  }

  check(
    "every curated product grid still resolves to live products",
    broken.length === 0,
    broken.slice(0, 4).join(" | "),
  );

  await prisma.$disconnect();

  for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} CMS checks passed`);
  process.exit(failed ? 1 : 0);
}

void main();
