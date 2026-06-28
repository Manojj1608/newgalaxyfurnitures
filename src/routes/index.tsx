import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Filter,
  Gem,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  Search,
  ShieldCheck,
  Star,
  Trees,
  Truck,
  X,
  Youtube,
} from "lucide-react";

import { CartDrawer } from "@/components/cart-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fetchProducts } from "@/lib/products-api";
import { formatINR, PRODUCT_CATEGORIES, type Product } from "@/lib/products-config";
import bedroomImage from "@/assets/category-bedroom.jpg";
import diningImage from "@/assets/category-dining.jpg";
import officeImage from "@/assets/category-office.jpg";
import outdoorImage from "@/assets/category-outdoor.jpg";
import sofasImage from "@/assets/category-sofas.jpg";
import chairsImage from "@/assets/category-chairs.jpg";
import tablesImage from "@/assets/category-tables.jpg";
import storageImage from "@/assets/category-storage.jpg";
import heroImage from "@/assets/hero-luxury-living.jpg";

type Category = {
  title: string;
  image: string;
  copy: string;
  eyebrow: string;
  span: string;
  height: string;
  featured?: boolean;
};

const categories: Category[] = [
  {
    title: "Sofas & Sectionals",
    eyebrow: "Living Room",
    image: sofasImage,
    copy: "Cloud-soft seating in Belgian linen and boucle, framed in solid walnut for statement living rooms.",
    span: "lg:col-span-8 lg:row-span-2",
    height: "h-[28rem] lg:h-[44rem]",
    featured: true,
  },
  {
    title: "Beds & Headboards",
    eyebrow: "Bedroom",
    image: bedroomImage,
    copy: "Tailored canopy beds and channel-tufted headboards for restorative bedrooms.",
    span: "lg:col-span-4",
    height: "h-72 lg:h-[21rem]",
  },
  {
    title: "Dining Tables",
    eyebrow: "Dining",
    image: diningImage,
    copy: "Bookmatched walnut and sculpted bases that anchor every gathering.",
    span: "lg:col-span-4",
    height: "h-72 lg:h-[21rem]",
  },
  {
    title: "Accent Chairs",
    eyebrow: "Living Room",
    image: chairsImage,
    copy: "Sculptural silhouettes in shearling, leather, and steam-bent walnut.",
    span: "lg:col-span-4",
    height: "h-72 lg:h-80",
  },
  {
    title: "Coffee & Side Tables",
    eyebrow: "Living Room",
    image: tablesImage,
    copy: "Travertine, hand-rubbed walnut, and brushed brass — composed with quiet weight.",
    span: "lg:col-span-4",
    height: "h-72 lg:h-80",
  },
  {
    title: "Storage & Display",
    eyebrow: "Storage",
    image: storageImage,
    copy: "Glass-fronted vitrines and walnut credenzas with hand-cast bronze hardware.",
    span: "lg:col-span-4",
    height: "h-72 lg:h-80",
  },
  {
    title: "Executive Office",
    eyebrow: "Office",
    image: officeImage,
    copy: "Walnut desks with leather inlay and lounge-ready seating for considered work.",
    span: "lg:col-span-6",
    height: "h-72 lg:h-96",
  },
  {
    title: "Outdoor Living",
    eyebrow: "Outdoor",
    image: outdoorImage,
    copy: "FSC teak and performance weaves designed for terraces, courtyards, and poolside.",
    span: "lg:col-span-6",
    height: "h-72 lg:h-96",
  },
];

const trustMetrics = [
  { value: "18", label: "Years crafting bespoke furniture" },
  { value: "2,400+", label: "Homes furnished across India" },
  { value: "120", label: "Master artisans in our workshop" },
  { value: "10 yr", label: "Structural warranty on every piece" },
] as const;

const successStories = [
  {
    title: "A Bengaluru penthouse furnished in 9 weeks.",
    summary:
      "38 walnut-and-linen pieces selected, manufactured, and white-glove installed on schedule — every order tracked end to end.",
    client: "Mehta Residence, Bengaluru",
  },
  {
    title: "Outfitting a 14-villa coastal resort.",
    summary:
      "From dining halls to private terraces, we delivered cohesive furniture in FSC-certified teak and weather-tested upholstery, ahead of opening.",
    client: "Saira Hospitality Group, Goa",
  },
  {
    title: "A heritage bungalow restoration.",
    summary:
      "Our workshop hand-built custom seating and casegoods to fit century-old architecture, with on-site finishing and a 10-year warranty.",
    client: "Rao Family Estate, Bengaluru",
  },
] as const;

