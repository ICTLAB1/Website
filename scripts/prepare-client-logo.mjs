import sharp from "sharp";
import { statSync } from "node:fs";
import { basename, extname, join } from "node:path";

/**
 * Prepares a supplied organisation mark for `public/clients/`.
 *
 *     node scripts/prepare-client-logo.mjs <source> <name>
 *     node scripts/prepare-client-logo.mjs ~/BARC.png barc
 *
 * Writes `public/clients/<name>.webp`.
 *
 * ## What it does, and what it deliberately does not
 *
 * Three operations, all of them about the plate the mark arrives on rather
 * than about the mark:
 *
 *  1. **Trim the uniform border.** Supplied artwork usually arrives on a
 *     canvas larger than the mark — transparent, or a flat white plate. That
 *     margin is packaging, not artwork, and leaving it on makes the mark
 *     render smaller than every other one in the line for a reason that is not
 *     about the mark.
 *  2. **Flatten a near-white plate to white.** A mark exported from a document
 *     often carries an off-white background — the RITES file is 252,251,252 —
 *     and 252 against the site's 255 is a faint grey rectangle behind the
 *     logo, plainly visible on the belt. Only pixels already within a few
 *     units of white are moved, so this cannot touch a colour that is part of
 *     the artwork: the greens, reds and blues in these emblems are hundreds of
 *     units away. It runs before the trim, so a plate that is off-white in one
 *     corner and white in another still trims as one border.
 *  3. **Scale to a common height.** 200px, the height the existing nine were
 *     prepared at, with the aspect ratio preserved exactly.
 *
 * None of the three alters an emblem. Nothing here recolours, crops into or recomposes
 * one, and it must not be extended to: most institutional brand programmes
 * prohibit it outright, and an altered mark is no longer the one that was
 * licensed. A supplied file that needs more than these two operations to look
 * right — a mark embedded in a banner, say, or one printed over a photograph —
 * is the wrong file, and the answer is to ask for the mark rather than to cut
 * it out of the picture.
 *
 * The flatten onto white is not a third operation on the artwork: it is the
 * background the mark is shown against on the site — both the belt chip and
 * the wall cell are white — written into the file rather than composited by
 * the browser. It also lets the trim find a white plate and a transparent
 * margin with the same threshold.
 */

/** The height every mark in the line shares. */
const HEIGHT = 200;

const [source, requested] = process.argv.slice(2);
if (!source) {
  console.error("usage: node scripts/prepare-client-logo.mjs <source> [name]");
  process.exit(1);
}

const name = requested ?? basename(source, extname(source)).toLowerCase();
const out = join("public/clients", `${name}.webp`);

/**
 * How close to white a pixel has to be to count as the plate rather than the
 * artwork. Deliberately tight. The off-white plates seen so far are 3–4 units
 * from white; the lightest colour inside any of these emblems is the white
 * *inside* the mark, which is 255 already and unaffected either way.
 */
const PLATE_TOLERANCE = 8;

const before = await sharp(source).metadata();

const { data, info } = await sharp(source)
  .flatten({ background: "#ffffff" })
  .raw()
  .toBuffer({ resolveWithObject: true });

let plate = 0;
for (let i = 0; i < data.length; i += info.channels) {
  if (
    data[i] >= 255 - PLATE_TOLERANCE &&
    data[i + 1] >= 255 - PLATE_TOLERANCE &&
    data[i + 2] >= 255 - PLATE_TOLERANCE &&
    (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255)
  ) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    plate += 1;
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
  // A threshold rather than an exact match: a scan-sourced plate can be 250 in
  // one corner and 255 in another, and an exact trim then finds no border at
  // all.
  .trim({ background: "#ffffff", threshold: 12 })
  .resize({ height: HEIGHT, fit: "inside", withoutEnlargement: false })
  .webp({ lossless: true })
  .toFile(out);

const after = await sharp(out).metadata();
const ratio = (n) => (n.width / n.height).toFixed(3);

console.log(`${source}\n  → ${out}`);
console.log(`  ${before.width}×${before.height} (${ratio(before)}) → ${after.width}×${after.height} (${ratio(after)})`);

// The aspect ratio is the thing that must not move. A mark that arrives
// square and leaves at 1.02 has been stretched, and nobody spots two per cent
// by eye — but the trim legitimately changes it, so this reports rather than
// asserts, and the number to compare is the trimmed one against what you see.
console.log(`  ${(statSync(out).size / 1024).toFixed(1)} KB, lossless`);
if (plate > 0) {
  const share = ((plate / (info.width * info.height)) * 100).toFixed(1);
  console.log(`  near-white plate flattened to white on ${share}% of the pixels`);
}
