import type { Tables } from "@/integrations/supabase/types";

export type ProductImage = { url: string; path: string };

export type ProductRow = Tables<"products">;
export type CategoryRow = Tables<"categories">;
export type SiteSettings = Tables<"site_settings">;
export type HomepageSection = Tables<"homepage_sections">;
export type HeroBanner = Tables<"hero_banners">;
export type EnquiryRow = Tables<"enquiries">;
export type MediaRow = Tables<"media">;

export type Product = Omit<ProductRow, "images"> & { images: ProductImage[] };

export type ProductStatus = "active" | "draft" | "hidden";
export const PRODUCT_STATUSES: ProductStatus[] = ["active", "draft", "hidden"];

export type EnquiryStatus = "new" | "contacted" | "quoted" | "closed" | "spam";
export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  "new",
  "contacted",
  "quoted",
  "closed",
  "spam",
];

export const SECTION_LABELS: Record<string, string> = {
  hero: "Hero banner",
  trust: "Trust pillars",
  categories: "Collections grid",
  featured: "Featured products",
  new_arrivals: "New arrivals",
  bestsellers: "Best sellers",
  trending: "Trending",
  catalogue: "Explore catalogue",
  promo: "Promotional banner",
  about: "About",
  testimonials: "Client stories",
  contact: "Contact / showroom",
};

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#e9e2d7"/><text x="50%" y="50%" font-family="serif" font-size="34" fill="#9d9184" text-anchor="middle">No image</text></svg>`,
  );

export function normalizeImages(value: unknown): ProductImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [{ url: entry, path: "" }];
    if (entry && typeof entry === "object" && "url" in entry) {
      const record = entry as { url?: unknown; path?: unknown };
      if (typeof record.url === "string") {
        return [{ url: record.url, path: typeof record.path === "string" ? record.path : "" }];
      }
    }
    return [];
  });
}

export function toProduct(row: ProductRow): Product {
  return { ...row, images: normalizeImages(row.images) };
}

export function primaryImage(product: Pick<Product, "images">): string {
  return product.images[0]?.url ?? PLACEHOLDER_IMAGE;
}

export function effectivePrice(product: Pick<Product, "price" | "sale_price">): number {
  return product.sale_price && product.sale_price > 0 ? product.sale_price : product.price;
}

export function discountPercent(
  product: Pick<Product, "price" | "sale_price">,
): number | null {
  if (!product.sale_price || product.sale_price <= 0 || product.sale_price >= product.price) {
    return null;
  }
  return Math.round(((product.price - product.sale_price) / product.price) * 100);
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function inStock(product: Pick<Product, "in_stock" | "stock_quantity">): boolean {
  return product.in_stock && (product.stock_quantity ?? 0) !== 0 ? true : product.in_stock;
}
