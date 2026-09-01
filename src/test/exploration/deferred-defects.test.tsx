/**
 * EXPLORATION TESTS (task 2) — Property 1: Bug Condition.
 *
 * These encode the EXPECTED (post-fix) behaviour required by bugfix.md section 2
 * and are EXPECTED TO FAIL against unfixed `main` @ 9f434af. That failure is the
 * evidence each deferred defect is still live.
 *
 * One case per family, per design.md §Exploratory bug condition checking (1–9).
 * The defects are deterministic, so each property is scoped to its concrete
 * failing case rather than generated broadly.
 *
 * `src/test/supabase-fake.ts` is the sole boundary fake; nothing here configures
 * a mock and asserts the mock's configured value back.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 2.11, 2.12, 2.13, 2.14,
 * 2.16, 2.17, 2.18, 2.19
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Profiler } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "@/components/site/site-header";
import { HeroSlider } from "@/components/site/hero-slider";
import { Catalogue } from "@/components/site/catalogue";
import { AdaptiveImage } from "@/components/site/adaptive-image";
import { ProductCard } from "@/components/site/product-card";
import { SITE_ORIGIN } from "@/lib/product-metadata";
import { banner, category, product, renderWithRouter, settings } from "@/test/render-harness";

afterEach(cleanup);

/* ------------------------------ static helpers ----------------------------- */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Application modules: everything under src/ that is not a test or test helper. */
function applicationModules(): string[] {
  return walk(SRC).filter((f) => !f.includes(join("src", "test")) && !/\.test\.tsx?$/.test(f));
}

function importersOf(specifier: string): string[] {
  return applicationModules().filter((f) =>
    new RegExp(`from\\s+["']${specifier}["']`).test(readFileSync(f, "utf8")),
  );
}

// jsdom's selector engine lowercases attribute names, so `svg[viewBox=…]` never
// matches. The monogram is identified by reading the attribute instead.
const monogram = (root: ParentNode) =>
  [...root.querySelectorAll("svg")].find((s) => s.getAttribute("viewBox") === "0 0 64 64") ?? null;

const header = (root: ParentNode) => root.querySelector("header")!;

/* ======================================================================== */

describe("case 1 — 1.1: a stored logo_url is resolved through the merged guard", () => {
  it("an application component imports src/lib/logo.ts", () => {
    // The module and its 15 tests are inert on 9f434af: only test files import it.
    expect(importersOf("@/lib/logo")).not.toEqual([]);
  });

  it.each([
    ["   ", "whitespace only"],
    ["javascript:alert(1)", "hostile scheme"],
    ["ftp://x/y.png", "non-http(s) scheme"],
  ])("logo_url %j (%s) reaches NGMonogram, never an img src", async (logo_url) => {
    const { container } = await renderWithRouter(
      <SiteHeader settings={settings({ logo_url })} categories={[]} onSelectCategory={() => {}} />,
    );
    expect(header(container).querySelector("img")).toBeNull();
    expect(monogram(header(container))).not.toBeNull();
  });

  it("2.3 — an accepted logo carries the merged LOGO_IMG_CLASS clamps and a real accessible name", async () => {
    const { container } = await renderWithRouter(
      <SiteHeader
        settings={settings({ logo_url: "https://img.test/logo.png", company_name: "Acme Beds" })}
        categories={[]}
        onSelectCategory={() => {}}
      />,
    );
    const img = header(container).querySelector("img")!;
    // 2.3: both a max-height and a max-width ceiling, scaled with object-contain.
    for (const cls of ["max-h-9", "max-w-[180px]", "object-contain"]) {
      expect(img.className).toContain(cls);
    }
    // 2.1: named in its own right, not by adjacent text.
    expect(img.getAttribute("alt")).toBe("Acme Beds");
  });
});

describe("case 2 — 1.2: a logo that fails to load falls back to NGMonogram", () => {
  it("firing error on the header img reveals the monogram", async () => {
    const { container } = await renderWithRouter(
      <SiteHeader
        settings={settings({ logo_url: "https://img.test/deleted.png" })}
        categories={[]}
        onSelectCategory={() => {}}
      />,
    );
    const img = header(container).querySelector("img");
    expect(img).not.toBeNull();

    fireEvent.error(img!);

    await waitFor(() => expect(monogram(header(container))).not.toBeNull());
    expect(header(container).querySelector("img")).toBeNull();
  });
});

