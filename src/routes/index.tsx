import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Gem, MessageCircle, MoveRight, ShieldCheck, Trees, Waves } from "lucide-react";

import { CartDrawer } from "@/components/cart-drawer";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { productsQueryOptions } from "@/lib/shopify";
import bedroomImage from "@/assets/category-bedroom.jpg";
import diningImage from "@/assets/category-dining.jpg";
import officeImage from "@/assets/category-office.jpg";
import outdoorImage from "@/assets/category-outdoor.jpg";
import heroImage from "@/assets/hero-luxury-living.jpg";

const categories = [
  {
    title: "Living Room",
    image: heroImage,
    copy: "Cloud-soft seating, sculpted tables, and layered lighting for statement gathering spaces.",
  },
  {
    title: "Bedroom",
    image: bedroomImage,
    copy: "Tailored beds, tactile upholstery, and serene finishes designed for restorative luxury.",
  },
  {
    title: "Dining Room",
    image: diningImage,
    copy: "Architectural tables and curved dining chairs that make every setting feel ceremonial.",
  },
  {
    title: "Office",
    image: officeImage,
    copy: "Walnut desks and lounge-ready seating for beautifully productive workspaces.",
  },
  {
    title: "Outdoor Furniture",
    image: outdoorImage,
    copy: "Resort-inspired silhouettes made to soften terraces, courtyards, and poolside rooms.",
  },
] as const;

const inspirationGallery = [
  {
    title: "Soft geometry",
    copy: "Curves, pale stone, and walnut grain composed with generous breathing room.",
    image: heroImage,
  },
  {
    title: "Quiet retreat",
    copy: "Layered upholstery and dimmable light for a slower, more tactile bedroom mood.",
    image: bedroomImage,
  },
  {
    title: "Entertaining ritual",
    copy: "Dining spaces with sculptural forms that anchor conversation and warm hospitality.",
    image: diningImage,
  },
  {
    title: "Open-air calm",
    copy: "Outdoor compositions that feel grounded, sun-washed, and quietly elevated.",
    image: outdoorImage,
  },
] as const;

const testimonialPlaceholders = [
  "No reviews yet — this space is reserved for verified client stories.",
  "Awaiting the first delivered home to leave a real experience here.",
  "Your future testimonials will appear once real orders begin arriving.",
] as const;

function HomeErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-16">
      <div className="luxury-card max-w-xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Storefront unavailable</p>
        <h1 className="mt-4 font-display text-5xl text-foreground">We couldn&apos;t load the collection</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{error.message}</p>
        <div className="mt-8">
          <Button variant="luxury" onClick={reset}>
            Refresh page
          </Button>
        </div>
      </div>
    </div>
  );
}

function HomeNotFoundComponent() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-16">
      <div className="luxury-card max-w-xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Collection missing</p>
        <h1 className="mt-4 font-display text-5xl text-foreground">Nothing to show here</h1>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions({ first: 6 })),
  head: () => ({
    meta: [
      { title: "Avery & Co. | Premium Luxury Furniture" },
      {
        name: "description",
        content:
          "Discover premium luxury furniture with sculpted silhouettes, warm walnut finishes, serene neutrals, and an elevated Shopify checkout flow.",
      },
      { property: "og:title", content: "Avery & Co. | Premium Luxury Furniture" },
      {
        property: "og:description",
        content:
          "A warm, editorial e-commerce experience inspired by the world of high-end furniture design.",
      },
    ],
  }),
  component: HomePage,
  errorComponent: HomeErrorComponent,
  notFoundComponent: HomeNotFoundComponent,
});

