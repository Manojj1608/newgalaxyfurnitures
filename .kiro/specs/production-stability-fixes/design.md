# Production Stability Fixes — Bugfix Design

## Overview

`bugfix.md` records 42 defects in a live, already-approved storefront. They are not 42 unrelated
bugs: they cluster into eight families, each with a single root cause and therefore a single fix
shape. This design specifies the smallest production-safe fix per family, the exact files touched,
and how each fix is verified.

The strategy has three properties:

1. **CRITICAL items land first and independently.** The bucket migration (1.1), the storage policy
   alignment (1.2) and the admin route guard (1.10) share no code with the long tail. They are
   shippable on their own, in that order, before anything else is touched.
2. **Every schema change is a new append-only migration.** Four new migrations. No existing
   migration file is edited (3.13).
3. **Additive over invasive.** New pure modules (`uploads.ts`, `links.ts`, `admin-guard.ts`,
   `query-state.tsx`) hold the new logic so it is unit-testable without a database, and existing
   components change by a few lines each. No stylistic refactors, no redesign (3.14).

Two facts constrain the design more than anything else in `bugfix.md`:

- **Live Supabase state is NOT VERIFIED.** Only an anon/publishable key exists in this sandbox. The
  actual existence of the `product-images` bucket, its public flag, and the currently-applied
  policies and grants cannot be read. Every migration is therefore written to be idempotent and
  safe against a live project whose state differs from the migration history, and every step whose
  correctness depends on live state is flagged so it is reported as NOT VERIFIED rather than
  claimed.
- **Nothing in this repo has been executed.** `node_modules` is absent and there is no test or
  typecheck script. All findings behind this design are static. Installing dependencies and
  standing up a test runner is part of the work (1.42), and it is sequenced first so the rest of
  the work can be verified at all.

## Glossary

- **Bug_Condition (C)**: the predicate identifying an input that triggers a defect. Stated per
  family in `isBugCondition` below; the WHEN clause of each section-1 clause in `bugfix.md` is the
  authoritative statement.
- **Property (P)**: the required behaviour for inputs satisfying C, given by the matching section-2
  clause.
- **Preservation**: behaviour that must be byte-for-byte identical before and after the fix for
  every input satisfying ¬C. Enumerated in section 3 of `bugfix.md`.
- **Staff model**: the three-tier role model the database already implements —
  `private.is_staff(uuid)` (`admin`|`manager`|`editor`) and `private.is_manager(uuid)`
  (`admin`|`manager`), both `SECURITY DEFINER` over `public.user_roles`.
- **`uploadProductImage`**: the single live upload function in `src/lib/content-api.ts` used by the
  product, category, banner and media panels. Compresses to WebP, uploads to `product-images`,
  signs a ~10-year URL, inserts a `media` row.
- **`deleteProductImage`**: the paired deletion function in `src/lib/content-api.ts`; currently
  removes the storage object without inspecting the result, then deletes the `media` row
  unconditionally.
- **`useAuth`**: the client hook in `src/hooks/use-admin.ts` that resolves `{loading, user,
  isAdmin}`; the only authorization signal the dashboard consumes today.
- **Signed URL**: a Storage URL of the form
  `/storage/v1/object/sign/product-images/<key>?token=<jwt>`, validated by its token. Distinct from
  a **public URL** (`/storage/v1/object/public/product-images/<key>`), which carries no token and
  is served only when the bucket's `public` flag is true.
- **Affected-rows failure**: a Supabase mutation that returns `error === null` while changing zero
  rows because RLS excluded every candidate row. Indistinguishable from success unless the
  statement carries a `.select()`.

## Bug Details

### Bug Condition

The defects share one meta-shape: **a failure boundary that is never inspected.** A bucket that was
never created, a policy that disagrees with the table policy beside it, a role check that asks the
wrong question, a mutation issued without `.select()`, a query whose `isError` is never read, a
`.catch(() => {})`. In every case the system continues past the boundary and reports the outcome as
if it had succeeded — to the admin as a success toast, to the customer as an empty page or a false
404.

Formally, the bug condition is the union of eight family predicates. An input satisfies C when it
crosses one of these boundaries and the boundary's failure is not surfaced.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT:  input of type { actor, operation, payload, liveState }
  OUTPUT: boolean

  // C1 — storage reachability and authorization (1.1, 1.2)
  storageBlocked :=
      operation IN UPLOAD_OPERATIONS
      AND ( NOT bucketExists('product-images', liveState)
            OR ( roleOf(actor) IN {'manager','editor'}
                 AND storageWritePolicyRequires('admin') ) )

  // C2 — upload pipeline integrity (1.3–1.9)
  uploadUnsafe :=
      operation IN UPLOAD_OPERATIONS
      AND ( batchHasPartialFailure(payload.files)      // reported as total success
            OR NOT mimeAllowListed(payload.file)
            OR payload.file.size > MAX_UPLOAD_BYTES
            OR objectKeyDerivedFromFilename(payload.file)
            OR deletionPrecedesRecordPersistence(operation)
            OR mediaRowDeletedDespiteStorageFailure(operation) )

  // C3 — admin authorization (1.10–1.14)
  authzWrong :=
      operation = 'ENTER_ADMIN'
      AND ( ( isAuthenticated(actor) AND NOT isStaff(actor) AND routeGuardAdmits(actor) )
            OR ( roleOf(actor) IN {'manager','editor'} AND NOT dashboardAdmits(actor) )
            OR roleLookupFailed(actor)          // rendered as "Access denied"
            OR sessionLookupRejected(actor) )   // never leaves "Loading…"

  // C4 — role oracle exposure (1.16)
  oracleOpen :=
      actor = 'anon' AND canExecute(actor, PRIVATE_ROLE_HELPERS)

  // C5 — false success (1.18–1.22)
  falseSuccess :=
      operation IN MUTATIONS
      AND ( ( affectedRows(operation) = 0 AND NOT operationInspectsAffectedRows(operation) )
            OR errorDiscarded(operation)
            OR ( operation IN REORDERS AND siblingsShareOrderValue(payload) ) )

  // C6 — failure rendered as emptiness (1.23–1.27)
  failureLooksEmpty :=
      queryFailed(operation)
      AND NOT rendersDistinctErrorState(operation)

  // C7 — unusable or silently dead interactions (1.29–1.31, 1.33–1.36, 1.41)
  interactionBroken :=
      ( operation = 'HERO_CTA'   AND NOT linkClassified(payload.button_link) )
      OR ( operation = 'PICK_CATEGORY' AND NOT catalogueMounted(liveState) )
      OR ( operation = 'COPY_URL'      AND clipboardRejected(liveState) )
      OR ( operation = 'SET_LOGO'      AND NOT validatedUploadFlowAvailable(liveState) )
      OR failsAccessibilityContract(operation)

  // C8 — published output built from an uninspected failure (1.37) or the URL (1.28)
  outputDerivedFromFailure :=
      ( operation = 'SITEMAP'      AND queryFailed(operation) AND responseStatus = 200 )
      OR ( operation = 'PRODUCT_HEAD' AND metadataDerivedFrom('url-handle') )

  RETURN storageBlocked OR uploadUnsafe OR authzWrong OR oracleOpen
         OR falseSuccess OR failureLooksEmpty OR interactionBroken
         OR outputDerivedFromFailure
