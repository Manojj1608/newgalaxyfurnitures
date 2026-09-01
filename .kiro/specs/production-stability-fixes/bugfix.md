# Bugfix Requirements Document

## Introduction

New Galaxy Furniture is a live, already-approved storefront (TanStack Start + React 19 + Vite + Supabase + Bun) with an admin dashboard, 18 append-only Supabase migrations, and no test infrastructure. This spec is a **production stability / reliability / security hardening pass**. It is not a redesign and not a new feature.

The defects fall into four families:

1. **The image pipeline cannot be trusted.** No migration ever creates the `product-images` storage bucket that four storage policies guard, storage write policies require `admin` while table policies allow `editor`/`manager`, batch uploads abort mid-way while still reporting full success, and there is no type/size validation.
2. **Authentication is enforced, authorization is not.** The `_authenticated` route guard only checks that a session exists. The dashboard's client-side gate then checks *only* `admin`, contradicting the three-tier `admin`/`manager`/`editor` model the database already implements via `private.is_staff` / `private.is_manager`.
3. **Security hygiene gaps.** `.env` is tracked in Git and absent from `.gitignore`; `private` schema role-helper functions are executable by `anon`, giving an unauthenticated role oracle.
4. **Failures are rendered as success or as emptiness.** Many Supabase mutations never inspect their error, several success toasts fire unconditionally, and almost every panel/page treats a failed query as "nothing here" — so network, permission and RLS failures look like an empty catalogue, an empty media library, or a missing product.

Impact: the owner cannot reliably publish product imagery; any signed-in account can reach the admin UI; genuine staff can be locked out; and both the owner and customers can be shown false or blank states that hide real failures.

### Verification status of the evidence

Everything below marked **VERIFIED** was established by direct inspection of the working tree in this sandbox (file reads, `grep` across all 18 migrations, `git ls-files`, import-graph greps).

Recorded as **NOT VERIFIED** — and treated as unknown, not assumed:

- Live Supabase state. Only an anon/publishable key is available here, so the actual existence of the `product-images` bucket, its public/private setting, and the currently-applied policies and grants on the production project cannot be checked. The bucket may have been created manually in the Supabase dashboard.
- Whether any external/indexed URL depends on the files in `public/media/`.
- Runtime behaviour: `node_modules` is not installed and there is no test or typecheck script, so nothing in this repo was executed. All findings are static.

### Hard constraints on every fix

- **No redesign.** Colour palette, typography, spacing, layout language, hero composition, card styling, design system, routes, URLs and existing SEO stay as they are. No gradients, no new animations, no generic-ecommerce conversion. Visual change only where it directly fixes usability, responsiveness, accessibility, alignment, readability, consistency, performance or a broken state.
- **Smallest production-safe fix per bug**, additive wherever possible. No stylistic mass refactors, no rewriting unrelated code.
- **All schema, policy and storage corrections must be new append-only migrations.** Existing migration files are never edited.
- **Do not weaken security to make a feature work**, and do not delete or collapse the existing `admin`/`manager`/`editor` roles to simplify.
- **Regression safety:** existing product/category/image URLs, WhatsApp behaviour, catalogue filters and search, hero rotation, trash/restore, session persistence, working admin functions, SEO and visual identity must all keep working.
- **Verification honesty:** anything not actually executed stays marked NOT VERIFIED. No fabricated evidence.
- **Testing:** practical test infrastructure must be added (vitest is the natural fit) plus a typecheck script, exercising real application logic for the bugs fixed here — not mocks asserting their own configured return values.
- **Logo artwork constraint:** the logo was supplied as a chat image attachment and cannot be written to disk from this environment. The fix must treat the artwork as something uploaded through the admin flow at runtime, and must not depend on any binary being committed to the repo.

## Bug Analysis

Each clause in section 1 states a checkable bug condition C(X) as its WHEN predicate, with a severity. Section 2 states the required behaviour for the same condition (fix check). Section 3 states the behaviour that must be identical before and after for every input that does not satisfy any C(X) (preservation check).

