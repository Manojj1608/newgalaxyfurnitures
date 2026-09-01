/**
 * Unit tests for the logo source guard (task 11.1).
 *
 * Validates: Requirements 2.41, 3.23, 2.42
 */
import { describe, expect, it } from "vitest";
import { LOGO_IMG_CLASS, resolveLogoSrc } from "./logo";

describe("resolveLogoSrc", () => {
  const absentCases: [string | null | undefined, string][] = [
    [null, "null"],
    [undefined, "undefined"],
    ["", "an empty string"],
    ["   ", "whitespace only"],
    ["javascript:alert(1)", "a hostile scheme"],
    ["ftp://x/y.png", "a non-http scheme"],
    ["data:text/html,<script>", "a non-image data URL"],
    ["logo.png", "a bare relative filename"],
    ["//cdn.test/logo.png", "a protocol-relative URL"],
  ];
  it.each(absentCases)(
    "treats %s (%s) as absent so the monogram fallback is reachable",
    (value) => {
      expect(resolveLogoSrc(value)).toBeNull();
    },
  );

  it.each(["https://cdn.test/logo.png", "http://cdn.test/logo.png", "HTTPS://CDN.TEST/LOGO.PNG"])(
    "accepts the http(s) URL %s",
    (value) => {
      expect(resolveLogoSrc(value)).toBe(value);
    },
  );

  it("accepts an image data URL", () => {
    expect(resolveLogoSrc("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });

  it("trims surrounding whitespace on an otherwise valid URL", () => {
    expect(resolveLogoSrc("  https://cdn.test/logo.png  ")).toBe("https://cdn.test/logo.png");
  });

  it("constrains rendered size so a wrong-ratio image cannot distort the header", () => {
    expect(LOGO_IMG_CLASS).toContain("object-contain");
    expect(LOGO_IMG_CLASS).toContain("max-h-9");
    expect(LOGO_IMG_CLASS).toContain("w-auto");
  });
});
