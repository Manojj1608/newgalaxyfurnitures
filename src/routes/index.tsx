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
import { supabase } from "@/integrations/supabase/client";

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
    title: "Office Furniture",
    eyebrow: "Office",
    image: officeImage,
    copy: "Walnut desks with leather inlay and lounge-ready seating for considered work.",
    span: "lg:col-span-6",
    height: "h-72 lg:h-96",
  },
  {
    title: "Outdoor Furniture",
    eyebrow: "Outdoor",
    image: outdoorImage,
    copy: "FSC teak and performance weaves designed for terraces, courtyards, and poolside.",
    span: "lg:col-span-6",
    height: "h-72 lg:h-96",
  },
];

const trustMetrics = [
  { value: "23+", label: "Years serving families since 2002" },
  { value: "10,000+", label: "Happy customers across India" },
  { value: "100%", label: "Premium quality materials" },
  { value: "Custom", label: "Made-to-order options on every piece" },
] as const;

const trustPillars = [
  { title: "Established Since 2002", copy: "More than two decades of trusted service and craftsmanship — a family business built on word of mouth." },
  { title: "Thousands of Happy Customers", copy: "Homes furnished across Bengaluru and India, with repeat customers and referrals every month." },
  { title: "Premium Quality Materials", copy: "Solid hardwoods, hand-selected fabrics, and durable finishes built to last for generations." },
  { title: "Custom Furniture Options", copy: "Tell us your size, fabric, and finish — our workshop builds it to fit your home." },
  { title: "Reliable Delivery & Installation", copy: "On-time white-glove delivery, in-room placement, and assembly handled by our own team." },
] as const;

const customerReviews = [
  {
    title: "Beautiful sofa, delivered on time.",
    summary:
      "Ordered a custom 3-seater in our preferred fabric. The team measured the room, suggested the right size, and delivered on schedule. Build quality is excellent.",
    client: "Priya & Arjun · Bengaluru",
  },
  {
    title: "Quality you can feel.",
    summary:
      "We furnished our new apartment end to end — dining table, beds, wardrobes. Solid wood, clean joinery, and the after-sales service has been prompt.",
    client: "Mehta Family · Whitefield",
  },
  {
    title: "A trusted local name.",
    summary:
      "Our family has been buying from New Galaxy Furniture since 2008. Same honest pricing, same craftsmanship. They feel like family at this point.",
    client: "Rao Residence · Jayanagar",
  },
] as const;

const PHONE_DISPLAY = "+91 95134 43606";
const PHONE_TEL = "+919513443606";
const WHATSAPP_URL =
  "https://wa.me/919513443606?text=Hello%2C%20I%27m%20interested%20in%20your%20furniture%20collection.";

function NGMonogram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ng-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6e2b3" />
          <stop offset="45%" stopColor="#d4af6a" />
          <stop offset="100%" stopColor="#8a6a2f" />
        </linearGradient>
      </defs>
      {/* Galaxy rings */}
      <ellipse cx="32" cy="32" rx="28" ry="10" fill="none" stroke="url(#ng-gold)" strokeOpacity="0.55" strokeWidth="0.9" transform="rotate(-22 32 32)" />
      <ellipse cx="32" cy="32" rx="28" ry="10" fill="none" stroke="url(#ng-gold)" strokeOpacity="0.35" strokeWidth="0.7" transform="rotate(22 32 32)" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="url(#ng-gold)" strokeOpacity="0.9" strokeWidth="1" />
      {/* NG monogram */}
      <g fill="url(#ng-gold)" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="600">
        <text x="32" y="39" textAnchor="middle" fontSize="20" letterSpacing="-1">NG</text>
      </g>
      {/* Tiny stars */}
      <circle cx="10" cy="20" r="0.8" fill="url(#ng-gold)" />
      <circle cx="54" cy="46" r="0.8" fill="url(#ng-gold)" />
      <circle cx="50" cy="14" r="0.6" fill="url(#ng-gold)" opacity="0.7" />
    </svg>
  );
}

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
      { title: "New Galaxy Furniture | Premium Furniture in Bengaluru · Since 2002" },
      {
        name: "description",
        content:
          "New Galaxy Furniture has been crafting premium sofas, beds, dining tables, and custom furniture in Bengaluru since 2002. Quality materials, expert craftsmanship, reliable delivery.",
      },
      { property: "og:title", content: "New Galaxy Furniture | Premium Furniture · Since 2002" },
      {
        property: "og:description",
        content:
          "Timeless furniture crafted for modern living. Sofas, beds, dining tables, and custom pieces — delivered across Bengaluru and India.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FurnitureStore",
          name: "New Galaxy Furniture",
          foundingDate: "2002",
          telephone: "+91 95134 43606",
          email: "sales@newgalaxyfurniture.in",
          url: "https://newgalaxyfurnitures.lovable.app",
          address: {
            "@type": "PostalAddress",
            streetAddress: "42 Lavelle Road",
            addressLocality: "Bengaluru",
            addressRegion: "Karnataka",
            addressCountry: "IN",
          },
          openingHours: "Mo-Sa 10:00-20:00",
        }),
      },
    ],
  }),
  component: HomePage,
  errorComponent: HomeErrorComponent,
  notFoundComponent: HomeNotFoundComponent,
});

