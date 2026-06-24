import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Gem,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  ShieldCheck,
  Trees,
  Youtube,
} from "lucide-react";

import { CartDrawer } from "@/components/cart-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    eyebrow: "Featured collection",
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
    eyebrow: "Seating",
    image: chairsImage,
    copy: "Sculptural silhouettes in shearling, leather, and steam-bent walnut.",
    span: "lg:col-span-4",
    height: "h-72 lg:h-80",
  },
  {
    title: "Coffee & Side Tables",
    eyebrow: "Living surfaces",
    image: tablesImage,
    copy: "Travertine, hand-rubbed walnut, and brushed brass — composed with quiet weight.",
    span: "lg:col-span-4",
    height: "h-72 lg:h-80",
  },
  {
    title: "Storage & Display",
    eyebrow: "Casegoods",
    image: storageImage,
    copy: "Glass-fronted vitrines and walnut credenzas with hand-cast bronze hardware.",
    span: "lg:col-span-4",
    height: "h-72 lg:h-80",
  },
  {
    title: "Executive Office",
    eyebrow: "Workspaces",
    image: officeImage,
    copy: "Walnut desks with leather inlay and lounge-ready seating for considered work.",
    span: "lg:col-span-6",
    height: "h-72 lg:h-96",
  },
  {
    title: "Outdoor Living",
    eyebrow: "Al fresco",
    image: outdoorImage,
    copy: "FSC teak and performance weaves designed for terraces, courtyards, and poolside.",
    span: "lg:col-span-6",
    height: "h-72 lg:h-96",
  },
];

