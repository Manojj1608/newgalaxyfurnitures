import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { CartDrawer } from "@/components/cart-drawer";
import { Button } from "@/components/ui/button";
import { formatPrice, productByHandleQueryOptions } from "@/lib/shopify";
import { useCartStore } from "@/stores/cart-store";

function ProductNotFoundComponent() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-16">
      <div className="luxury-card max-w-xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Product not found</p>
        <h1 className="mt-4 font-display text-5xl text-foreground">That piece isn&apos;t in the catalog</h1>
        <div className="mt-8">
          <Button variant="luxury" asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-16">
      <div className="luxury-card max-w-xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Unable to load</p>
        <h1 className="mt-4 font-display text-5xl text-foreground">This product couldn&apos;t be loaded</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{error.message}</p>
        <div className="mt-8">
          <Button variant="luxury" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/product/$handle")({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(productByHandleQueryOptions(params.handle));
    if (!product) {
      throw notFound();
    }
    return product;
  },
  head: ({ loaderData }) => {
    const title = loaderData?.title ?? "Product";
    const description = loaderData?.description || `Discover ${title} at New Galaxy Furniture`;

    return {
      meta: [
        { title: `${title} | New Galaxy Furniture` },
        { name: "description", content: description },
      ],
    };
  },
  component: ProductPage,
  errorComponent: ProductErrorComponent,
  notFoundComponent: ProductNotFoundComponent,
});

function ProductPage() {
  const { handle } = Route.useParams();
  const { data: product } = useSuspenseQuery(productByHandleQueryOptions(handle));
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);

  if (!product) {
    throw notFound();
  }

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
    <main className="page-shell py-6 sm:py-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-full border border-border/70 bg-background/85 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="outlineWarm" size="icon" asChild>
            <Link to="/" aria-label="Back to home">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="truncate font-display text-3xl text-foreground">New Galaxy Furniture</p>
            <p className="truncate text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Product detail
            </p>
          </div>
        </div>
        <CartDrawer />
      </header>

      <section className="section-shell">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <div className="luxury-card image-frame overflow-hidden">
            {product.images[0] ? (
              <img
                src={product.images[0].url}
                alt={product.images[0].altText ?? product.title}
                className="h-full min-h-[28rem] w-full object-cover"
                width={1536}
                height={1024}
              />
            ) : (
              <div className="grid min-h-[28rem] place-items-center bg-secondary/45 text-muted-foreground">
                Product imagery coming soon
              </div>
            )}
          </div>

          <div className="space-y-6">
            <p className="section-kicker">Luxury detail</p>
            <h1 className="section-title">{product.title}</h1>
            <p className="font-display text-4xl text-foreground">
              {formatPrice(product.priceRange.minVariantPrice)}
            </p>
            <p className="section-copy">
              {product.description ||
                "Crafted with quiet proportions, tactile materials, and a warm luxury sensibility."}
            </p>

            <div className="luxury-card p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Available finish</p>
              <p className="mt-3 text-sm leading-7 text-foreground">
                {selectedVariant?.title && selectedVariant.title !== "Default Title"
                  ? selectedVariant.title
                  : "Signature finish"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedVariant?.selectedOptions.length
                  ? selectedVariant.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(" • ")
                  : "Configured for effortless checkout."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="wood" size="lg" onClick={handleAddToCart} disabled={!selectedVariant || isLoading}>
                Add to cart
                <ArrowRight />
              </Button>
              <Button variant="outlineWarm" size="lg" asChild>
                <Link to="/">Continue browsing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
