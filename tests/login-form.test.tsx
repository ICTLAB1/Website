import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/login" }));

import { LoginForm } from "@/components/auth/login-form";

describe("the sign-in form", () => {
  const html = renderToStaticMarkup(<LoginForm />);

  it("still asks for a business email and a password, as before", () => {
    expect(html).toMatch(/Business email/);
    expect(html).toMatch(/name="email"[^>]*type="email"|type="email"[^>]*name="email"/);
    expect(html).toMatch(/name="password"[^>]*type="password"|type="password"[^>]*name="password"/);
    expect(html).toMatch(/autoComplete="current-password"/i);
  });

  it("keeps the forgot-password route and the Sign in button", () => {
    expect(html).toContain('href="/forgot-password"');
    expect(html).toMatch(/>Sign in</);
  });

  it("offers a show/hide control that does not use the word password in its name", () => {
    // Existing browser checks find the field by getByLabel("Password"); a second control with that word would be ambiguous.
    expect(html).toContain('aria-label="Show characters"');
    expect(html).not.toMatch(/aria-label="[^"]*password/i);
  });

  it("says the remembered value is the email address only", () => {
    expect(html).toMatch(/not your password/);
  });
});
