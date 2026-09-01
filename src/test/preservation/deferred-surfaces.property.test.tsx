/**
 * PRESERVATION TESTS (task 3) — Property 2: Untriggered Surfaces Are Byte-Identical.
 *
 * OBSERVATION-FIRST. Every expected value in this file was produced by executing
 * the UNFIXED code at `9f434af` and recording its ACTUAL output; nothing here
 * asserts assumed behaviour. Where the observed value is surprising it is pinned
 * deliberately and annotated.
 *
 * These tests MUST PASS before the fix and MUST STILL PASS after it.
 *
 * Property-based generation is used where the claim is universal (ratio
 * clamping); recorded golden values are used where the claim is byte-exactness.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.8, 3.9, 3.10, 3.22
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AdaptiveImage } from "@/components/site/adaptive-image";
import { ProductCard } from "@/components/site/product-card";
import { Catalogue } from "@/components/site/catalogue";
import { HeroSlider } from "@/components/site/hero-slider";
import { NGMonogram, SiteHeader } from "@/components/site/site-header";
import { PLACEHOLDER_IMAGE } from "@/lib/content-types";
import { banner, category, product, renderWithRouter, settings } from "@/test/render-harness";

afterEach(cleanup);

/** jsdom lowercases attribute names in selectors, so read the attribute. */
const monogram = (root: ParentNode) =>
  [...root.querySelectorAll("svg")].find((s) => s.getAttribute("viewBox") === "0 0 64 64") ?? null;

/* ---------------------------------------------------------------- property 1 */

describe("3.1 — the NGMonogram fallback is unchanged at its three existing sizes", () => {
  // Scoped to values OUTSIDE the bug condition: the absent-logo cases, which
  // already reach the monogram on unfixed code. Values such as "   " or
  // "javascript:…" satisfy C(X) and belong to the fix check (exploration case 1),
  // not to preservation.
  it.each([[null], [undefined], [""]])(
    "header renders the monogram at h-9 w-9 for logo_url %j",
    async (logo_url) => {
      const { container } = await renderWithRouter(
        <SiteHeader
          settings={settings({ logo_url: logo_url as string | null })}
          categories={[]}
          onSelectCategory={() => {}}
        />,
      );
      const svg = monogram(container.querySelector("header")!);
      expect(svg).not.toBeNull();
      // OBSERVED on 9f434af: class exactly "h-9 w-9", aria-hidden set.
      expect(svg!.getAttribute("class")).toBe("h-9 w-9");
      expect(svg!.getAttribute("aria-hidden")).toBe("true");
    },
  );

  it.each([
    [undefined, "h-9 w-9"],
    ["h-20 w-20", "h-20 w-20"],
    ["h-12 w-12", "h-12 w-12"],
  ])("the mark at %s keeps its recorded size %s", (className, expected) => {
    // The about section (index.tsx:260) and the footer (index.tsx:395) render the
    // mark at h-20 w-20 and h-12 w-12 respectively. Those two sizes are pinned
    // here on the shared mark, which is what both call sites resolve to.
    const { container } = render(className ? <NGMonogram className={className} /> : <NGMonogram />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("class")).toBe(expected);
    expect(svg.getAttribute("viewBox")).toBe("0 0 64 64");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });
});

/* ---------------------------------------------------------------- property 2 */

