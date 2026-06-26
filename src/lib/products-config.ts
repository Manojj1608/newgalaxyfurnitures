export const PRODUCT_CATEGORIES = [
  "Sofas & Sectionals",
  "Beds & Headboards",
  "Dining Tables",
  "Accent Chairs",
  "Coffee & Side Tables",
  "Storage & Display",
  "Executive Office",
  "Outdoor Living",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type ProductImage = { url: string; path: string };

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  sale_price: number | null;
  description: string | null;
  material: string | null;
  dimensions: string | null;
  images: ProductImage[];
  in_stock: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

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