### Current Behavior (Defect)

**Image upload and storage**

1.1 **[CRITICAL]** WHEN the schema is applied from `supabase/migrations/` alone (all 18 files contain zero `storage.buckets` inserts and no bucket creation of any kind, yet `20260626155029` and `20260627095713` define four RLS policies keyed on `bucket_id = 'product-images'`) AND an admin uploads any image THEN the storage request targets a bucket that was never created and `uploadProductImage` throws, so no image can be added to products, categories, banners, homepage or the media library. *VERIFIED statically; live bucket existence NOT VERIFIED.*

1.2 **[CRITICAL]** WHEN a signed-in user whose role is `manager` or `editor` uploads an image THEN the storage INSERT/UPDATE/DELETE policies require `private.has_role(auth.uid(), 'admin')` while the `products`/`media`/`categories`/`hero_banners` table policies accept `private.is_staff(auth.uid())`, so the record write is permitted but the image write is denied and the panel surfaces a raw policy error. *VERIFIED in migrations; live policy state NOT VERIFIED.*

1.3 **[HIGH]** WHEN several files are selected in the media library and one fails part-way through THEN `onFiles` aborts every remaining file (single `try` around a sequential `for … await` loop) yet still shows `${files.length} file(s) uploaded`, so the admin is told all files landed when some or most did not.

1.4 **[HIGH]** WHEN a selected file is not a supported image (only `accept="image/*"` is applied, with no MIME allow-list) or is arbitrarily large (no size cap) THEN the file is sent to storage and any rejection reaches the admin as an opaque error, with no guidance and no per-file validation.

1.5 **[HIGH]** WHEN an image is removed from the product dialog THEN `deleteProductImage` runs immediately and its failure is swallowed by `.catch(() => {})`, so the stored object is destroyed even if the admin then cancels the dialog, and a failed deletion is invisible.

1.6 **[HIGH]** WHEN storage removal fails inside `deleteProductImage` THEN the `.remove()` result is never inspected and the `media` row is deleted regardless, leaving an orphaned storage object with no record, reported to the admin as a successful delete.

1.7 **[MEDIUM]** WHEN an image is uploaded from the product, category or hero-banner dialog, or deleted from a product THEN the `media` query key is not invalidated, so the media library keeps showing a stale file list until it is refetched for another reason.

1.8 **[MEDIUM]** WHEN an upload succeeds THEN a ~10-year signed URL (`SIGNED_URL_TTL`) is persisted into `products.images`, `media.url`, `categories.thumbnail_url`/`banner_url` and `hero_banners.image_url`, so every already-published image URL is bound to the signing key and to a TTL ceiling rather than to a durable object reference. *Code VERIFIED; whether the live bucket is public and whether signing keys have rotated is NOT VERIFIED.*

1.9 **[LOW]** WHEN a file whose name has no extension, several extensions, or an unexpected extension is uploaded THEN the object key extension is taken unvalidated from the original filename (`file.name.split(".").pop() ?? "jpg"`) while the content type comes from the blob, so the stored key can misdescribe the object.

**Admin authorization**

1.10 **[CRITICAL]** WHEN any authenticated user — including one holding only the default `user` role — requests `/admin/dashboard` directly THEN `_authenticated/route.tsx` `beforeLoad` performs only `supabase.auth.getUser()` with no role check, so the admin route loads and its admin queries fire; the only gate is a client-side render check inside the dashboard component.

1.11 **[HIGH]** WHEN a `manager` or `editor` signs in THEN `useAuth` queries `user_roles` for `role = 'admin'` only, so the dashboard renders "Admins only / Access denied" even though database policies already grant that user content rights.

1.12 **[HIGH]** WHEN the `user_roles` lookup in `useAuth` fails (offline, RLS, or transient error) THEN the error is discarded and `isAdmin` resolves to `false`, so a genuine admin is shown "Access denied" with no retry and no indication that the check itself failed.