END FUNCTION
```

`UPLOAD_OPERATIONS` = uploads from the product, category, hero-banner, homepage, media-library and
logo surfaces. `MUTATIONS` = the nine statements issued without `.select()` (`softDeleteProduct`,
`restoreProduct`, `purgeProduct`, `saveSettings`, `saveSection`, `saveBanner`, `deleteBanner`,
`deleteCategory`, `updateEnquiry`) plus `createEnquiry`, `logProductView`, `logAudit`,
`reorderSections`. `PRIVATE_ROLE_HELPERS` = `private.is_staff`, `private.is_manager`,
`private.has_role`.

### Examples

- **Bucket absent (1.1).** Apply `supabase/migrations/` to an empty project, sign in as `admin`,
  upload a JPEG. Expected: the image is stored and appears on the product. Actual: all 18 migration
  files contain zero `storage.buckets` writes, so the request targets a nonexistent bucket and
  `uploadProductImage` throws — no image can be added anywhere in the admin.
- **Role disagreement (1.2).** As `editor`, save a product with a new image. Expected: both the row
  and the image are written, since `products` accepts `private.is_staff`. Actual: the row write
  succeeds and the storage write is denied, because the storage INSERT policy from `20260627095713`
  requires `private.has_role(auth.uid(), 'admin')`. The admin sees a raw policy error.
- **Batch upload lies (1.3).** Select five files in the media library where the third exceeds the
  server limit. Expected: "2 uploaded, 3 failed" with reasons, or four uploaded and one reported.
  Actual: files 1–2 upload, file 3 throws, files 4–5 are never attempted, and the toast reads
  "5 file(s) uploaded".
- **Non-staff reaches admin (1.10).** Sign in as an account holding only the default `user` role and
  request `/admin/dashboard`. Expected: denied before the route loads. Actual: `beforeLoad` only
  calls `supabase.auth.getUser()`, so the route loads and its admin queries fire; the sole gate is a
  render-time `if (!isAdmin)` inside the dashboard component.
- **Manager locked out (1.11).** Sign in as `manager`. Expected: admitted to the panels the database
  already authorises. Actual: `useAuth` queries `user_roles` for `role = 'admin'` only, so the
  dashboard renders "Admins only / Access denied".
- **Role oracle (1.16).** With only the publishable key, call
  `private.is_staff('<any-user-uuid>')`. Expected: refused. Actual: `20260806143302` grants execute
  to `anon`, so any unauthenticated caller can probe whether an arbitrary account is staff.
- **False "Moved to trash" (1.22).** As a role RLS excludes from `products` UPDATE, delete a
  product. Expected: an error. Actual: `softDeleteProduct` carries no `.select()`, returns
  `error === null` with zero rows affected, and the panel toasts "Moved to trash" — the product is
  still published.
- **Failure as emptiness (1.23, 1.24).** Go offline and load the homepage, then the media panel.
  Expected: an error state with retry. Actual: every hook defaults to `[]`/`null` and no `isError`
  is read, so the homepage renders near-blank and the media library reads "No media yet."
- **False 404 (1.27).** Make the product query fail transiently on `/product/{existing-slug}`.
  Expected: a load-failure state with retry. Actual: `product` is `undefined` and the route falls
  through to "Piece not found", telling the customer a product that exists was removed.
- **Equal ordering values (1.20).** The seed in `20260802160613` assigns `display_order = 99` to
  every category derived from `products.category`. Click ↑ on such a collection. Expected: it moves.
  Actual: the two-row swap writes 99 and 99, nothing moves, nothing is reported.
- **Edge case — signed URLs already in the database (1.8, 2.8).** Every currently-rendering image
  URL is a ~10-year signed URL persisted into `products.images`, `media.url`,
  `categories.thumbnail_url`/`banner_url` and `hero_banners.image_url`. Expected behaviour after the
  fix: these rows are never rewritten and every one keeps rendering, while *new* uploads stop
  depending on the signing key.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Anonymous browsing returns exactly the same row sets: active non-deleted products, visible
  categories, enabled sections, active in-window banners (3.1).
- Every existing `/product/{slug}` URL resolves to the same product; no route or URL changes
  anywhere (3.2, 3.16).
- Every image URL already stored in the database keeps rendering from that URL, with no row
  rewritten and no backfill (3.3).
- WhatsApp enquiry behaviour is identical: same message format, product link and image line, from
  cards, product page, mobile bar, promo, contact and the floating button; the enquiry is still
  recorded (3.4).
- Catalogue search fields, collection/sub-collection, price, material, colour and availability
  filters, all six sort options, the 12-per-page "Load more", and clear/reset all behave identically
  (3.5).
- Hero rotation stays on the 7-second cycle in priority order with working manual selection (3.6).
- Trash workflow and counts, session persistence, focus revalidation, realtime role changes and
  sign-out are unchanged (3.7, 3.8).
- `admin` retains full access to every panel and action available today; no role is removed or
  collapsed (3.9, 3.10).
- The single realtime channel keeps propagating admin changes to every storefront surface and keeps
  removing its subscriptions on unmount (3.11).
- The homepage is still driven by `homepage_sections` order and `enabled` flags, rendering the same
  section types (3.12).
- The existing 18 migrations apply unmodified (3.13).
- Colour palette, typography, spacing, card styling, hero composition and design-system components
  are unchanged; no new gradients, no new animations (3.14).
- Existing titles, descriptions, OG/Twitter tags and the `FurnitureStore` structured data keep the
  project's real business details, none invented or altered (3.15).
- The shared `product-media` no-crop framing and clamped ratios are preserved exactly (3.17).
- `error-capture`, `error-page`, `lovable-error-reporting`, the root error component and the 404
  component all survive and stay in use (3.18).
- The inline `PLACEHOLDER_IMAGE` fallback still applies to imageless products, categories and
  banners (3.19).
- Admin pages stay `noindex,nofollow`, and the login route keeps rejecting external and
  protocol-relative `next` values (3.20).
- Enquiries keep anon-insert-`new`-only, with reads/status/notes restricted to manager level (3.21).
- Product views are logged for published products only and still increment via the existing trigger
  (3.22).
- `NGMonogram` still renders in header, footer and about when no logo is configured (3.23).
- Bun, the existing lockfile and the existing `dev`/`build`/`preview`/`lint`/`format` scripts keep
  working; no runtime dependency is added unless a fix strictly requires it (3.24).

**Scope:**

All inputs that do NOT satisfy any family predicate must be completely unaffected. This includes:

- Anonymous storefront reads of products, categories, sections, banners and settings.
- Any already-persisted image URL, signed or otherwise.
- Any mutation by an `admin` that already succeeds today.
- Every filter, sort, search, pagination, hero rotation and trash/restore interaction.
- All existing metadata, routes and the visual identity of every page.

The correct behaviour required for inputs that DO satisfy the bug condition is specified in the
Correctness Properties section below and in section 2 of `bugfix.md`.

## Hypothesized Root Cause

Based on static inspection of the working tree and all 18 migrations, the likely causes are:

1. **Storage was configured through the Supabase dashboard, not through migrations.** Policies
   referencing `bucket_id = 'product-images'` were written in `20260626155029` while the bucket
   itself was created out-of-band, so migration history is not a complete description of the
   project. This explains 1.1 and predicts that the live bucket probably *does* exist — which is
   why the fix must be idempotent rather than a plain `INSERT`.
2. **The role model was widened after the storage policies were written.** `20260626155029` and
   `20260627095713` predate the three-tier model introduced in `20260802160613`, which added
   `is_staff`/`is_manager` and rewrote the *table* policies while leaving the four *storage*
   policies on `has_role(..., 'admin')`. `useAuth` was written against the same pre-widening
   assumption. One migration widened the model; the two places that hardcoded `admin` were not
   revisited. This is the shared cause of 1.2 and 1.11.
3. **Grants were added reactively to clear a runtime error.** `20260627101920` and `20260806143302`
   grant `anon` both `USAGE ON SCHEMA private` and `EXECUTE` on the role helpers. Nothing in the
   storefront calls these functions directly; they are only referenced inside RLS policies. The
   grants exist because the public-read policies reference the helpers and anonymous reads failed
   without them. The oracle (1.16) is collateral damage from fixing that error at the grant level
   instead of at the policy level — which is precisely where this design fixes it.
4. **Supabase's result shape makes success the default.** `{data, error}` requires opting in to
   failure detection, and a statement without `.select()` cannot report affected rows at all. Code
   written in the fast path — `await supabase.from(...).update(...)` followed by
   `toast.success(...)` — is silently correct only while RLS never excludes the target row. This is
   the single cause behind all of 1.18–1.22.
5. **TanStack Query's defaulted destructuring hides `isError`.** `const { data: media = [] } =
   useMedia()` makes a failed query structurally identical to an empty one at every call site. The
   `= []` / `= null` defaults are the direct cause of 1.23–1.27; no call site reads `isError`.
6. **`ssr: false` on the `_authenticated` route means `beforeLoad` is not a server boundary.** The
   guard was treated as authorization when it can only be a UI gate, and the real authorization
   (RLS) was never mirrored into it. This is the cause of 1.10 and constrains what the fix can
   honestly claim.
7. **Two upload implementations diverged.** `src/lib/products-api.ts` + `products-config.ts` form an
   older, unreferenced copy without compression or validation. Its existence (1.39) makes it likely
   that validation was intended in one path and never added to the other, and is why the fix
   consolidates rather than patches twice.

## Correctness Properties

Property 1: Bug Condition — Storage is reachable and writable by every role the tables already trust

_For any_ upload input where the bug condition holds (the bucket is absent, or the actor holds
`manager`/`editor` while the storage write policy demands `admin`), the fixed system SHALL have
created the `product-images` bucket idempotently through a new append-only migration and SHALL gate
storage writes on `private.is_staff` and destructive storage operations on `private.is_manager`, so
that the upload succeeds for exactly the roles that already hold the corresponding table rights and
for no others.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Uploads validate, report per file, and never destroy data early

_For any_ set of selected files, the fixed system SHALL accept a file only if its MIME type is in
{`image/jpeg`, `image/png`, `image/webp`} and its size is within the cap; SHALL attempt every
remaining file independently and report the exact succeeded and failed counts with a reason per
failure; SHALL derive the object key from the validated MIME type of the uploaded bytes rather than
the filename; SHALL not remove a storage object before the owning record is persisted; and SHALL NOT
delete a `media` row when the storage removal failed.

**Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7, 2.9**

Property 3: Bug Condition — Stored URLs keep rendering while new uploads stop depending on signing

_For any_ image URL already persisted in `products.images`, `media.url`,
`categories.thumbnail_url`/`banner_url` or `hero_banners.image_url`, the fixed system SHALL continue
to render it from that same URL with no row rewritten, while _for any_ new upload it SHALL persist a
durable reference not bound to the signing key or a TTL ceiling.

**Validates: Requirements 2.8**

Property 4: Bug Condition — Admin access is decided by the staff model, and an undecidable check says so

_For any_ actor requesting an admin route, the fixed system SHALL deny non-staff actors in the route
guard before the admin route and its queries load; SHALL admit `admin`, `manager` and `editor`
according to the database's three-tier model and expose the panels their role can operate; SHALL
distinguish "no staff role" from "the role check could not be completed" and offer a retry for the
latter; SHALL always settle out of the loading state when `getUser()` rejects; and SHALL preserve
the intended destination through the login route's existing validated `next` parameter.

**Validates: Requirements 2.10, 2.11, 2.12, 2.13, 2.14**

Property 5: Bug Condition — The role helpers are not callable by `anon`, and anonymous reads are unchanged

_For any_ invocation of `private.is_staff`, `private.is_manager` or `private.has_role` by `anon`, the
fixed system SHALL refuse execution, while _for any_ anonymous read of `products`, `categories`,
`homepage_sections` or `hero_banners` it SHALL return exactly the row set returned before the fix.

**Validates: Requirements 2.16, 2.17**

Property 6: Bug Condition — No operation reports success it cannot demonstrate

_For any_ mutation that must have changed a row, the fixed system SHALL detect zero affected rows and
treat it as a failure, never showing "Moved to trash", "Settings saved", "Deleted", "Updated" or
"Notes saved" for it; SHALL inspect and report the errors from `createEnquiry`, `logProductView`,
`logAudit` and `reorderSections` through the existing error-reporting infrastructure; SHALL produce a
deterministic persisted order change even when siblings share an ordering value; and SHALL restore an
inline switch to its previous position when its write fails.

**Validates: Requirements 2.18, 2.19, 2.20, 2.21, 2.22**

Property 7: Bug Condition — A failed read is never rendered as an empty one

_For any_ query that fails, the fixed system SHALL render a distinct error state with a retry —
separate from that surface's empty state — for media, homepage content, settings, enquiries, trash,
categories, sections, banners and the product page; SHALL keep rendering the homepage sections that
did load; and SHALL reserve "Piece not found" for a product that genuinely does not exist or is not
published.

**Validates: Requirements 2.23, 2.24, 2.25, 2.26, 2.27**

Property 8: Bug Condition — Published output is built from real records, never from a swallowed failure

_For any_ product page render, the fixed system SHALL emit a canonical link, an `og:image` from the
product's own image, `Product` structured data and a title/description derived from the real product
record, inventing no business detail; and _for any_ `sitemap.xml` request whose query fails, it SHALL
NOT return or cache a truncated 200 response, reporting the failure instead.

**Validates: Requirements 2.28, 2.37**

Property 9: Bug Condition — Interactions either work or say why

_For any_ hero `button_link`, the fixed system SHALL open an absolute URL externally, scroll to an
in-page anchor, navigate a registered internal path, or omit the call to action — never breaking the
slide or the route; SHALL land a category selection on a filtered view or give explicit feedback;
SHALL confirm a clipboard write only on actual success and offer a manual-copy fallback; SHALL meet
the stated tap-target, reduced-motion, combobox-semantics, accessible-name and mobile-overlap
contracts; and SHALL let an admin upload, preview, replace and remove the logo through the validated
upload path, rendering it undistorted with a real accessible name and falling back to `NGMonogram`
whenever no valid logo is configured.

**Validates: Requirements 2.29, 2.30, 2.31, 2.32, 2.33, 2.34, 2.35, 2.36, 2.41**

Property 10: Bug Condition — The fixes are verifiable

_For any_ fix in this spec, the fixed system SHALL provide a typecheck script and a test script whose
tests exercise the real exported application logic of that fix — upload validation, batch result
accounting, zero-rows detection, role gating, error-versus-empty state selection and link
classification — and SHALL contain no test that configures a mock and then asserts the mock returned
its configured value.

**Validates: Requirements 2.42, 2.38, 2.39, 2.40, 2.15**

Property 11: Preservation — Every input outside the bug condition behaves identically

_For any_ input where the bug condition does NOT hold, the fixed system SHALL produce the same result
as the original system, preserving anonymous row sets, product URLs and slugs, already-stored image
URLs, WhatsApp message format and enquiry recording, catalogue filters/sorts/pagination, hero
rotation, trash/restore, session persistence and sign-out, full `admin` capability, the three-tier
policy model, realtime propagation, homepage section ordering, the existing 18 migrations, the visual
identity and design system, existing metadata and structured data, the `product-media` framing, the
error-reporting infrastructure, the placeholder fallback, `noindex` on admin routes and `next`
validation, enquiry insert restrictions, view logging, the `NGMonogram` fallback, and the existing
Bun scripts.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 3.20, 3.21, 3.22, 3.23, 3.24**


## Fix Implementation

### Sequencing

Work is grouped so that the CRITICAL items land first and depend on nothing else. Each phase is
independently shippable.

| Phase | Contents | Defects | Depends on |
|---|---|---|---|
| **0 — Enablement** | Install deps, vitest + `typecheck`/`test` scripts, untrack `.env`, add `.env.example` | 1.42, 1.15 | — |
| **1 — CRITICAL** | Bucket migration; storage policy alignment; route guard enforces staff | 1.1, 1.2, 1.10 | Phase 0 for verification only |
| **2 — Authz + oracle** | Role-split public-read policies then revoke `anon`; `useAuth` rewrite | 1.16, 1.11–1.14 | Phase 1 (guard shares `deriveAccess`) |
| **3 — Upload pipeline** | Shared validated upload path; deletion ordering; media invalidation; delete dead duplicate | 1.3–1.9, 1.39 | Phase 1 (bucket must exist) |
| **4 — False success** | `.select()` + zero-rows detection; error propagation; order normalisation migration; switch revert | 1.18–1.22 | Phase 0 |
| **5 — States** | loading/empty/error separation across admin + homepage + product page | 1.23–1.27 | Phase 0 |
| **6 — Logo** | Admin upload/preview/replace/remove + constrained rendering + fallback | 1.41 | Phase 3 |
| **7 — Long tail** | Navigation, clipboard, a11y/responsive, SEO/robots/sitemap, assets, performance | 1.17, 1.28–1.40 | Phase 0 |

Phases 1 and 2 must ship in that order: the guard change is safe on its own, but the `anon`
revocation must not precede the policy split it depends on (both inside one migration, one
transaction).

---

### Decision 1 — Storage bucket migration: create `product-images`, public, no row rewrites

**File:** new `supabase/migrations/<ts>_create_product_images_bucket.sql`

**Public vs private — the decision and why.** The bucket is created **public**. The reasoning turns
on three verified facts:

1. **A signed URL's validity does not depend on the bucket's `public` flag.** Signed URLs are served
   from `/storage/v1/object/sign/...` and authorised by their token. Flipping `public` to true does
   not invalidate them. So every already-persisted ~10-year signed URL keeps resolving — 2.8 and 3.3
   are satisfied with **zero row rewrites**.
2. **A public bucket grants no read access that is not already granted.** `20260626155029` created
   `"Public can view product images" ON storage.objects FOR SELECT TO anon, authenticated USING
   (bucket_id = 'product-images')`. The cleanup loop in `20260627095713` drops only policies whose
   qual matches `%has_role%`, so this policy survives, and `20260627095713` additionally adds
   `"Authenticated can read product images"`. Anonymous read of every object in this bucket is
   therefore **already permitted today**. `public = true` changes the URL *shape* available, not the
   audience. There is no confidentiality regression, and the bucket holds only public storefront
   imagery.
3. **Only a public bucket lets new uploads escape the signing key.** Defect 1.8 is that stored URLs
   are bound to the JWT signing secret and a TTL ceiling. `getPublicUrl` is a pure client-side string
   construction (no network, no token) and its output never expires, so with `public = true` new
   uploads can persist a durable URL.

**The tradeoff, stated.** A *private* bucket would keep new uploads on signed URLs and leave 1.8
unfixed — the defect would survive the fix. A *public* bucket cannot break existing signed URLs
(fact 1) and cannot broaden the read audience (fact 2). Public is therefore strictly better here, and
the choice that preserves live rendering. If the live bucket turns out to be private *and* the
`"Public can view product images"` policy has been removed out-of-band, then anonymous rendering
today must already be relying on signed tokens alone; `public = true` still does not break that.

**Forward path that rewrites nothing.** Object keys are already persisted alongside URLs for products
(`ProductImage = {url, path}`) and media (`media.path`).

- New uploads persist a public URL derived from the key; the key itself remains the durable
  reference.
- Existing rows are **not** backfilled and **not** rewritten. Legacy signed URLs continue to render
  from the same strings.
- Consequence: for a transition period both URL forms coexist in the database. Both resolve. Nothing
  in the render path branches on which form a URL takes, so no code change is needed to read them.
- A one-off reconciliation that re-derives public URLs for legacy rows is **explicitly out of scope**:
  it would rewrite production rows to fix a defect that is not user-visible, against a live state
  that is NOT VERIFIED. It is recorded here as deliberately deferred.

**Migration shape:**

```
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, <MAX_UPLOAD_BYTES>,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
```

Idempotent and safe whether or not the bucket exists on the live project. `allowed_mime_types` mirrors
the client allow-list from Decision 5 so the server enforces the same contract; it applies to new
uploads only and cannot affect objects already stored.

**NOT VERIFIED:** bucket existence, its current `public` flag, its current limits, and whether the
four storage policies are actually applied on the live project. All are unreadable with an anon key.
This migration's effect on production must be reported as NOT VERIFIED until run against the live
project (or a branch/shadow database).

**Verification:** apply all migrations to a clean local/branch database; assert one row in
`storage.buckets` with `public = true` and the expected limits; run the migration twice and assert the
second run is a no-op. Then, in the admin, upload a JPEG/PNG/WebP and confirm it renders, and confirm
a pre-existing signed URL still renders on the same page.

---

### Decision 2 — Storage policy alignment to the staff model

**File:** new `supabase/migrations/<ts>_align_storage_policies_to_staff_model.sql`

Drop and recreate the three storage write policies from `20260627095713`, replacing
`private.has_role(auth.uid(), 'admin')` with the staff model:

| Operation | Old predicate | New predicate | Rationale |
|---|---|---|---|
| INSERT | `has_role(...,'admin')` | `private.is_staff(auth.uid())` | Mirrors `"Staff can insert products"`, `"Staff can insert media"`, `"Staff can insert categories"`, `"Staff can insert banners"` |
| UPDATE | `has_role(...,'admin')` | `private.is_staff(auth.uid())` | Mirrors the matching `"Staff can update …"` table policies |
| DELETE | `has_role(...,'admin')` | `private.is_manager(auth.uid())` | Mirrors `"Managers can delete products/media/categories/sections/banners"` |

Every predicate is copied from a policy that already governs the corresponding table, so no actor
gains a capability it does not already hold on the owning row. `editor` gains image write — which it
needs, because it can already write the `products`/`media` rows that reference the image — and does
**not** gain image delete, matching its lack of table DELETE. `admin` is unaffected (3.9); it
satisfies both `is_staff` and `is_manager`. The two SELECT policies are left untouched, so read
behaviour is unchanged.

Uses `drop policy if exists` before each `create policy` so the migration is idempotent and tolerates
a live project whose policy set differs from history.

**NOT VERIFIED:** live policy state. **Verification:** on a branch database, seed one user per role and
assert INSERT/UPDATE succeeds for all three staff roles, DELETE succeeds for `admin`/`manager` and is
denied for `editor`, and every operation is denied for a plain `user` and for `anon`.

---

### Decision 3 — Revoking `anon` from the role helpers without breaking the storefront

**File:** new `supabase/migrations/<ts>_split_public_read_policies_and_revoke_anon_private.sql`

This is the highest-risk item in the spec and the reasoning must be explicit, because a naive
revocation would take the public storefront down.

**Why a bare revoke is unsafe.** RLS policy expressions are inlined into the querying statement and
evaluated **with the privileges of the querying role**. `SECURITY DEFINER` governs what the function
body may touch once it runs; it does not exempt the *caller* from needing `EXECUTE`. So a role that
queries a table whose policy calls a function needs `EXECUTE` on that function. Four policies that
`anon` evaluates call `private.is_staff` (verified by grep across all 18 migrations):

- `products` — `"Public can view published products"`: `USING ((status = 'active' AND deleted_at IS NULL) OR private.is_staff(auth.uid()))`
- `categories` — `"Public can view visible categories"`: `USING (visible = true OR private.is_staff(auth.uid()))`
- `homepage_sections` — `"Public can view sections"`: `USING (enabled = true OR private.is_staff(auth.uid()))`
- `hero_banners` — `"Public can view active banners"`: `USING (active = true OR private.is_staff(auth.uid()))`

The `OR` does not rescue us: privilege checks on a referenced function are not skipped by runtime
short-circuiting. This also explains *why* the grants in `20260627101920`/`20260806143302` exist —
they were almost certainly added to clear `permission denied for function` on anonymous reads.
Revoking them alone would reintroduce exactly that failure and blank the storefront (a 3.1/3.2
regression far worse than the oracle).

**The fix: remove `anon`'s need to call the helpers, then revoke.** Split each of the four policies by
role. This is sound because **`is_staff` is provably `false` for `anon`**: an anonymous request has no
`auth.uid()`, so `private.is_staff(NULL)` evaluates `EXISTS (SELECT 1 FROM user_roles WHERE user_id =
NULL AND …)`, which is always false. Therefore `X OR is_staff(auth.uid()) ≡ X` for `anon`, and an
anon-only policy carrying just `X` returns an **identical row set**.

```
-- per table: anon gets the staff-free predicate, authenticated keeps the full one
create policy "Anon can view published products" on public.products
  for select to anon using (status = 'active' and deleted_at is null);

