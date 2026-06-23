import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cart-store";

interface ProductCardProps {
  product: ShopifyProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const selectedVariant = product.variants[0];

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions ?? [],
    });
  };

  return (
    <article className="luxury-card group flex h-full flex-col">
      <Link to="/product/$handle" params={{ handle: product.handle }} className="image-frame block">
        {product.images[0] ? (
          <img
            src={product.images[0].url}
            alt={product.images[0].altText ?? product.title}
            className="h-80 w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-80 place-items-center bg-secondary/45 text-sm text-muted-foreground">
            Product imagery coming soon
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Featured piece</p>
              <h3 className="font-display text-3xl leading-none text-foreground">{product.title}</h3>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {formatPrice(product.priceRange.minVariantPrice)}
            </p>
          </div>
          <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
            {product.description || "Crafted with tactile materials, quiet curves, and timeless proportion."}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap gap-3">
          <Button variant="wood" onClick={handleAddToCart} disabled={isLoading || !selectedVariant}>
            Add to cart
          </Button>
          <Button variant="outlineWarm" asChild>
            <Link to="/product/$handle" params={{ handle: product.handle }}>
              View details
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