1.13 **[HIGH]** WHEN `supabase.auth.getUser()` rejects in `useAuth` THEN the promise has no rejection handler, `loading` is never cleared, and the dashboard stays on "Loading…" indefinitely.

1.14 **[MEDIUM]** WHEN the session check in `_authenticated` `beforeLoad` fails for a transient reason THEN the failure is indistinguishable from "not signed in" and the user is redirected to `/admin/login` without the `next` parameter that the login route already supports, losing the intended destination.

**Security**

1.15 **[HIGH]** WHEN the repository is cloned THEN `.env` is tracked in Git (`git ls-files` returns it) containing `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` and their `VITE_` equivalents, `.gitignore` contains no env entry at all, there is no `.env.example`, and the required variables are undocumented. *VERIFIED. Also VERIFIED by import-graph grep: no service-role key is present in `.env`, and `client.server.ts` and `auth-middleware.ts` are imported by nothing, so no server secret currently reaches the browser bundle. The committed publishable credentials must still be treated as potentially compromised.*

1.16 **[HIGH]** WHEN an unauthenticated caller invokes `private.is_staff(uuid)`, `private.is_manager(uuid)` or `private.has_role(uuid, app_role)` with an arbitrary user id THEN the grants in `20260806143302` and `20260627101920` (`grant usage on schema private to anon` plus `grant execute … to anon`) allow it, exposing a role oracle for probing arbitrary accounts. *VERIFIED in migrations; live grant state NOT VERIFIED.*

1.17 **[MEDIUM]** WHEN a crawler fetches `robots.txt` THEN it is `User-agent: * / Allow: /` with no admin exclusion and no `Sitemap:` directive, so admin routes are crawlable apart from their per-route `noindex` meta and the existing `sitemap.xml` is undeclared.

**False success and ignored database errors**

1.18 **[HIGH]** WHEN `createEnquiry`, `logProductView`, `logAudit`, or the `media` delete inside `deleteProductImage` fails THEN the returned Supabase error is never inspected, so WhatsApp enquiry records, product-view records and audit entries can be lost with no signal anywhere.

1.19 **[HIGH]** WHEN one of the parallel updates in `reorderSections` fails THEN `Promise.all` results are discarded, the caller refreshes, and the section order silently reverts on refetch with no error shown.

1.20 **[MEDIUM]** WHEN two sibling collections share a `display_order` value — the seed in `20260802160613` assigns `99` to every category derived from `products.category` — and the admin clicks the up/down arrows THEN the swap writes identical values, nothing moves, and no message is shown; the same equal-value swap risk applies to hero banner `priority`.

1.21 **[MEDIUM]** WHEN an inline product switch (in-stock, published) is toggled THEN `patch` shows nothing on success and does not revert the switch on failure, so the admin cannot tell whether the change persisted.

1.22 **[MEDIUM]** WHEN a mutation targets a row that RLS excludes THEN the mutations issued without `.select()` — `softDeleteProduct`, `restoreProduct`, `purgeProduct`, `saveSettings`, `saveSection`, `saveBanner`, `deleteBanner`, `deleteCategory`, `updateEnquiry` — return no error and zero affected rows, and the caller reports "Moved to trash" / "Settings saved" / "Deleted" / "Notes saved" for an operation that changed nothing.

**Loading, empty and error states**

1.23 **[HIGH]** WHEN the media query fails (offline or RLS-denied) THEN the media panel renders `isLoading ? … : media.length === 0 ? "No media yet." : grid` with no `isError` branch, so a failed query is presented as a legitimately empty library.

1.24 **[HIGH]** WHEN any homepage query (products, categories, sections, banners, settings) fails THEN every hook defaults to `[]`/`null` and no `isError` is checked, so the homepage renders as a near-blank page — sections silently return `null` on empty data — with no error state and no retry.

1.25 **[HIGH]** WHEN the settings query fails THEN the settings panel renders "No settings row found.", reporting a load failure as a missing database row.