drop policy if exists "Public can view published products" on public.products;
create policy "Authenticated can view published products" on public.products
  for select to authenticated
  using ((status = 'active' and deleted_at is null) or private.is_staff(auth.uid()));

-- …the same split for categories (visible), homepage_sections (enabled), hero_banners (active)

revoke execute on function private.is_staff(uuid) from anon;
revoke execute on function private.is_manager(uuid) from anon;
revoke execute on function private.has_role(uuid, public.app_role) from anon;
revoke usage on schema private from anon;
```

Ordering matters and all of it runs in **one transaction**: the anon-only policies are created before
the combined policies are dropped, and the revokes come last, so there is no window in which
anonymous reads are unserved. Grants to `authenticated` and `service_role` are retained — the
authenticated policies still need them.

**Conclusion on the stated question.** Revoking `anon` is safe **only after** this policy split; it is
not safe on its own. The split is also the robust choice under uncertainty: if PostgreSQL did not in
fact require caller `EXECUTE` for policy-referenced functions, the split is a harmless no-op with an
identical row set either way. The design therefore does not depend on resolving that ambiguity.
Security is strengthened (the oracle closes, `anon` loses schema `private` entirely) and no policy
predicate is weakened.

**NOT VERIFIED:** live grant and policy state. **Verification:** on a branch database, (a) with the anon
key, assert `select` on all four tables returns the same rows and counts as before the migration; (b)
assert a direct anon `rpc`/`select private.is_staff(...)` now fails with `permission denied`; (c) as
`admin`, assert draft/hidden/deleted products, hidden categories, disabled sections and inactive
banners are still visible. A post-deploy anon-key smoke check over these four tables is required
before the change is called done, and must be reported as NOT VERIFIED until it runs against
production.

---

### Decision 4 — Route authorization and `useAuth`

**Files:** `src/routes/_authenticated/route.tsx` (minimal edit), new `src/lib/admin-guard.ts`,
`src/hooks/use-admin.ts`, `src/routes/_authenticated/admin.dashboard.tsx`

**Handling the `ssr: false` + "integration-managed" constraints.** The file carries a
`// This file is integration-managed.` header and sets `ssr: false`. Two consequences drive the
design:

