import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
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
  Truck,
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

const trustMetrics = [
  { value: "18", label: "Years crafting bespoke furniture" },
  { value: "2,400+", label: "Homes furnished across India" },
  { value: "120", label: "Master artisans in our workshop" },
  { value: "10 yr", label: "Structural warranty on every piece" },
] as const;

const successStories = [
  {
    title: "A Bandra penthouse furnished in 9 weeks.",
    summary:
      "38 walnut-and-linen pieces selected, manufactured, and white-glove installed on schedule — every order tracked end to end.",
    client: "Mehta Residence, Mumbai",
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
          "Premium luxury furniture in walnut, beige, and linen. Bespoke craftsmanship, white-glove delivery across India, and a 10-year structural warranty.",
      },
      { property: "og:title", content: "Avery & Co. | Premium Luxury Furniture" },
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

const WHATSAPP_URL =
  "https://wa.me/919876543210?text=Hello%20Avery%20%26%20Co.,%20I%27m%20interested%20in%20your%20furniture%20collection%20and%20would%20like%20a%20quote.";

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
              <a href="#categories" className="story-link">Collections</a>
              <a href="#why" className="story-link">Why us</a>
              <a href="#featured" className="story-link">Featured</a>
              <a href="#about" className="story-link">About</a>
              <a href="#contact" className="story-link">Contact</a>
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
                <a href="#featured">
                  Explore featured pieces
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

      <section id="categories" className="page-shell section-shell">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end">
          <div className="max-w-2xl space-y-5">
            <p className="section-kicker">Featured collections</p>
            <h2 className="section-title">A curated edit of premium furniture, by category.</h2>
          </div>
          <p className="section-copy lg:justify-self-end lg:text-right">
            Eight signature collections — from sculptural sofas to executive walnut desks —
            composed in an editorial grid drawn from the world&apos;s most elevated furniture houses.
          </p>
        </div>

        <div className="mt-16 grid auto-rows-[minmax(0,auto)] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {categories.map((category) => (
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
      </section>

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

      <section id="featured" className="page-shell section-shell border-t border-border/60">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end">
          <div className="space-y-5">
            <p className="section-kicker">Featured products</p>
            <h2 className="section-title">Signature pieces from this season&apos;s workshop.</h2>
          </div>
          <p className="section-copy lg:justify-self-end lg:text-right">
            A curated edit of hand-built furniture in walnut, linen, teak, and brass — each piece
            available to order and shipped white-glove across India.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {featuredProducts.map((product) => {
            const enquireUrl = `https://wa.me/919876543210?text=${encodeURIComponent(
              `Hello Avery & Co., I'd like product details and a quote for the ${product.name}.`,
            )}`;
            return (
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
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Made to order · 6–8 wks · White-glove delivery
                  </p>
                  <div className="mt-auto flex flex-wrap gap-3 border-t border-border/60 pt-5">
                    <Button variant="wood" asChild>
                      <a href={enquireUrl} target="_blank" rel="noreferrer">
                        Enquire on WhatsApp
                      </a>
                    </Button>
                    <Button variant="outlineWarm" asChild>
                      <a href="#contact">
                        Get product details
                        <ArrowRight />
                      </a>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

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
                  <a href="mailto:sales@averyandco.in?subject=Quote%20request">Request a quote</a>
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
                <a href="mailto:sales@averyandco.in" className="flex items-start gap-3 text-foreground transition-colors hover:text-wood">
                  <Mail className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-2xl">sales@averyandco.in</span><span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Replies within 24 hours</span></span>
                </a>
                <div className="flex items-start gap-3 text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 text-wood" />
                  <span><span className="block font-display text-2xl">Mumbai showroom</span><span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Visit our showroom · Mon–Sat</span></span>
                </div>
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
              <a href="#categories" className="block story-link">Collections</a>
              <a href="#featured" className="block story-link">Featured products</a>
              <a href="#why" className="block story-link">Why choose us</a>
              <a href="#about" className="block story-link">About</a>
              <a href="#contact" className="block story-link">Contact</a>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Contact</p>
            <div className="mt-5 space-y-3 text-sm text-foreground">
              <a href="tel:+919876543210" className="flex items-center gap-2 story-link"><Phone className="h-3.5 w-3.5" />+91 98765 43210</a>
              <a href="mailto:sales@averyandco.in" className="flex items-center gap-2 story-link"><Mail className="h-3.5 w-3.5" />sales@averyandco.in</a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 story-link"><MessageCircle className="h-3.5 w-3.5" />WhatsApp enquiries</a>
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
                <p className="mt-1 text-muted-foreground">42 Lavelle Road<br />Mon–Sat · 11am–8pm</p>
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
