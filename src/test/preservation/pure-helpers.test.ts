/**
 * PRESERVATION TESTS (task 3) — Property 2: every input outside the bug
 * condition must behave identically before and after the fix.
 *
 * OBSERVATION-FIRST: every expected value below was captured by executing the
 * UNFIXED code and recording its ACTUAL output (see the observation run in the
 * change log). Nothing here asserts assumed behaviour — where the current
 * output is surprising, the surprising value is pinned deliberately and noted.
 *
 * These tests MUST PASS on unfixed code and MUST STILL PASS after the fix.
 *
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5
 */
import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_IMAGE,
  discountPercent,
  effectivePrice,
  formatINR,
  inStock,
  normalizeImages,
  primaryImage,
  slugify,
} from "@/lib/content-types";
import { productEnquiryMessage, whatsappHref } from "@/lib/whatsapp";

const product = (over: Record<string, unknown> = {}) =>
  ({
    id: "p1",
    name: "Oak Dining Table",
    slug: "oak-dining-table",
    sku: "NG-001",
    price: 50000,
    sale_price: null,
    in_stock: true,
    stock_quantity: 3,
    images: [{ url: "https://img.test/a.webp", path: "a.webp" }],
    ...over,
  }) as never;

describe("3.2 — slug generation is unchanged, so every /product/{slug} still resolves", () => {
  it.each([
    ["Oak Dining Table", "oak-dining-table"],
    ["  Sofa & Chair — 'Deluxe' (2024)!  ", "sofa-chair-deluxe-2024"],
    // Accents are stripped as non-alphanumeric — observed, not assumed.
    ["Café Naïve Fauteuil", "caf-na-ve-fauteuil"],
    ["", ""],
    ["---already---slugged---", "already-slugged"],
    ["Table 2 Seater 120cm", "table-2-seater-120cm"],
  ])("slugify(%j) === %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("clamps to 80 characters", () => {
    expect(slugify("x".repeat(100))).toBe("x".repeat(80));
  });
});

describe("3.3 — image normalisation is unchanged, so stored URLs keep rendering", () => {
  it("string entries become url with an empty path", () => {
    expect(normalizeImages(["https://a.test/1.jpg", "https://a.test/2.jpg"])).toEqual([
      { url: "https://a.test/1.jpg", path: "" },
      { url: "https://a.test/2.jpg", path: "" },
    ]);
  });

  it("object entries keep url and path", () => {
    expect(normalizeImages([{ url: "u", path: "p" }])).toEqual([{ url: "u", path: "p" }]);
  });

  it("an object with only a url gets an empty path", () => {
    expect(normalizeImages([{ url: "u" }])).toEqual([{ url: "u", path: "" }]);
  });

  it("malformed entries are dropped entirely", () => {
    expect(normalizeImages([{ path: "p" }, null, 42, undefined, { url: 5 }])).toEqual([]);
  });

  it("non-array input yields an empty list", () => {
    expect(normalizeImages("nope")).toEqual([]);
    expect(normalizeImages(null)).toEqual([]);
  });

  it("mixed valid and invalid entries keep only the valid ones, in order", () => {
    expect(normalizeImages(["s", { url: "u", path: "p" }, {}])).toEqual([
      { url: "s", path: "" },
      { url: "u", path: "p" },
    ]);
  });

  it("3.19 — an imageless product falls back to the inline placeholder", () => {
    expect(primaryImage({ images: [] })).toBe(PLACEHOLDER_IMAGE);
    expect(primaryImage({ images: [{ url: "https://img.test/a.webp", path: "a" }] })).toBe(
      "https://img.test/a.webp",
    );
  });
});

describe("3.5 — price helpers are unchanged", () => {
  it.each([
    ["no sale price", null, 50000],
    ["zero sale price", 0, 50000],
    ["a real sale price", 42000, 42000],
    ["a sale price equal to price", 50000, 50000],
    // A sale price ABOVE list price is still returned — observed baseline quirk.
    ["a sale price above price", 60000, 60000],
  ])("effectivePrice with %s", (_label, sale, expected) => {
    expect(effectivePrice({ price: 50000, sale_price: sale })).toBe(expected);
  });

  it.each([
    ["no sale price", null, null],
    ["zero sale price", 0, null],
    ["a real sale price", 42000, 16],
    ["a sale price equal to price", 50000, null],
    ["a sale price above price", 60000, null],
  ])("discountPercent with %s", (_label, sale, expected) => {
    expect(discountPercent({ price: 50000, sale_price: sale })).toBe(expected);
  });

  it("rounds the discount the same way", () => {
    expect(discountPercent({ price: 30000, sale_price: 19999 })).toBe(33);
  });

  it("formats INR with Indian digit grouping", () => {
    expect(formatINR(50000)).toBe("₹50,000");
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(1234567)).toBe("₹12,34,567");
  });

  it("inStock follows in_stock, including the zero-quantity baseline quirk", () => {
    expect(inStock({ in_stock: true, stock_quantity: 3 })).toBe(true);
    // stock_quantity 0 still reports true on unfixed code — pinned as baseline.
    expect(inStock({ in_stock: true, stock_quantity: 0 })).toBe(true);
    expect(inStock({ in_stock: true, stock_quantity: null })).toBe(true);
    expect(inStock({ in_stock: false, stock_quantity: 5 })).toBe(false);
  });
});

describe("3.4 — the WhatsApp enquiry message is byte-identical", () => {
  it("builds the href by stripping non-digits and encoding the message", () => {
    expect(whatsappHref("+91 90000 00000", "Hi there")).toBe(
      "https://wa.me/919000000000?text=Hi%20there",
    );
  });

  it("includes the SKU line when a sku is present", () => {
    // NOTE: `.filter(Boolean)` also strips the intended blank lines, so the real
    // message has NO empty lines. Pinned exactly as observed.
    expect(productEnquiryMessage(product(), "https://ng.test")).toBe(
      [
        "Hello,",
        "I am interested in:",
        "Product: Oak Dining Table",
        "SKU: NG-001",
        "Price: ₹50,000",
        "Link: https://ng.test/product/oak-dining-table",
        "Image: https://img.test/a.webp",
        "Please share more information.",
      ].join("\n"),
    );
  });

  it("omits the SKU line when there is no sku", () => {
    expect(productEnquiryMessage(product({ sku: null }), "https://ng.test")).toBe(
      [
        "Hello,",
        "I am interested in:",
        "Product: Oak Dining Table",
        "Price: ₹50,000",
        "Link: https://ng.test/product/oak-dining-table",
        "Image: https://img.test/a.webp",
        "Please share more information.",
      ].join("\n"),
    );
  });

  it("uses the sale price when one is set", () => {
    expect(productEnquiryMessage(product({ sale_price: 42000 }), "https://ng.test")).toContain(
      "Price: ₹42,000",
    );
  });

  it("falls back to the placeholder image line when a product has no images", () => {
    expect(productEnquiryMessage(product({ images: [] }), "https://ng.test")).toContain(
      `Image: ${PLACEHOLDER_IMAGE}`,
    );
  });

  it("always contains the product link built from the slug", () => {
    expect(productEnquiryMessage(product({ slug: "teak-bench" }), "https://ng.test")).toContain(
      "Link: https://ng.test/product/teak-bench",
    );
  });
});
