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

  it("renders italic, and does not mistake it for a list", () => {
    expect(html("a *stressed* word")).toContain("<em>stressed</em>");
    // `* ` is not a list marker precisely because it collides with italic.
    expect(html("*one* and *two*")).not.toContain("<ul>");
    expect(html("- one\n- two")).toContain("<ul>");
  });

  it("renders an internal link", () => {
    const out = html("see the [terms of sale](/terms) for more");
    expect(out).toContain('href="/terms"');
    expect(out).toContain("terms of sale");
  });

  it("opens an external link safely", () => {
    const out = html("[docs](https://example.test/x)");
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it("refuses a dangerous link target, keeping the words", () => {
    // Prose written in the admin panel is an authoring surface like any other,
    // so a link target here is validated by the same schema as a menu item.
    for (const href of ["javascript:alert(1)", "data:text/html,x", "//evil.test", "http://x.test"]) {
      const out = html(`click [here](${href}) now`);
      expect(out, href).not.toContain("<a");
      expect(out, href).toContain("here");
    }
  });

  it("does not let a link label smuggle markup", () => {
    const out = html("[<script>x</script>](/safe)");
    expect(out).not.toContain("<script");
    expect(out).toContain("&lt;script&gt;");
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
