import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { safeTeamImage } from "@/lib/team-image";

/**
 * A portrait's path reaches an `src` attribute from a stored settings row an
 * administrator can edit, so the same two things have to hold as for a
 * programme mark: the path can only name a file this site serves, and the file
 * the site's own content asks for has to actually exist.
 *
 * There is a third thing here that the marks directory does not have to worry
 * about. This is the one directory holding photographs of identifiable people,
 * and the site pairs a portrait with a name from a single settings row so the
 * two cannot drift apart. A path that escaped the directory would be the one
 * image on the site nobody had checked — under somebody's name.
 */

/** The portrait the content migration records, and what the about page asks for. */
const SUPPLIED = "/team/abhinav-jain.webp";

describe("what is accepted", () => {
  it("takes a file in the team directory", () => {
    expect(safeTeamImage(SUPPLIED)).toBe(SUPPLIED);
    expect(safeTeamImage(`  ${SUPPLIED}  `)).toBe(SUPPLIED);
  });

  it("treats nothing at all as nothing, not as an error", () => {
    // A director with no photograph is simply named, which is what the about
    // page did before there was one — not an error to report.
    expect(safeTeamImage(null)).toBeNull();
    expect(safeTeamImage(undefined)).toBeNull();
    expect(safeTeamImage("")).toBeNull();
  });
});

describe("what is refused", () => {
  it("refuses another directory, including the marks and brands ones", () => {
    // The separation is the point: a programme mark states this company is
    // registered, a brand logo identifies a publisher, and a file here is a
    // photograph of a person. None may borrow another's meaning.
    expect(safeTeamImage("/marks/gem.webp")).toBeNull();
    expect(safeTeamImage("/brands/microsoft.svg")).toBeNull();
    expect(safeTeamImage("/logo.png")).toBeNull();
  });

  it("refuses a scheme, a protocol-relative host and a traversal", () => {
    expect(safeTeamImage("https://evil.test/portrait.webp")).toBeNull();
    expect(safeTeamImage("javascript:alert(1)")).toBeNull();
    expect(safeTeamImage("//evil.test/portrait.webp")).toBeNull();
    expect(safeTeamImage("/team/../../etc/passwd")).toBeNull();
    expect(safeTeamImage("/team/portrait.webp?x=1")).toBeNull();
  });

  it("refuses an extension the site does not serve as an image", () => {
    expect(safeTeamImage("/team/portrait.html")).toBeNull();
    expect(safeTeamImage("/team/portrait")).toBeNull();
  });
});

describe("the artwork the seeded content asks for", () => {
  it("exists in public/", () => {
    expect(safeTeamImage(SUPPLIED), `${SUPPLIED} is not a servable portrait`).toBe(SUPPLIED);
    expect(
      existsSync(join(process.cwd(), "public", SUPPLIED)),
      `${SUPPLIED} is missing`,
    ).toBe(true);
  });
});
