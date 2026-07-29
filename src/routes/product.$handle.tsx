import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchProductBySlug } from "@/lib/products-api";
import { formatINR, type Product } from "@/lib/products-config";
import { supabase } from "@/integrations/supabase/client";

const PHONE_DIGITS = "919513443606";

function ProductNotFoundComponent() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-16">
      <div className="luxury-card max-w-xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Product not found</p>
        <h1 className="mt-4 font-display text-5xl text-foreground">That piece isn&apos;t in the catalog</h1>
        <div className="mt-8">
          <Button variant="wood" asChild>
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
          <Button variant="wood" onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/product/$handle")({
  loader: async ({ params }) => {
    const product = await fetchProductBySlug(params.handle);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => {
    const title = loaderData?.name ?? "Product";
    const description =
      loaderData?.description ||
      `Discover ${title} at New Galaxy Furniture — premium furniture crafted in Bengaluru since 2002.`;
    return {
      meta: [
        { title: `${title} | New Galaxy Furniture` },
        { name: "description", content: description },
        { property: "og:title", content: `${title} | New Galaxy Furniture` },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
  errorComponent: ProductErrorComponent,
  notFoundComponent: ProductNotFoundComponent,
});

function ProductPage() {
  const initial = Route.useLoaderData();
  const { handle } = Route.useParams();
  const [product, setProduct] = useState<Product>(initial);
  const [activeImage, setActiveImage] = useState(0);

  // Live-refresh on admin edits.
  useEffect(() => {
    const channel = supabase
      .channel(`product:${handle}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `slug=eq.${handle}` },
        () => {
          fetchProductBySlug(handle).then((p) => p && setProduct(p)).catch(() => {});
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [handle]);

  const onSale = product.sale_price != null && Number(product.sale_price) < Number(product.price);
  const images = product.images ?? [];
  const enquireMessage = encodeURIComponent(
    `Hello, I'm interested in ${product.name} (${product.category}). Could you share availability and delivery details?`,
  );
  const whatsappUrl = `https://wa.me/${PHONE_DIGITS}?text=${enquireMessage}`;

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
        <Button asChild variant="wood" size="sm">
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </Button>
      </header>

      <section className="section-shell">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <div className="space-y-4">
            <div className="luxury-card image-frame overflow-hidden">
              {images[activeImage] ? (
                <img
                  src={images[activeImage].url}
                  alt={product.name}
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
            {images.length > 1 && (
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <button
                    key={img.path}
                    onClick={() => setActiveImage(i)}
                    className={`h-20 w-20 overflow-hidden rounded-lg border transition ${
                      i === activeImage ? "border-wood ring-2 ring-wood/40" : "border-border/60 hover:border-wood/60"
                    }`}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="section-kicker">{product.category}</p>
              {product.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-wood/95 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-wood-foreground">
                  <Star className="h-3 w-3 fill-current" /> Featured
                </span>
              )}
              {!product.in_stock && (
                <span className="rounded-full bg-muted px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  Out of stock
                </span>
              )}
            </div>
            <h1 className="section-title">{product.name}</h1>
            <div>
              <p className="font-display text-4xl text-foreground">
                {formatINR(Number(onSale ? product.sale_price! : product.price))}
              </p>
              {onSale && (
                <p className="text-sm text-muted-foreground line-through">
                  {formatINR(Number(product.price))}
                </p>
              )}
            </div>
            {product.description && (
              <p className="section-copy whitespace-pre-line">{product.description}</p>
            )}

            {(product.material || product.dimensions) && (
              <div className="luxury-card grid gap-4 p-6 sm:grid-cols-2">
                {product.material && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Material</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{product.material}</p>
                  </div>
                )}
                {product.dimensions && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Dimensions</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{product.dimensions}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button variant="wood" size="lg" asChild>
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Enquire on WhatsApp
                </a>
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