1.26 **[MEDIUM]** WHEN the enquiries, trash, categories, sections or banners query fails in the admin dashboard THEN each panel shows its empty-state copy or an empty list ("No enquiries yet.", "Trash is empty.", "No hero banners yet.", or no rows at all for collections), with no error state or retry.

**Product page and 404**

1.27 **[HIGH]** WHEN the product query fails (offline, RLS, or server error) THEN `product` is `undefined` and the route falls through to the "Piece not found" branch, telling the customer a product that exists has been removed and returning a 404-style page for a transient failure.

1.28 **[MEDIUM]** WHEN a product page is rendered THEN its head has no canonical link and no `og:image` (despite `twitter:card: summary_large_image`), no `Product` structured data, and the title/`og:title`/description are derived from the URL handle (`params.handle.replace(/-/g, " ")`) and generic copy rather than the real product record.

**Navigation**

1.29 **[HIGH]** WHEN a hero banner's `button_link` is any admin-entered value that does not start with `#` — an absolute URL, or a path that is not a registered route — THEN it is passed straight to a typed `<Link to={…}>`, producing a failed navigation or an error boundary instead of a working call to action.

1.30 **[MEDIUM]** WHEN a category is chosen from the header or footer while the `catalogue` homepage section is disabled THEN `selectCategory` sets state and scrolls to a ref that is not mounted, so the click produces no visible result and no feedback.

**Error handling**

1.31 **[MEDIUM]** WHEN a clipboard write fails (non-secure context or denied permission) THEN the media panel still shows "URL copied" because `navigator.clipboard.writeText` is called with no error handling, and the product page's `share()` falls through to `navigator.clipboard.writeText` with no catch, producing an unhandled rejection and a "Link copied" state that may be false.

1.32 **[LOW]** WHEN the enquiry insert inside `openProductEnquiry` fails THEN an empty `catch {}` discards it, so the loss is never reported even though `error-capture` / `lovable-error-reporting` infrastructure exists.

**Responsive and accessibility**

1.33 **[MEDIUM]** WHEN the hero slideshow is used on a touch device THEN the pagination controls are `h-1` (4px) targets, the 7-second autoplay never pauses on interaction, and `prefers-reduced-motion` is not respected.

1.34 **[MEDIUM]** WHEN the catalogue search suggestion list is open THEN it is a plain `ul` of buttons with no combobox roles, no `aria-expanded`, no arrow-key/Enter/Escape handling, no outside-click dismissal, and it remains open covering the results after a suggestion is selected (the chosen name still matches the query).

1.35 **[MEDIUM]** WHEN a keyboard or screen-reader user works through the site THEN icon-only admin controls (edit, delete, move up/down, copy URL, delete media) have no accessible names, hero background images use the banner title as `alt` for purely decorative imagery, the header logo `img` has `alt=""` with no accessible name for the brand, and admin form fields use `Label` elements not associated with their inputs.

1.36 **[MEDIUM]** WHEN the product page is viewed on a mobile viewport THEN the fixed bottom enquiry bar and the fixed WhatsApp floating button overlap each other and can obscure page content at the end of the scroll.

**SEO, assets and performance**

1.37 **[MEDIUM]** WHEN the product query inside the `sitemap.xml` handler fails THEN the error is ignored and a 200 response is returned containing only `/`, with `Cache-Control: public, max-age=3600`, so a truncated sitemap is published and cached.

1.38 **[LOW]** WHEN the repository is built THEN nine identical filenames exist in both `src/assets/` and `public/media/` (`category-bedroom|chairs|dining|office|outdoor|sofas|storage|tables.jpg`, `hero-luxury-living.jpg`) and neither set is referenced anywhere in `src/` (VERIFIED by grep), so 18 unreferenced image files ship with the project. *Whether any external or indexed URL points at `/media/*` is NOT VERIFIED.*

1.39 **[LOW]** WHEN modules are resolved THEN `src/lib/products-api.ts` + `src/lib/products-config.ts` form a second, unused upload/fetch implementation with no compression and no validation, and `src/integrations/supabase/client.server.ts` and `auth-middleware.ts` are referenced by nothing (VERIFIED), leaving divergent duplicate paths that a future change can accidentally adopt.

