import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";

import type { CategoryRow, SiteSettings } from "@/lib/content-types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark } from "@/components/site/brand-mark";

// `NGMonogram` moved verbatim into brand-mark.tsx, which now owns the mark. It is
// re-exported here so index.tsx's existing import path keeps working. Both files
// export components only, so no react-refresh warning is added.
export { NGMonogram } from "@/components/site/brand-mark";

export function SiteHeader({
  settings,
  categories,
  onSelectCategory,
}: {
  settings: SiteSettings | null;
  categories: CategoryRow[];
  onSelectCategory: (id: string) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = categories.filter((c) => !c.parent_id).slice(0, 6);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled ? "bg-background/90 shadow-sm backdrop-blur" : "bg-transparent"
      }`}
    >
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark settings={settings} size="header" />
          <span className="leading-tight">
            <span
              className={`block font-display text-xl ${scrolled ? "text-foreground" : "text-primary-foreground"}`}
            >
              {settings?.company_name ?? "New Galaxy Furniture"}
            </span>
            <span
              className={`block text-[0.6rem] uppercase tracking-[0.3em] ${
                scrolled ? "text-muted-foreground" : "text-primary-foreground/75"
              }`}
            >
              {settings?.tagline ?? ""}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(c.id)}
              className={`text-xs uppercase tracking-[0.2em] transition-opacity hover:opacity-70 ${
                scrolled ? "text-foreground" : "text-primary-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
          <a
            href="#contact"
            className={`text-xs uppercase tracking-[0.2em] transition-opacity hover:opacity-70 ${
              scrolled ? "text-foreground" : "text-primary-foreground"
            }`}
          >
            Contact
          </a>
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className={`lg:hidden ${scrolled ? "text-foreground" : "text-primary-foreground"}`}
            >
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[80vw] max-w-sm">
            <nav className="mt-10 flex flex-col gap-1">
              {nav.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(c.id);
                    setOpen(false);
                  }}
                  className="rounded-xl px-3 py-3 text-left font-display text-2xl text-foreground hover:bg-accent"
                >
                  {c.name}
                </button>
              ))}
              <a
                href="#contact"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 font-display text-2xl text-foreground hover:bg-accent"
              >
                Contact
              </a>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
