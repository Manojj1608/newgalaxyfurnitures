# Fully Dynamic, Database-Driven New Galaxy Furniture

## Audit of what exists today

| Area | Today | Gap |
| --- | --- | --- |
| Products | `products` table, live realtime on homepage + product page | Missing SKU, sub-category, stock qty, color/finish/weight, flags (bestseller/trending/new/on-sale), SEO fields, status (active/draft/hidden), soft delete |
| Categories | Hardcoded array in `src/lib/products-config.ts` | No categories table, no banners/order/visibility |
| Homepage | All sections hardcoded in `src/routes/index.tsx` (1049 lines) — hero copy, hero image, trust pillars, reviews, about, contact | No homepage/CMS tables, no section ordering |
| Site info | Phone `9513443606`, Bengaluru address, WhatsApp, maps hardcoded in 2 route files | No settings table |
| Enquiries | WhatsApp deep link only, nothing saved | No enquiries table |
| Admin | Single dashboard page: product CRUD + image upload | No modules for categories, homepage, media, enquiries, settings, analytics |
| Leftovers | `src/lib/shopify.ts`, `cart-store.ts`, `cart-drawer.tsx` unused Shopify remnants | Delete |

This is a large build. I'll ship it in phases, each one fully working before moving on — so you always have a usable site.

## Phase 1 — Data foundation

New tables (all with RLS: public reads active rows, admins write; grants included):

- `categories` — name, slug, description, banner, thumbnail, parent_id (sub-categories), display_order, visible, SEO fields
- `products` extended — sku, product_code, category_id + subcategory_id FKs, sale/discount, stock_quantity + status + low-stock threshold, short/long description, color, finish, size, weight, primary/hover image, flags (featured, bestseller, trending, new_arrival, on_sale), meta_title/description/keywords, status enum, view_count, deleted_at (soft delete)
- `media` — bucket path, url, alt, width/height, size, uploaded_by
- `site_settings` — single-row CMS: company name, logo, phone, email, address, WhatsApp, maps embed, socials, policy/about/FAQ rich text
- `homepage_sections` — type, sort_order, enabled, JSON config (drag-and-drop ordering)
- `hero_banners` — image, title, subtitle, button text/link, priority, start/end date, active
- `enquiries` — name, phone, email, product_id, message, source_page, status, notes
- `audit_logs` — actor, action, table, row id, diff
- `user_roles` extended with `manager` and `editor` roles

Existing products migrate into the new shape; existing category strings seed the `categories` table so nothing is lost.

## Phase 2 — Data layer refactor

- One typed data module per entity (`src/lib/*-api.ts`) — single source of truth, no duplicate fetch logic
- TanStack Query hooks with shared query keys + one realtime subscription hub that invalidates the right keys on any insert/update/delete → instant propagation to homepage, collections, explore, search, product page, nav, filters
- Delete `shopify.ts`, `cart-store.ts`, `cart-drawer.tsx`

## Phase 3 — Public site goes fully dynamic

- Homepage renders from `homepage_sections` in admin-defined order; hero from `hero_banners` slider
- Categories, collections grid, nav links, footer, contact details, about, policies — all from DB
- Filters built from live data: category, subcategory, material, color, price, availability, style, size + sorting (newest, price asc/desc, most viewed, best selling, trending)
- Search across name, SKU, description, material, category, color, tags with live suggestions
- Empty/placeholder states: "No products available.", "No products found in this category.", placeholder image
- Product page: gallery slider with zoom, specs, delivery/warranty, breadcrumbs, related products (same category → same material → similar price), recently viewed, quick view, share/copy link, WhatsApp enquiry with name/SKU/price/link/image that also writes an `enquiries` row
- Mobile: sticky bottom actions, swipe gallery, touch filter drawer
- Performance: lazy loading, responsive/WebP images, pagination or infinite scroll, query caching
- SEO: auto slug, per-route meta/OG, Product + Organization JSON-LD, DB-driven sitemap, robots.txt

## Phase 4 — Admin panel

Sidebar shell at `/admin` with modules: Dashboard, Products, Categories, Homepage Manager, Collections, Promotions, Enquiries, Media Library, Settings, Analytics.

- Products: full form for every field above, multi-image upload with drag-sort, bulk status, soft delete + restore
- Categories: unlimited, nested sub-categories, banners, ordering, visibility
- Homepage Manager: drag-and-drop section ordering, per-section config, hero banner slider CRUD with scheduling
- Enquiries: list, status workflow, notes
- Settings: all CMS text, contact info, socials, policies
- Analytics: totals, product views, enquiries, most viewed/enquired, low stock
- Role-based access (admin/manager/editor), audit log, session timeout

## Technical notes

- Public reads via anon-safe SELECT policies; all writes go through authenticated server functions with role checks — no client-side privilege decisions
- Product views/analytics counted via a server function so it can't be spoofed from the client
- Image compression + WebP conversion at upload time in the browser before it hits storage
- Zod validation on every admin form and every server function input

## Scope note

This is roughly a full rebuild of both the storefront and the admin. Phase 1 + 2 are prerequisites for everything else, so I'll start there and check in after each phase.
