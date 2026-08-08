import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_product",
  title: "Get product",
  description: "Fetch the full details of a single product by its slug or id.",
  inputSchema: {
    slug: z.string().trim().optional().describe("Product slug, e.g. 'walnut-lounge-sofa'."),
    id: z.string().uuid().optional().describe("Product id (uuid)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    if (!slug && !id) {
      return { content: [{ type: "text", text: "Provide either slug or id." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("products").select("*").is("deleted_at", null);
    q = id ? q.eq("id", id) : q.eq("slug", slug!);
    const { data, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Product not found." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { product: data },
    };
  },
});
