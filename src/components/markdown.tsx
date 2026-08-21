import type { ReactNode } from "react";

/**
 * Minimal, deliberately restrictive Markdown rendering.
 *
 * Only headings, blockquotes, lists, bold and paragraphs are recognised, and
 * every piece of text is rendered as a React text node rather than as HTML — so
 * authored content cannot inject markup. This is what makes it safe to let
 * administrators write page and article copy without sanitising HTML on every
 * render: there is no HTML path at all.
 *
 * Extracted from the blog route so the CMS prose blocks and blog posts share
 * one renderer, and so a change to what Markdown is supported cannot apply to
 * one surface but not the other.
 */

/** Handles `**bold**` only, as React nodes — never as raw HTML. */
export function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

/**
 * Renders a Markdown-subset string to React elements.
 *
 * Blocks are separated by a blank line. Recognised block forms:
 *   `## `   heading level 2
 *   `### `  heading level 3
 *   `> `    blockquote (consecutive lines are joined)
 *   `- `    unordered list (every line in the block must match)
 *   `1. `   ordered list (every line in the block must match)
 *   otherwise, a paragraph with single newlines collapsed to spaces.
 */
export function renderMarkdown(body: string): ReactNode[] {
  return body.split("\n\n").map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return <h2 key={index}>{trimmed.slice(3)}</h2>;
    }
    if (trimmed.startsWith("### ")) {
      return <h3 key={index}>{trimmed.slice(4)}</h3>;
    }
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={index}
          className="border-l-2 border-accent-600 pl-4 text-[15px] italic text-ink-600"
        >
          {trimmed
            .split("\n")
            .map((line) => line.replace(/^>\s?/, ""))
            .join(" ")}
        </blockquote>
      );
    }

    const lines = trimmed.split("\n");

    if (lines.every((line) => /^[-*]\s/.test(line))) {
      return (
        <ul key={index}>
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{renderInline(line.replace(/^[-*]\s/, ""))}</li>
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