const PHONE_DISPLAY = "+91 95134 43606";
const PHONE_TEL = "+919513443606";
const WHATSAPP_URL =
  "https://wa.me/919513443606?text=Hello%20New%20Galaxy%20Furniture,%20I%27m%20interested%20in%20your%20furniture%20collection%20and%20would%20like%20a%20quote.";

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
  head: () => ({
    meta: [
      { title: "New Galaxy Furniture | Premium Luxury Furniture" },
      {
        name: "description",
        content:
          "Premium luxury furniture in walnut, beige, and linen. Bespoke craftsmanship, white-glove delivery across India, and a 10-year structural warranty.",
      },
      { property: "og:title", content: "New Galaxy Furniture | Premium Luxury Furniture" },
      {
        property: "og:description",
        content:
          "Shop sculptural sofas, walnut dining tables, beds, and casegoods — hand-built and delivered white-glove across India.",
      },
    ],
  }),
  component: HomePage,
  errorComponent: HomeErrorComponent,
  notFoundComponent: HomeNotFoundComponent,
});

function HomePage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const filters = useMemo(() => ["All", ...PRODUCT_CATEGORIES], []);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((c) => {
      const matchesFilter =
        activeFilter === "All" ||
        c.title === activeFilter ||
        c.eyebrow === activeFilter;
      const matchesQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.copy.toLowerCase().includes(q) ||
        c.eyebrow.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [query, activeFilter]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesFilter = activeFilter === "All" || p.category === activeFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.material ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q);
      return matchesFilter && matchesQuery && p.in_stock;
    });
  }, [products, query, activeFilter]);

  const featuredProducts = useMemo(() => products.filter((p) => p.featured && p.in_stock).slice(0, 6), [products]);

  const hasActiveFilters = query.trim() !== "" || activeFilter !== "All";
  const clearFilters = () => {
    setQuery("");
    setActiveFilter("All");
  };

  return (
    <main className="relative overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="page-shell py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-full border border-white/35 bg-background/70 px-4 py-3 shadow-lg backdrop-blur-xl sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
            <div className="min-w-0">
              <p className="truncate font-display text-2xl text-foreground sm:text-3xl">New Galaxy Furniture</p>
              <p className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground sm:text-xs">
                Premium furniture &amp; interiors
              </p>
            </div>
            <nav className="hidden min-w-0 items-center justify-center gap-6 text-sm text-foreground/80 md:flex">
              <a href="#about" className="story-link">About</a>
              <a href="#categories" className="story-link">Collections</a>
              <a href="#contact" className="story-link">Contact</a>
              <a href="#why" className="story-link">Why us</a>
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

        <div className="page-shell relative flex min-h-screen items-end pb-16 pt-32 sm:pb-24 lg:pb-32">
          <div className="hero-panel max-w-2xl animate-fade-in">
            <Badge variant="outline" className="rounded-full border-border/80 bg-background/80 px-4 py-1.5 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              A premium luxury furniture showroom
            </Badge>
            <h1 className="mt-6 font-display text-4xl leading-[0.98] text-foreground sm:text-[2.9rem] lg:text-[4.2rem]">
              Furniture curated for luminous, richly layered homes.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground">
              Sculptural silhouettes, tactile upholstery, and warm walnut craftsmanship — hand-built
              in our workshop and delivered white-glove across India.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button variant="luxury" size="lg" asChild>
                <a href="#categories">
                  Browse collections
                  <ArrowRight />
                </a>
              </Button>
              <Button variant="outlineWarm" size="lg" asChild>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Enquire on WhatsApp</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="page-shell section-shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
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
            <p className="section-kicker">About New Galaxy Furniture</p>
            <h2 className="section-title">A modern luxury furniture house rooted in warmth.</h2>
            <p className="section-copy">
              Founded in 2007, New Galaxy Furniture is a quiet, editorial furniture house where sculpted
              walnut, warm beige upholstery, and timeless craftsmanship shape every room into a
              softer, more elevated retreat.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="luxury-card p-6">
                <p className="font-display text-4xl text-wood">01</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  An in-house workshop of 120 master artisans — every piece signed by its maker.
                </p>
              </div>
              <div className="luxury-card p-6">
                <p className="font-display text-4xl text-wood">02</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Bespoke sizing, fabric, and finish options on every made-to-order piece.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section id="categories" className="page-shell section-shell border-t border-border/60">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end">
          <div className="max-w-2xl space-y-5">
            <p className="section-kicker">Collections</p>
            <h2 className="section-title">A curated edit of premium furniture, by category.</h2>
          </div>
          <p className="section-copy lg:justify-self-end lg:text-right">
            Search by name, room, or material — or filter by category to find the pieces that
            belong in your home.
          </p>
        </div>

        {/* Search + filters */}
        <div className="mt-10 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sofas, walnut tables, outdoor pieces..."
                aria-label="Search furniture collections"
                className="h-12 rounded-full border-border/70 bg-background/70 pl-11 pr-4 text-sm backdrop-blur"
              />
            </div>
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outlineWarm" size="lg" className="sm:hidden">
                  <Filter className="h-4 w-4" />
                  Filters{activeFilter !== "All" ? ` · ${activeFilter}` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle className="font-display text-2xl">Filter by category</SheetTitle>
                </SheetHeader>
                <div className="mt-4 grid grid-cols-2 gap-2 px-4 pb-6">
                  {filters.map((f) => {
                    const active = activeFilter === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => { setActiveFilter(f); setMobileFiltersOpen(false); }}
                        className={`rounded-full border px-3 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-all ${
                          active ? "border-wood bg-wood text-wood-foreground" : "border-border/70 bg-background/70 text-foreground"
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-border/60 p-4">
                  <Button variant="ghost" className="w-full" onClick={() => { clearFilters(); setMobileFiltersOpen(false); }} disabled={!hasActiveFilters}>
                    <X className="h-4 w-4" /> Clear filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="hidden sm:inline-flex">
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            )}
          </div>
          <div className="hidden flex-wrap gap-2 sm:flex">
            {filters.map((f) => {
              const active = activeFilter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.24em] transition-all duration-300 ${
                    active
                      ? "border-wood bg-wood text-wood-foreground shadow-sm"
                      : "border-border/70 bg-background/60 text-muted-foreground hover:-translate-y-0.5 hover:border-wood/60 hover:text-foreground"
                  }`}
                  aria-pressed={active}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="luxury-card mt-12 p-10 text-center">
            <p className="font-display text-3xl text-foreground">No collections match your search.</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Try a different keyword, clear the filters, or message us on WhatsApp for a curated
              recommendation.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="outlineWarm"
                onClick={() => {
                  setQuery("");
                  setActiveFilter("All");
                }}
              >
                Reset filters
              </Button>
              <Button variant="wood" asChild>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                  Enquire on WhatsApp
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-12 grid auto-rows-[minmax(0,auto)] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
            {filteredCategories.map((category) => (
              <article
                key={category.title}
                className={`luxury-card image-frame group relative cursor-pointer overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_44px_90px_-44px_color-mix(in_oklab,var(--color-foreground)_32%,transparent)] ${category.span}`}
              >
                <div className={`relative w-full overflow-hidden ${category.height}`}>
                  <img
                    src={category.image}
                    alt={category.title}
                    className="h-full w-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.07]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/80" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground transition-transform duration-500 group-hover:-translate-y-1 sm:p-8 lg:p-10">
                    <p className="text-[10px] uppercase tracking-[0.34em] opacity-85 sm:text-[11px]">
                      {category.eyebrow}
                    </p>
                    <h3
                      className={`mt-3 font-display leading-none ${
                        category.featured
                          ? "text-4xl sm:text-5xl lg:text-6xl"
                          : "text-3xl sm:text-[2.1rem]"
                      }`}
                    >
                      {category.title}
                    </h3>
                    <p
                      className={`mt-3 leading-7 opacity-90 ${
                        category.featured ? "max-w-md text-sm sm:text-base" : "max-w-sm text-sm"
                      }`}
                    >
                      {category.copy}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] opacity-0 transition-all duration-500 group-hover:translate-x-1 group-hover:opacity-100">
                      Explore collection <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Products from DB (filtered by same search/filter) */}
        {filteredProducts.length > 0 && (
          <div className="mt-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="section-kicker">Shop products</p>
                <h3 className="font-display text-3xl text-foreground sm:text-4xl">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "piece" : "pieces"} available
                </h3>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
            </div>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((p) => (
                <ProductCardLite key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Featured products */}
      {featuredProducts.length > 0 && (
        <section id="featured" className="page-shell section-shell border-t border-border/60">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-5">
              <p className="section-kicker"><Star className="inline h-3 w-3 fill-wood text-wood" /> Featured products</p>
              <h2 className="section-title">Hand-picked pieces from our latest edit.</h2>
            </div>
            <Button variant="outlineWarm" asChild>
              <a href="#categories">Browse all collections <ArrowRight /></a>
            </Button>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((p) => (
              <ProductCardLite key={p.id} product={p} featured />
            ))}
          </div>
        </section>
      )}


      {/* Contact */}
      <section id="contact" className="page-shell section-shell border-t border-border/60">
        <div className="luxury-card relative overflow-hidden">
          <img
            src={diningImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-linear-to-r from-background/95 via-background/85 to-background/60" />
          <div className="relative grid gap-10 p-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center lg:p-16">
            <div className="space-y-6">
              <Badge variant="outline" className="rounded-full border-border/80 bg-background/80 px-4 py-1.5 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                Contact &amp; enquiries
              </Badge>
              <h2 className="font-display text-4xl leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
                Enquire about any piece — we&apos;ll respond within 24 hours.
              </h2>
              <p className="max-w-xl text-base leading-8 text-muted-foreground">
                Share the piece, the room, and your delivery city. Our team will confirm pricing,
                availability, lead times, and white-glove logistics — all backed by our 10-year
                structural warranty.
              </p>
              <ul className="grid gap-3 text-sm leading-7 text-muted-foreground sm:grid-cols-2">
                <li className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 text-wood" /> Request a quote in writing</li>
                <li className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 text-wood" /> Check availability &amp; lead times</li>
                <li className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 text-wood" /> Material &amp; finish details on request</li>
                <li className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 text-wood" /> White-glove delivery &amp; warranty</li>
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="wood" size="lg" asChild>
                  <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                    Enquire on WhatsApp
                    <ArrowRight />
                  </a>
                </Button>
                <Button variant="outlineWarm" size="lg" asChild>
                  <a href="mailto:sales@newgalaxyfurniture.in?subject=Quote%20request">Request a quote</a>
                </Button>
              </div>
            </div>
            <div className="space-y-4 rounded-[calc(var(--radius-2xl))] border border-border/70 bg-background/80 p-7 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">Direct lines</p>
              <div className="space-y-4 text-sm">
                <a href={`tel:${PHONE_TEL}`} className="flex items-start gap-3 text-foreground transition-colors hover:text-wood">
                  <Phone className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-2xl">{PHONE_DISPLAY}</span><span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Mon–Sat · 10am–7pm IST</span></span>
                </a>
                <a href="mailto:sales@newgalaxyfurniture.in" className="flex items-start gap-3 text-foreground transition-colors hover:text-wood">
                  <Mail className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-2xl">sales@newgalaxyfurniture.in</span><span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Replies within 24 hours</span></span>
                </a>
                <div className="flex items-start gap-3 text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-2xl">Bengaluru showroom</span><span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">42 Lavelle Road · Mon–Sat · 11am–8pm</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section id="why" className="page-shell section-shell border-t border-border/60">
        <div className="max-w-2xl space-y-5">
          <p className="section-kicker">Why choose us</p>
          <h2 className="section-title">Built to last. Delivered with care.</h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="luxury-card p-8 transition-all duration-500 hover:-translate-y-1">
            <Gem className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-5 font-display text-3xl text-foreground">Material-led luxury</h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Walnut grain, boucle texture, soft linen, and brushed metal — every material chosen
              for tactile depth and longevity.
            </p>
          </div>
          <div className="luxury-card p-8 transition-all duration-500 hover:-translate-y-1">
            <Truck className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-5 font-display text-3xl text-foreground">White-glove delivery</h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Scheduled delivery, in-room placement, unpacking and assembly — handled by our
              dedicated logistics team across India.
            </p>
          </div>
          <div className="luxury-card p-8 transition-all duration-500 hover:-translate-y-1">
            <Trees className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-5 font-display text-3xl text-foreground">Responsibly sourced</h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              FSC-certified hardwoods, natural fibres, and small-batch finishing keep each
              collection grounded in considered craft.
            </p>
          </div>
          <div className="luxury-card p-8 transition-all duration-500 hover:-translate-y-1">
            <ShieldCheck className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-5 font-display text-3xl text-foreground">10-year warranty</h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Structural warranty on every frame, complimentary repairs in the first year, and
              lifetime servicing from the artisans who built your piece.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="trust" className="page-shell section-shell border-t border-border/60">
        <div className="max-w-2xl space-y-5">
          <p className="section-kicker">Customer testimonials</p>
          <h2 className="section-title">Loved by homeowners across India.</h2>
          <p className="section-copy">
            Eighteen years of furniture commissions — measured in the homes, resorts, and heritage
            estates that trust us to deliver.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustMetrics.map((metric) => (
            <div
              key={metric.label}
              className="luxury-card p-8 transition-all duration-500 hover:-translate-y-1"
            >
              <p className="font-display text-6xl text-wood">{metric.value}</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {successStories.map((story) => (
            <article
              key={story.client}
              className="luxury-card flex h-full flex-col gap-5 p-8 transition-all duration-500 hover:-translate-y-1"
            >
              <Quote className="h-6 w-6 text-wood" />
              <h3 className="font-display text-3xl leading-tight text-foreground">{story.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{story.summary}</p>
              <p className="mt-auto border-t border-border/60 pt-5 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {story.client}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 bg-secondary/40">
        <div className="page-shell grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <p className="font-display text-4xl text-foreground">New Galaxy Furniture</p>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              A modern luxury furniture house. Bespoke craftsmanship, white-glove delivery, and a
              10-year structural warranty on every piece — for refined homes across India and beyond.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-wood hover:text-wood-foreground">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-wood hover:text-wood-foreground">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-wood hover:text-wood-foreground">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Browse</p>
            <div className="mt-5 space-y-3 text-sm text-foreground">
              <a href="#about" className="block story-link">About</a>
              <a href="#categories" className="block story-link">Collections</a>
              <a href="#contact" className="block story-link">Contact</a>
              <a href="#why" className="block story-link">Why choose us</a>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Contact</p>
            <div className="mt-5 space-y-3 text-sm text-foreground">
              <a href={`tel:${PHONE_TEL}`} className="flex items-center gap-2 story-link"><Phone className="h-3.5 w-3.5" />{PHONE_DISPLAY}</a>
              <a href="mailto:sales@newgalaxyfurniture.in" className="flex items-center gap-2 story-link"><Mail className="h-3.5 w-3.5" />sales@newgalaxyfurniture.in</a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 story-link"><MessageCircle className="h-3.5 w-3.5" />WhatsApp enquiries</a>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Showroom</p>
            <div className="mt-5 space-y-4 text-sm text-foreground">
              <div>
                <p className="font-display text-xl">Bengaluru</p>
                <p className="mt-1 text-muted-foreground">42 Lavelle Road, Bengaluru<br />Mon–Sat · 11am–8pm</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="page-shell flex flex-col gap-3 py-6 text-xs uppercase tracking-[0.28em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} New Galaxy Furniture Atelier Pvt. Ltd.</p>
            <p className="flex items-center gap-4">
              <span>Crafted in India · Delivered worldwide</span>
              <a href="/admin/login" className="opacity-30 transition-opacity hover:opacity-80" aria-label="Admin sign in">·</a>
            </p>
          </div>
        </div>
      </footer>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Enquire on WhatsApp"
        className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-wood text-wood-foreground shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </main>
  );
}

function ProductCardLite({ product, featured }: { product: Product; featured?: boolean }) {
  const primary = product.images[0]?.url;
  const onSale = product.sale_price !== null && Number(product.sale_price) < Number(product.price);
  const enquireUrl = `https://wa.me/919513443606?text=${encodeURIComponent(
    `Hello New Galaxy Furniture, I'd like a quote for: ${product.name} (${product.category}).`,
  )}`;
  return (
    <article className="luxury-card image-frame group relative flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-40px_color-mix(in_oklab,var(--color-foreground)_30%,transparent)]">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {primary ? (
          <img src={primary} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05]" />
        ) : (
          <div className="grid h-full w-full place-content-center text-xs uppercase tracking-[0.3em] text-muted-foreground">No image</div>
        )}
        {featured && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-wood/95 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-wood-foreground">
            <Star className="h-3 w-3 fill-current" /> Featured
          </span>
        )}
        {onSale && (
          <span className="absolute right-4 top-4 rounded-full bg-background/95 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-foreground">Sale</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{product.category}</p>
        <h4 className="font-display text-2xl leading-tight text-foreground">{product.name}</h4>
        {product.material && <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{product.material}</p>}
        {product.description && <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{product.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="font-display text-2xl text-foreground">
              {formatINR(Number(onSale ? product.sale_price! : product.price))}
            </p>
            {onSale && (
              <p className="text-xs text-muted-foreground line-through">{formatINR(Number(product.price))}</p>
            )}
          </div>
          <Button asChild variant="wood" size="sm">
            <a href={enquireUrl} target="_blank" rel="noreferrer">Enquire</a>
          </Button>
        </div>
      </div>
    </article>
  );
}