describe("3.2, 3.3 — product-media framing, clamps and placeholder fallback", () => {
  const saved = new Map<string, PropertyDescriptor | undefined>();
  let nat = { w: 0, h: 0 };

  beforeEach(() => {
    for (const [prop, get] of [
      ["complete", () => true],
      ["naturalWidth", () => nat.w],
      ["naturalHeight", () => nat.h],
    ] as const) {
      saved.set(prop, Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, prop));
      Object.defineProperty(HTMLImageElement.prototype, prop, { configurable: true, get });
    }
  });

  afterEach(() => {
    for (const [prop, d] of saved) {
      if (d) Object.defineProperty(HTMLImageElement.prototype, prop, d);
      else Reflect.deleteProperty(HTMLImageElement.prototype, prop);
    }
    saved.clear();
  });

  it("AdaptiveImage applies the recorded 0.75–1.5 clamp for all generated dimensions", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6000 }), fc.integer({ min: 1, max: 6000 }), (w, h) => {
        nat = { w, h };
        const view = render(<AdaptiveImage src="https://img.test/a.webp" alt="x" />);
        const frame = view.container.querySelector(".product-media") as HTMLElement;
        // OBSERVED formula on 9f434af: min(1.5, max(0.75, w / h)).
        const expected = Math.min(1.5, Math.max(0.75, w / h));
        const actual = Number(frame.style.aspectRatio.split("/")[0]!.trim());
        expect(actual).toBe(expected);
        expect(frame.className).toContain("product-media");
        view.unmount();
      }),
      { numRuns: 40 },
    );
  });

  it.each([
    [1000, 1000, "1 / 1"],
    [3000, 400, "1.5 / 1"],
    [400, 3000, "0.75 / 1"],
    [1200, 900, "1.3333333333333333 / 1"],
    [900, 1200, "0.75 / 1"],
    [1500, 1000, "1.5 / 1"],
    [0, 0, "1 / 1"],
  ])("AdaptiveImage %ix%i keeps the recorded aspectRatio %s", (w, h, expected) => {
    nat = { w, h };
    const { container } = render(<AdaptiveImage src="https://img.test/a.webp" alt="x" />);
    expect((container.querySelector(".product-media") as HTMLElement).style.aspectRatio).toBe(
      expected,
    );
  });

  it.each([
    [1000, 1000, "1 / 1"],
    [3000, 400, "1.25 / 1"],
    [400, 3000, "0.8 / 1"],
    [1200, 900, "1.25 / 1"],
    [900, 1200, "0.8 / 1"],
    [1500, 1000, "1.25 / 1"],
    [0, 0, "1 / 1"],
  ])("ProductCard %ix%i keeps the recorded aspectRatio %s", async (w, h, expected) => {
    nat = { w, h };
    const { container } = await renderWithRouter(
      <ProductCard product={product()} whatsapp="919000000000" />,
    );
    expect((container.querySelector(".product-media") as HTMLElement).style.aspectRatio).toBe(
      expected,
    );
  });

  it("3.3 — a failing image still falls back to the inline PLACEHOLDER_IMAGE", () => {
    nat = { w: 0, h: 0 };
    const { container } = render(<AdaptiveImage src="https://img.test/missing.webp" alt="x" />);
    const img = container.querySelector("img")!;
    fireEvent.error(img);
    expect(img.getAttribute("src")).toBe(PLACEHOLDER_IMAGE);
    // OBSERVED: the img keeps the shared product-media-img class.
    expect(img.className).toContain("product-media-img");
  });
});

/* ---------------------------------------------------------------- property 3 */

