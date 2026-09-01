/**
 * PRESERVATION TESTS (task 3, continued) — Property 2, properties 4 and 6.
 *
 * Split from the other preservation file because both subjects need the Supabase
 * boundary faked, and `src/test/supabase-fake.ts` is the sole fake permitted.
 * Nothing here configures a mock and asserts the mock's configured value back:
 * the assertions are about the bytes the real `sitemap.xml` route emits and the
 * payload the real settings panel sends to the real `saveSettings`.
 *
 * OBSERVATION-FIRST: every expected value was recorded by executing the UNFIXED
 * code at `9f434af`.
 *
 * Validates: Requirements 3.13, 3.20
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FakeSupabase } from "@/test/supabase-fake";

let fake: FakeSupabase = new FakeSupabase();

// The sitemap route builds its own client with createClient(...).
vi.mock("@supabase/supabase-js", () => ({ createClient: () => fake }));
// Everything in src/lib/content-api.ts goes through this shared client.
vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return fake;
  },
}));

afterEach(cleanup);

/* ------------------------------- property 4 -------------------------------- */

const ORIGIN = "https://newgalaxyfurnitures.lovable.app";

/**
 * Golden bytes recorded from the UNFIXED handler at `9f434af` for the row set
 * below. A row with a null `updated_at` emits no `<lastmod>` — observed, pinned.
 */
const GOLDEN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${ORIGIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${ORIGIN}/product/oak-dining-table</loc>
    <lastmod>2024-03-01T10:00:00.000Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${ORIGIN}/product/velvet-sofa</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

const ROWS = [
  { slug: "oak-dining-table", updated_at: "2024-03-01T10:00:00.000Z" },
  { slug: "velvet-sofa", updated_at: null },
];

async function getSitemap(): Promise<Response> {
  const mod = await import("@/routes/sitemap[.]xml");
  const handler = (
    mod.Route as unknown as {
      options: { server: { handlers: { GET: (a: { request: Request }) => Promise<Response> } } };
    }
  ).options.server.handlers.GET;
  return handler({ request: new Request(`${ORIGIN}/sitemap.xml`) });
}

describe("3.20 — a successful sitemap request is byte-identical", () => {
  it("emits the recorded XML with the recorded headers", async () => {
    fake = new FakeSupabase({ tables: { products: { data: ROWS, error: null } } });

    const res = await getSitemap();

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(GOLDEN_XML);
    expect(res.headers.get("Content-Type")).toBe("application/xml");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("lists only / when the product set is empty, still cacheable", async () => {
    fake = new FakeSupabase({ tables: { products: { data: [], error: null } } });

    const res = await getSitemap();

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${ORIGIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
    );
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("queries the same active, non-deleted product set in the same order", async () => {
    fake = new FakeSupabase({ tables: { products: { data: ROWS, error: null } } });

    await getSitemap();

    const op = fake.opsFor("products", "select")[0]!;
    expect(op.selected).toBe("slug, updated_at");
    expect(op.filters).toEqual([
      { column: "status", value: "active", op: "eq" },
      { column: "deleted_at", value: null, op: "is" },
    ]);
  });
});

/* ------------------------------- property 6 -------------------------------- */

const SETTINGS_ROW = {
  id: true,
  company_name: "New Galaxy Furniture",
  tagline: "Timeless pieces",
  phone: "+91 90000 00000",
  whatsapp: "919000000000",
  email: "hello@example.test",
  address: "1 Showroom Road",
  showroom_hours: "10-8",
  maps_embed_url: null,
  logo_url: "https://img.test/existing-logo.png",
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
};

/**
 * Recorded from the UNFIXED panel: the ordered non-logo field labels. The logo
 * control is deliberately excluded, because replacing it is the fix (2.4); every
 * OTHER field must keep its position and copy (3.13).
 */
const NON_LOGO_LABELS = [
  "Company name",
  "Tagline",
  "Phone",
  "WhatsApp number (digits only)",
  "Email",
  "Address",
  "Showroom hours",
  "Google Maps embed URL",
  "Instagram",
  "Facebook",
  "YouTube",
  "Pinterest",
  "About text",
  "FAQ",
  "Terms",
  "Privacy policy",
  "Return policy",
  "Footer note",
];

async function renderSettingsPanel() {
  fake = new FakeSupabase({
    tables: {
      site_settings: (op) =>
        op.kind === "update"
          ? { data: [{ id: true }], error: null }
          : { data: SETTINGS_ROW, error: null },
    },
  });
  const { SettingsPanel } = await import("@/components/admin/settings-panel");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <SettingsPanel />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText("Site settings")).toBeInTheDocument());
  return view;
}

/** Finds a text control by its current value, so no htmlFor is required. */
function fieldByValue(value: string): HTMLElement {
  const all = [...document.querySelectorAll("input, textarea")] as (
    | HTMLInputElement
    | HTMLTextAreaElement
  )[];
  const found = all.find((el) => el.value === value);
  if (!found) throw new Error(`no field currently holding ${JSON.stringify(value)}`);
  return found;
}

const savedPayload = () =>
  fake.opsFor("site_settings", "update").at(-1)?.values as Record<string, unknown> | undefined;

describe("3.13 — every non-logo settings field keeps its copy, position and save path", () => {
  beforeEach(() => vi.resetModules());

  it("renders the recorded non-logo labels in the recorded order", async () => {
    await renderSettingsPanel();
    const labels = [...document.querySelectorAll("label")]
      .map((l) => (l.textContent ?? "").trim())
      .filter((t) => !/logo/i.test(t));
    expect(labels).toEqual(NON_LOGO_LABELS);
  });

  it("saves an edited non-logo field with the recorded payload shape", async () => {
    await renderSettingsPanel();

    fireEvent.change(fieldByValue("Timeless pieces"), { target: { value: "Made to last" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });

    await waitFor(() => expect(savedPayload()).toBeDefined());
    // Only the edited key is sent, and logo_url is untouched by a non-logo edit.
    expect(savedPayload()).toEqual({ tagline: "Made to last" });
  });

  it('still maps an emptied non-logo field to null ("" → null)', async () => {
    await renderSettingsPanel();

    fireEvent.change(fieldByValue("hello@example.test"), { target: { value: "" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });

    await waitFor(() => expect(savedPayload()).toBeDefined());
    expect(savedPayload()).toEqual({ email: null });
  });

  it("still sends every edited non-logo field together, and only those", async () => {
    await renderSettingsPanel();

    fireEvent.change(fieldByValue("+91 90000 00000"), { target: { value: "+91 91111 11111" } });
    fireEvent.change(fieldByValue("1 Showroom Road"), { target: { value: "2 Showroom Road" } });
    fireEvent.change(fieldByValue("About the showroom."), { target: { value: "New about copy." } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });

    await waitFor(() => expect(savedPayload()).toBeDefined());
    expect(savedPayload()).toEqual({
      phone: "+91 91111 11111",
      address: "2 Showroom Road",
      about_text: "New about copy.",
    });
  });

  it("still updates the singleton row and asks for affected rows back", async () => {
    await renderSettingsPanel();

    fireEvent.change(fieldByValue("Timeless pieces"), { target: { value: "Made to last" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });

    await waitFor(() => expect(savedPayload()).toBeDefined());
    const op = fake.opsFor("site_settings", "update").at(-1)!;
    expect(op.filters).toEqual([{ column: "id", value: true, op: "eq" }]);
    expect(op.selected).toBe("id");
  });
});