- **`beforeLoad` runs client-side only, so it cannot be a security boundary.** The design does not
  claim server-side enforcement. The authoritative boundary remains RLS, which is exactly what
  Decisions 2 and 3 harden. The guard's job is what 2.10 actually asks for: deny access *before the
  admin route and its queries load*. `ssr: false` is **kept** — enabling SSR here would require the
  Supabase client to read auth cookies server-side, which risks session persistence (3.8) and is far
  outside "smallest production-safe fix".
- **The managed file is edited as little as possible.** All logic goes into a new, unmanaged
  `src/lib/admin-guard.ts`; `route.tsx` keeps its header, its `ssr: false` and its shape, and its
  `beforeLoad` body becomes a call into the guard. If the integration regenerates the file, one small
  call is lost rather than a block of authorization logic, and the logic itself stays unit-testable
  without a router.

`src/lib/admin-guard.ts` exports two pure-ish pieces:

```
type Access =
  | { status: 'anonymous' }
  | { status: 'error'; message: string }   // check could not be completed
  | { status: 'denied'; user: User }       // authenticated, no staff role
  | { status: 'ready'; user: User; roles: AppRole[]; isAdmin; isManager; isStaff }

deriveAccess(user, roles, lookupError): Access   // pure — unit tested
loadAccess(): Promise<Access>                    // getUser + user_roles, both errors inspected
```