const PRICE_RANGES = [
  { id: "All", label: "Any price", min: 0, max: Infinity },
  { id: "u25", label: "Under ₹25k", min: 0, max: 25000 },
  { id: "25-50", label: "₹25k – ₹50k", min: 25000, max: 50000 },
  { id: "50-100", label: "₹50k – ₹1L", min: 50000, max: 100000 },
  { id: "100+", label: "₹1L & above", min: 100000, max: Infinity },
] as const;

function HomePage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [activePrice, setActivePrice] = useState<string>("All");
  const [activeMaterial, setActiveMaterial] = useState<string>("All");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetchProducts()
        .then((p) => { if (mounted) setProducts(p); })
        .catch(() => { if (mounted) setProducts([]); });
    load();
    const channel = supabase
      .channel("products:home")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);


  const filters = useMemo(() => ["All", ...PRODUCT_CATEGORIES], []);

  const materials = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const m = (p.material ?? "").trim();
      if (m) set.add(m);
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  useEffect(() => {
    if (activeMaterial !== "All" && !materials.includes(activeMaterial)) setActiveMaterial("All");
  }, [materials, activeMaterial]);

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
    const range = PRICE_RANGES.find((r) => r.id === activePrice) ?? PRICE_RANGES[0];
    return products.filter((p) => {
      const matchesFilter = activeFilter === "All" || p.category === activeFilter;
      const effectivePrice = p.sale_price ?? p.price;
      const matchesPrice = effectivePrice >= range.min && effectivePrice < range.max;
      const matchesMaterial =
        activeMaterial === "All" || (p.material ?? "").trim() === activeMaterial;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.material ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q);
      return matchesFilter && matchesPrice && matchesMaterial && matchesQuery && p.in_stock;
    });
  }, [products, query, activeFilter, activePrice, activeMaterial]);

  const featuredProducts = useMemo(() => products.filter((p) => p.featured && p.in_stock).slice(0, 6), [products]);

  const activeFilterCount =
    (activeFilter !== "All" ? 1 : 0) + (activePrice !== "All" ? 1 : 0) + (activeMaterial !== "All" ? 1 : 0);
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0;
  const clearFilters = () => {
    setQuery("");
    setActiveFilter("All");
    setActivePrice("All");
    setActiveMaterial("All");
  };


  return (
    <main className="relative overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="page-shell py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-full border border-white/35 bg-background/70 px-4 py-3 shadow-lg backdrop-blur-xl sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
            <a href="#top" className="flex min-w-0 items-center gap-3">
              <NGMonogram className="h-11 w-11 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-display text-lg uppercase tracking-[0.18em] text-foreground sm:text-xl">New Galaxy Furniture</p>
                <p className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground sm:text-xs">
                  Premium Furniture Since 2002
                </p>
              </div>
            </a>
            <nav className="hidden min-w-0 items-center justify-center gap-6 text-sm text-foreground/80 lg:flex">
              <a href="#top" className="story-link">Home</a>
              <a href="#categories" className="story-link">Collections</a>
              <a href="#categories" className="story-link">Living Room</a>
              <a href="#categories" className="story-link">Bedroom</a>
              <a href="#categories" className="story-link">Dining</a>
              <a href="#contact" className="story-link">Contact</a>
            </nav>
            <div className="justify-self-end">
              <CartDrawer />
            </div>
          </div>
        </div>
      </header>

      <section id="top" className="relative min-h-screen">
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
              Trusted Furniture Experts · Since 2002
            </Badge>
            <h1 className="mt-6 font-display text-4xl leading-[0.98] text-foreground sm:text-[2.9rem] lg:text-[4.2rem]">
              Luxury Furniture Crafted for Modern Living.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground">
              Since 2002, New Galaxy Furniture has been creating elegant living spaces with premium
              sofas, beds, dining sets, wardrobes, and custom furniture designed for comfort, style,
              and durability.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button variant="luxury" size="lg" asChild>
                <a href="#categories">
                  Explore Collection
                  <ArrowRight />
                </a>
              </Button>
              <Button variant="outlineWarm" size="lg" asChild>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp Inquiry</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust pillars */}
      <section className="page-shell section-shell">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {trustPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="luxury-card flex flex-col gap-3 p-6 transition-all duration-500 hover:-translate-y-1"
            >
              <ShieldCheck className="h-5 w-5 text-wood" />
              <h3 className="font-display text-lg leading-tight text-foreground">{pillar.title}</h3>
              <p className="text-xs leading-6 text-muted-foreground">{pillar.copy}</p>
            </div>
          ))}
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
            <h2 className="section-title">A trusted Bengaluru furniture house — since 2002.</h2>
            <p className="section-copy">
              New Galaxy Furniture has been serving customers since 2002, offering premium furniture
              crafted with quality materials, timeless designs, and attention to detail. From our
              Bengaluru showroom to homes across India, every piece is built to be lived in for years.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="luxury-card p-6">
                <p className="font-display text-4xl text-wood">23+</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Years of trusted craftsmanship and honest service, run as a family business.
                </p>
              </div>
              <div className="luxury-card p-6">
                <p className="font-display text-4xl text-wood">Custom</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Made-to-order sizing, fabric, and finish on every piece — built in our own workshop.
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
                  Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle className="font-display text-2xl">Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 px-4 pb-6 pt-4">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Category</p>
                    <div className="grid grid-cols-2 gap-2">
                      {filters.map((f) => (
                        <FilterChip key={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} compact>
                          {f}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Price range</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PRICE_RANGES.map((r) => (
                        <FilterChip key={r.id} active={activePrice === r.id} onClick={() => setActivePrice(r.id)} compact>
                          {r.label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                  {materials.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Material</p>
                      <div className="grid grid-cols-2 gap-2">
                        {materials.map((m) => (
                          <FilterChip key={m} active={activeMaterial === m} onClick={() => setActiveMaterial(m)} compact>
                            {m}
                          </FilterChip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-border/60 bg-background p-4">
                  <Button variant="ghost" onClick={clearFilters} disabled={!hasActiveFilters}>
                    <X className="h-4 w-4" /> Clear
                  </Button>
                  <Button variant="wood" onClick={() => setMobileFiltersOpen(false)}>
                    Show {filteredProducts.length} pieces
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
          <div className="hidden flex-col gap-3 sm:flex">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Category</span>
              {filters.map((f) => (
                <FilterChip key={f} active={activeFilter === f} onClick={() => setActiveFilter(f)}>
                  {f}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Price</span>
              {PRICE_RANGES.map((r) => (
                <FilterChip key={r.id} active={activePrice === r.id} onClick={() => setActivePrice(r.id)}>
                  {r.label}
                </FilterChip>
              ))}
            </div>
            {materials.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Material</span>
                {materials.map((m) => (
                  <FilterChip key={m} active={activeMaterial === m} onClick={() => setActiveMaterial(m)}>
                    {m}
                  </FilterChip>
                ))}
              </div>
            )}
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
                Visit our showroom or message us — we&apos;ll respond within 24 hours.
              </h2>
              <p className="max-w-xl text-base leading-8 text-muted-foreground">
                Share the piece, the room, and your delivery city. Our team will confirm pricing,
                availability, lead times, and delivery — backed by 23+ years of trusted service.
              </p>
              <ul className="grid gap-3 text-sm leading-7 text-muted-foreground sm:grid-cols-2">
                <li className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 text-wood" /> Request a quote in writing</li>
                <li className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 text-wood" /> Check availability &amp; lead times</li>
                <li className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 text-wood" /> Custom sizing, fabric &amp; finish</li>
                <li className="flex items-start gap-3"><ShieldCheck className="mt-1 h-4 w-4 text-wood" /> Reliable delivery &amp; installation</li>
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
              <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">Get in touch</p>
              <div className="space-y-4 text-sm">
                <a href={`tel:${PHONE_TEL}`} className="flex items-start gap-3 text-foreground transition-colors hover:text-wood">
                  <Phone className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-xl">{PHONE_DISPLAY}</span><span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Call us · Mon–Sat</span></span>
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-start gap-3 text-foreground transition-colors hover:text-wood">
                  <MessageCircle className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-xl">WhatsApp us</span><span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{PHONE_DISPLAY}</span></span>
                </a>
                <a href="mailto:sales@newgalaxyfurniture.in" className="flex items-start gap-3 text-foreground transition-colors hover:text-wood">
                  <Mail className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-xl">sales@newgalaxyfurniture.in</span><span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Replies within 24 hours</span></span>
                </a>
                <div className="flex items-start gap-3 text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-xl">Bengaluru Showroom</span><span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">42 Lavelle Road, Bengaluru 560001</span></span>
                </div>
                <div className="flex items-start gap-3 text-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-xl">Mon–Sat · 10am–8pm</span><span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Closed on Sundays</span></span>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/60">
                <iframe
                  title="New Galaxy Furniture showroom on Google Maps"
                  src="https://www.google.com/maps?q=Lavelle+Road+Bengaluru&output=embed"
                  className="h-48 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
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
          {customerReviews.map((story) => (
            <article
              key={story.client}
              className="luxury-card flex h-full flex-col gap-5 p-8 transition-all duration-500 hover:-translate-y-1"
            >
              <Quote className="h-6 w-6 text-wood" />
              <div className="flex gap-0.5 text-wood">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <h3 className="font-display text-2xl leading-tight text-foreground">{story.title}</h3>
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
            <div className="flex items-center gap-3">
              <NGMonogram className="h-14 w-14 shrink-0" />
              <div>
                <p className="font-display text-2xl uppercase tracking-[0.16em] text-foreground">New Galaxy Furniture</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.34em] text-muted-foreground">Premium Furniture Since 2002</p>
              </div>
            </div>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              A trusted Bengaluru furniture house serving families since 2002 — quality materials,
              expert craftsmanship, custom options, and reliable delivery across India.
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
                <p className="mt-1 text-muted-foreground">42 Lavelle Road<br />Bengaluru 560001<br />Mon–Sat · 10am–8pm</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="page-shell flex flex-col gap-3 py-6 text-xs uppercase tracking-[0.28em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} New Galaxy Furniture | Since 2002</p>
            <p className="flex items-center gap-4">
              <span>Crafted with care in Bengaluru · Delivered across India</span>
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
    `Hello, I'm interested in your furniture collection — specifically: ${product.name} (${product.category}).`,
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
          <div className="flex gap-2">
            <Button asChild variant="outlineWarm" size="sm">
              <Link to="/product/$handle" params={{ handle: product.slug }}>Quick View</Link>
            </Button>
            <Button asChild variant="wood" size="sm">
              <a href={enquireUrl} target="_blank" rel="noreferrer" aria-label={`Enquire about ${product.name} on WhatsApp`}>
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
