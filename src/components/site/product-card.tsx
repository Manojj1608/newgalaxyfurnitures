import { Link } from "@tanstack/react-router";
import { Eye, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  discountPercent,
  effectivePrice,
  formatINR,
  PLACEHOLDER_IMAGE,
  primaryImage,
  type Product,
} from "@/lib/content-types";
import { openProductEnquiry } from "@/lib/whatsapp";

export function ProductCard({
  product,
  whatsapp,
  sourcePage = "catalogue",
}: {
  product: Product;
  whatsapp: string;
  sourcePage?: string;
}) {
  const discount = discountPercent(product);
  const image = primaryImage(product);
  const hover = product.hover_image_url ?? product.images[1]?.url ?? null;

  return (
    <article className="group luxury-card overflow-hidden">
      <Link
        to="/product/$handle"
        params={{ handle: product.slug }}
        className="block"
        aria-label={product.name}
      >
        <div
          className="image-frame product-media relative overflow-hidden"
          style={{ aspectRatio: String(ratio) }}
        >
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            ref={(el) => {
              if (el?.complete) measure(el);
            }}
            onLoad={(e) => measure(e.currentTarget)}
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
            className="product-media-img transition-transform duration-700 group-hover:scale-105"
          />
          {hover ? (
            <img
              src={hover}
              alt=""
              aria-hidden
              loading="lazy"
              className="product-media-img absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          ) : null}


          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {product.new_arrival ? <Badge variant="secondary">New</Badge> : null}
            {product.bestseller ? <Badge variant="secondary">Bestseller</Badge> : null}
            {product.trending ? <Badge variant="secondary">Trending</Badge> : null}
            {discount ? <Badge>{discount}% off</Badge> : null}
          </div>
          {!product.in_stock ? (
            <div className="absolute inset-x-0 bottom-0 bg-primary/85 py-2 text-center text-xs uppercase tracking-[0.2em] text-primary-foreground">
              Made to order
            </div>
          ) : null}
        </div>
      </Link>

      <div className="space-y-3 p-5">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
            {product.category}
          </p>
          <Link
            to="/product/$handle"
            params={{ handle: product.slug }}
            className="mt-1 block font-display text-2xl leading-tight text-foreground"
          >
            {product.name}
          </Link>
        </div>

        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {product.short_description ?? product.description ?? product.material ?? ""}
        </p>

        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-foreground">
            {formatINR(effectivePrice(product))}
          </span>
          {discount ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatINR(product.price)}
            </span>
          ) : null}
        </div>

        <div className="flex gap-2 pt-1">
          <Link
            to="/product/$handle"
            params={{ handle: product.slug }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-input bg-background px-4 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-accent"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Link>
          <button
            type="button"
            onClick={() => void openProductEnquiry(product, whatsapp, sourcePage)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Enquire
          </button>
        </div>
      </div>
    </article>
  );
}