`isStaff`/`isManager` mirror the SQL helpers exactly (`admin|manager|editor`, `admin|manager`), so the
UI and the database agree by construction.

`beforeLoad` then:

- `status: 'ready'` → return `{ user, roles }` as route context; admin queries proceed.
- `status: 'anonymous'` or `'denied'` → `throw redirect({ to: '/admin/login', search: nextFor(location) })`.
  `nextFor` reuses the login route's existing validation contract (`startsWith('/')` and
  `!startsWith('//')`) so no external or protocol-relative value is ever produced (3.20, 2.14).
- `status: 'error'` → **do not** redirect. A transient failure is not an absent session (1.14); throw
  so the route's existing `errorComponent` (already a `luxury-card` with a Retry button) renders. No
  new markup, no destination lost.

**`useAuth` rewrite (1.11–1.14).** Returns the same `Access` union plus a `retry()`:

- queries **all** roles for the user (`select role from user_roles where user_id = ...`) instead of
  filtering `role = 'admin'`, so managers and editors resolve correctly (1.11);
- inspects the lookup `error` and resolves `status: 'error'` rather than collapsing to
  `isAdmin: false` (1.12);
- attaches a rejection handler to `supabase.auth.getUser()` so a rejected promise settles into
  `status: 'error'` and never leaves the dashboard on "Loading…" (1.13);
- keeps, unchanged: the `onAuthStateChange` subscription and its event list, the `user_roles`
  realtime channel, focus revalidation, the `mounted` guard and all cleanup (3.8, 3.11).

**Dashboard (`admin.dashboard.tsx`).** The existing "Access denied / Admins only" card is kept
verbatim and now renders for `status: 'denied'` only. A new sibling card — built from the same
`luxury-card` + `text-destructive` + `Button` primitives already used by this file's `errorComponent`,
so no new design language — renders for `status: 'error'` with a Retry wired to `retry()`. Tabs are
filtered by capability: Products / Collections / Homepage / Media require `isStaff`; Enquiries and
Settings require `isManager` (matching `"Managers can view enquiries"` and the manager-level intent of
settings writes). `admin` sees every tab exactly as today (3.9).

**Verification:** unit tests over `deriveAccess` for the matrix {anonymous, lookup error, no roles,
`user`, `editor`, `manager`, `admin`} × expected status and tab set; a test that a rejected `getUser()`
yields `status: 'error'`; and manual checks that a `user`-only account is bounced from
`/admin/dashboard` before any admin query fires (visible as zero admin requests in the network panel),
that an `editor` sees the staff tabs, and that sign-out and reload still behave as before.

---

### Decision 5 — One shared, validated upload path

**Files:** new `src/lib/uploads.ts`, new `src/hooks/use-image-upload.ts`,
`src/lib/content-api.ts`, `src/components/admin/media-panel.tsx`,
`src/components/admin/products-panel.tsx`, `src/components/admin/categories-panel.tsx`,
`src/components/admin/homepage-panel.tsx`, `src/components/admin/settings-panel.tsx`;
**deleted:** `src/lib/products-api.ts`, `src/lib/products-config.ts`

`src/lib/uploads.ts` holds the whole contract as pure, dependency-free functions:

```
ALLOWED_IMAGE_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
MAX_UPLOAD_BYTES   = 10 * 1024 * 1024

validateUploadFile(file) -> { ok: true } | { ok: false; code: 'mime' | 'size' | 'empty'; message }
extensionForMime(mime)   -> 'jpg' | 'png' | 'webp'
buildObjectKey(mime)     -> `${crypto.randomUUID()}.${extensionForMime(mime)}`
summarise(results)       -> { succeeded, failed, message }   // the toast copy
```

Design points:

- **MIME allow-list + size cap (1.4, 2.4).** Validation happens before any network call, per file, and
  produces an actionable message ("PNG, JPG or WebP only" / "Must be under 10 MB"). The bucket's
  `allowed_mime_types` and `file_size_limit` from Decision 1 enforce the same contract server-side.
  Rejected files leave every existing image untouched.
- **Keys never derive from filenames (1.9, 2.9).** `buildObjectKey` takes only the validated MIME of
  the bytes actually being uploaded — after compression, that is the *blob's* type, not the original
  file's. Filenames with spaces, `#`, `?`, Unicode, multiple extensions, no extension, or duplicate
  names are all structurally irrelevant: the key is a UUID plus a derived extension. The original name
  is still recorded as `media.alt` exactly as today.
- **Independent per-file batch results (1.3, 2.3).** `uploadImages(files)` wraps each file in its own
  `try`/`catch` so one failure never aborts the remainder, and returns
  `{ succeeded: ProductImage[], failed: { name, reason }[] }`. Call sites report
  `summarise(...)` — "3 uploaded · 2 failed" plus each reason — never `files.length`. A `retry(failed)`
  path re-attempts only the failures.
- **Deletion ordering (1.5, 2.5).** `removeImage` in the product dialog stops calling
  `deleteProductImage`. It only mutates form state and pushes the object key onto a local
  `pendingDeletions` list. Objects are deleted **after** `saveProduct` resolves. Cancelling the dialog
  discards the list and leaves every object intact. Deletion failures are reported, not swallowed.
- **Storage failure blocks the row delete (1.6, 2.6).** `deleteProductImage` inspects the `.remove()`
  result: on error it throws and the `media` row is **left in place** (no orphaned object without a
  record); a "not found" result is treated as already-deleted so the call stays idempotent. Only once
  the object is gone is the `media` row deleted, and that result is inspected too (1.18). If the row
  delete fails after the object is gone, the mismatch is recorded via `logAudit('orphan', 'media', …)`
  for reconciliation and surfaced to the admin — no new table, no background job.
- **Media invalidation (1.7, 2.7).** `use-image-upload.ts` owns the mutation and invalidates
  `contentKeys.media()` on both upload and delete. Every panel — products, categories, banners,
  homepage, media, logo — goes through this hook, so the library can no longer go stale.
- **One implementation (1.39, 2.39).** `src/lib/products-api.ts` and `src/lib/products-config.ts` are
  deleted; grep confirms nothing imports them. `src/integrations/supabase/client.server.ts` and
  `auth-middleware.ts` are integration-managed and referenced only from a comment; they are **kept**
  and marked with a quarantine note rather than deleted, per 2.39's instruction to leave
  integration-managed generated files intact. This preserves the verified property that no
  service-role key reaches the browser bundle.

`compressImage` keeps its current behaviour (max side 1800, WebP q0.82, fall back to the original when
compression does not help) and now runs only after validation passes.

**Verification:** unit tests over `validateUploadFile` (each allowed MIME, a disallowed MIME, an
oversize file, a zero-byte file), `extensionForMime`/`buildObjectKey` (extension follows MIME, not
filename; awkward filenames produce valid keys), and `uploadImages` batch accounting against an
injected fake storage boundary configured to fail chosen indices — asserting *our* counts and reasons,
not the fake's return value. Plus a manual multi-file upload with one deliberately invalid file, and a
product-dialog cancel-after-removing-an-image check confirming the object still exists.

---

### Decision 6 — No operation reports success it cannot demonstrate

**Files:** `src/lib/content-api.ts`, `src/lib/whatsapp.ts`,
`src/components/admin/products-panel.tsx`, `categories-panel.tsx`, `homepage-panel.tsx`,
`enquiries-panel.tsx`, `settings-panel.tsx`; new
`supabase/migrations/<ts>_normalise_category_order_and_banner_priority.sql`

**Zero-rows detection (1.22, 2.22).** Every mutation that must change a row gains `.select('id')` and
runs through one shared helper:

```
function expectRows<T>(result: { data: T[] | null; error: PostgrestError | null }, entity: string): T[]
// throws on error; throws MutationBlockedError(entity) when data is empty
```

Applied to `softDeleteProduct`, `restoreProduct`, `purgeProduct`, `saveSettings`, `saveSection`,
`saveBanner`, `deleteBanner`, `deleteCategory`, `updateEnquiry`. `MutationBlockedError` carries copy
along the lines of "No rows were changed — you may not have permission to update this record", so the
admin sees a real failure instead of "Moved to trash" / "Settings saved" / "Deleted" / "Notes saved".
`saveProduct`/`saveCategory` already use `.single()` and already throw; they are left alone.

**Error propagation (1.18, 2.18).** `createEnquiry`, `logProductView` and `logAudit` inspect their
`error` and report through the existing `reportLovableError`. Customer-facing paths stay unblocked:
`openProductEnquiry` catches, reports, and **still opens WhatsApp** with the identical message (2.32,
3.4). The empty `catch {}` in `openProductEnquiry` and the `.catch(() => {})` around image deletion
are removed.

