/**
 * Unit tests for product metadata built from the real record (task 11.1).
 *
 * Validates: Requirements 2.28, 3.15, 2.42
 */
import { describe, expect, it } from "vitest";
import { PLACEHOLDER_IMAGE } from "./content-types";
import {
  SITE_ORIGIN,
  buildProductMetadata,
  canonicalFor,
  fallbackProductMetadata,
} from "./product-metadata";

const full = {
  name: "Oak Dining Table",
  slug: "oak-dining-table",
  price: 50000,
  sale_price: null,
  in_stock: true,
  images: [{ url: "https://img.test/a.webp", path: "a.webp" }],
  sku: "NG-001",
  product_code: "PC-1",
  brand: "New Galaxy",
  description: "A solid oak table.",
  short_description: "Solid oak.",
  meta_title: "Oak Dining Table — Bengaluru",
  meta_description: "Handcrafted oak dining table.",
};

const sparse = {
  name: "Plain Bench",
  slug: "plain-bench",
  price: 12000,
  sale_price: null,
  in_stock: false,
  images: [],
  sku: null,
  product_code: null,
  brand: null,
  description: null,
  short_description: null,
  meta_title: null,
  meta_description: null,
};

const contentOf = (meta: ReturnType<typeof buildProductMetadata>["meta"], key: string) => {
  const tag = meta.find(
    (m) => ("property" in m && m.property === key) || ("name" in m && m.name === key),
  );
  return tag && "content" in tag ? tag.content : undefined;
};

describe("buildProductMetadata with a complete product", () => {
  const { meta, links, jsonLd } = buildProductMetadata(full);

  it("emits a canonical link at the product URL", () => {
    expect(links).toEqual([{ rel: "canonical", href: `${SITE_ORIGIN}/product/oak-dining-table` }]);
  });

  it("uses the product's own meta_title, not the URL handle", () => {
    const title = meta.find((m) => "title" in m);
    expect(title).toEqual({ title: "Oak Dining Table — Bengaluru | New Galaxy Furniture" });
  });

  it("emits og:image from the product's own image, making twitter:card honest", () => {
    expect(contentOf(meta, "og:image")).toBe("https://img.test/a.webp");
    expect(contentOf(meta, "twitter:card")).toBe("summary_large_image");
  });

  it("emits a description from the record", () => {
    expect(contentOf(meta, "description")).toBe("Handcrafted oak dining table.");
  });

  it("emits Product structured data built from the real record", () => {
    expect(jsonLd).toMatchObject({
      "@type": "Product",
      name: "Oak Dining Table",
      sku: "NG-001",
      brand: { "@type": "Brand", name: "New Galaxy" },
      offers: {
        priceCurrency: "INR",
        price: 50000,
        availability: "https://schema.org/InStock",
      },
    });
  });

  it("drives offers.price from the sale price when one is set", () => {
    const { jsonLd: onSale } = buildProductMetadata({ ...full, sale_price: 42000 });
    expect((onSale.offers as { price: number }).price).toBe(42000);
  });

  it("marks an out-of-stock product as OutOfStock", () => {
    const { jsonLd: oos } = buildProductMetadata({ ...full, in_stock: false });
    expect((oos.offers as { availability: string }).availability).toBe(
      "https://schema.org/OutOfStock",
    );
  });
});

describe("buildProductMetadata with a sparse product — absent fields are OMITTED", () => {
  const { meta, jsonLd } = buildProductMetadata(sparse);

  it("omits sku and brand rather than emitting empty values (3.15)", () => {
    expect("sku" in jsonLd).toBe(false);
    expect("brand" in jsonLd).toBe(false);
  });

  it("omits the description tags entirely rather than emitting an empty string", () => {
    expect(contentOf(meta, "description")).toBeUndefined();
    expect(contentOf(meta, "og:description")).toBeUndefined();
    expect("description" in jsonLd).toBe(false);
  });

  it("falls back to the product name for the title", () => {
    expect(meta.find((m) => "title" in m)).toEqual({
      title: "Plain Bench | New Galaxy Furniture",
    });
  });

  it("uses the shared placeholder when the product has no images", () => {
    expect(contentOf(meta, "og:image")).toBe(PLACEHOLDER_IMAGE);
  });

  it("never emits a tag whose content is an empty string", () => {
    for (const tag of meta) {
      if ("content" in tag) expect(tag.content).not.toBe("");
    }
  });

  it("prefers product_code as the sku when sku is absent", () => {
    const { jsonLd: withCode } = buildProductMetadata({ ...sparse, product_code: "PC-9" });
    expect(withCode.sku).toBe("PC-9");
  });
});

describe("fallback metadata preserves the pre-existing handle-derived tags", () => {
  it("keeps the original title shape so the change is purely additive", () => {
    const { meta } = fallbackProductMetadata("oak-dining-table");
    expect(meta.find((m) => "title" in m)).toEqual({
      title: "oak dining table | New Galaxy Furniture",
    });
  });
});

describe("canonicalFor", () => {
  it("builds the canonical URL from the slug with no trailing slash", () => {
    expect(canonicalFor("teak-bench")).toBe(`${SITE_ORIGIN}/product/teak-bench`);
  });
});
