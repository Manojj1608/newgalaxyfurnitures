/**
 * Rendering harness for component-level tests.
 *
 * Not a test file (no `.test.` in the name), so vitest does not collect it.
 *
 * Several site components render `<Link>` from `@tanstack/react-router`, which
 * throws outside a `RouterProvider`. This module supplies a memory router whose
 * route tree mirrors the real registered storefront routes (`/`,
 * `/product/$handle`, `/admin/login`) so a `Link` resolves exactly as it does in
 * the app. The router is a genuine router, not a mock: nothing here is asserted
 * against — it only makes the real component renderable.
 *
 * It also provides plain object fixtures. These are data, not stubs: every
 * assertion in the tests that use them is about the behaviour of real exported
 * application code.
 */
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach } from "vitest";
import type { CategoryRow, HeroBanner, Product, SiteSettings } from "@/lib/content-types";

// This project's vitest config does not enable `globals`, so
// @testing-library/react cannot register its own auto-cleanup and rendered trees
// would otherwise accumulate in the document across tests.
afterEach(cleanup);

/**
 * Renders `ui` at `/` inside a memory router carrying the real route set.
 *
 * Async because a router mounts its route component after an initial load pass;
 * awaiting it means assertions never race the mount.
 */
export async function renderWithRouter(ui: ReactNode) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const children = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => <div data-harness-root>{ui}</div>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/product/$handle",
      component: () => null,
    }),
    createRoute({ getParentRoute: () => rootRoute, path: "/admin/login", component: () => null }),
  ];
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await router.load();
  // Flushed with an async `act` rather than `waitFor`: waitFor is driven by
  // timers, so it would hang in any test that installs fake timers (the hero
  // motion cases). `act` drains the router's pending microtasks directly.
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <QueryClientProvider client={client}>
        {/* The generated route tree is not registered in tests; the cast keeps
            the real RouterProvider usable with this ad-hoc tree. */}
        <RouterProvider router={router as never} />
      </QueryClientProvider>,
    );
  });
  if (!result.container.querySelector("[data-harness-root]")) {
    throw new Error("harness route did not mount");
  }
  return result;
}

/* --------------------------------- fixtures -------------------------------- */

export function settings(over: Partial<SiteSettings> = {}): SiteSettings {
  return {
    id: "singleton",
    company_name: "New Galaxy Furniture",
    tagline: "Timeless pieces",
    phone: "+91 90000 00000",
    whatsapp: "919000000000",
    email: "hello@example.test",
    address: "1 Showroom Road",
    showroom_hours: "10-8",
    maps_embed_url: null,
    logo_url: null,
    instagram_url: null,
    facebook_url: null,
    youtube_url: null,
    pinterest_url: null,
    about_text: "About the showroom.",
    faq_text: null,
    terms_text: null,
    privacy_text: null,
    return_policy_text: null,
    footer_note: null,
    ...over,
  } as SiteSettings;
}

export function category(over: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: "c1",
    name: "Sofas",
    slug: "sofas",
    parent_id: null,
    visible: true,
    sort_order: 0,
    image_url: null,
    ...over,
  } as CategoryRow;
}

export function banner(over: Partial<HeroBanner> = {}): HeroBanner {
  return {
    id: "b1",
    title: "Crafted for living",
    eyebrow: "New season",
    subtitle: "Hand-finished furniture",
    image_url: "https://img.test/hero.webp",
    button_text: "Explore",
    button_link: "#catalogue",
    active: true,
    sort_order: 0,
    ...over,
  } as HeroBanner;
}

export function product(over: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Oak Dining Table",
    slug: "oak-dining-table",
    sku: "NG-001",
    price: 50000,
    sale_price: null,
    in_stock: true,
    stock_quantity: 2,
    status: "active",
    category: "Tables",
    category_id: "c1",
    subcategory_id: null,
    material: "Oak",
    color: "Natural",
    description: "A table.",
    short_description: "A table.",
    images: [{ url: "https://img.test/a.webp", path: "a.webp" }],
    hover_image_url: null,
    new_arrival: false,
    bestseller: false,
    trending: false,
    view_count: 0,
    order_count: 0,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    deleted_at: null,
    ...over,
  } as Product;
}