function HomePage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions({ first: 6 }));

  return (
    <main className="relative overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="page-shell py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-full border border-white/35 bg-background/70 px-4 py-3 shadow-lg backdrop-blur-xl sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
            <div className="min-w-0">
              <p className="truncate font-display text-2xl text-foreground sm:text-3xl">Avery &amp; Co.</p>
              <p className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground sm:text-xs">
                Premium furniture &amp; interiors
              </p>
            </div>
            <nav className="hidden min-w-0 items-center justify-center gap-6 text-sm text-foreground/80 md:flex">
              <a href="#categories" className="story-link">
                Categories
              </a>
              <a href="#featured" className="story-link">
                Featured
              </a>
              <a href="#inspiration" className="story-link">
                Inspiration
              </a>
              <a href="#about" className="story-link">
                About
              </a>
            </nav>
            <div className="justify-self-end">
              <CartDrawer />
            </div>
          </div>
        </div>
      </header>

      <section className="relative min-h-screen">
        <img
          src={heroImage}
          alt="Luxury living room with warm walnut and off-white furnishings"
          className="absolute inset-0 h-full w-full object-cover"
          width={1536}
          height={1024}
        />
        <div className="hero-scrim absolute inset-0" />

        <div className="page-shell relative flex min-h-screen items-end pb-12 pt-32 sm:pb-18 lg:pb-24">
          <div className="hero-panel max-w-2xl animate-fade-in">
            <Badge variant="outline" className="rounded-full border-border/80 bg-background/80 px-4 py-1.5 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              Inspired by the quiet confidence of luxury interiors
            </Badge>
            <h1 className="mt-6 font-display text-6xl leading-[0.9] text-foreground sm:text-7xl lg:text-[6.5rem]">
              Furniture curated for luminous, richly layered homes.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Explore sculptural silhouettes, tactile upholstery, and warm walnut craftsmanship in
              a premium storefront designed to feel refined on every screen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="luxury" size="lg" asChild>
                <a href="#featured">
                  Shop featured pieces
                  <ArrowRight />
                </a>
              </Button>
              <Button variant="outlineWarm" size="lg" asChild>
                <a href="#categories">Browse collections</a>
              </Button>
            </div>
            <div className="mt-10 grid gap-4 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                <p className="font-display text-3xl text-foreground">Warm palette</p>
                <p className="mt-1">Beige, walnut, and off-white for timeless calm.</p>
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">Real checkout</p>
                <p className="mt-1">Cart and checkout connect directly to Shopify.</p>
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">Responsive</p>
                <p className="mt-1">Optimized for mobile browsing and large-screen discovery.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="page-shell section-shell">
        <div className="max-w-2xl space-y-4">
          <p className="section-kicker">Shop by room</p>
          <h2 className="section-title">Collections arranged like a beautifully edited home.</h2>
          <p className="section-copy">
            Each category is grounded in warm neutrals, natural texture, and a relaxed sense of
            luxury drawn from the world&apos;s most elevated furniture brands.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {categories.map((category, index) => (
            <article
              key={category.title}
              className={`luxury-card image-frame group ${index === 0 ? "md:col-span-2 xl:col-span-2" : ""}`}
            >
              <div className="relative h-72 overflow-hidden xl:h-96">
                <img
                  src={category.image}
                  alt={category.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  width={1536}
                  height={1024}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/45 via-black/0 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground">
                  <p className="text-[11px] uppercase tracking-[0.3em] opacity-85">Collection</p>
                  <h3 className="mt-2 font-display text-4xl">{category.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-7 opacity-90">{category.copy}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="featured" className="page-shell section-shell border-t border-border/60">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-end">
          <div className="space-y-4">
            <p className="section-kicker">Featured products</p>
            <h2 className="section-title">A Shopify-powered edit ready for real checkout.</h2>
            <p className="section-copy">
              This section loads live product data from your store, so every item shown here can be
              added to cart and checked out through Shopify.
            </p>
          </div>
          <div className="rounded-[calc(var(--radius-2xl))] border border-border/70 bg-secondary/45 p-5 text-sm leading-7 text-muted-foreground">
            Because your Shopify catalog is currently empty, the featured product grid below will
            automatically populate as soon as you add your first products.
          </div>
        </div>

        <div className="mt-10">
          {products.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="luxury-card flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  No products found
                </p>
                <h3 className="mt-2 font-display text-4xl text-foreground">
                  Your catalog is ready for its first piece.
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Tell me the first product name and price, and I can add it directly to your
                  Shopify store so this section becomes fully live.
                </p>
              </div>
              <Button variant="wood" asChild>
                <a href="https://wa.me/?text=Hello%20Avery%20%26%20Co.,%20I%27d%20like%20help%20choosing%20my%20first%20piece." target="_blank" rel="noreferrer">
                  Contact on WhatsApp
                  <MoveRight />
                </a>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="page-shell section-shell border-t border-border/60">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="luxury-card p-7">
            <Gem className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-4 font-display text-4xl text-foreground">Material-led luxury</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Walnut grain, boucle texture, soft linen, and brushed metal accents build quiet depth
              into every composition.
            </p>
          </div>
          <div className="luxury-card p-7">
            <ShieldCheck className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-4 font-display text-4xl text-foreground">Seamless buying</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              A persistent cart, responsive product cards, and a direct Shopify checkout keep the
              experience polished from first click to order completion.
            </p>
          </div>
          <div className="luxury-card p-7">
            <Trees className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-4 font-display text-4xl text-foreground">Inspired spaces</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Spacious layouts, soft shadows, and editorial imagery give the storefront the feeling
              of an aspirational interiors journal.
            </p>
          </div>
        </div>
      </section>

      <section id="inspiration" className="page-shell section-shell border-t border-border/60">
        <div className="max-w-2xl space-y-4">
          <p className="section-kicker">Room inspiration</p>
          <h2 className="section-title">Editorial spaces for every mood of home.</h2>
          <p className="section-copy">
            Large-format imagery and calm pacing evoke the atmosphere of a premium catalog while
            keeping the browsing experience airy and modern.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="luxury-card image-frame group overflow-hidden">
            <img
              src={inspirationGallery[0].image}
              alt={inspirationGallery[0].title}
              className="h-[28rem] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              width={1536}
              height={1024}
            />
            <div className="space-y-3 p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Signature mood</p>
              <h3 className="font-display text-4xl text-foreground">{inspirationGallery[0].title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{inspirationGallery[0].copy}</p>
            </div>
          </article>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            {inspirationGallery.slice(1).map((item) => (
              <article key={item.title} className="luxury-card image-frame group overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  width={1536}
                  height={1024}
                />
                <div className="space-y-2 p-5">
                  <h3 className="font-display text-3xl text-foreground">{item.title}</h3>
                  <p className="text-sm leading-7 text-muted-foreground">{item.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell section-shell border-t border-border/60">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="space-y-4">
            <p className="section-kicker">Client testimonials</p>
            <h2 className="section-title">Reserved for verified customer stories.</h2>
            <p className="section-copy">
              To keep the storefront honest, this section stays empty until real reviews arrive from
              actual orders.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonialPlaceholders.map((copy, index) => (
              <article key={index} className="luxury-card flex flex-col gap-5 p-6">
                <div className="flex gap-1 text-muted-foreground">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Waves key={starIndex} className="h-4 w-4 opacity-55" />
                  ))}
                </div>
                <p className="font-display text-3xl text-foreground">No reviews yet</p>
                <p className="text-sm leading-7 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="page-shell section-shell border-t border-border/60">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div className="luxury-card image-frame overflow-hidden">
            <img
              src={officeImage}
              alt="Warm walnut luxury office vignette"
              className="h-full min-h-[28rem] w-full object-cover"
              loading="lazy"
              width={1536}
              height={1024}
            />
          </div>
          <div className="space-y-6">
            <p className="section-kicker">About Avery &amp; Co.</p>
            <h2 className="section-title">A modern luxury furniture house rooted in warmth.</h2>
            <p className="section-copy">
              Avery &amp; Co. is imagined as a quiet, editorial furniture brand where sculpted walnut,
              warm beige upholstery, and timeless craftsmanship shape every room into a softer,
              more elevated retreat.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="luxury-card p-5">
                <p className="font-display text-4xl text-foreground">01</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Large imagery and airy spacing create a premium browsing rhythm on mobile and
                  desktop alike.
                </p>
              </div>
              <div className="luxury-card p-5">
                <p className="font-display text-4xl text-foreground">02</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Category-led storytelling keeps the homepage aspirational while the Shopify cart
                  remains ready for real purchases.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-secondary/35">
        <div className="page-shell grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div>
            <p className="font-display text-4xl text-foreground">Avery &amp; Co.</p>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              Premium furniture, real Shopify checkout, and an editorial brand experience inspired
              by the world of high-end interiors.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Browse</p>
            <div className="mt-4 space-y-3 text-sm text-foreground">
              <a href="#categories" className="block story-link">
                Categories
              </a>
              <a href="#featured" className="block story-link">
                Featured products
              </a>
              <a href="#inspiration" className="block story-link">
                Inspiration
              </a>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Contact</p>
            <div className="mt-4 space-y-3 text-sm text-foreground">
              <a
                href="https://wa.me/?text=Hello%20Avery%20%26%20Co.,%20I%27d%20love%20help%20with%20a%20furniture%20selection."
                target="_blank"
                rel="noreferrer"
                className="block story-link"
              >
                WhatsApp concierge
              </a>
              <span className="block text-muted-foreground">Made for refined homes in India and beyond.</span>
            </div>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/?text=Hello%20Avery%20%26%20Co.,%20I%27m%20interested%20in%20your%20luxury%20furniture%20collection."
        target="_blank"
        rel="noreferrer"
        aria-label="Contact on WhatsApp"
        className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 hover:-translate-y-1"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </main>
  );
}