1.40 **[MEDIUM]** WHEN product cards and `AdaptiveImage` measure images THEN aspect ratio is set from state written in a `ref` callback during commit for already-complete images, forcing an extra render per image, and no intrinsic `width`/`height` or responsive `sizes` are supplied, so the grid shifts as images resolve and full-size uploads are served to every viewport.

**Logo**

1.41 **[HIGH]** WHEN the owner sets the site logo THEN the only control is a free-text "Logo URL" field in the settings panel — no upload, preview, replace, remove, or validation — and the header renders `<img src={settings.logo_url} alt="" className="h-9 w-auto" />` with no dimension guard and no `onError`, so a broken, oversized or wrong-ratio URL yields a broken or distorted header, the existing `NGMonogram` fallback is never reached once any value is stored, and the footer and metadata never use the logo at all.

**Verification ability**

1.42 **[MEDIUM]** WHEN any of the fixes above is made THEN there is no way to verify it: `package.json` scripts are only `dev`, `build`, `build:dev`, `preview`, `lint`, `format` — no test runner, no test files, and no typecheck script — so regressions in the upload pipeline, authorization gates and error states can only be caught by hand.

### Expected Behavior (Correct)

**Image upload and storage**

2.1 WHEN the schema is applied from `supabase/migrations/` alone and an admin uploads any image THEN the system SHALL have created the `product-images` bucket through a new append-only migration that is idempotent and safe if the bucket already exists on the live project, with settings consistent with the existing policies, and the upload SHALL succeed.

2.2 WHEN a signed-in user whose role is `manager` or `editor` uploads an image THEN the system SHALL apply storage write policies aligned with the staff model the database already enforces (`private.is_staff` for writes, `private.is_manager`/`admin` for destructive operations), granting no capability beyond what those existing roles already hold on the corresponding tables.

2.3 WHEN several files are selected in the media library and one fails part-way through THEN the system SHALL attempt every remaining file independently and SHALL report the exact number that succeeded and the number that failed, with the reason for each failure.

2.4 WHEN a selected file is not a supported image or exceeds the maximum size THEN the system SHALL reject that file before upload against an explicit allow-list (JPG/JPEG, PNG, WebP) and an explicit size limit, SHALL explain what to do instead, and SHALL leave every existing image untouched.

2.5 WHEN an image is removed from the product dialog THEN the system SHALL not destroy the stored object until the owning record has been persisted, SHALL leave the object intact if the dialog is cancelled, and SHALL report any deletion failure.

2.6 WHEN storage removal fails inside `deleteProductImage` THEN the system SHALL inspect the storage result, SHALL remove the `media` row only once the object is gone (or record it for reconciliation), and SHALL surface the failure instead of reporting success.

2.7 WHEN an image is uploaded from the product, category or hero-banner dialog, or deleted from a product THEN the system SHALL invalidate the media query so the library reflects the change immediately.

2.8 WHEN an upload succeeds THEN the system SHALL persist a durable reference to the object and derive display URLs from it, while every URL already stored and currently rendering SHALL continue to render unchanged.

2.9 WHEN a file whose name has no extension, several extensions, or an unexpected extension is uploaded THEN the system SHALL derive the object key extension from the validated MIME type of the uploaded bytes.

**Admin authorization**

2.10 WHEN any authenticated user without a staff role requests `/admin/dashboard` directly THEN the system SHALL deny access in the route guard before the admin route and its queries load, and SHALL redirect that user away from the admin area.

2.11 WHEN a `manager` or `editor` signs in THEN the system SHALL admit them to the dashboard according to the database's three-tier model and SHALL expose the panels their role can actually operate, preserving every capability the database already grants them; no role SHALL be removed or collapsed.

2.12 WHEN the role lookup fails THEN the system SHALL distinguish "this user has no staff role" from "the role check could not be completed", SHALL say which occurred, and SHALL offer a retry rather than asserting "Access denied".

