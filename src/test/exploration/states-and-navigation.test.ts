/**
 * EXPLORATION TESTS — families C6 "failure rendered as emptiness" (1.23–1.27),
 * C7 "broken interactions" (1.29, 1.31, 1.41) and C5 ordering (1.20).
 *
 * These encode the EXPECTED (post-fix) behaviour from bugfix.md section 2 and are
 * expected to FAIL against unfixed code.
 *
 * Validates: Requirements 2.20, 2.23, 2.24, 2.25, 2.26, 2.27, 2.29, 2.31, 2.41
 */
import { describe, expect, it } from "vitest";

describe("1.23–1.27 — a failed query is never reported as an empty one", () => {
  it("error takes precedence over emptiness", async () => {
    const { queryStateOf } = await import("@/components/site/query-state");

    // This single ordering is the whole 1.23–1.26 family: an error with an empty
    // data default currently renders "No media yet." / "Trash is empty." etc.
    expect(queryStateOf({ isLoading: false, isError: true, data: [] })).toBe("error");
    expect(queryStateOf({ isLoading: false, isError: true, data: undefined })).toBe("error");
  });

  it("distinguishes loading, empty and ready", async () => {
    const { queryStateOf } = await import("@/components/site/query-state");

    expect(queryStateOf({ isLoading: true, isError: false, data: undefined })).toBe("loading");
    expect(queryStateOf({ isLoading: false, isError: false, data: [] })).toBe("empty");
    expect(queryStateOf({ isLoading: false, isError: false, data: [{ id: "x" }] })).toBe("ready");
    expect(queryStateOf({ isLoading: false, isError: false, data: null })).toBe("empty");
  });

  it("a non-collection payload that loaded successfully is 'ready'", async () => {
    const { queryStateOf } = await import("@/components/site/query-state");
    // 1.25: a settings row that genuinely loaded must not be called empty.
    expect(queryStateOf({ isLoading: false, isError: false, data: { id: true } })).toBe("ready");
  });
});

describe("1.29 — hero CTA links are classified, never passed raw to a typed <Link>", () => {
  it("classifies each shape of admin-entered value", async () => {
    const { classifyLink } = await import("@/lib/links");

    expect(classifyLink("#collections").kind).toBe("anchor");
    expect(classifyLink("https://example.com").kind).toBe("external");
    expect(classifyLink("http://example.com/x").kind).toBe("external");
    expect(classifyLink("/").kind).toBe("internal");
    expect(classifyLink("/product/oak-dining-table").kind).toBe("internal");

    // The crash cases: an unregistered path and a hostile scheme must yield no CTA.
    expect(classifyLink("/not-a-route").kind).toBe("none");
    expect(classifyLink("javascript:alert(1)").kind).toBe("none");
    expect(classifyLink("").kind).toBe("none");
    expect(classifyLink(null).kind).toBe("none");
  });

  it("never classifies an unregistered path as internal", async () => {
    const { classifyLink } = await import("@/lib/links");
    for (const value of ["/admin", "/checkout", "/collections/sofas", "/product"]) {
      expect(classifyLink(value).kind).not.toBe("internal");
    }
  });
});

describe("1.20 — reordering siblings that share an ordering value must still move them", () => {
  it("re-sequences densely instead of swapping two identical values", async () => {
    const { resequence } = await import("@/lib/ordering");

    // The 20260802160613 seed gave display_order = 99 to every derived category.
    const siblings = [
      { id: "a", order: 99 },
      { id: "b", order: 99 },
      { id: "c", order: 99 },
    ];

    const moved = resequence(siblings, "c", -1);
    const orders = moved.map((s) => s.order);

    // Dense, distinct, deterministic — and 'c' actually moved up one place.
    expect(new Set(orders).size).toBe(orders.length);
    expect(moved.map((s) => s.id)).toEqual(["a", "c", "b"]);
  });

  it("moving the first item up, or the last down, is a no-op", async () => {
    const { resequence } = await import("@/lib/ordering");
    const siblings = [
      { id: "a", order: 1 },
      { id: "b", order: 2 },
    ];
    expect(resequence(siblings, "a", -1).map((s) => s.id)).toEqual(["a", "b"]);
    expect(resequence(siblings, "b", 1).map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("1.31 — the clipboard only confirms on real success", () => {
  it("returns false when the clipboard write rejects", async () => {
    const { copyToClipboard } = await import("@/lib/clipboard");

    // Clipboard is a BOUNDARY here; the assertion is about our helper's output.
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText: () => Promise.reject(new Error("denied")) } },
      configurable: true,
    });

    await expect(copyToClipboard("https://img.test/a.webp")).resolves.toBe(false);

    Object.defineProperty(globalThis, "navigator", { value: original, configurable: true });
  });

  it("returns true when the clipboard write succeeds", async () => {
    const { copyToClipboard } = await import("@/lib/clipboard");
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText: () => Promise.resolve() } },
      configurable: true,
    });

    await expect(copyToClipboard("https://img.test/a.webp")).resolves.toBe(true);

    Object.defineProperty(globalThis, "navigator", { value: original, configurable: true });
  });
});

describe("1.41 — the logo falls back to the monogram whenever no valid logo is configured", () => {
  it("treats absent, blank and hostile values as 'no logo'", async () => {
    const { resolveLogoSrc } = await import("@/lib/logo");

    expect(resolveLogoSrc(null)).toBeNull();
    expect(resolveLogoSrc("")).toBeNull();
    expect(resolveLogoSrc("   ")).toBeNull();
    expect(resolveLogoSrc("javascript:alert(1)")).toBeNull();
    expect(resolveLogoSrc("ftp://x/y.png")).toBeNull();
  });

  it("accepts http(s) and data URLs", async () => {
    const { resolveLogoSrc } = await import("@/lib/logo");

    expect(resolveLogoSrc("https://cdn.test/logo.png")).toBe("https://cdn.test/logo.png");
    expect(resolveLogoSrc("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });
});
