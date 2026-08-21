import type { ReactNode } from "react";
import Link from "next/link";
import { safeHref } from "@/lib/blocks/schemas";

/**
 * Minimal, deliberately restrictive Markdown rendering.
 *
 * Only headings, blockquotes, lists, bold, italic, links and paragraphs are
 * recognised, and every piece of text is rendered as a React text node rather
 * than as HTML — so authored content cannot inject markup. This is what makes
 * it safe to let administrators write page and article copy without sanitising
 * HTML on every render: there is no HTML path at all.
 *
 * Extracted from the blog route so the CMS prose blocks and blog posts share
 * one renderer, and so a change to what Markdown is supported cannot apply to
 * one surface but not the other.
 */

/** `**bold**`, `*italic*` and `[text](href)`, in that precedence. */
const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g;

const LINK = /^\[([^\]\n]+)\]\(([^)\s]+)\)$/;

/**
 * Renders inline markup as React nodes — never as raw HTML.
 *
 * A link's target goes through `safeHref`, the same schema that validates a
 * navigation item and a block's call to action. Without it, prose written in
 * the admin panel would be the one authoring surface on the site from which a
 * `javascript:` URL could still reach an anchor. A rejected target degrades to
 * plain text: the words survive, the link does not.
 */
export function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    const link = LINK.exec(part);
    if (link) {
      const label = link[1]!;
      const href = link[2]!;
      if (!safeHref.safeParse(href).success) return label;

      const external = /^https:\/\//.test(href);
      return external ? (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {label}
        </a>
      ) : (
        <Link key={index} href={href} className="underline underline-offset-2">
          {label}
        </Link>
      );
    }

    // A plain segment is returned as a string, not wrapped in a span: React
    // renders it as a text node either way, and the wrapper would otherwise
    // appear in the markup of every heading and paragraph on the site.
    return part;
  });
}

/**
 * Renders a Markdown-subset string to React elements.
 *
 * Blocks are separated by a blank line. Recognised block forms:
 *   `## `   heading level 2
 *   `### `  heading level 3
 *   `> `    blockquote (consecutive lines are joined)
 *   `- `    unordered list (every line in the block must match). `* ` is
 *           deliberately not a list marker: it would collide with `*italic*`.
 *   `1. `   ordered list (every line in the block must match)
 *   otherwise, a paragraph with single newlines collapsed to spaces.
 */
export function renderMarkdown(body: string): ReactNode[] {
  return body.split("\n\n").map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return <h2 key={index}>{renderInline(trimmed.slice(3))}</h2>;
    }
    if (trimmed.startsWith("### ")) {
      return <h3 key={index}>{renderInline(trimmed.slice(4))}</h3>;
    }
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={index}
          className="border-l-2 border-accent-600 pl-4 text-[15px] italic text-ink-600"
        >
          {renderInline(
            trimmed
              .split("\n")
              .map((line) => line.replace(/^>\s?/, ""))
              .join(" "),
          )}
        </blockquote>
      );
    }

    const lines = trimmed.split("\n");

    if (lines.every((line) => /^-\s/.test(line))) {
      return (
        <ul key={index}>
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{renderInline(line.replace(/^-\s/, ""))}</li>
          ))}
        </ul>
      );
    }

    if (lines.every((line) => /^\d+\.\s/.test(line))) {
      return (
        <ol key={index}>
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{renderInline(line.replace(/^\d+\.\s/, ""))}</li>
          ))}
        </ol>
      );
    }

    return <p key={index}>{renderInline(trimmed.replace(/\n/g, " "))}</p>;
  });
}

/** Convenience wrapper carrying the shared prose styling. */
export function Markdown({ body, className }: { body: string; className?: string }) {
  return <div className={className ?? "prose-content text-[16px]"}>{renderMarkdown(body)}</div>;
}