2.13 WHEN `supabase.auth.getUser()` rejects THEN the system SHALL settle out of the loading state into an explicit error state with a retry, and SHALL never leave the dashboard on "Loading…" indefinitely.

2.14 WHEN the session check in the route guard fails for a transient reason THEN the system SHALL distinguish it from an absent session and SHALL preserve the intended destination via the existing validated `next` parameter when it does send the user to the login route.

**Security**

2.15 WHEN the repository is cloned THEN `.env` SHALL be untracked and ignored, a committed `.env.example` SHALL document every required variable, the previously committed credentials SHALL be recorded as potentially compromised with rotation noted, and the verified client/server split (no service-role key present, `client.server.ts` unreferenced) SHALL be preserved so no server secret can enter the browser bundle.

2.16 WHEN an unauthenticated caller invokes `private.is_staff`, `private.is_manager` or `private.has_role` THEN the system SHALL refuse execution, having revoked the `anon` grants in a new append-only migration, while every RLS policy that depends on those security-definer functions SHALL continue to evaluate correctly for `anon` and `authenticated` requests.

2.17 WHEN a crawler fetches `robots.txt` THEN the system SHALL disallow the admin paths and SHALL declare the existing `sitemap.xml`, without changing any public URL.

**False success and ignored database errors**

2.18 WHEN `createEnquiry`, `logProductView`, `logAudit`, or the `media` delete inside `deleteProductImage` fails THEN the system SHALL inspect the error and SHALL report it through the existing error-reporting infrastructure; where the customer must not be blocked, the failure SHALL still be recorded rather than discarded.

2.19 WHEN one of the parallel updates in `reorderSections` fails THEN the system SHALL detect the failed update and SHALL tell the admin that the new order was not applied.

2.20 WHEN two sibling collections or banners share an ordering value and the admin clicks up/down THEN the system SHALL produce a deterministic, persisted order change, and SHALL report explicitly when the reorder could not be applied.

2.21 WHEN an inline product switch is toggled THEN the system SHALL confirm the change on success and SHALL restore the previous switch position on failure, so the control always reflects persisted state.

2.22 WHEN a mutation affects zero rows because RLS excluded the target THEN the system SHALL treat that as a failure for every operation that must have changed a row, and SHALL never show "Moved to trash", "Settings saved", "Deleted", "Updated" or "Notes saved" for it.

**Loading, empty and error states**

2.23 WHEN the media query fails THEN the system SHALL render a distinct error state with a retry, clearly separate from the empty-library state.

2.24 WHEN any homepage query fails THEN the system SHALL render a distinct error state with a retry for the affected content, SHALL keep rendering the sections that did load, and SHALL never present a failure as an empty homepage.

2.25 WHEN the settings query fails THEN the system SHALL report a load failure with a retry, distinct from a genuinely missing settings row.

2.26 WHEN the enquiries, trash, categories, sections or banners query fails THEN each panel SHALL show an error state with a retry rather than its empty-state copy.

**Product page and 404**

2.27 WHEN the product query fails THEN the system SHALL show a load-failure state with a retry and SHALL reserve the "Piece not found" page for a product that genuinely does not exist or is not published, keeping the existing 404 copy and route unchanged.

2.28 WHEN a product page is rendered THEN the system SHALL emit a canonical link, an `og:image` drawn from the product's own image, `Product` structured data built from the real product record, and a title/description derived from the product's real name and copy — extending the existing meta rather than replacing it, and inventing no business details.

**Navigation**

2.29 WHEN a hero banner's `button_link` is an absolute URL, an in-page anchor, a registered internal path, or an unusable value THEN the system SHALL respectively open it as an external anchor, scroll to the anchor, navigate internally, or omit the call to action — and SHALL never break the slide or the route.

2.30 WHEN a category is chosen while the catalogue section is disabled THEN the system SHALL still land the user on a filtered view of that collection or SHALL give explicit feedback, never producing a silent no-op.

