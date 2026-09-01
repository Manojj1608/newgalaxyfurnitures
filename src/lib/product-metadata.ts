/**
 * Product page metadata, built from the REAL product record.
 *
 * Defect 1.28: the product head had no canonical link and no `og:image` (despite
 * `twitter:card: summary_large_image`), no `Product` structured data, and derived
 * its title / og:title / description from the URL handle
 * (`params.handle.replace(/-/g, " ")`) plus generic copy rather than from the
 * product row.
 *
 * Absent fields are OMITTED, never filled in — no business detail is invented
 * (3.15). Pure, so omission behaviour is unit- and property-testable.
 */
import { effectivePrice, primaryImage, type Product } from "@/lib/content-types";

/**
 * Reuses the origin already present in the homepage's FurnitureStore JSON-LD
 * rather than introducing a new domain.
 */
export const SITE_ORIGIN = "https://newgalaxyfurnitures.lovable.app";

export type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

export type LinkTag = { rel: string; href: string };

export type ProductMetadata = {
  meta: MetaTag[];
  links: LinkTag[];
  jsonLd: Record<string, unknown>;
};

type MetadataProduct = Pick<
  Product,
  | "name"
  | "slug"
  | "price"
  | "sale_price"
  | "in_stock"
  | "images"
  | "sku"
  | "product_code"
  | "brand"
  | "description"
  | "short_description"
  | "meta_title"
  | "meta_description"
>;

function firstNonEmpty(...values: (string | null | undefined)[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return undefined;
}

export function canonicalFor(slug: string): string {
  return `${SITE_ORIGIN}/product/${slug}`;
}

/** Metadata for a real product record. Every value comes from the row. */
export function buildProductMetadata(product: MetadataProduct): ProductMetadata {
  const title = `${firstNonEmpty(product.meta_title, product.name) ?? product.name} | New Galaxy Furniture`;
  const description = firstNonEmpty(
    product.meta_description,
    product.short_description,
    product.description,
  );
  const image = primaryImage(product);
  const canonical = canonicalFor(product.slug);
  const sku = firstNonEmpty(product.sku, product.product_code);
  const brand = firstNonEmpty(product.brand);

  const meta: MetaTag[] = [
    { title },
    { property: "og:type", content: "product" },
    { property: "og:title", content: title },
    { property: "og:url", content: canonical },
    // Makes the pre-existing twitter:card summary_large_image honest.
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: image },
  ];
  // Only emit a description tag when the record actually has copy for it.
  if (description) {
    meta.push({ name: "description", content: description });
    meta.push({ property: "og:description", content: description });
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image,
    url: canonical,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: effectivePrice(product),
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: canonical,
    },
  };
  // Absent fields are omitted rather than emitted empty.
  if (description) jsonLd.description = description;
  if (sku) jsonLd.sku = sku;
  if (brand) jsonLd.brand = { "@type": "Brand", name: brand };

  return { meta, links: [{ rel: "canonical", href: canonical }], jsonLd };
}

/**
 * The pre-existing handle-derived tags, retained verbatim as the fallback for
 * when loader data is unavailable. This keeps the change purely additive.
 */
export function fallbackProductMetadata(handle: string): { meta: MetaTag[] } {
  const title = `${handle.replace(/-/g, " ")} | New Galaxy Furniture`;
  return {
    meta: [
      { title },
      {
        name: "description",
        content:
          "Premium furniture handcrafted in Bengaluru by New Galaxy Furniture. View details, materials, dimensions and enquire on WhatsApp.",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: title },
      {
        property: "og:description",
        content: "Handcrafted premium furniture from New Galaxy Furniture, Bengaluru.",
      },
    ],
  };
}