**`reorderSections` (1.19, 2.19).** Collects every `Promise.allSettled` result, inspects each for both
`error` and zero rows, and throws an aggregate naming how many updates failed. The homepage panel
reports it instead of refreshing into a silently reverted order.

**Equal ordering values (1.20, 2.20).** Two-part fix, because the data is already degenerate — the
seed in `20260802160613` gave `display_order = 99` to every category derived from `products.category`:

1. *Migration* — normalise to a dense per-parent sequence, and do the same for `hero_banners.priority`:

```
with ranked as (
  select id, row_number() over (partition by parent_id order by display_order, name, id) as rn
  from public.categories
)
update public.categories c set display_order = ranked.rn
from ranked where ranked.id = c.id and c.display_order <> ranked.rn;
-- same shape for public.hero_banners using (order by priority, created_at, id)
```

Deterministic (ties broken by `name`/`created_at` then `id`), idempotent, and re-runnable. It changes
only the *values*, so the resulting visible order matches what admins see today wherever values were
already distinct, and becomes deterministic where they were not.

2. *Client* — `move()` in `categories-panel.tsx` and `homepage-panel.tsx` stops swapping two values and
instead re-sequences the affected sibling list densely (`1..n`) and writes the changed rows, checking
affected rows on each. This is correct even if values collide again later, so the fix does not depend
on the migration holding forever.

**Optimistic switch revert (1.21, 2.21).** `patch()` in `products-panel.tsx` records the previous
value, applies it optimistically to the `products` query cache, toasts confirmation on success, and on
failure restores the previous value and toasts the error — so the switch always reflects persisted
state.

**Verification:** unit tests over `expectRows` (error → throws; `data: []` → throws
`MutationBlockedError`; `data: [row]` → returns) and over the dense re-sequencing function (all-equal
input, already-dense input, single item, first/last item moves). Migration verified by running it twice
on a branch database seeded with duplicate `99`s and asserting a dense distinct sequence and a stable
second run. Manually: revoke a role's UPDATE, click a switch, confirm the error and the reverted
position.

---

### Decision 7 — loading / empty / error, separated everywhere

**Files:** new `src/components/site/query-state.tsx`; `src/components/admin/media-panel.tsx`,
`settings-panel.tsx`, `enquiries-panel.tsx`, `products-panel.tsx` (trash), `categories-panel.tsx`,
`homepage-panel.tsx`; `src/routes/index.tsx`; `src/hooks/use-content.ts`

One pure selector plus one presentational component, so the rule is testable and applied identically:

```
queryStateOf({ isLoading, isError, data }): 'loading' | 'error' | 'empty' | 'ready'
// error is checked BEFORE emptiness — a failed query can never be reported as empty
<QueryFailed message onRetry />   // luxury-card + text-destructive + Button — existing primitives only
```

Applied so that each surface keeps its **existing** loading text and empty copy verbatim ("Loading…",
"No media yet.", "Trash is empty.", "No products match these filters.", "No hero banners yet.") and
gains only a third branch. No markup, class or copy is otherwise changed — this satisfies 2.23–2.26
without touching the visual language (3.14).

- **Media (1.23), settings (1.25), and enquiries / trash / categories / sections / banners (1.26)** —
  add the `isError` branch.
  `settings-panel` in particular stops reporting a failed load as "No settings row found."; that copy
  now renders only when the query succeeded and returned `null` (2.25).
- **Homepage (2.24)** — the hooks already return `isError`/`refetch`; `index.tsx` stops discarding
  them. Sections whose data failed render `<QueryFailed onRetry={refetch} />` in place of their
  content while **every section that did load keeps rendering**, so a single failure never blanks the
  page. Section types that legitimately render `null` on genuinely empty data keep doing so.

**Verification:** a unit test walking the full matrix — `{isLoading} → 'loading'`;
`{isError} → 'error'`; `{isError, data: []} → 'error'` (the regression this whole family is about);
`{data: []} → 'empty'`; `{data: [x]} → 'ready'` — plus a component test asserting the media panel
renders the error card and not "No media yet." when the query fails.

---

### Decision 8 — Product page: real 404s, real metadata

**File:** `src/routes/product.$handle.tsx`

**Failure vs not-found (1.27, 2.27).** The single `if (!product)` branch splits in three: `isLoading` →
the existing skeleton; `isError` → a load-failure card with Retry (`refetch`); `data === null` → the
existing "Piece not found" markup, copy, route and CTA **unchanged**. Only a genuinely absent or
unpublished product now yields the 404 page.

**Metadata from the real record (1.28, 2.28).** `head()` currently receives only `params`, which is why
the title is built from the URL handle. A route `loader` is added that warms the product query via
`queryClient.ensureQueryData(productQuery(handle))`, so `head({ loaderData })` can read the real
record. Rendering keeps using `useQuery` against the same key, so there is no double fetch and no
change to the render path.

With `loaderData` present, `head` emits, in addition to the existing tags:

- `<link rel="canonical">` at `/product/{slug}`;
- `og:image` = `primaryImage(product)` — the product's own image, which makes the existing
  `twitter:card: summary_large_image` honest;
- title from `meta_title ?? name`, description from `meta_description ?? short_description ??
  description`;
- `Product` JSON-LD: `name`, `image`, `description`, `sku` (only when `sku`/`product_code` exists),
  `brand` (only when set), and `offers` with `priceCurrency: 'INR'`, `price: effectivePrice(product)`
  and `availability` from `in_stock`.

Every field comes from the product row or from helpers already in `content-types.ts`. Absent fields are
omitted rather than filled in — nothing is invented (3.15). The canonical origin reuses the base URL
already present in `src/routes/index.tsx`'s `FurnitureStore` JSON-LD rather than introducing a new
domain. When `loaderData` is unavailable, the existing handle-derived tags remain as the fallback, so
this is purely additive.

**Verification:** unit tests over the metadata builder — a full product yields canonical, `og:image`,
real title and complete JSON-LD; a sparse product omits `sku` and `brand` rather than emitting empty
strings; `sale_price` drives `offers.price`. Plus a component test that `isError` renders the retry card
while `data: null` renders "Piece not found".

---

### Decision 9 — Logo: runtime upload, no committed binary

**Files:** `src/components/admin/settings-panel.tsx`, `src/components/site/site-header.tsx`,
`src/routes/index.tsx` (footer)

**Hard constraint honoured.** The artwork was supplied as a chat attachment and cannot be written to
disk here. Nothing in this design requires a committed binary and **no logo URL is hardcoded
anywhere**. The logo arrives at runtime through the admin flow below and is persisted in the existing
`site_settings.logo_url` column — so there is no migration and no schema change.

**Admin flow (2.41).** The Settings panel's `logo_url` free-text input is kept (capability is never
removed) and joined by a small control group built from existing primitives: **Upload** (the shared
`useImageUpload` path from Decision 5, so the logo gets the same MIME allow-list, size cap and
UUID key), **preview** at the same constrained size the header uses, **Replace**, and **Remove** (sets
`logo_url` to `null`, reachable back to the monogram). The new URL is written to the draft only after
the upload resolves, so a failed upload leaves the previous logo intact and reports the reason.

**Rendering (2.41, 3.23).** Header and footer render:

- `alt={settings.company_name}` — a real accessible name instead of today's `alt=""` (also part of
  1.35);
- constrained, ratio-preserving sizing — `h-9 w-auto max-h-9 max-w-[180px] object-contain` — so a
  wrong-ratio or oversized image cannot distort or blow out the 20-height header bar;
- `onError` → fall back to `<NGMonogram />`;
- a treat-as-absent guard: empty, whitespace-only or non-`http(s)`/non-`data:` values fall back to
  `NGMonogram` too, which is what makes the existing fallback reachable again (today any stored value
  permanently defeats it).

The footer, which currently never uses the logo, renders it with the same guarded component; when
absent it keeps rendering `NGMonogram` exactly as today. No spacing, colour or type change.

**Verification:** unit tests over the guard (`null`, `''`, `'   '`, `'javascript:…'`, a valid https URL,
a `data:` URL → monogram vs image); component tests that an `onError` swaps in the monogram and that
`alt` equals the company name. Manually: upload, preview, replace, remove, and an intentionally broken
URL.

---

### Decision 10 — Remaining scope

**Navigation.**

- **Hero CTA (1.29, 2.29)** — new pure `src/lib/links.ts`:
  `classifyLink(value) -> {kind: 'anchor'|'external'|'internal'|'none'}`. `#…` → anchor (`<a href>`);
  `http(s)://…` → external (`<a target="_blank" rel="noopener noreferrer">`); a path matching a
  **registered** route (`/`, `/product/{slug}`, `/admin/login`) → internal (`<Link>`); anything else,
  including an unregistered path, a `javascript:` URL or an empty value → `none`, and the CTA is
  omitted. This removes the typed-`Link` crash for admin-entered values while never breaking the
  slide (`hero-slider.tsx` changes only where it chooses the element).