**Error handling**

2.31 WHEN a clipboard write fails THEN the system SHALL only confirm on actual success, SHALL handle the rejection, and SHALL offer a usable fallback (such as displaying the URL for manual copying).

2.32 WHEN the enquiry insert inside `openProductEnquiry` fails THEN the system SHALL still open WhatsApp for the customer and SHALL report the failure through the existing error-reporting infrastructure instead of discarding it.

**Responsive and accessibility**

2.33 WHEN the hero slideshow is used on a touch device THEN the system SHALL provide pagination controls meeting a minimum tap-target size, SHALL pause autoplay on interaction, and SHALL respect `prefers-reduced-motion` — with the hero's visual composition otherwise unchanged.

2.34 WHEN the catalogue search suggestion list is open THEN the system SHALL expose correct combobox semantics and state, SHALL support arrow-key navigation, Enter selection and Escape dismissal, and SHALL close on selection and on outside click so results are never obscured.

2.35 WHEN a keyboard or screen-reader user works through the site THEN every icon-only control SHALL have an accessible name, decorative imagery SHALL be marked decorative while meaningful imagery SHALL carry meaningful alt text, the brand mark SHALL have an accessible name, and every admin form field SHALL be programmatically associated with its label.

2.36 WHEN the product page is viewed on a mobile viewport THEN the system SHALL ensure the fixed enquiry bar and the floating WhatsApp button do not overlap each other or obscure page content, without changing the existing layout language.

**SEO, assets and performance**

2.37 WHEN the product query inside the `sitemap.xml` handler fails THEN the system SHALL not publish or cache a truncated sitemap, and SHALL surface the failure through error reporting.

2.38 WHEN the repository is built THEN the system SHALL keep exactly one copy of each shared image asset, retaining the `public/media/` paths that may be externally referenced, with no blind destructive cleanup of anything a production URL could depend on.

2.39 WHEN modules are resolved THEN the system SHALL retain a single upload/fetch implementation, and the unused duplicate modules SHALL be removed or clearly quarantined, leaving integration-managed generated files intact.

2.40 WHEN product cards and `AdaptiveImage` measure images THEN the system SHALL avoid the extra commit-time render and the resulting layout shift, and SHALL supply intrinsic sizing hints, while preserving the existing `object-contain` no-crop framing and clamped aspect ratios exactly.

**Logo**

2.41 WHEN the owner sets the site logo THEN the system SHALL let an admin upload, preview, replace and remove it through the same validated upload pipeline, SHALL persist the resulting URL in `site_settings`, SHALL recover cleanly from a failed upload without losing the previous logo, SHALL render it at a sensible maximum size in correct aspect ratio without distortion and responsively in the site header (and footer and branding metadata where appropriate) with a real accessible name, SHALL handle image load errors gracefully, and SHALL fall back to the existing `NGMonogram` whenever no valid logo is configured. The artwork SHALL be supplied at runtime through this admin flow; no committed binary SHALL be required.

**Verification ability**

2.42 WHEN any of the fixes above is made THEN the system SHALL provide a typecheck script and a working test setup appropriate to the stack, with tests that exercise the real application logic of the bugs fixed here — upload validation and batch reporting, authorization decisions, mutation error/zero-row handling, and loading-versus-empty-versus-error rendering — and not mocks asserting their own configured return values.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an anonymous visitor browses the site THEN the system SHALL CONTINUE TO show only active, non-deleted products, visible categories, enabled sections and active in-window banners.

3.2 WHEN an existing product URL `/product/{slug}` is requested THEN the system SHALL CONTINUE TO resolve the same slugs to the same products, with no route or URL changes anywhere in the app.

3.3 WHEN a page renders an image whose URL is already stored in the database THEN the system SHALL CONTINUE TO display it from that URL.

3.4 WHEN a customer taps Enquire on a card, the product page, the mobile bar, the promo section, the contact section or the floating button THEN the system SHALL CONTINUE TO open WhatsApp with the same message format, product link and image line, and SHALL CONTINUE TO record the enquiry.

