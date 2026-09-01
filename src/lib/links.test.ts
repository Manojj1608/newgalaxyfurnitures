/**
 * Unit tests for hero CTA link classification (task 11.1).
 *
 * Validates: Requirements 2.29, 2.42
 */
import { describe, expect, it } from "vitest";
import { classifyLink, isRegisteredRoute } from "./links";

describe("classifyLink", () => {
  it.each(["#collections", "#top", "#a-b_c"])("treats %s as an in-page anchor", (v) => {
    expect(classifyLink(v)).toEqual({ kind: "anchor", href: v });
  });

  it.each(["https://example.com", "http://example.com/x?y=1", "HTTPS://EXAMPLE.COM"])(
    "treats %s as external",
    (v) => {
      expect(classifyLink(v).kind).toBe("external");
    },
  );

  it.each(["/", "/admin/login", "/product/oak-dining-table"])(
    "treats the registered route %s as internal",
    (v) => {
      expect(classifyLink(v)).toEqual({ kind: "internal", href: v });
    },
  );

  it.each([
    ["/not-a-route", "an unregistered path"],
    ["/checkout", "another unregistered path"],
    ["/product", "the product prefix with no slug"],
    ["/product/a/b", "a too-deep product path"],
    ["/admin", "the admin index (deliberately excluded from CTAs)"],
    ["/admin/dashboard", "the dashboard (deliberately excluded)"],
    ["javascript:alert(1)", "a hostile scheme"],
    ["mailto:a@b.test", "a mailto"],
    ["//evil.test", "a protocol-relative URL"],
    ["", "an empty value"],
    ["   ", "whitespace only"],
    ["nonsense", "a bare word"],
  ])("yields no CTA for %s (%s)", (v) => {
    expect(classifyLink(v).kind).toBe("none");
  });

  it("treats null and undefined as no CTA", () => {
    expect(classifyLink(null).kind).toBe("none");
    expect(classifyLink(undefined).kind).toBe("none");
  });

  it("trims surrounding whitespace before classifying", () => {
    expect(classifyLink("  /  ").kind).toBe("internal");
    expect(classifyLink("  https://example.com  ").kind).toBe("external");
  });

  it("never returns a non-empty href for a 'none' classification", () => {
    expect(classifyLink("/not-a-route").href).toBe("");
  });
});

describe("isRegisteredRoute", () => {
  it("ignores a query string or fragment when matching", () => {
    expect(isRegisteredRoute("/product/oak-table?ref=hero")).toBe(true);
    expect(isRegisteredRoute("/#section")).toBe(true);
  });

  it("rejects unregistered paths", () => {
    expect(isRegisteredRoute("/collections/sofas")).toBe(false);
  });
});
