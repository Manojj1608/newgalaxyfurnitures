/**
 * PRESERVATION PROPERTY TESTS (task 3) — generated inputs over the pure helpers
 * that the storefront's URLs, prices and enquiry messages depend on.
 *
 * These assert invariants that hold on UNFIXED code and must continue to hold
 * after the fix, giving stronger preservation guarantees than fixed examples.
 * Subjects are real exported functions in `src/`; no mocks are involved.
 *
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  PLACEHOLDER_IMAGE,
  discountPercent,
  effectivePrice,
  normalizeImages,
  primaryImage,
  slugify,
} from "@/lib/content-types";
import { productEnquiryMessage, whatsappHref } from "@/lib/whatsapp";

describe("slugify invariants (3.2)", () => {
  it("only ever emits [a-z0-9-] and is at most 80 chars", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = slugify(s);
        expect(out).toMatch(/^[a-z0-9-]*$/);
        expect(out.length).toBeLessThanOrEqual(80);
      }),
    );
  });

  it("never has a leading or trailing dash", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = slugify(s);
        expect(out.startsWith("-")).toBe(false);
        expect(out.endsWith("-")).toBe(false);
      }),
    );
  });

  it("is idempotent for any slug short enough not to be re-clamped", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (s) => {
        const once = slugify(s);
        expect(slugify(once)).toBe(once);
      }),
    );
  });
});

describe("normalizeImages invariants (3.3)", () => {
  it("always returns entries with string url and string path", () => {
    const entry = fc.oneof(
      fc.string(),
      fc.record({ url: fc.string(), path: fc.string() }),
      fc.record({ url: fc.string() }),
      fc.record({ path: fc.string() }),
      fc.constant(null),
      fc.integer(),
    );
    fc.assert(
      fc.property(fc.array(entry), (entries) => {
        for (const img of normalizeImages(entries)) {
          expect(typeof img.url).toBe("string");
          expect(typeof img.path).toBe("string");
        }
      }),
    );
  });

  it("never returns more entries than it was given", () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.string(), fc.constant(null))), (entries) => {
        expect(normalizeImages(entries).length).toBeLessThanOrEqual(entries.length);
      }),
    );
  });

  it("primaryImage returns the first url, or the placeholder when there is none", () => {
    // OBSERVED BASELINE, pinned deliberately: the fallback is `?? PLACEHOLDER`,
    // so it triggers only for a nullish url. An image row carrying an EMPTY
    // string url therefore yields "" rather than the placeholder.
    // Counterexample found by this property on unfixed code: [{url:"",path:""}].
    // This is a latent issue outside the 42 defects in bugfix.md and is
    // deliberately NOT fixed here; it is recorded in the change log instead.
    fc.assert(
      fc.property(fc.array(fc.record({ url: fc.string(), path: fc.string() })), (images) => {
        const out = primaryImage({ images });
        if (images.length === 0) {
          expect(out).toBe(PLACEHOLDER_IMAGE);
        } else {
          expect(out).toBe(images[0]!.url);
        }
      }),
    );
  });
});

describe("price helper invariants (3.5)", () => {
  const price = fc.integer({ min: 1, max: 10_000_000 });
  const sale = fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 10_000_000 }));

  it("effectivePrice returns either the price or the sale price, never anything else", () => {
    fc.assert(
      fc.property(price, sale, (p, s) => {
        const out = effectivePrice({ price: p, sale_price: s });
        expect([p, s]).toContain(out);
      }),
    );
  });

  it("discountPercent is null or an integer percentage in 0..100", () => {
    // OBSERVED BASELINE: the result is rounded, so a 99.5% reduction rounds up
    // to exactly 100 (counterexample found by this property: price 200, sale 1),
    // and a sub-0.5% reduction rounds down to 0. Bounds pinned as observed.
    fc.assert(
      fc.property(price, sale, (p, s) => {
        const pct = discountPercent({ price: p, sale_price: s });
        if (pct === null) return;
        expect(Number.isInteger(pct)).toBe(true);
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
      }),
    );
  });

  it("a discount exists exactly when the sale price is a real reduction", () => {
    fc.assert(
      fc.property(price, sale, (p, s) => {
        const isRealReduction = s !== null && s > 0 && s < p;
        expect(discountPercent({ price: p, sale_price: s }) !== null).toBe(isRealReduction);
      }),
    );
  });
});

describe("enquiry message invariants (3.4)", () => {
  it("always names the product, its price line and its link", () => {
    const productArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 60 }),
      slug: fc.stringMatching(/^[a-z0-9-]{1,40}$/),
      sku: fc.oneof(fc.constant(null), fc.stringMatching(/^[A-Z0-9-]{1,12}$/)),
      price: fc.integer({ min: 1, max: 1_000_000 }),
      sale_price: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 1_000_000 })),
      images: fc.array(fc.record({ url: fc.webUrl(), path: fc.string() }), { maxLength: 3 }),
    });

    fc.assert(
      fc.property(productArb, fc.webUrl(), (p, origin) => {
        const message = productEnquiryMessage(p as never, origin);
        expect(message).toContain(`Product: ${p.name}`);
        expect(message).toContain("Price: ");
        expect(message).toContain(`Link: ${origin}/product/${p.slug}`);
        expect(message).toContain("Image: ");
        // The SKU line appears if and only if a sku is set.
        expect(message.includes("SKU: ")).toBe(p.sku !== null);
      }),
    );
  });

  it("whatsappHref strips every non-digit from the phone number", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (phone, message) => {
        const href = whatsappHref(phone, message);
        const digits = phone.replace(/\D/g, "");
        expect(href.startsWith(`https://wa.me/${digits}?text=`)).toBe(true);
      }),
    );
  });
});