const featuredProducts = [
  {
    name: "Halden Lounge Sofa",
    category: "Living Room",
    price: "₹ 4,85,000",
    materials: "Belgian linen · solid walnut frame · down-wrapped cushions",
    image: heroImage,
  },
  {
    name: "Marlow Canopy Bed",
    category: "Bedroom",
    price: "₹ 3,62,000",
    materials: "Hand-rubbed walnut · brushed brass joinery · boucle headboard",
    image: bedroomImage,
  },
  {
    name: "Cassia Dining Table",
    category: "Dining Room",
    price: "₹ 2,98,000",
    materials: "Bookmatched walnut top · sculpted oak base · matte oil finish",
    image: diningImage,
  },
  {
    name: "Atelier Walnut Desk",
    category: "Office",
    price: "₹ 1,84,000",
    materials: "Solid walnut · leather inlay · hand-cast bronze pulls",
    image: officeImage,
  },
  {
    name: "Sereno Outdoor Lounge",
    category: "Outdoor",
    price: "₹ 2,45,000",
    materials: "FSC teak · marine-grade rope · Sunbrella performance fabric",
    image: outdoorImage,
  },
  {
    name: "Vela Sculptural Armchair",
    category: "Living Room",
    price: "₹ 1,68,000",
    materials: "Italian shearling · steam-bent ash · hand-stitched seams",
    image: heroImage,
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

const trustMetrics = [
  { value: "18", label: "Years crafting bespoke interiors" },
  { value: "2,400+", label: "Homes furnished across India" },
  { value: "120", label: "Master artisans in our atelier" },
  { value: "10 yr", label: "Structural warranty on every piece" },
] as const;

const successStories = [
  {
    title: "A Bandra penthouse, reimagined in 9 weeks.",
    summary:
      "Our concierge team curated 38 walnut-and-linen pieces around a single mood board — delivered, installed, and styled on schedule.",
    client: "Mehta Residence, Mumbai",
  },
  {
    title: "Outfitting a 14-villa coastal resort.",
    summary:
      "From dining halls to private terraces, we delivered cohesive interiors using FSC-certified teak and weather-tested upholstery.",
    client: "Saira Hospitality Group, Goa",
  },
  {
    title: "A heritage bungalow restoration.",
    summary:
      "Our artisans hand-restored original teak floors and built custom seating to complement century-old architecture.",
    client: "Rao Family Estate, Bengaluru",
  },
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
  head: () => ({
    meta: [
      { title: "Avery & Co. | Premium Luxury Furniture" },
      {
        name: "description",
        content:
          "Bespoke luxury furniture in walnut, beige, and off-white. Concierge design consultations, master craftsmanship, and editorial interiors for refined homes.",
      },
      { property: "og:title", content: "Avery & Co. | Premium Luxury Furniture" },
      {
        property: "og:description",
        content:
          "A warm, editorial luxury furniture house — bespoke craftsmanship and concierge design consultations.",
      },
    ],
  }),
  component: HomePage,
  errorComponent: HomeErrorComponent,
  notFoundComponent: HomeNotFoundComponent,
});

function HomePage() {
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
              <a href="#categories" className="story-link">Categories</a>
              <a href="#featured" className="story-link">Featured</a>
              <a href="#inspiration" className="story-link">Inspiration</a>
              <a href="#consult" className="story-link">Consultations</a>
              <a href="#about" className="story-link">About</a>
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
              Inspired by the quiet confidence of luxury interiors
            </Badge>
            <h1 className="mt-6 font-display text-4xl leading-[0.98] text-foreground sm:text-[2.9rem] lg:text-[4.2rem]">
              Furniture curated for luminous, richly layered homes.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-base">

              Explore sculptural silhouettes, tactile upholstery, and warm walnut craftsmanship —
              hand-built in our atelier and styled by our in-house design concierge.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button variant="luxury" size="lg" asChild>
                <a href="#featured">
                  Explore featured pieces
                  <ArrowRight />
                </a>
              </Button>
              <Button variant="outlineWarm" size="lg" asChild>
                <a href="#consult">Book a consultation</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="page-shell section-shell">
        <div className="max-w-2xl space-y-5">
          <p className="section-kicker">Shop by room</p>
          <h2 className="section-title">Collections arranged like a beautifully edited home.</h2>
          <p className="section-copy">
            Each category is grounded in warm neutrals, natural texture, and a relaxed sense of
            luxury drawn from the world&apos;s most elevated furniture houses.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-5">
          {categories.map((category, index) => (
            <article
              key={category.title}
              className={`luxury-card image-frame group cursor-pointer transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_36px_80px_-40px_color-mix(in_oklab,var(--color-foreground)_28%,transparent)] ${index === 0 ? "md:col-span-2 xl:col-span-2" : ""}`}
            >
              <div className="relative h-72 overflow-hidden xl:h-96">
                <img
                  src={category.image}
                  alt={category.title}
                  className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                  loading="lazy"
                  width={1536}
                  height={1024}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground transition-transform duration-500 group-hover:-translate-y-1">
                  <p className="text-[11px] uppercase tracking-[0.3em] opacity-85">Collection</p>
                  <h3 className="mt-2 font-display text-4xl">{category.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-7 opacity-90">{category.copy}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] opacity-0 transition-all duration-500 group-hover:opacity-100">
                    Explore collection <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="featured" className="page-shell section-shell border-t border-border/60">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end">
          <div className="space-y-5">
            <p className="section-kicker">Featured pieces</p>
            <h2 className="section-title">Signature pieces from this season&apos;s atelier.</h2>
          </div>
          <p className="section-copy lg:justify-self-end lg:text-right">
            A curated edit of hand-built furniture in walnut, linen, teak, and brass — each piece
            sized for bespoke order and shipped white-glove across India.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {featuredProducts.map((product) => (
            <article
              key={product.name}
              className="luxury-card group flex h-full flex-col transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_36px_80px_-40px_color-mix(in_oklab,var(--color-foreground)_28%,transparent)]"
            >
              <div className="image-frame relative overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-80 w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                  loading="lazy"
                />
                <span className="absolute left-5 top-5 rounded-full bg-background/85 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground backdrop-blur">
                  {product.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-5 p-7">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-3xl leading-tight text-foreground">{product.name}</h3>
                  <p className="whitespace-nowrap text-sm font-medium text-wood">{product.price}</p>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{product.materials}</p>
                <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-5 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  <span>Made to order · 6–8 wks</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell section-shell border-t border-border/60">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="luxury-card p-8 transition-all duration-500 hover:-translate-y-1">
            <Gem className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-5 font-display text-3xl text-foreground">Material-led luxury</h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Walnut grain, boucle texture, soft linen, and brushed metal accents build quiet depth
              into every composition.
            </p>
          </div>
          <div className="luxury-card p-8 transition-all duration-500 hover:-translate-y-1">
            <ShieldCheck className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-5 font-display text-3xl text-foreground">Concierge service</h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              From mood board to white-glove installation, our design concierge guides every step
              with the discretion of a private atelier.
            </p>
          </div>
          <div className="luxury-card p-8 transition-all duration-500 hover:-translate-y-1">
            <Trees className="h-5 w-5 text-accent-foreground" />
            <h3 className="mt-5 font-display text-3xl text-foreground">Responsibly sourced</h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              FSC-certified hardwoods, natural fibers, and small-batch finishing keep each
              collection grounded in considered craft.
            </p>
          </div>
        </div>
      </section>

      <section id="inspiration" className="page-shell section-shell border-t border-border/60">
        <div className="max-w-2xl space-y-5">
          <p className="section-kicker">Room inspiration</p>
          <h2 className="section-title">Editorial spaces for every mood of home.</h2>
          <p className="section-copy">
            Large-format imagery and calm pacing evoke the atmosphere of a premium catalog while
            keeping the browsing experience airy and modern.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="luxury-card image-frame group cursor-pointer overflow-hidden transition-all duration-500 hover:-translate-y-1.5">
            <div className="overflow-hidden">
              <img
                src={inspirationGallery[0].image}
                alt={inspirationGallery[0].title}
                className="h-[28rem] w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                loading="lazy"
                width={1536}
                height={1024}
              />
            </div>
            <div className="space-y-3 p-7">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Signature mood</p>
              <h3 className="font-display text-4xl text-foreground">{inspirationGallery[0].title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{inspirationGallery[0].copy}</p>
            </div>
          </article>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
            {inspirationGallery.slice(1).map((item) => (
              <article
                key={item.title}
                className="luxury-card image-frame group cursor-pointer overflow-hidden transition-all duration-500 hover:-translate-y-1.5"
              >
                <div className="overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-64 w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                    loading="lazy"
                    width={1536}
                    height={1024}
                  />
                </div>
                <div className="space-y-2 p-6">
                  <h3 className="font-display text-3xl text-foreground">{item.title}</h3>
                  <p className="text-sm leading-7 text-muted-foreground">{item.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell section-shell border-t border-border/60">
        <div className="max-w-2xl space-y-5">
          <p className="section-kicker">Trusted by discerning homes</p>
          <h2 className="section-title">Eighteen years of considered craft.</h2>
          <p className="section-copy">
            A small set of numbers that hint at the scale and care behind every Avery &amp; Co.
            commission.
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

      <section id="consult" className="page-shell section-shell border-t border-border/60">
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
                Complimentary design concierge
              </Badge>
              <h2 className="font-display text-4xl leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
                Book a private furniture consultation with our design atelier.
              </h2>
              <p className="max-w-xl text-base leading-8 text-muted-foreground">
                Share your floor plan, palette, and lifestyle — we&apos;ll respond within 24 hours
                with a curated piece selection, material samples, and a tailored quote.
              </p>
              <ul className="grid gap-3 text-sm leading-7 text-muted-foreground sm:grid-cols-2">
                <li className="flex items-start gap-3"><Award className="mt-1 h-4 w-4 text-wood" /> 1:1 session with a senior designer</li>
                <li className="flex items-start gap-3"><Award className="mt-1 h-4 w-4 text-wood" /> Material &amp; finish samples to your home</li>
                <li className="flex items-start gap-3"><Award className="mt-1 h-4 w-4 text-wood" /> Bespoke quote within 24 hours</li>
                <li className="flex items-start gap-3"><Award className="mt-1 h-4 w-4 text-wood" /> White-glove delivery &amp; styling</li>
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="wood" size="lg" asChild>
                  <a href="https://wa.me/919876543210?text=Hello%20Avery%20%26%20Co.,%20I%27d%20like%20to%20book%20a%20design%20consultation." target="_blank" rel="noreferrer">
                    Book consultation
                    <ArrowRight />
                  </a>
                </Button>
                <Button variant="outlineWarm" size="lg" asChild>
                  <a href="mailto:atelier@averyandco.in">Email the atelier</a>
                </Button>
              </div>
            </div>
            <div className="space-y-4 rounded-[calc(var(--radius-2xl))] border border-border/70 bg-background/80 p-7 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">Direct lines</p>
              <div className="space-y-4 text-sm">
                <a href="tel:+919876543210" className="flex items-start gap-3 text-foreground transition-colors hover:text-wood">
                  <Phone className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-2xl">+91 98765 43210</span><span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Mon–Sat · 10am–7pm IST</span></span>
                </a>
                <a href="mailto:atelier@averyandco.in" className="flex items-start gap-3 text-foreground transition-colors hover:text-wood">
                  <Mail className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-2xl">atelier@averyandco.in</span><span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Replies within 24 hours</span></span>
                </a>
                <div className="flex items-start gap-3 text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-2xl">Mumbai showroom</span><span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">By appointment</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="page-shell section-shell border-t border-border/60">
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
            <p className="section-kicker">About Avery &amp; Co.</p>
            <h2 className="section-title">A modern luxury furniture house rooted in warmth.</h2>
            <p className="section-copy">
              Founded in 2007, Avery &amp; Co. is a quiet, editorial furniture house where sculpted
              walnut, warm beige upholstery, and timeless craftsmanship shape every room into a
              softer, more elevated retreat.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="luxury-card p-6">
                <p className="font-display text-4xl text-wood">01</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  An in-house atelier of 120 master artisans, each piece signed by its maker.
                </p>
              </div>
              <div className="luxury-card p-6">
                <p className="font-display text-4xl text-wood">02</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Bespoke commissions tailored to your floor plan, palette, and lifestyle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-secondary/40">
        <div className="page-shell grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <p className="font-display text-4xl text-foreground">Avery &amp; Co.</p>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              A modern luxury furniture house. Bespoke craftsmanship, concierge design, and an
              editorial sensibility for refined homes across India and beyond.
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
              <a href="#categories" className="block story-link">Categories</a>
              <a href="#featured" className="block story-link">Featured pieces</a>
              <a href="#inspiration" className="block story-link">Inspiration</a>
              <a href="#consult" className="block story-link">Consultations</a>
              <a href="#about" className="block story-link">About</a>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Contact</p>
            <div className="mt-5 space-y-3 text-sm text-foreground">
              <a href="tel:+919876543210" className="flex items-center gap-2 story-link"><Phone className="h-3.5 w-3.5" />+91 98765 43210</a>
              <a href="mailto:atelier@averyandco.in" className="flex items-center gap-2 story-link"><Mail className="h-3.5 w-3.5" />atelier@averyandco.in</a>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="flex items-center gap-2 story-link"><MessageCircle className="h-3.5 w-3.5" />WhatsApp concierge</a>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Showrooms</p>
            <div className="mt-5 space-y-4 text-sm text-foreground">
              <div>
                <p className="font-display text-xl">Mumbai</p>
                <p className="mt-1 text-muted-foreground">14 Linking Road, Bandra West<br />Mon–Sat · 11am–8pm</p>
              </div>
              <div>
                <p className="font-display text-xl">Bengaluru</p>
                <p className="mt-1 text-muted-foreground">42 Lavelle Road<br />By appointment</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="page-shell flex flex-col gap-3 py-6 text-xs uppercase tracking-[0.28em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Avery &amp; Co. Atelier Pvt. Ltd.</p>
            <p>Crafted in India · Delivered worldwide</p>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/919876543210?text=Hello%20Avery%20%26%20Co.,%20I%27m%20interested%20in%20your%20luxury%20furniture%20collection."
        target="_blank"
        rel="noreferrer"
        aria-label="Contact on WhatsApp"
        className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-wood text-wood-foreground shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </main>
  );
}
