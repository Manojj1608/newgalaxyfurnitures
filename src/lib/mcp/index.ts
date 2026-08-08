import { auth, defineMcp } from "@lovable.dev/mcp-js";

import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import createProduct from "./tools/create-product";
import updateProduct from "./tools/update-product";
import listEnquiries from "./tools/list-enquiries";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged and Vite inlines it at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "new-galaxy-furniture",
  title: "New Galaxy Furniture",
  version: "0.1.0",
  instructions:
    "Tools for the New Galaxy Furniture showroom. Browse the catalogue with `search_products` and `get_product`. Admin accounts can add or edit pieces with `create_product` / `update_product` and review customer enquiries with `list_enquiries`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, getProduct, createProduct, updateProduct, listEnquiries],
});
