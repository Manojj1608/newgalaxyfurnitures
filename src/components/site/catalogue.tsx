import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search, X } from "lucide-react";

import { ProductCard } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CategoryRow, Product } from "@/lib/content-types";
import { effectivePrice } from "@/lib/content-types";

const PRICE_RANGES = [
  { label: "Under ₹25k", min: 0, max: 25000 },
  { label: "₹25k – ₹50k", min: 25000, max: 50000 },
  { label: "₹50k – ₹1L", min: 50000, max: 100000 },
  { label: "₹1L+", min: 100000, max: Number.POSITIVE_INFINITY },
] as const;

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "viewed", label: "Most viewed" },
  { key: "bestselling", label: "Best selling" },
  { key: "trending", label: "Trending" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

const PAGE_SIZE = 12;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.13em] transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export type CatalogueHandle = { setCategory: (slug: string) => void };

export function Catalogue({
  products,
  categories,
  whatsapp,
  title,
  subtitle,
  externalCategory,
}: {
  products: Product[];
  categories: CategoryRow[];
  whatsapp: string;
  title?: string | null;
  subtitle?: string | null;
  externalCategory?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [subcategory, setSubcategory] = useState<string>("all");
  const [price, setPrice] = useState<number>(-1);
  const [material, setMaterial] = useState("all");
  const [color, setColor] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalCategory) {
      setCategory(externalCategory);
      setSubcategory("all");
    }
  }, [externalCategory]);

  const topCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const subcategories = useMemo(() => {
    const parent = categories.find((c) => c.id === category);
    if (!parent) return [];
    return categories.filter((c) => c.parent_id === parent.id);
  }, [categories, category]);

  const materials = useMemo(
    () => [...new Set(products.map((p) => p.material).filter(Boolean) as string[])].sort(),
    [products],
  );
  const colors = useMemo(
    () => [...new Set(products.map((p) => p.color).filter(Boolean) as string[])].sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const range = price >= 0 ? PRICE_RANGES[price] : null;

    const result = products.filter((p) => {
      if (category !== "all" && p.category_id !== category) {
        const cat = categories.find((c) => c.id === category);
        if (!cat || p.category !== cat.name) return false;
      }
      if (subcategory !== "all" && p.subcategory_id !== subcategory) return false;
      if (material !== "all" && p.material !== material) return false;
      if (color !== "all" && p.color !== color) return false;
      if (availability === "in-stock" && !p.in_stock) return false;
      if (availability === "made-to-order" && p.in_stock) return false;
      if (range) {
        const value = effectivePrice(p);
        if (value < range.min || value >= range.max) return false;
      }
      if (q) {
        const haystack = [
          p.name,
          p.sku,
          p.product_code,
          p.category,
          p.material,
          p.color,
          p.finish,
          p.style,
          p.brand,
          p.short_description,
          p.description,
          ...(p.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...result];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case "price-desc":
        sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case "viewed":
        sorted.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
        break;
      case "bestselling":
        sorted.sort((a, b) => Number(b.bestseller) - Number(a.bestseller));
        break;
      case "trending":
        sorted.sort((a, b) => Number(b.trending) - Number(a.trending));
        break;
      default:
        sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return sorted;
  }, [products, categories, search, category, subcategory, material, color, availability, price, sort]);

  useEffect(() => setVisible(PAGE_SIZE), [search, category, subcategory, material, color, availability, price, sort]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [products, search]);

  const hasFilters =
    search !== "" ||
    category !== "all" ||
    subcategory !== "all" ||
    material !== "all" ||
    color !== "all" ||
    availability !== "all" ||
    price >= 0;

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setSubcategory("all");
    setMaterial("all");
    setColor("all");
    setAvailability("all");
    setPrice(-1);
  }

  const filterGroups = (
    <div className="space-y-6">
      <FilterGroup label="Collection">
        <Chip active={category === "all"} onClick={() => setCategory("all")}>
          All
        </Chip>
        {topCategories.map((c) => (
          <Chip
            key={c.id}
            active={category === c.id}
            onClick={() => {
              setCategory(c.id);
              setSubcategory("all");
            }}
          >
            {c.name}
          </Chip>
        ))}
      </FilterGroup>

      {subcategories.length > 0 ? (
        <FilterGroup label="Sub-collection">
          <Chip active={subcategory === "all"} onClick={() => setSubcategory("all")}>
            All
          </Chip>
          {subcategories.map((c) => (
            <Chip key={c.id} active={subcategory === c.id} onClick={() => setSubcategory(c.id)}>
              {c.name}
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup label="Price">
        <Chip active={price === -1} onClick={() => setPrice(-1)}>
          Any
        </Chip>
        {PRICE_RANGES.map((r, i) => (
          <Chip key={r.label} active={price === i} onClick={() => setPrice(i)}>
            {r.label}
          </Chip>
        ))}
      </FilterGroup>

      {materials.length > 0 ? (
        <FilterGroup label="Material">
          <Chip active={material === "all"} onClick={() => setMaterial("all")}>
            Any
          </Chip>
          {materials.map((m) => (
            <Chip key={m} active={material === m} onClick={() => setMaterial(m)}>
              {m}
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      {colors.length > 0 ? (
        <FilterGroup label="Colour">
          <Chip active={color === "all"} onClick={() => setColor("all")}>
            Any
          </Chip>
          {colors.map((c) => (
            <Chip key={c} active={color === c} onClick={() => setColor(c)}>
              {c}
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup label="Availability">
        {[
          { key: "all", label: "Any" },
          { key: "in-stock", label: "In stock" },
          { key: "made-to-order", label: "Made to order" },
        ].map((o) => (
          <Chip key={o.key} active={availability === o.key} onClick={() => setAvailability(o.key)}>
            {o.label}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Sort by">
        {SORTS.map((s) => (
          <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
            {s.label}
          </Chip>
        ))}
      </FilterGroup>
    </div>
  );

  return (
    <section id="catalogue" className="section-shell">
      <div className="page-shell">
        {title ? <h2 className="section-title">{title}</h2> : null}
        {subtitle ? <p className="section-copy mt-4 max-w-2xl">{subtitle}</p> : null}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, material, colour…"
              className="h-12 rounded-full pl-11"
              aria-label="Search products"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            {suggestions.length > 0 ? (
              <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSearch(s.name)}
                      className="block w-full px-4 py-2.5 text-left text-sm text-popover-foreground hover:bg-accent"
                    >
                      {s.name}
                      <span className="ml-2 text-xs text-muted-foreground">{s.category}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-12 rounded-full lg:hidden">
                  <Filter className="mr-2 h-4 w-4" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="pb-8 pt-4">{filterGroups}</div>
              </SheetContent>
            </Sheet>

            {hasFilters ? (
              <Button variant="ghost" className="h-12 rounded-full" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 hidden lg:block">{filterGroups}</div>

        <div ref={gridRef} className="mt-12">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
          </p>

          {products.length === 0 ? (
            <p className="mt-10 text-sm text-muted-foreground">No products available.</p>
          ) : filtered.length === 0 ? (
            <div className="mt-10 space-y-4">
              <p className="text-sm text-muted-foreground">
                No products found in this category.
              </p>
              <Button variant="outline" className="rounded-full" onClick={clearFilters}>
                Reset filters
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.slice(0, visible).map((p) => (
                  <ProductCard key={p.id} product={p} whatsapp={whatsapp} />
                ))}
              </div>
              {visible < filtered.length ? (
                <div className="mt-12 text-center">
                  <Button
                    variant="outline"
                    className="rounded-full px-8"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  >
                    Load more
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
