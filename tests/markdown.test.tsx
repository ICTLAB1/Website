import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMarkdown, renderInline } from "@/components/markdown";

/**
 * The renderer's contract is that authored content can never become markup.
 * These tests pin that, because it is the reason no HTML sanitiser is needed
 * anywhere in the CMS.
 */
const html = (body: string) => renderToStaticMarkup(<>{renderMarkdown(body)}</>);

describe("renderMarkdown", () => {
  it("renders headings, lists, quotes and paragraphs", () => {
    expect(html("## Heading")).toContain("<h2>Heading</h2>");
    expect(html("### Sub")).toContain("<h3>Sub</h3>");
    expect(html("- one\n- two")).toContain("<ul>");
    expect(html("1. one\n2. two")).toContain("<ol>");
    expect(html("> quoted")).toContain("<blockquote");
    expect(html("plain text")).toContain("<p>");
  });

  it("renders bold as an element, not as markup in text", () => {
    expect(html("a **bold** word")).toContain("<strong>bold</strong>");
  });

  it("never emits author-supplied HTML", () => {
    const attack = '<script>alert(1)</script> and <img src=x onerror=alert(1)>';
    const out = html(attack);

    // What matters is that no tag is ever opened. `onerror=` may appear as
    // escaped text inside a text node, which is inert - so assert on the
    // absence of an unescaped `<`, not on the absence of the substring.
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapes HTML inside every block form, not just paragraphs", () => {
    for (const body of ["## <script>x</script>", "- <script>x</script>", "> <script>x</script>"]) {
      expect(html(body)).not.toContain("<script>");
    }
  });

  it("treats a blank line as a block separator", () => {
    const out = html("first\n\nsecond");
    expect(out.match(/<p>/g)).toHaveLength(2);
  });

  it("collapses single newlines inside a paragraph", () => {
    expect(html("one\ntwo")).toContain("one two");
  });

  it("survives empty and whitespace-only input", () => {
    expect(html("")).toBe("");
    expect(html("\n\n   \n\n")).toBe("");
  });

  it("only treats a block as a list when every line is a list item", () => {
    // A stray leading dash must not turn prose into a list.
    expect(html("- item\nnot an item")).not.toContain("<ul>");
  });
});

describe("renderInline", () => {
  it("returns plain text unchanged", () => {
    expect(renderToStaticMarkup(<>{renderInline("plain")}</>)).toContain("plain");
  });

  it("leaves an unmatched asterisk pair alone", () => {
    const out = renderToStaticMarkup(<>{renderInline("a ** b")}</>);
    expect(out).not.toContain("<strong>");
  });
});
