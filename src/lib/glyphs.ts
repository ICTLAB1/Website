/**
 * One glyph per key, drawn on a 20×20 grid as a single stroked path.
 *
 * One map rather than one per component. Category cards had these to
 * themselves until industry cards needed the same vocabulary, and two copies of
 * a glyph set is two places for a drawing to be improved in only one.
 *
 * `workspace` used to be a wide bar over two boxes, which was meant to read as
 * a window layout and read instead as a shopfront with an awning — a building,
 * on the two most prominent cards on the homepage, for a company that sells
 * software licences. It is now two overlapping panels: a document in front of a
 * window, which is what productivity and collaboration actually look like.
 */
export const GLYPHS: Record<string, string> = {
  workspace: "M2 4h11v9H2zM2 7h11M6 16h10V8h-3",
  document: "M5 2h7l4 4v12H5zM12 2v4h4",
  mail: "M2 5h16v10H2zM2 5l8 6 8-6",
  creative: "M10 2 3 6v8l7 4 7-4V6zM10 2v16M3 6l7 4 7-4",
  cad: "M3 3h14v14H3zM3 8h14M8 3v14",
  media: "M2 4h16v12H2zM7 8l5 2-5 2z",
  construction: "M2 16h16v2H2zM4 16V8l6-4 6 4v8",
  business: "M3 7h14v10H3zM7 7V4h6v3",
  finance: "M3 16V9M8 16V5M13 16v-6M18 16V7",
  support: "M10 2a6 6 0 0 0-6 6v3a3 3 0 0 0 3 3h1V9H6V8a4 4 0 0 1 8 0v1h-2v5h1a3 3 0 0 0 3-3V8a6 6 0 0 0-6-6",
  os: "M2 4h16v10H2zM7 17h6M10 14v3",
  server: "M3 3h14v5H3zM3 12h14v5H3zM6 5.5h.01M6 14.5h.01",
  database: "M10 2c4 0 7 1 7 2.5S14 7 10 7 3 6 3 4.5 6 2 10 2M3 4.5v10C3 16 6 17 10 17s7-1 7-2.5v-10",
  chart: "M3 17V3M3 17h14M7 13v-4M11 13V7M15 13V5",
  cloud: "M6 15a4 4 0 0 1 .5-7.97A5 5 0 0 1 16 8.5a3.5 3.5 0 0 1-.5 6.5z",
  shield: "M10 2 4 4.5v5c0 4 2.5 7 6 8.5 3.5-1.5 6-4.5 6-8.5v-5z",
  key: "M13 2a5 5 0 0 0-4.9 6L2 14.1V18h4v-2h2v-2h2l1.9-1.9A5 5 0 1 0 13 2m1 4h.01",
  storage: "M3 5h14v4H3zM3 11h14v4H3zM6 7h.01M6 13h.01",
  network: "M10 2v4M4 14v-4h12v4M4 14H2v4h4v-4zM14 14h-2v4h4v-4zM8 2h4v4H8z",
  desktop: "M2 3h16v10H2zM7 17h6M10 13v4",
};

/** The drawing for a key, falling back rather than rendering an empty box. */
export function glyph(key: string | null | undefined): string {
  return GLYPHS[key ?? ""] ?? GLYPHS.workspace!;
}
