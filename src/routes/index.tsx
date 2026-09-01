import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone, Quote } from "lucide-react";

import { Catalogue } from "@/components/site/catalogue";
import { HeroSlider } from "@/components/site/hero-slider";
import { ProductCard } from "@/components/site/product-card";
import { NGMonogram, SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QueryFailed } from "@/components/site/query-state";
import {
  useBanners,
  useCategories,
  useContentRealtime,
  useProducts,
  useSections,
  useSettings,
} from "@/hooks/use-content";
import type { CategoryRow, HomepageSection, Product, SiteSettings } from "@/lib/content-types";
import { PLACEHOLDER_IMAGE } from "@/lib/content-types";
import { whatsappHref } from "@/lib/whatsapp";

/** Stable empty-array identity for query fallbacks (see HomePage). */
const EMPTY: never[] = [];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "New Galaxy Furniture | Premium Furniture in Bengaluru · Since 2002" },
      {
        name: "description",
        content:
          "New Galaxy Furniture crafts premium sofas, beds, dining tables and custom furniture in Bengaluru since 2002. Quality materials, expert craftsmanship, reliable delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "New Galaxy Furniture | Premium Furniture · Since 2002" },
      {
        property: "og:description",
        content:
          "Timeless furniture crafted for modern living — sofas, beds, dining tables and custom pieces, delivered across India.",
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
          url: "https://newgalaxyfurnitures.lovable.app",
          address: {
            "@type": "PostalAddress",
            streetAddress: "1, Thubarahalli, Varthur Main Road, next to ICICI Bank, Whitefield",
            addressLocality: "Bengaluru",
            addressRegion: "Karnataka",
            postalCode: "560066",
            addressCountry: "IN",
          },
          openingHours: "Mo-Sa 10:00-20:00",
        }),
      },
    ],
  }),
  component: HomePage,
});

type ConfigItem = { title?: string; copy?: string; quote?: string; author?: string };

function configItems(section: HomepageSection): ConfigItem[] {
  const config = section.config as { items?: unknown } | null;
  return Array.isArray(config?.items) ? (config.items as ConfigItem[]) : [];
}

function configValue(section: HomepageSection, key: string): string | null {
  const config = section.config as Record<string, unknown> | null;
  const value = config?.[key];
  return typeof value === "string" ? value : null;
}

function SectionHeading({ section }: { section: HomepageSection }) {
  if (!section.title && !section.subtitle) return null;
  return (
    <header className="max-w-2xl">
      {section.title ? <h2 className="section-title">{section.title}</h2> : null}
      {section.subtitle ? <p className="section-copy mt-4">{section.subtitle}</p> : null}
    </header>
  );
}