3.5 WHEN a visitor uses the catalogue THEN the system SHALL CONTINUE TO apply the same search fields, collection/sub-collection, price, material, colour and availability filters, the same six sort options, the same 12-per-page "Load more", and the same clear/reset behaviour.

3.6 WHEN the homepage hero has multiple banners THEN the system SHALL CONTINUE TO rotate them on the existing 7-second cycle in priority order with working manual selection.

3.7 WHEN an admin soft-deletes, restores or purges a product THEN the system SHALL CONTINUE TO support the same trash workflow and counts.

3.8 WHEN an admin signs in, reloads, returns to a tab, or signs out THEN the system SHALL CONTINUE TO persist and refresh the session, revalidate the role on focus and on realtime role changes, and clear the session on sign-out.

3.9 WHEN a user holding the `admin` role uses the dashboard THEN the system SHALL CONTINUE TO grant full access to every panel and action available today.

3.10 WHEN database policies evaluate `admin`, `manager`, `editor` or `user` THEN the system SHALL CONTINUE TO honour the existing three-tier model, and every legitimate `manager`/`editor` capability already granted SHALL CONTINUE TO work.

3.11 WHEN an admin changes products, categories, sections, banners or settings THEN the system SHALL CONTINUE TO propagate the change to every open storefront surface through the existing single realtime channel, and SHALL CONTINUE TO remove its subscriptions on unmount.

3.12 WHEN an admin reorders or disables homepage sections THEN the system SHALL CONTINUE TO drive the homepage from `homepage_sections` order and `enabled` flags, rendering the same section types.

3.13 WHEN migrations are applied THEN the system SHALL CONTINUE TO apply the existing 18 files unmodified, with every correction added as a new append-only migration and no rewriting of migration history.

3.14 WHEN any page is viewed THEN the system SHALL CONTINUE TO present the existing colour palette, typography, spacing, card styling, hero composition and design-system components, with no redesign, no new gradients and no new animations.

3.15 WHEN metadata is emitted THEN the system SHALL CONTINUE TO serve the existing titles, descriptions, Open Graph and Twitter tags and the existing `FurnitureStore` structured data with the project's real business details (address, phone, founding year, opening hours) — none invented or altered.

3.16 WHEN `sitemap.xml` and `robots.txt` are fetched THEN the system SHALL CONTINUE TO serve them at the same paths, listing the same set of public URLs.

3.17 WHEN a product image is framed THEN the system SHALL CONTINUE TO use the shared `product-media` treatment that never crops or distorts furniture, with ratios clamped to the current range.

3.18 WHEN an unexpected error occurs THEN the system SHALL CONTINUE TO use the existing `error-capture`, `error-page` and `lovable-error-reporting` infrastructure and the existing root error and 404 components; none SHALL be deleted.

3.19 WHEN a product, category or banner has no usable image THEN the system SHALL CONTINUE TO fall back to the existing inline placeholder image.

3.20 WHEN an admin route is loaded or a login redirect is issued THEN the system SHALL CONTINUE TO mark admin pages `noindex,nofollow` and SHALL CONTINUE TO reject external or protocol-relative `next` values at the login route.

3.21 WHEN an enquiry is created or managed THEN the system SHALL CONTINUE TO allow anonymous insert of `new` enquiries only, and SHALL CONTINUE TO restrict reading, status changes and notes to manager-level roles.

3.22 WHEN a product page is viewed THEN the system SHALL CONTINUE TO log a view for published products only and SHALL CONTINUE TO increment `view_count` through the existing trigger.

3.23 WHEN no logo is configured THEN the system SHALL CONTINUE TO render the existing `NGMonogram` mark in the header, footer and about section.

3.24 WHEN the project is installed and run THEN the system SHALL CONTINUE TO work with Bun, the existing lockfile and the existing `dev`/`build`/`preview`/`lint`/`format` scripts, with no runtime dependencies added beyond what a fix strictly requires.
