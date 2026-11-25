#!/usr/bin/env node
/**
 * IndexNow: tells Bing (and through it Copilot and ChatGPT search) which URLs changed, so
 * they are fetched now instead of when a crawler next comes by.
 *
 *   npm run indexnow
 *   SITE=https://techzoidtechnologies.com npm run indexnow
 *   DRY_RUN=1 npm run indexnow          # list what would be sent, send nothing
 *
 * It reads the live sitemap and POSTs every URL in it to api.indexnow.org, in batches under the
 * protocol's limit of 10,000. The key is not a secret: IndexNow requires it to be published at
 * /<key>.txt so the receiver can check that the sender controls the site, and it is.
 *
 * It runs after every deploy (see .github/workflows/deploy.yml). It never fails a deploy: a
 * network error is reported and the exit code stays 0 unless STRICT=1 is set.
 */
const KEY = "376db28d2d32461d696447b385927d46";
const SITE = (process.env.SITE ?? "https://techzoidtechnologies.com").replace(/\/$/, "");
const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH = 10_000;

async function sitemapUrls() {
  // The site may still be restarting just after a deploy: retry for a few minutes.
  let last = "";
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(`${SITE}/sitemap.xml`, { headers: { "user-agent": "techzoid-indexnow" } });
      if (response.ok) {
        const xml = await response.text();
        const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
        if (urls.length > 0) return urls;
        last = "sitemap was empty";
      } else {
        last = `sitemap returned ${response.status}`;
      }
    } catch (error) {
      last = String(error?.message ?? error);
    }
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  throw new Error(`could not read ${SITE}/sitemap.xml: ${last}`);
}

async function main() {
  const host = new URL(SITE).host;
  const all = await sitemapUrls();
  const urls = all.filter((url) => new URL(url).host === host);
  console.log(`${urls.length} URLs from ${SITE}/sitemap.xml` + (urls.length < all.length ? ` (${all.length - urls.length} on another host were left out)` : ""));
  if (urls.length === 0) throw new Error(`the sitemap lists no URL on ${host}; check APP_URL`);
  if (process.env.DRY_RUN) return;

  for (let start = 0; start < urls.length; start += BATCH) {
    const urlList = urls.slice(start, start + BATCH);
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
    });
    // 200 and 202 are both success: the URLs were received (202: the key is still being validated).
    console.log(`batch of ${urlList.length}: HTTP ${response.status}`);
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(`IndexNow answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
  }
}

main().catch((error) => {
  console.error(`IndexNow: ${error.message}`);
  process.exit(process.env.STRICT ? 1 : 0);
});
