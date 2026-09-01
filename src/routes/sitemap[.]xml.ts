import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { createClient } from "@supabase/supabase-js";

import { sitemapResponse } from "@/lib/sitemap";

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

        // 1.8: `error` was previously discarded, turning a failure into a
        // truncated but cacheable 200.
        const { data, error } = await supabase
          .from("products")
          .select("slug, updated_at")
          .eq("status", "active")
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(1000);

        // console.error is the correct channel server-side: reportLovableError
        // no-ops without `window`, and the Supabase clients already report this
        // way. No error module is added or removed (3.24).
        if (error) console.error("[sitemap]", error);

        return sitemapResponse({ origin, data, error });
      },
    },
  },
});
