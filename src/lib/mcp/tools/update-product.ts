import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_product",
  title: "Update product",
  description:
    "Update an existing product's price, stock, status, or featured flag. Requires an admin account.",
  inputSchema: {
    id: z.string().uuid().describe("Product id to update."),
    name: z.string().trim().min(1).optional(),
    price: z.number().nonnegative().optional(),
    sale_price: z.number().nonnegative().nullable().optional(),
    description: z.string().trim().optional(),
    category: z.string().trim().optional(),
    stock_quantity: z.number().int().min(0).optional(),
    in_stock: z.boolean().optional(),
    status: z.enum(["active", "draft"]).optional(),
    featured: z.boolean().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, ...changes }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const values = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    if (Object.keys(values).length === 0) {
      return { content: [{ type: "text", text: "No fields to update." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .update(values)
      .eq("id", id)
      .select("id,name,slug,price,status,featured,stock_quantity,in_stock")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "No product updated — check the id and that your account has admin access." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { product: data },
    };
  },
});
