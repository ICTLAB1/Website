import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Field, Input } from "@/components/ui/form";

/**
 * `Field` labels exactly one control, and has to do so from either side of the
 * server/client boundary.
 *
 * The reason this file exists: `Field` used `Children.only`, which is correct
 * for a child written inside a client component and wrong for the identical
 * child written inside a *server* component — crossing the boundary wraps it in
 * an array. The brand editor is the one admin screen assembled on the server,
 * and it answered 500 while every other form worked, with an error naming a
 * line of React rather than the page.
 *
 * So the array case is pinned here. It is not an exotic input: it is what half
 * the callers in this codebase will hand over the moment somebody writes a form
 * in a server component.
 */
const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe("Field", () => {
  it("labels a control written as a single child", () => {
    const markup = html(
      <Field name="logo" label="Logo file">
        <Input name="logo" />
      </Field>,
    );

    expect(markup).toContain("Logo file");
    expect(markup).toContain("<input");
  });

  it("labels a control that arrives wrapped in an array", () => {
    // What a server component's children look like once serialised.
    const markup = html(
      <Field name="logo" label="Logo file">
        {[<Input key="only" name="logo" />]}
      </Field>,
    );

    expect(markup).toContain("Logo file");
    expect(markup).toContain("<input");
  });

  it("gives the label and the control the same generated id", () => {
    const markup = html(
      <Field name="logo" label="Logo file">
        <Input name="logo" />
      </Field>,
    );

    const forId = /<label[^>]*for="([^"]+)"/.exec(markup)?.[1];
    expect(forId).toBeTruthy();
    // Without this the label is decorative and the field is unlabelled to a
    // screen reader — the whole point of the component.
    expect(markup).toContain(`id="${forId}"`);
  });

  it("marks the control invalid when the field has an error", () => {
    const markup = html(
      <Field name="logo" label="Logo file" error="That is not an image.">
        <Input name="logo" />
      </Field>,
    );

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("That is not an image.");
  });
});