- **Category selection with catalogue disabled (1.30, 2.30)** — `index.tsx` derives whether a
  `catalogue` section is enabled. When it is, behaviour is unchanged (set state, scroll to the ref).
  When it is not, the click gives explicit feedback via the existing `sonner` toast instead of a
  silent no-op.

**Error handling.**

- **Clipboard (1.31, 2.31)** — one `copyToClipboard(text): Promise<boolean>` helper. The media panel
  awaits it and toasts "URL copied" only on `true`; on `false` it shows the URL for manual copying.
  `share()` on the product page wraps its `navigator.clipboard` call so there is no unhandled
  rejection and no false "Link copied".
- **Swallowed enquiry error (1.32, 2.32)** — covered in Decision 6.

**Responsive and accessibility.**

- **Hero (1.33, 2.33)** — pagination controls keep the exact 4px visual bar and gain a ≥44px hit area
  via transparent padding with a negative margin, so the composition is pixel-identical. Autoplay
  pauses on pointer/focus interaction. `prefers-reduced-motion: reduce` disables both autoplay and the
  opacity cross-fade.
- **Catalogue suggestions (1.34, 2.34)** — proper combobox semantics (`role="combobox"`,
  `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"`/`option`), ↑/↓
  navigation, Enter to select, Escape to dismiss, outside-click dismissal, and close-on-select so the
  list stops covering the results. Markup and classes are unchanged apart from the added attributes
  and handlers.
- **Accessible names (1.35, 2.35)** — `aria-label` on every icon-only admin control (edit, delete,
  move up/down, copy URL, delete media, restore, purge); hero background images become `alt=""` +
  `aria-hidden` (decorative) while product imagery keeps meaningful alt text; the brand mark gets a
  real name (Decision 9); admin `Label`s gain `htmlFor` with matching input `id`s, following the
  pattern `admin.login.tsx` already uses.
- **Mobile overlap (1.36, 2.36)** — on the product page the floating WhatsApp button clears the fixed
  enquiry bar (`bottom-24 lg:bottom-6`) and the page gains matching bottom padding so content is not
  obscured at the end of scroll. No layout-language change.

**SEO, assets, performance.**

- **`robots.txt` (1.17, 2.17)** — keep `User-agent: *` and `Allow: /`; add `Disallow: /admin` and a
  `Sitemap:` line pointing at the existing `sitemap.xml`. No public URL changes (3.16).
- **`sitemap.xml` (1.37, 2.37)** — inspect the query `error`; on failure return a 5xx with no
  `Cache-Control` and report via `reportLovableError`, so a truncated sitemap is never published or
  cached. The success path — same URL set, same ordering, same `max-age=3600` — is untouched.
- **Duplicate assets (1.38, 2.38)** — the nine files in `src/assets/` are unreferenced (verified by
  grep) and are deleted. The nine identical files in `public/media/` are **kept**, exactly as 2.38
  requires, because an external or indexed URL may point at `/media/*` — that is NOT VERIFIED and no
  blind destructive cleanup is performed.
- **Image measurement (1.40, 2.40)** — in `adaptive-image.tsx` and `product-card.tsx` the ratio state
  is written only when the measured value actually differs, removing the guaranteed extra commit-time
  render for already-complete images. `width`/`height` intrinsic hints and a `sizes` attribute matching
  the existing grid breakpoints are added. The `object-contain` no-crop treatment, the `product-media`
  classes and the clamp ranges (`0.75–1.5` and `0.8–1.25`) are preserved exactly (3.17).

**Security hygiene (1.15, 2.15).** `git rm --cached .env`; add `.env` and `.env*.local` to
`.gitignore`; commit a `.env.example` documenting `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_PROJECT_ID` with placeholder values. The previously
committed publishable credentials are recorded as potentially compromised with rotation recommended;
rotation itself is an owner action outside this repo and is reported, not claimed. The verified
client/server split is preserved: no service-role key is introduced, and `client.server.ts` stays
unreferenced (Decision 5). Note that untracking `.env` does not purge it from history — history
rewriting is deliberately **not** proposed, and rotation is the mitigation.


---

### Decision 11 — Test and verification infrastructure

**Files:** `package.json`, new `vitest.config.ts`, new `src/test/setup.ts`, new `src/**/*.test.ts(x)`

`node_modules` is absent, so **installation is part of the work**: `bun install` first, then

```
bun add -d vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
```

Scripts added (existing scripts untouched, per 3.24):

```
"typecheck": "tsc --noEmit",
"test": "vitest --run"
```

`test` uses `--run` for single-shot execution; watch mode is never invoked by tooling and is left to
the developer. `vitest.config.ts` reuses the already-present `vite-tsconfig-paths` so the `@/` alias
resolves without duplicating path config, with `environment: 'jsdom'` and `setupFiles:
['src/test/setup.ts']` for `@testing-library/jest-dom` matchers. `vitest` and `jsdom` are dev
dependencies only — no runtime dependency is added (3.24).

**What the tests target.** Each fix in this design deliberately puts its decision logic in a pure
exported function precisely so it can be tested without a database, a browser or a network:

| Subject | Module | Asserts |
|---|---|---|
| Upload validation | `validateUploadFile` | each allowed MIME accepted; disallowed MIME, oversize and zero-byte rejected with the right `code` |
| Object keys | `buildObjectKey`, `extensionForMime` | extension follows the validated MIME, never the filename; spaces/Unicode/multi-extension/no-extension names still yield valid keys |
| Batch accounting | `uploadImages`, `summarise` | with a fake storage boundary failing chosen indices: every file attempted, counts exact, one reason per failure, `succeeded.length + failed.length === files.length` |
| Zero-rows detection | `expectRows` | `error` → throws; `data: []` → `MutationBlockedError`; `data: [row]` → returns rows |
| Dense re-sequencing | reorder helper | all-equal values, already-dense, single item, first/last moves all yield a distinct deterministic order |
| Role gating | `deriveAccess` | {anonymous, lookup error, no roles, `user`, `editor`, `manager`, `admin`} → expected status and permitted tab set; error ≠ denied |
| State selection | `queryStateOf` | full matrix, including `{isError, data: []} → 'error'` |
| Link classification | `classifyLink` | anchor / external / registered-internal / unregistered / `javascript:` / empty |
| Logo guard | logo-source guard | `null`, `''`, whitespace, `javascript:`, valid https, `data:` |
| Product metadata | metadata builder | canonical + `og:image` + real title present; absent `sku`/`brand` omitted, not emptied |
| Preservation locks | `productEnquiryMessage`, `normalizeImages`, `slugify`, `effectivePrice`, `discountPercent` | output byte-identical to current behaviour (regression locks for 3.4, 3.3, 3.2, 3.5) |

Component tests (jsdom) cover the error-vs-empty rendering that unit tests cannot: the media panel
renders the error card and **not** "No media yet." on failure; the product page renders retry on
`isError` and "Piece not found" on `null`; a broken logo `onError` swaps in `NGMonogram`.

**Explicitly forbidden.** No test may configure a mock and then assert that the mock returned its
configured value — that asserts the test's own setup and proves nothing. Injected fakes are permitted
**only as boundaries** (Supabase storage, the network, the clipboard) and never as the subject: every
assertion must be about the output of a real exported function in `src/`. A test whose failure could
not be caused by a change to `src/` does not belong in the suite.

**What tests cannot cover.** Anything depending on live Supabase state — bucket existence and flags,
applied policies, actual grants, real RLS row sets — is unreachable from vitest with an anon key. Those
are verified against a branch/shadow database as described per decision, and reported as **NOT
VERIFIED** for production until run there.

---

## Testing Strategy

### Validation Approach

Two phases. First, surface counterexamples on the **unfixed** code to confirm or refute the root-cause
analysis in this design — if a counterexample fails to reproduce, the hypothesis is wrong and must be
re-formed before any fix is written. Second, verify that the fix holds for every input satisfying the
bug condition and that behaviour is unchanged for every input that does not.

Because the suite does not exist yet (1.42), Phase 0 of the sequencing stands up vitest **before** any
fix, so the exploratory tests below can actually be run against unfixed code.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fixes. Confirm or
refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests and manual probes that exercise each family's boundary against the current
code and current schema. Schema-level probes run against a **clean branch database built only from
`supabase/migrations/`** — that is the exact condition defect 1.1 describes, and it is the only place
the missing bucket is observable, since the live project's state is NOT VERIFIED.

**Test Cases**:

1. **Bucket absence** — apply all 18 migrations to a clean database, then upload as `admin`; expect a
   storage error naming a missing bucket (will fail on unfixed code).
2. **Role disagreement** — as `editor`, insert a `media` row (succeeds) and upload the object (denied);
   the asymmetry is the counterexample (will fail on unfixed code).