describe("3.8 — the computed suggestions and every catalogue result set are untouched", () => {
  const CAT = [
    category({ id: "c1", name: "Sofas", slug: "sofas" }),
    category({ id: "c2", name: "Tables", slug: "tables" }),
  ];
  const PRODUCTS = [
    product({
      id: "p1",
      name: "Oakley Sofa",
      slug: "oakley-sofa",
      price: 30000,
      material: "Velvet",
      color: "Ivory",
      category: "Sofas",
      category_id: "c1",
    }),
    product({
      id: "p2",
      name: "Oakwood Bench",
      slug: "oakwood-bench",
      price: 12000,
      material: "Teak",
      color: "Brown",
      category: "Tables",
      category_id: "c2",
    }),
    product({
      id: "p3",
      name: "Velvet Chaise",
      slug: "velvet-chaise",
      price: 90000,
      material: "Linen",
      color: "Grey",
      category: "Sofas",
      category_id: "c1",
    }),
    product({
      id: "p4",
      name: "Oak Sideboard",
      slug: "oak-sideboard",
      price: 45000,
      material: "Oak",
      color: "Natural",
      category: "Tables",
      category_id: "c2",
    }),
  ];

  /**
   * Recorded by executing the UNFIXED catalogue for each query.
   * Surprising-but-pinned: a 1-character query yields NO suggestions (the
   * `q.length < 2` guard) yet still returns every product, because the search
   * filter also matches material and colour. Recorded, not corrected.
   */
  const GOLDEN: [string, string[], string[]][] = [
    ["", [], ["Oakley Sofa", "Oakwood Bench", "Velvet Chaise", "Oak Sideboard"]],
    ["o", [], ["Oakley Sofa", "Oakwood Bench", "Velvet Chaise", "Oak Sideboard"]],
    [
      "oa",
      ["Oakley SofaSofas", "Oakwood BenchTables", "Oak SideboardTables"],
      ["Oakley Sofa", "Oakwood Bench", "Oak Sideboard"],
    ],
    [
      "oak",
      ["Oakley SofaSofas", "Oakwood BenchTables", "Oak SideboardTables"],
      ["Oakley Sofa", "Oakwood Bench", "Oak Sideboard"],
    ],
    [
      "OAK",
      ["Oakley SofaSofas", "Oakwood BenchTables", "Oak SideboardTables"],
      ["Oakley Sofa", "Oakwood Bench", "Oak Sideboard"],
    ],
    ["velvet", ["Velvet ChaiseSofas"], ["Oakley Sofa", "Velvet Chaise"]],
    ["zzz", [], []],
    ["bench", ["Oakwood BenchTables"], ["Oakwood Bench"]],
  ];

  it.each(GOLDEN)("query %j yields the recorded suggestions and results", async (q, sugg, res) => {
    const { container } = await renderWithRouter(
      <Catalogue products={PRODUCTS} categories={CAT} whatsapp="919000000000" />,
    );
    if (q) fireEvent.change(screen.getByLabelText("Search products"), { target: { value: q } });

    const suggestions = [...container.querySelectorAll("ul li button")].map((b) =>
      (b.textContent ?? "").trim(),
    );
    const results = [...container.querySelectorAll("article")].map((a) =>
      (a.querySelector("a[aria-label]")?.getAttribute("aria-label") ?? "").trim(),
    );

    expect(suggestions).toEqual(sugg);
    expect(results).toEqual(res);
  });
});

/* ---------------------------------------------------------------- property 5 */

describe("3.9, 3.10 — hero CTAs that already work navigate identically", () => {
  // OBSERVED base class on 9f434af; the CTA styling must not move.
  const BASE =
    "inline-flex items-center justify-center rounded-full bg-primary-foreground px-7 py-3.5 " +
    "text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-transform " +
    "hover:-translate-y-0.5";

  it.each([
    ["#catalogue", "#catalogue"],
    ["#contact", "#contact"],
    ["/", "/"],
    ["/product/oak-dining-table", "/product/oak-dining-table"],
    ["/product/velvet-sofa", "/product/velvet-sofa"],
    ["/admin/login", "/admin/login"],
  ])("button_link %j still renders an anchor to %j with unchanged styling", async (link, href) => {
    await renderWithRouter(
      <HeroSlider banners={[banner({ button_text: "Explore", button_link: link })]} />,
    );
    const cta = screen.getByText("Explore");
    expect(cta.tagName).toBe("A");
    expect(cta.getAttribute("href")).toBe(href);
    for (const cls of BASE.split(/\s+/)) expect(cta.getAttribute("class")).toContain(cls);
  });

  it("generated anchors and product paths never lose their call to action", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/).map((s) => `#${s}`),
          fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/).map((s) => `/product/${s}`),
        ),
        async (link) => {
          const view = await renderWithRouter(
            <HeroSlider banners={[banner({ button_text: "Explore", button_link: link })]} />,
          );
          const cta = screen.getByText("Explore");
          expect(cta.tagName).toBe("A");
          expect(cta.getAttribute("href")).toBe(link);
          view.unmount();
        },
      ),
      { numRuns: 20 },
    );
  });
});

/* ---------------------------------------------------------------- property 7 */

describe("3.22 — all nine public/media files are still served at their current paths", () => {
  it("keeps exactly the nine recorded filenames", () => {
    expect(readdirSync(join(process.cwd(), "public", "media")).sort()).toEqual([
      "category-bedroom.jpg",
      "category-chairs.jpg",
      "category-dining.jpg",
      "category-office.jpg",
      "category-outdoor.jpg",
      "category-sofas.jpg",
      "category-storage.jpg",
      "category-tables.jpg",
      "hero-luxury-living.jpg",
    ]);
  });
});
