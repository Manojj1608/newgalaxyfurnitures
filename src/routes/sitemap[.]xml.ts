import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;

        const supabase = createClient(
          process.env["VITE_SUPABASE_URL"] ?? import.meta.env.VITE_SUPABASE_URL,
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          { auth: { persistSession: false } },
        );

        const { data } = await supabase
          .from("products")
          .select("slug, updated_at")
          .eq("status", "active")
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(1000);

        const entries = [
          { path: "/", changefreq: "daily", priority: "1.0", lastmod: undefined as string | undefined },
          ...(data ?? []).map((p) => ({
            path: `/product/${p.slug}`,
            changefreq: "weekly",
            priority: "0.8",
            lastmod: p.updated_at,
          })),
        ];

        const xml = [
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

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
