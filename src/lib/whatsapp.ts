import { createEnquiry } from "@/lib/content-api";
import { effectivePrice, formatINR, primaryImage, type Product } from "@/lib/content-types";

export function whatsappHref(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function productEnquiryMessage(product: Product, origin: string): string {
  const link = `${origin}/product/${product.slug}`;
  return [
    "Hello,",
    "",
    "I am interested in:",
    `Product: ${product.name}`,
    product.sku ? `SKU: ${product.sku}` : null,
    `Price: ${formatINR(effectivePrice(product))}`,
    `Link: ${link}`,
    `Image: ${primaryImage(product)}`,
    "",
    "Please share more information.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function openProductEnquiry(
  product: Product,
  phone: string,
  sourcePage: string,
): Promise<void> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const message = productEnquiryMessage(product, origin);
  try {
    await createEnquiry({
      product_id: product.id,
      product_name: product.name,
      message,
      source_page: sourcePage,
      channel: "whatsapp",
    });
  } catch {
    // never block the customer on analytics
  }
  if (typeof window !== "undefined") {
    window.open(whatsappHref(phone, message), "_blank", "noopener,noreferrer");
  }
}
