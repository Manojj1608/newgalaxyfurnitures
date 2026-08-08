import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default defineTool({
  name: "create_product",
  title: "Create product",
  description:
    "Add a new furniture product to the catalogue. Requires an admin account; the product appears on the storefront when status is active.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Product name."),
    category: z.string().trim().min(1).describe("Category name, e.g. 'Dining Tables'."),
    price: z.number().nonnegative().describe("Price in INR."),
    description: z.string().trim().optional(),
    material: z.string().trim().optional(),
    dimensions: z.string().trim().optional(),
    status: z.enum(["active", "draft"]).optional().describe("Defaults to draft."),
    featured: z.boolean().optional().describe("Show in the homepage featured grid."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: input.name,
        slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 7)}`,
        category: input.category,
        price: input.price,
        description: input.description ?? null,
        material: input.material ?? null,
        dimensions: input.dimensions ?? null,
        status: input.status ?? "draft",
        featured: input.featured ?? false,
      })
      .select("id,name,slug,status,price")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { product: data },
    };
  },
});