describe("case 3 — 1.6: hero CTAs are classified, never passed raw to a typed <Link>", () => {
  it("a .tsx application component imports src/lib/links.ts", () => {
    expect(importersOf("@/lib/links").filter((f) => f.endsWith(".tsx"))).not.toEqual([]);
  });

  it("an absolute external button_link renders a safe external anchor", async () => {
    await renderWithRouter(
      <HeroSlider
        banners={[
          banner({ button_text: "WhatsApp us", button_link: "https://wa.me/919000000000" }),
        ]}
      />,
    );
    const cta = screen.getByText("WhatsApp us");
    expect(cta.tagName).toBe("A");
    expect(cta.getAttribute("href")).toBe("https://wa.me/919000000000");
    // The external contract: a raw <Link to> supplies no rel.
    expect(cta.getAttribute("rel") ?? "").toContain("noopener");
    expect(cta.getAttribute("rel") ?? "").toContain("noreferrer");
  });

  it("an unregistered path renders no call to action at all", async () => {
    await renderWithRouter(
      <HeroSlider
        banners={[banner({ button_text: "Browse sofas", button_link: "/collections/sofas" })]}
      />,
    );
    expect(screen.queryByText("Browse sofas")).toBeNull();
  });
});

describe("case 4 — 1.8: a failing sitemap query is never a cacheable 200", () => {
  it("sitemapResponse reports the failure uncacheably", async () => {
    // Resolved at runtime, not transform time: on unfixed code the module does
    // not exist yet, and a static import would abort the whole file before any
    // other counterexample could be observed.
    const specifier = ["..", "..", "lib", "sitemap"].join("/");
    const { sitemapResponse } = (await import(/* @vite-ignore */ specifier)) as {
      sitemapResponse: (a: { origin: string; data: unknown; error: unknown }) => Response;
    };

    const failed = sitemapResponse({
      origin: SITE_ORIGIN,
      data: null,
      error: { message: "relation does not exist", code: "42P01" },
    });

    expect(failed.status).toBe(503);
    expect(failed.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("case 5 — 1.7: robots.txt states the crawler contract", () => {
  it("disallows /admin and declares the sitemap", () => {
    const txt = readFileSync(join(process.cwd(), "public", "robots.txt"), "utf8");
    const lines = txt.split(/\r?\n/).map((l) => l.trim());

    expect(lines).toContain("User-agent: *");
    expect(lines).toContain("Allow: /");
    expect(lines).toContain("Disallow: /admin");
    expect(lines).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });
});

describe("case 6 — 1.10, 1.11, 1.12: hero motion respects the visitor", () => {
  const reduce = (matches: boolean) =>
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));

  const three = [
    banner({ id: "b1", title: "First" }),
    banner({ id: "b2", title: "Second" }),
    banner({ id: "b3", title: "Third" }),
  ];

  const shown = () => screen.getByRole("heading", { level: 1 }).textContent;

  // Fake timers must be installed BEFORE the component mounts, otherwise its
  // setInterval is scheduled on real timers and advancing does nothing — which
  // would make the reduced-motion assertions pass for the wrong reason.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not auto-advance when prefers-reduced-motion is reduce", async () => {
    reduce(true);
    await renderWithRouter(<HeroSlider banners={three} />);
    expect(shown()).toBe("First");

    act(() => vi.advanceTimersByTime(7100));
    expect(shown()).toBe("First");

    act(() => vi.advanceTimersByTime(21000));
    expect(shown()).toBe("First");
  });

  it("does not auto-advance after a manual pagination selection", async () => {
    reduce(false);
    await renderWithRouter(<HeroSlider banners={three} />);

    fireEvent.click(screen.getByLabelText("Show banner 2"));
    expect(shown()).toBe("Second");

    act(() => vi.advanceTimersByTime(7100));
    expect(shown()).toBe("Second");
  });

  it("3.9 — still auto-advances on the untouched 7s cycle when motion is allowed", async () => {
    reduce(false);
    await renderWithRouter(<HeroSlider banners={three} />);
    expect(shown()).toBe("First");

    act(() => vi.advanceTimersByTime(7100));
    expect(shown()).toBe("Second");
  });

  it("1.12 — the decorative background image is not announced", async () => {
    reduce(false);
    const { container } = await renderWithRouter(<HeroSlider banners={[banner()]} />);
    const bg = container.querySelector("section img")!;
    expect(bg.getAttribute("alt")).toBe("");
    expect(bg.getAttribute("aria-hidden")).not.toBeNull();
  });
});

describe("case 7 — 1.13, 1.14, 1.15: the catalogue suggestion list is a real combobox", () => {
  const products = [
    product({ id: "p1", name: "Oakley Sofa", slug: "oakley-sofa" }),
    product({ id: "p2", name: "Oakwood Bench", slug: "oakwood-bench" }),
  ];

  async function openSuggestions() {
    const view = await renderWithRouter(
      <Catalogue products={products} categories={[category()]} whatsapp="919000000000" />,
    );
    const input = screen.getByLabelText("Search products");
    fireEvent.change(input, { target: { value: "oak" } });
    return { ...view, input };
  }

  it("exposes combobox / listbox / option roles and aria-expanded", async () => {
    const { input } = await openSuggestions();

    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option").length).toBe(2);
  });

  it("ArrowDown moves aria-activedescendant and Enter applies the highlighted suggestion", async () => {
    const { input } = await openSuggestions();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    const active = input.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)?.getAttribute("role")).toBe("option");

    fireEvent.keyDown(input, { key: "Enter" });
    expect((input as HTMLInputElement).value).toBe("Oakley Sofa");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("Escape closes the list without clearing the query", async () => {
    const { input } = await openSuggestions();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect((input as HTMLInputElement).value).toBe("oak");
  });
});

describe("case 8 — 1.16, 1.17: admin controls are named and labels are associated", () => {
  const ADMIN = join(SRC, "components", "admin");
  const panels = readdirSync(ADMIN).filter((f) => f.endsWith(".tsx"));
  const ICONS = ["Pencil", "Trash2", "ChevronUp", "ChevronDown"];

  /** Icon-only Button/button elements whose opening tag carries no aria-label. */
  function unnamedIconOnlyControls(source: string, file: string): string[] {
    const found: string[] = [];
    const iconRe = new RegExp(`<(${ICONS.join("|")})\\b[^>]*/>`, "g");
    let m: RegExpExecArray | null;
    while ((m = iconRe.exec(source))) {
      const openIdx = Math.max(
        source.lastIndexOf("<Button", m.index),
        source.lastIndexOf("<button", m.index),
      );
      if (openIdx < 0) continue;
      const openingTag = source.slice(openIdx, m.index);
      const after = source.slice(m.index + m[0].length);
      const closeAt = Math.min(
        ...["</Button>", "</button>"].map((t) => {
          const i = after.indexOf(t);
          return i < 0 ? Number.POSITIVE_INFINITY : i;
        }),
      );
      const body = closeAt === Number.POSITIVE_INFINITY ? "" : after.slice(0, closeAt);
      if (body.trim() === "" && !openingTag.includes("aria-label")) {
        found.push(`${file}:${source.slice(0, m.index).split("\n").length} <${m[1]}>`);
      }
    }
    return found;
  }

  const counts = panels.map((f) => {
    const src = readFileSync(join(ADMIN, f), "utf8");
    return {
      file: f,
      labels: (src.match(/<Label\b/g) ?? []).length,
      htmlFor: (src.match(/htmlFor=/g) ?? []).length,
    };
  });

  it("2.16 — every icon-only admin control has an accessible name", () => {
    const unnamed = panels.flatMap((f) =>
      unnamedIconOnlyControls(readFileSync(join(ADMIN, f), "utf8"), f),
    );
    expect(unnamed).toEqual([]);
  });

  it("2.17 — every admin Label is associated, and the total is the recorded 40", () => {
    const actual = Object.fromEntries(counts.map((c) => [c.file, c.htmlFor]));
    const oneForEachLabel = Object.fromEntries(counts.map((c) => [c.file, c.labels]));

    expect(actual).toEqual(oneForEachLabel);
    expect(counts.reduce((n, c) => n + c.htmlFor, 0)).toBe(40);
  });
});

describe("case 9 — 1.18, 1.19: image sizing without a commit-phase state write", () => {
  const saved = new Map<string, PropertyDescriptor | undefined>();

  beforeEach(() => {
    // jsdom never loads images, so a cached-complete image is simulated at the
    // DOM boundary. This controls the environment, not our components.
    for (const [prop, value] of [
      ["complete", true],
      ["naturalWidth", 1000],
      ["naturalHeight", 1000],
    ] as const) {
      saved.set(prop, Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, prop));
      Object.defineProperty(HTMLImageElement.prototype, prop, {
        configurable: true,
        get: () => value,
      });
    }
  });

  afterEach(() => {
    for (const [prop, descriptor] of saved) {
      if (descriptor) Object.defineProperty(HTMLImageElement.prototype, prop, descriptor);
      else Reflect.deleteProperty(HTMLImageElement.prototype, prop);
    }
    saved.clear();
  });

  it("AdaptiveImage commits once for a cached square image at the fallback ratio", () => {
    let commits = 0;
    render(
      <Profiler id="adaptive" onRender={() => void commits++}>
        <AdaptiveImage src="https://img.test/a.webp" alt="A chair" />
      </Profiler>,
    );
    expect(commits).toBe(1);
  });

  it("ProductCard commits once for a cached square image at the default ratio", async () => {
    let commits = 0;
    await renderWithRouter(
      <Profiler id="card" onRender={() => void commits++}>
        <ProductCard product={product()} whatsapp="919000000000" />
      </Profiler>,
    );
    expect(commits).toBe(1);
  });

  it("2.19 — grids supply intrinsic width/height and a responsive sizes hint", () => {
    const { container } = render(<AdaptiveImage src="https://img.test/a.webp" alt="A chair" />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("width")).toBeTruthy();
    expect(img.getAttribute("height")).toBeTruthy();
    expect(img.getAttribute("sizes")).toBe(
      "(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw",
    );
  });
});