3. **Batch upload accounting** — call the current `onFiles` with five files where the third throws;
   assert files 4–5 were never attempted and the toast said "5 file(s) uploaded" (will fail on unfixed
   code).
4. **Non-staff admin entry** — with a `user`-only account, request `/admin/dashboard` and observe the
   route load and its admin queries fire (will fail on unfixed code).
5. **Manager lockout** — with a `manager` account, observe "Admins only" (will fail on unfixed code).
6. **Role oracle** — with only the anon key, invoke `private.is_staff` with an arbitrary UUID and
   observe it answer (will fail on unfixed code).
7. **Anon read dependency** — the decisive probe for Decision 3: on a branch database, revoke `anon`
   execute on `private.is_staff` *without* splitting the policies, then read `products` with the anon
   key. Expect `permission denied for function`. This is the counterexample that justifies the policy
   split; if it does **not** reproduce, the caller-privilege premise is wrong and the split is merely
   redundant rather than required — the design is safe either way, but the conclusion must be
   corrected.
8. **False success** — with a role RLS excludes, call `softDeleteProduct` and observe
   `error === null`, zero rows changed, and "Moved to trash" (will fail on unfixed code).
9. **Equal ordering** — on a database carrying the `display_order = 99` seed, click ↑ and observe no
   movement and no message (will fail on unfixed code).
10. **Failure as emptiness** — force the media and homepage queries to reject; observe "No media yet."
    and a near-blank homepage (will fail on unfixed code).
11. **False 404** — force the product query to reject on a valid slug; observe "Piece not found" (will
    fail on unfixed code).
12. **Edge case — hero CTA** — set `button_link` to `https://example.com` and to `/not-a-route`;
    observe the failed navigation or error boundary (may fail on unfixed code).

**Expected Counterexamples**:

- Storage writes rejected for missing bucket and for non-`admin` staff roles.
- Success toasts and success-shaped returns for operations that changed nothing.
- Empty states and 404 pages standing in for failed queries.
- `permission denied for function` on anonymous reads after a bare revoke — the specific result that
  validates the policy-split design.
- Possible causes: bucket created out-of-band rather than in migrations; storage policies not updated
  when the three-tier role model was introduced; Supabase's `{data, error}` shape making success the
  default; `= []`/`= null` destructuring defaults erasing `isError`; grants added to clear a policy-level
  error.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the
expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedSystem(input)
  ASSERT expectedBehavior(result)
END FOR
```

Concretely, per family: uploads by any staff role succeed against an existing bucket; invalid files are
rejected with a reason and every valid sibling still uploads; keys derive from MIME; objects survive a
cancelled dialog; non-staff never reach the admin route and managers/editors do; `anon` cannot execute
the role helpers; no mutation reports success without a changed row; every failed query renders a
distinct error state with retry; the product page 404s only for genuinely absent products; the sitemap
never publishes a truncated 200.

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces
the same result as the original function.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalSystem(input) = fixedSystem(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behaviour on UNFIXED code first for the non-bug inputs below — capture the
current output of the pure helpers as golden values and record the current anonymous row counts — then
write tests that pin exactly those observations so any drift fails.

**Test Cases**:

1. **Anonymous row sets** — record the anon-key counts and IDs for `products`, `categories`,
   `homepage_sections` and `hero_banners` on unfixed code, then assert the identical sets after the
   policy split and revoke. This is the single most important preservation check in the spec (3.1).
2. **Already-stored image URLs** — record a set of live signed URLs that render today, then assert each
   still renders after the bucket is made public and that no row was modified (3.3).
3. **WhatsApp message format** — capture `productEnquiryMessage` output for products with and without
   `sku` and with and without `sale_price` on unfixed code, then assert byte-identical output (3.4).
4. **Catalogue filtering and sorting** — capture the filtered/sorted ID order for a fixed product
   fixture across every filter and all six sorts, then assert identical order (3.5).
5. **Image normalisation and slugs** — capture `normalizeImages` output for string entries, object
   entries and malformed entries, and `slugify` output for awkward names, then assert unchanged (3.2,
   3.3).
6. **Price helpers** — capture `effectivePrice` and `discountPercent` across zero, null, equal and
   greater `sale_price`, then assert unchanged (3.5).
7. **`admin` capability** — walk every panel and action as `admin` before and after; assert the same
   tabs and the same successful outcomes (3.9).
8. **Hero rotation** — assert the 7-second cycle, priority ordering and manual selection still behave
   as before when `prefers-reduced-motion` is not set (3.6).
9. **Trash workflow** — soft-delete, restore and purge as `admin`; assert the same transitions and
   counts (3.7).
10. **Session lifecycle** — sign in, reload, refocus the tab, sign out; assert persistence, focus
    revalidation and clean sign-out unchanged (3.8).
11. **Metadata and structured data** — assert the existing homepage `FurnitureStore` JSON-LD and all
    existing meta tags are byte-identical and that the product page's additions are purely additive
    (3.15).
12. **Routes and public paths** — assert every route, `/product/{slug}`, `sitemap.xml` URL set and
    `robots.txt` availability unchanged (3.2, 3.16).

### Unit Tests

- Upload validation, MIME→extension mapping and object-key construction.
- Batch upload accounting against an injected fake storage boundary.
- `expectRows` zero-rows and error detection; the dense re-sequencing helper.
- `deriveAccess` role matrix, including error-vs-denied.
- `queryStateOf` full state matrix, with error taking precedence over emptiness.
- `classifyLink` across anchor, external, registered internal, unregistered and hostile inputs.
- Logo-source guard; product metadata builder including omission of absent fields.
- Preservation locks over `productEnquiryMessage`, `normalizeImages`, `slugify`, `effectivePrice`,
  `discountPercent`.

### Property-Based Tests

- Generate arbitrary file sets (mixed MIME types, sizes, and adversarial filenames) and assert the
  batch invariant `succeeded.length + failed.length === files.length`, that every rejection carries a
  reason, and that no valid file is ever skipped because a sibling failed.
- Generate arbitrary role sets and assert `deriveAccess` agrees with the SQL model
  (`isStaff ⟺ roles ∩ {admin,manager,editor} ≠ ∅`, `isManager ⟺ roles ∩ {admin,manager} ≠ ∅`) and that
  `isManager ⟹ isStaff`.
- Generate arbitrary `{isLoading, isError, data}` combinations and assert `queryStateOf` never returns
  `'empty'` when `isError` is true.
- Generate arbitrary sibling ordering arrays (including all-equal values) and assert the re-sequencing
  helper always yields distinct, dense, deterministic values and moves the target exactly one position.
- Generate arbitrary product records and assert the metadata builder never emits an empty-valued tag and
  never invents a field absent from the record.
- Generate arbitrary strings and assert `classifyLink` never returns `'internal'` for a value that is
  not a registered route — the invariant that prevents the typed-`Link` crash.

### Integration Tests

- Full admin flow per role on a branch database: sign in as `admin`, `manager`, `editor` and a plain
  `user`; assert route admission, visible tabs, and that an upload plus a product save succeeds for
  staff and is denied for `user`.
- Storefront flow with the anon key: load the homepage, filter and search the catalogue, open a product,
  and assert the same content as before the change — the end-to-end form of preservation case 1.
- Image lifecycle: upload from the product dialog, cancel, and assert the object survives; upload, save,
  remove, save, and assert the object and its `media` row are both gone; force a storage failure and
  assert the `media` row remains.
- Context switching: reorder and disable homepage sections, reorder collections carrying duplicate
  `display_order`, and assert the storefront reflects each change through the existing realtime channel.
- Failure-path rendering: with the network offline, assert the homepage, media panel, settings panel and
  product page each show an error state with a working retry and never an empty state.
- Published output: assert `robots.txt` disallows `/admin` and declares the sitemap, and that
  `sitemap.xml` returns a non-cached error rather than a truncated 200 when its query fails.

---

## Explicit NOT VERIFIED register

Carried forward from `bugfix.md` and extended by this design. Each item must be reported as NOT
VERIFIED, never claimed, until executed against the live project.

| # | Unverifiable here | Affects |
|---|---|---|
| 1 | Whether the `product-images` bucket exists, and its `public` flag and limits | Decision 1 |
| 2 | Which storage policies are actually applied on the live project | Decisions 1, 2 |
| 3 | Which grants on schema `private` and the role helpers are actually in effect | Decision 3 |
| 4 | Whether revoking `anon` execute breaks live anonymous reads (probe 7 must run on a branch DB) | Decision 3 |
| 5 | Whether any external or indexed URL references `public/media/*` | Decision 10 (1.38) |
| 6 | Whether the live signing key has rotated, invalidating already-stored signed URLs | Decision 1 (1.8) |
| 7 | All runtime behaviour — `node_modules` is absent and nothing in this repo has been executed | Every decision |
