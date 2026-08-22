import { readUpload } from "@/lib/uploads";

/**
 * Serves an uploaded file.
 *
 * A route rather than a folder under `public/`, because uploads live on a
 * volume outside the application — that is what lets them survive a rebuild —
 * and because the headers below matter more than the convenience.
 *
 * ## The SVG problem
 *
 * An SVG is a document, not a picture. It may contain `<script>`, and a browser
 * navigating straight to one runs that script on this origin, which is the
 * whole of a stored cross-site scripting attack. Rendering it inside `<img>`
 * does not — but nothing stops somebody visiting the file's URL directly.
 *
 * Vector logos are the point of accepting SVG at all, so it is neutralised
 * here rather than banned:
 *
 *  - `content-security-policy: default-src 'none'; …; sandbox` — no script, no
 *    fetches, no plugins, and an opaque origin, so even a script that ran would
 *    have nothing to reach.
 *  - `x-content-type-options: nosniff` — the browser must honour the type sent,
 *    so a PNG cannot be re-read as HTML.
 *  - `content-disposition: inline; filename=…` — named, and never treated as a
 *    top-level document to be interpreted.
 *
 * The type is taken from the file's own bytes, never from the request or from
 * anything stored alongside it.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;

  const file = await readUpload(name);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.body), {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.body.length),
      "content-disposition": `inline; filename="${name}"`,
      "x-content-type-options": "nosniff",
      "content-security-policy":
        "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      /*
       * A year, and immutable. The filename is a digest of the contents, so a
       * changed file is a different URL by construction and a stale cache is
       * not a state this can reach.
       */
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
