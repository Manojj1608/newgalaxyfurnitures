/**
 * Unit tests for the F5 extraction (2.8, 3.20).
 *
 * `renderSitemapXml` is asserted against the golden bytes recorded from the
 * UNFIXED handler at `9f434af` (see
 * src/test/preservation/sitemap-and-settings.test.tsx, which pins the same bytes
 * through the real route), so the refactor cannot have changed the success path.
 *
 * Validates: Requirements 2.8, 3.20
 */
import { describe, expect, it } from "vitest";

import { renderSitemapXml, sitemapResponse } from "@/lib/sitemap";

const ORIGIN = "https://newgalaxyfurnitures.lovable.app";

const ROWS = [
  { slug: "oak-dining-table", updated_at: "2024-03-01T10:00:00.000Z" },
  { slug: "velvet-sofa", updated_at: null },
];

/** Recorded from the unfixed handler, byte for byte. */
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

describe("renderSitemapXml — 3.20 byte-identical success output", () => {
  it("matches the recorded golden bytes", () => {
    expect(renderSitemapXml(ORIGIN, ROWS)).toBe(GOLDEN_XML);
  });

  it("emits only / for an empty row set", () => {
    expect(renderSitemapXml(ORIGIN, [])).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${ORIGIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
    );
  });

  it("omits lastmod exactly when updated_at is absent", () => {
    expect(renderSitemapXml(ORIGIN, [{ slug: "a", updated_at: null }])).not.toContain("<lastmod>");
    expect(renderSitemapXml(ORIGIN, [{ slug: "a" }])).not.toContain("<lastmod>");
    expect(renderSitemapXml(ORIGIN, [{ slug: "a", updated_at: "2024-01-01" }])).toContain(
      "<lastmod>2024-01-01</lastmod>",
    );
  });

  it("preserves the given row order", () => {
    const xml = renderSitemapXml(ORIGIN, [{ slug: "b" }, { slug: "a" }]);
    expect(xml.indexOf("/product/b")).toBeLessThan(xml.indexOf("/product/a"));
  });
});

describe("sitemapResponse — 2.8 a failure is never a cacheable 200", () => {
  it("returns 503 and no-store when the query errored", () => {
    const res = sitemapResponse({
      origin: ORIGIN,
      data: null,
      error: { message: "relation does not exist", code: "42P01" },
    });

    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not publish a truncated document when the query errored", async () => {
    const res = sitemapResponse({ origin: ORIGIN, data: [], error: new Error("network") });

    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("<urlset");
  });

  it("still errors out even when partial data arrived alongside the error", () => {
    const res = sitemapResponse({ origin: ORIGIN, data: ROWS, error: new Error("partial") });
    expect(res.status).toBe(503);
  });

  it("returns today's bytes, content type and cache header on success", async () => {
    const res = sitemapResponse({ origin: ORIGIN, data: ROWS, error: null });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(GOLDEN_XML);
    expect(res.headers.get("Content-Type")).toBe("application/xml");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("treats a null-data success as the / only document, still cacheable", async () => {
    const res = sitemapResponse({ origin: ORIGIN, data: null, error: null });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(renderSitemapXml(ORIGIN, []));
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("treats undefined error as success, matching the client library's shape", () => {
    expect(sitemapResponse({ origin: ORIGIN, data: ROWS, error: undefined }).status).toBe(200);
  });
});
