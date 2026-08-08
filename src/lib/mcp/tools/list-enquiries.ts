import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_enquiries",
  title: "List customer enquiries",
  description:
    "List recent customer enquiries with status and the product enquired about. Requires an admin account.",
  inputSchema: {
    status: z.string().trim().optional().describe("Filter by status, e.g. 'new', 'contacted', 'closed'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("enquiries")
      .select("id,customer_name,phone,email,message,product_name,status,channel,created_at")
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { enquiries: data ?? [] },
    };
  },
});
