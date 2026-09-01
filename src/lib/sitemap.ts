/**
 * Sitemap rendering and response policy.
 *
 * Defect 1.8: the route handler destructured only `data`, so a failed products
 * query became `(data ?? [])` — an apparently valid document containing just `/`,
 * returned as a **200** with `Cache-Control: public, max-age=3600`. A truncated
 * sitemap was therefore both published and cached for an hour while the real
 * failure was never reported.
 *
 * Lifted verbatim out of `createFileRoute` so both the builder and the response
 * policy are importable and assertable without a server or a network. It lives in
 * `src/lib/` rather than being exported from the route module because a route
 * exporting `Route` plus a function trips `react-refresh/only-export-components`,
 * which would raise the recorded lint baseline (2.22).
 */

export type SitemapRow = { slug: string; updated_at?: string | null };

/**
 * The success-path document. Byte-identical to what the handler emitted before
 * this extraction (3.20): same entries, same ordering, same optional `<lastmod>`.
 */
export function renderSitemapXml(origin: string, rows: SitemapRow[]): string {
  const entries = [
    {
      path: "/",
      changefreq: "daily",
      priority: "1.0",
      lastmod: undefined as string | undefined,
    },
    ...rows.map((p) => ({
      path: `/product/${p.slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: p.updated_at ?? undefined,
    })),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) =>
      [
        "  <url>",
        `    <loc>${origin}${entry.path}</loc>`,
        entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "</urlset>",
  ].join("\n");
}

/**
 * 2.8: a failed query yields 503 + `no-store`, so no crawler can cache an
 * incomplete document. A successful query yields today's bytes and today's cache
 * header, unchanged.
 */
export function sitemapResponse({
  origin,
  data,
  error,
}: {
  origin: string;
  data: SitemapRow[] | null;
  error: unknown;
}): Response {
  if (error !== null && error !== undefined) {
    return new Response("sitemap temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new Response(renderSitemapXml(origin, data ?? []), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
