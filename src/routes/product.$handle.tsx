import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, MessageCircle, Share2, Truck } from "lucide-react";

import { ProductCard } from "@/components/site/product-card";
import { AdaptiveImage } from "@/components/site/adaptive-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  contentKeys,
  productQuery,
  useContentRealtime,
  useProducts,
  useSettings,
} from "@/hooks/use-content";
import { logProductView } from "@/lib/content-api";
import {
  discountPercent,
  effectivePrice,
  formatINR,
  PLACEHOLDER_IMAGE,
  type Product,
} from "@/lib/content-types";
import { openProductEnquiry } from "@/lib/whatsapp";
import { toast } from "sonner";
import { QueryFailed } from "@/components/site/query-state";
import { buildProductMetadata, fallbackProductMetadata } from "@/lib/product-metadata";
import { copyToClipboard } from "@/lib/clipboard";
import type { QueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/product/$handle")({
  // 1.28: warm the product query so head() can read the REAL record. Rendering
  // still uses useQuery against the same key, so there is no double fetch and no
  // change to the render path.
  loader: async ({ context, params }) => {
    const queryClient = (context as { queryClient?: QueryClient } | undefined)?.queryClient;
    if (!queryClient) return { product: null };
    try {
      const product = await queryClient.ensureQueryData({
        ...productQuery(params.handle),
        queryKey: contentKeys.product(params.handle),
      });
      return { product: product ?? null };
    } catch {
      // A failed warm must not break the route; head() falls back and the
      // component renders its own error state.
      return { product: null };
    }
  },
  head: ({ params, loaderData }) => {
    const product = loaderData?.product;
    // Purely additive: without loader data the existing handle-derived tags
    // remain as the fallback.
    if (!product) return fallbackProductMetadata(params.handle);
    const { meta, links, jsonLd } = buildProductMetadata(product);
    return {
      meta,
      links,
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  component: ProductPage,
});

function Spec({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="border-b border-border py-3">
      <dt className="text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function ProductPage() {
  const { handle } = useParams({ from: "/product/$handle" });
  useContentRealtime();

  const {
    data: product,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...productQuery(handle),
    queryKey: contentKeys.product(handle),
  });
  const { data: allProducts = [] } = useProducts();
  const { data: settings = null } = useSettings();
  const whatsapp = settings?.whatsapp ?? "919513443606";

  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (product?.id) void logProductView(product.id);
  }, [product?.id]);

  useEffect(() => setActive(0), [handle]);

  const related = useMemo(() => {
    if (!product) return [] as Product[];
    const others = allProducts.filter((p) => p.id !== product.id);
    const score = (p: Product) =>
      (p.category_id && p.category_id === product.category_id ? 4 : 0) +
      (p.category === product.category ? 2 : 0) +
      (p.material && p.material === product.material ? 1 : 0);
    return [...others]
      .sort(
        (a, b) =>
          score(b) - score(a) ||
          Math.abs(effectivePrice(a) - effectivePrice(product)) -
            Math.abs(effectivePrice(b) - effectivePrice(product)),
      )
      .slice(0, 3);
  }, [allProducts, product]);

  if (isLoading) {
    return (
      <main className="page-shell py-32">
        <div className="h-[26rem] animate-pulse rounded-3xl bg-muted" />
      </main>
    );
  }

  // 1.27: a transient failure previously fell through to "Piece not found",
  // telling the customer a product that exists had been removed. The 404 copy,
  // markup, route and CTA below are UNCHANGED and now render only when the query
  // SUCCEEDED and the product genuinely does not exist or is not published.
  if (isError) {
    return (
      <main className="page-shell flex min-h-[70vh] flex-col items-center justify-center">
        <QueryFailed
          message="Could not load this piece. Please check your connection and try again."
          onRetry={() => void refetch()}
        />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="page-shell flex min-h-[70vh] flex-col items-center justify-center text-center">
        <h1 className="font-display text-4xl text-foreground">Piece not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This product may have been removed from the showroom.
        </p>
        <Button asChild variant="luxury" className="mt-8 rounded-full">
          <Link to="/">Back to collection</Link>
        </Button>
      </main>
    );
  }

  const images = product.images.length > 0 ? product.images : [{ url: PLACEHOLDER_IMAGE, path: "" }];
  const discount = discountPercent(product);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    // 1.31: this previously had no catch, producing an unhandled rejection and a
    // "Link copied" state that could be false. Confirm only on real success.
    if (await copyToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy the link automatically", { description: url });
    }
  };

  return (
    <main className="pb-28 pt-28 lg:pb-24">
      <div className="page-shell">
        <nav className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Collection
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.category}</span>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-2">
          <div>
            <AdaptiveImage
              key={images[Math.min(active, images.length - 1)]!.url}
              src={images[Math.min(active, images.length - 1)]!.url}
              alt={product.name}
              className="image-frame overflow-hidden rounded-3xl"
              imgClassName="transition-transform duration-700 hover:scale-105"
            />

            {images.length > 1 ? (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.url + i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                      i === active ? "border-wood" : "border-transparent"
                    }`}
                  >
                    <img src={img.url} alt="" className="product-media-img" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              {product.new_arrival ? <Badge variant="secondary">New</Badge> : null}
              {product.bestseller ? <Badge variant="secondary">Bestseller</Badge> : null}
              {discount ? <Badge>{discount}% off</Badge> : null}
            </div>

            <h1 className="mt-4 font-display text-[clamp(2.2rem,4vw,3.2rem)] leading-tight text-foreground">
              {product.name}
            </h1>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-foreground">
                {formatINR(effectivePrice(product))}
              </span>
              {discount ? (
                <span className="text-base text-muted-foreground line-through">
                  {formatINR(product.price)}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {product.in_stock ? "In stock — ready to deliver" : "Made to order"}
            </p>

            {product.short_description || product.description ? (
              <p className="mt-6 text-sm leading-8 text-muted-foreground">
                {product.short_description ?? product.description}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                variant="luxury"
                className="rounded-full px-8"
                onClick={() => void openProductEnquiry(product, whatsapp, "product-page")}
              >
                <MessageCircle className="mr-2 h-4 w-4" /> Enquire on WhatsApp
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => void share()}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
                {copied ? "Link copied" : "Share"}
              </Button>
            </div>

            <dl className="mt-10">
              <Spec label="SKU" value={product.sku ?? product.product_code} />
              <Spec label="Material" value={product.material} />
              <Spec label="Finish" value={product.finish} />
              <Spec label="Colour" value={product.color} />
              <Spec label="Dimensions" value={product.dimensions ?? product.size} />
              <Spec label="Weight" value={product.weight} />
              <Spec label="Style" value={product.style} />
              <Spec label="Warranty" value={product.warranty} />
            </dl>

            {product.delivery_info ? (
              <p className="mt-6 flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                <Truck className="mt-1 h-4 w-4 shrink-0 text-wood" />
                {product.delivery_info}
              </p>
            ) : null}

            {product.description && product.short_description ? (
              <p className="mt-8 text-sm leading-8 text-muted-foreground">{product.description}</p>
            ) : null}
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-24">
            <h2 className="section-title">You may also like</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} whatsapp={whatsapp} sourcePage="product-page" />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-5 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {formatINR(effectivePrice(product))}
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            {product.in_stock ? "In stock" : "Made to order"}
          </p>
        </div>
        <Button
          variant="luxury"
          className="rounded-full"
          onClick={() => void openProductEnquiry(product, whatsapp, "product-page-mobile")}
        >
          <MessageCircle className="mr-2 h-4 w-4" /> Enquire
        </Button>
      </div>
    </main>
  );
}