function ProductRow({
  section,
  products,
  whatsapp,
}: {
  section: HomepageSection;
  products: Product[];
  whatsapp: string;
}) {
  if (products.length === 0) return null;
  return (
    <section className="section-shell">
      <div className="page-shell">
        <SectionHeading section={section} />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} whatsapp={whatsapp} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryGrid({
  section,
  categories,
  products,
  onSelect,
}: {
  section: HomepageSection;
  categories: CategoryRow[];
  products: Product[];
  onSelect: (id: string) => void;
}) {
  const top = categories.filter((c) => !c.parent_id);
  if (top.length === 0) return null;

  const counts = new Map<string, number>();
  for (const p of products) {
    const key = p.category_id ?? "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (
    <section id="collections" className="section-shell">
      <div className="page-shell">
        <SectionHeading section={section} />
        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          {top.map((c, i) => {
            const featured = i === 0;
            const span = featured
              ? "lg:col-span-8 lg:row-span-2"
              : i < 3
                ? "lg:col-span-4"
                : "lg:col-span-4";
            const height = featured ? "h-[26rem] lg:h-[41rem]" : "h-72 lg:h-80";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`group relative isolate overflow-hidden rounded-3xl text-left shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl ${span} ${height}`}
              >
                <img
                  src={c.thumbnail_url ?? c.banner_url ?? PLACEHOLDER_IMAGE}
                  alt={c.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-7">
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-primary-foreground/75">
                    {counts.get(c.id) ?? 0} {(counts.get(c.id) ?? 0) === 1 ? "piece" : "pieces"}
                  </p>
                  <h3
                    className={`mt-3 font-display text-primary-foreground ${featured ? "text-4xl lg:text-5xl" : "text-2xl"}`}
                  >
                    {c.name}
                  </h3>
                  {c.description ? (
                    <p className="mt-3 max-w-md text-sm leading-6 text-primary-foreground/80">
                      {c.description}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustSection({ section }: { section: HomepageSection }) {
  const items = configItems(section);
  if (items.length === 0) return null;
  return (
    <section className="section-shell bg-secondary/40">
      <div className="page-shell">
        <SectionHeading section={section} />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="luxury-card p-7">
              <h3 className="font-display text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoSection({
  section,
  whatsapp,
}: {
  section: HomepageSection;
  whatsapp: string;
}) {
  if (!section.title) return null;
  const label = configValue(section, "button_text") ?? "Enquire on WhatsApp";
  const link = configValue(section, "button_link");
  const href =
    !link || link === "whatsapp"
      ? whatsappHref(whatsapp, `Hello, I would like a custom piece made to my measurements.`)
      : link;
  return (
    <section className="section-shell">
      <div className="page-shell">
        <div className="luxury-card overflow-hidden bg-wood px-8 py-16 text-center text-wood-foreground sm:px-14">
          <h2 className="font-display text-[clamp(2rem,4vw,3.2rem)] leading-tight">
            {section.title}
          </h2>
          {section.subtitle ? (
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 opacity-85">{section.subtitle}</p>
          ) : null}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-background px-8 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-foreground transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle className="h-4 w-4" /> {label}
          </a>
        </div>
      </div>
    </section>
  );
}

function AboutSection({
  section,
  settings,
}: {
  section: HomepageSection;
  settings: SiteSettings | null;
}) {
  const body = settings?.about_text;
  if (!body) return null;
  return (
    <section id="about" className="section-shell">
      <div className="page-shell grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <NGMonogram className="h-20 w-20" />
          <h2 className="section-title mt-6">{section.title ?? "About us"}</h2>
        </div>
        <p className="text-base leading-9 text-muted-foreground">{body}</p>
      </div>
    </section>
  );
}

function TestimonialsSection({ section }: { section: HomepageSection }) {
  const items = configItems(section);
  if (items.length === 0) return null;
  return (
    <section className="section-shell bg-secondary/40">
      <div className="page-shell">
        <SectionHeading section={section} />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {items.map((item, i) => (
            <blockquote key={i} className="luxury-card p-8">
              <Quote className="h-6 w-6 text-wood" />
              <p className="mt-5 text-sm leading-8 text-muted-foreground">{item.quote}</p>
              <footer className="mt-6 text-xs uppercase tracking-[0.2em] text-foreground">
                {item.author}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({
  section,
  settings,
}: {
  section: HomepageSection;
  settings: SiteSettings | null;
}) {
  if (!settings) return null;
  return (
    <section id="contact" className="section-shell">
      <div className="page-shell grid gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading section={section} />
          <dl className="mt-10 space-y-6 text-sm">
            <div className="flex gap-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-wood" />
              <div>
                <dt className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Showroom
                </dt>
                <dd className="mt-1 text-foreground">{settings.address}</dd>
              </div>
            </div>
            <div className="flex gap-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-wood" />
              <div>
                <dt className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Hours</dt>
                <dd className="mt-1 text-foreground">{settings.showroom_hours}</dd>
              </div>
            </div>
            <div className="flex gap-4">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-wood" />
              <div>
                <dt className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Phone</dt>
                <dd className="mt-1">
                  <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="text-foreground">
                    {settings.phone}
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex gap-4">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-wood" />
              <div>
                <dt className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Email</dt>
                <dd className="mt-1">
                  <a href={`mailto:${settings.email}`} className="text-foreground">
                    {settings.email}
                  </a>
                </dd>
              </div>
            </div>
          </dl>
          <Button asChild variant="luxury" className="mt-10 rounded-full">
            <a
              href={whatsappHref(
                settings.whatsapp,
                "Hello, I'm interested in your furniture collection.",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Enquire on WhatsApp
            </a>
          </Button>
        </div>

        {settings.maps_embed_url ? (
          <div className="overflow-hidden rounded-3xl border border-border shadow-sm">
            <iframe
              title="Showroom location"
              src={settings.maps_embed_url}
              loading="lazy"
              className="h-full min-h-[22rem] w-full"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Footer({
  settings,
  categories,
  onSelect,
}: {
  settings: SiteSettings | null;
  categories: CategoryRow[];
  onSelect: (id: string) => void;
}) {
  const socials = [
    { label: "Instagram", href: settings?.instagram_url },
    { label: "Facebook", href: settings?.facebook_url },
    { label: "YouTube", href: settings?.youtube_url },
    { label: "Pinterest", href: settings?.pinterest_url },
  ].filter((s) => s.href);

  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="page-shell grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <NGMonogram className="h-12 w-12" />
          <p className="mt-4 font-display text-2xl text-foreground">
            {settings?.company_name ?? "New Galaxy Furniture"}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {settings?.tagline}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Collections</p>
          <ul className="mt-4 space-y-2 text-sm">
            {categories
              .filter((c) => !c.parent_id)
              .slice(0, 6)
              .map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Contact</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{settings?.address}</li>
            <li>{settings?.showroom_hours}</li>
            <li>{settings?.phone}</li>
            <li>{settings?.email}</li>
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Follow</p>
          <ul className="mt-4 space-y-2 text-sm">
            {socials.length === 0 ? (
              <li className="text-muted-foreground">Coming soon</li>
            ) : (
              socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {s.label}
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="page-shell flex flex-col items-center justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {settings?.company_name ?? "New Galaxy Furniture"}.{" "}
          {settings?.footer_note}
        </p>
        <Link to="/admin/login" className="opacity-30 transition-opacity hover:opacity-100">
          ·
        </Link>
      </div>
    </footer>
  );
}

function HomePage() {
  useContentRealtime();
  // 1.24: the `= []` / `= null` destructuring defaults made a FAILED query
  // structurally identical to an empty one, so an offline or RLS-denied load
  // rendered as a near-blank homepage with no error state and no retry.
  const productsQ = useProducts();
  const categoriesQ = useCategories();
  const sectionsQ = useSections();
  const bannersQ = useBanners();
  const settingsQ = useSettings();

  // EMPTY is hoisted to module scope so the `?? EMPTY` fallback has a STABLE
  // identity across renders; an inline `?? []` would allocate a new array each
  // render and destabilise the `buckets` useMemo below.
  const products = productsQ.data ?? EMPTY;
  const categories = categoriesQ.data ?? EMPTY;
  const sections = sectionsQ.data ?? EMPTY;
  const banners = bannersQ.data ?? EMPTY;
  const settings = settingsQ.data ?? null;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const catalogueRef = useRef<HTMLDivElement>(null);

  const whatsapp = settings?.whatsapp ?? "919513443606";

  const catalogueEnabled = sections.some((s) => s.section_type === "catalogue");

  const selectCategory = (id: string) => {
    setSelectedCategory(id);
    // 1.30: when no catalogue section is enabled the ref is not mounted, so the
    // old scrollIntoView was a silent no-op. Give explicit feedback instead.
    if (!catalogueEnabled) {
      toast.info("The catalogue section is currently disabled on the homepage.");
      return;
    }
    requestAnimationFrame(() =>
      catalogueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const buckets = useMemo(
    () => ({
      featured: products.filter((p) => p.featured),
      new_arrivals: products.filter((p) => p.new_arrival),
      bestsellers: products.filter((p) => p.bestseller),
      trending: products.filter((p) => p.trending),
    }),
    [products],
  );

  // Which query each section type depends on, so a failure is reported on the
  // section that actually needs the data.
  const SECTION_DEPENDENCIES: Record<
    string,
    { query: { isError: boolean; refetch: () => unknown }; message: string }[]
  > = {
    hero: [{ query: bannersQ, message: "Could not load the hero banners." }],
    categories: [{ query: categoriesQ, message: "Could not load the collections." }],
    featured: [{ query: productsQ, message: "Could not load products." }],
    new_arrivals: [{ query: productsQ, message: "Could not load products." }],
    bestsellers: [{ query: productsQ, message: "Could not load products." }],
    trending: [{ query: productsQ, message: "Could not load products." }],
    catalogue: [
      { query: productsQ, message: "Could not load products." },
      { query: categoriesQ, message: "Could not load the collections." },
    ],
  };

  return (
    <main className="min-h-screen">
      <SiteHeader settings={settings} categories={categories} onSelectCategory={selectCategory} />

      {/* 1.24: if the section list itself failed, show one error card with a
          retry rather than a blank page. */}
      {sectionsQ.isError ? (
        <div className="page-shell py-16">
          <QueryFailed
            message="Could not load the homepage layout."
            onRetry={() => void sectionsQ.refetch()}
          />
        </div>
      ) : null}

      {sections.map((section) => {
        // 1.24: a section whose own data failed renders an error card with a
        // retry IN PLACE of its content, while every section that did load keeps
        // rendering — a single failure never blanks the page.
        const failed = SECTION_DEPENDENCIES[section.section_type]?.find((dep) => dep.query.isError);
        if (failed) {
          return (
            <div key={section.id} className="page-shell py-16">
              <QueryFailed message={failed.message} onRetry={() => void failed.query.refetch()} />
            </div>
          );
        }
        switch (section.section_type) {
          case "hero":
            return <HeroSlider key={section.id} banners={banners} />;
          case "trust":
            return <TrustSection key={section.id} section={section} />;
          case "categories":
            return (
              <CategoryGrid
                key={section.id}
                section={section}
                categories={categories}
                products={products}
                onSelect={selectCategory}
              />
            );
          case "featured":
          case "new_arrivals":
          case "bestsellers":
          case "trending":
            return (
              <ProductRow
                key={section.id}
                section={section}
                products={buckets[section.section_type as keyof typeof buckets]}
                whatsapp={whatsapp}
              />
            );
          case "catalogue":
            return (
              <div key={section.id} ref={catalogueRef}>
                <Catalogue
                  products={products}
                  categories={categories}
                  whatsapp={whatsapp}
                  title={section.title}
                  subtitle={section.subtitle}
                  externalCategory={selectedCategory}
                />
              </div>
            );
          case "promo":
            return <PromoSection key={section.id} section={section} whatsapp={whatsapp} />;
          case "about":
            return <AboutSection key={section.id} section={section} settings={settings} />;
          case "testimonials":
            return <TestimonialsSection key={section.id} section={section} />;
          case "contact":
            return <ContactSection key={section.id} section={section} settings={settings} />;
          default:
            return null;
        }
      })}

      <Footer settings={settings} categories={categories} onSelect={selectCategory} />

      <a
        href={whatsappHref(whatsapp, "Hello, I'm interested in your furniture collection.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-wood text-wood-foreground shadow-xl transition-transform hover:-translate-y-1"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </main>
  );
}
