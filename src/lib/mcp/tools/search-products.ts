import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search the New Galaxy Furniture catalogue by name, category, or status. Returns matching products with price and stock.",
  inputSchema: {
    query: z.string().trim().optional().describe("Text to match against product name or description."),
    category: z.string().trim().optional().describe("Filter by category name, e.g. 'Sofas & Sectionals'."),
    status: z.enum(["active", "draft", "any"]).optional().describe("Publication status filter. Defaults to active."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("products")
      .select("id,name,slug,category,price,sale_price,status,in_stock,stock_quantity,featured")
      .is("deleted_at", null)
      .limit(limit ?? 20);
    if ((status ?? "active") !== "any") q = q.eq("status", status ?? "active");
    if (category) q = q.ilike("category", `%${category}%`);
    if (query) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
