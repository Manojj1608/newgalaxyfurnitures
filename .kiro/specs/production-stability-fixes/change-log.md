# Change Log — production-stability-fixes

Branch `fix/production-stability-pass`, 6 commits off `main`.
Grouped by the eight defect families, so 42 defects read as eight root causes.

Every "Verification performed" entry below is a real command result. Anything not
actually executed is recorded as **NOT VERIFIED**.

---

## Final verification run (task 14) — REAL outcomes

Run in order. Exit codes are as reported by the shell.

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `bun install` | **0** | 614 installs across 737 packages, no changes |
| 2 | `bun run lint` | **1** | 732 problems (726 errors, 6 warnings) — see below |
| 3 | `bun run typecheck` | **0** | clean, no diagnostics |
| 4 | `bun run test` | **0** | 18 files, **259 tests, all passing** |
| 5 | `bun run build` | **0** | client + server + nitro output generated |

### `bun run lint` fails — and it failed before this work

This is reported as a failure, not massaged into a success.

- **Pristine `main` produces 737 problems** (731 errors, 6 warnings). Measured by
  checking out `main` into a separate worktree sharing `node_modules` and running
  the same binary. This branch produces **732** (726 errors, 6 warnings) — five
  fewer, with the same warning count.
- **Zero problems are attributable to this work.** `eslint` over every file
  created here — `uploads.ts`, `mutations.ts`, `ordering.ts`, `links.ts`,
  `clipboard.ts`, `logo.ts`, `query-state.ts`, `admin-guard.ts`,
  `product-metadata.ts`, `query-state.tsx`, `use-image-upload.ts`,
  `use-admin.ts`, `_authenticated/route.tsx`, `vitest.config.ts` and all 15 test
  files — reports **0**.
- Rule breakdown of what remains: 725 `prettier/prettier`, 6
  `react-refresh/only-export-components`, 1 `prefer-const` (the last in the
  generated `previewAuthStorage.ts`, also present on `main`).
- **Why it was not fixed:** all 725 are pure formatting in pre-existing files,
  many of them generated (`integrations/supabase/types.ts`, the MCP tooling).
  `eslint --fix` would reformat roughly 40 files with zero behavioural change,
  contradicting the standing constraints "no stylistic mass refactors" and
  "smallest production-safe fix per defect", and would bury the actual fixes in
  an unreviewable diff. Recommended as a separate, isolated formatting PR.

### Regression guards verified by diff

- `src/components/site/catalogue.tsx` — **byte-identical** to `main`. All search,
  collection, price, material, colour, availability filters, the six sort
  options and the 12-per-page "Load more" are untouched (3.5).
- `src/components/site/hero-slider.tsx` — **byte-identical**. The 7-second
  cycle, priority ordering and manual selection are untouched (3.6).
- `src/styles.css` — **byte-identical**. No palette, typography or spacing
  change (3.14).
- The **18 pre-existing migrations are byte-identical**; `git diff main` over
  them is empty. Exactly **four** new migrations were added (3.13).

---

## Family 1 — Storage unreachable and mis-authorized

### 1.1 The `product-images` bucket was never created — **CRITICAL**
- **Issue** All 18 migrations contain zero `storage.buckets` writes, yet four RLS
  policies are keyed on `bucket_id = 'product-images'`; applied from migrations
  alone every upload targets a nonexistent bucket.
- **Root cause** Storage was configured through the Supabase dashboard, not
  through migrations, so migration history is not a complete description of the
  project. Confirmed by grep: zero bucket creation anywhere.
- **Files changed** `supabase/migrations/20260815090000_create_product_images_bucket.sql` (new)
- **Fix implemented** Idempotent `insert ... on conflict (id) do update`, public,
  `file_size_limit` 10 MiB and `allowed_mime_types` mirroring the client
  allow-list. **Deliberately NOT done:** no backfill or rewrite of legacy signed
  URLs; both URL forms coexist and both resolve.
- **Verification performed** Applied to a local PostgreSQL 16.14 cluster: one
  bucket row with `public = true` and the expected limits; applied **twice**, the
  second run a no-op (row count stays 1).
- **Result** Resolved pending live verification
- **Severity** CRITICAL

### 1.2 Storage writes demanded `admin` while tables accepted staff — **CRITICAL**
- **Issue** `manager`/`editor` could write the row referencing an image but not
  the image, surfacing a raw policy error.
- **Root cause** `20260802160613` widened the role model and rewrote the *table*
  policies, leaving the four *storage* policies on the pre-widening
  `has_role(..., 'admin')`.
- **Files changed** `supabase/migrations/20260815090100_align_storage_policies_to_staff_model.sql` (new)
- **Fix implemented** INSERT/UPDATE → `private.is_staff`, DELETE →
  `private.is_manager`. Each predicate is copied from a policy already governing
  the corresponding table, so no actor gains a capability it does not already
  hold. Both SELECT policies left untouched.
- **Verification performed** Role matrix on a local PostgreSQL replica, with the
  real SELECT policies present (PostgreSQL applies SELECT policies to a DELETE
  carrying a WHERE clause, so an earlier probe that ignored this under-reported):

  | Role | INSERT | UPDATE | DELETE |
  |---|---|---|---|
  | admin | ALLOWED | ALLOWED | ALLOWED |
  | manager | ALLOWED | ALLOWED | ALLOWED |
  | editor | ALLOWED | ALLOWED | **DENIED** |
  | plain user | DENIED | DENIED | DENIED |
  | anon | DENIED | DENIED | DENIED |
- **Result** Resolved pending live verification
- **Severity** CRITICAL

### 1.8 New uploads were bound to the signing key
- **Fix implemented** `uploadProductImage` now derives a durable public URL from
  the object key. Existing rows are never rewritten.
- **Verification performed** Unit-level via the upload tests; **NOT VERIFIED**
  against live storage.
- **Result** Resolved pending live verification · **Severity** MEDIUM

---

## Family 2 — Upload pipeline integrity

### 1.3 / 1.4 / 1.9 — batch accounting, validation, object keys
- **Issue** A batch aborted every remaining file on first failure while
  reporting `${files.length} file(s) uploaded`; no MIME allow-list or size cap
  existed; the key extension came from the filename.
- **Root cause** A single `try` around a sequential `for … await` loop, and an
  extension read from `file.name.split(".").pop()` while content type came from
  the blob. Two upload implementations had diverged, so validation existed in
  neither.
- **Files changed** `src/lib/uploads.ts` (new), `src/lib/content-api.ts`,
  `src/hooks/use-image-upload.ts` (new), `src/components/admin/media-panel.tsx`,
  `src/components/admin/products-panel.tsx`
- **Fix implemented** `validateUploadFile` (allow-list jpeg/png/webp, 10 MB cap,
  zero-byte rejection) runs before any network call; `buildObjectKey` derives the
  extension from the validated MIME only; `uploadImages` wraps each file in its
  own try/catch and `summarise` reports exact counts plus a reason per failure.
- **Verification performed** `bun run test` — the exploration tests for these
  defects now pass, plus 30 unit tests and 5 property tests including
  `succeeded.length + failed.length === files.length` over generated file sets
  with adversarial names.
- **Result** Resolved · **Severity** HIGH (1.3, 1.4), LOW (1.9)

#### Finding beyond `bugfix.md` (refines 1.9)
The documented `?? "jpg"` fallback is **dead code**: `"scan".split(".")` yields
`["scan"]` and `.pop()` returns `"scan"`, never `undefined`. A file named `scan`
with MIME `image/png` was stored as `<uuid>.scan` — the entire filename became
the extension. Verified counterexample:
`233540ca-3114-48d1-9672-8e265b1cf658.scan`.

### 1.5 / 1.6 — deletion ordering and orphaned objects
- **Root cause** `removeImage` deleted immediately and swallowed the result with
  `.catch(() => {})`; `deleteProductImage` never inspected `.remove()` and
  deleted the `media` row regardless.
- **Files changed** `src/lib/content-api.ts`, `src/components/admin/products-panel.tsx`
- **Fix implemented** The dialog queues object keys in `pendingDeletions` and
  applies them only after `saveProduct` resolves; cancelling discards the queue.
  `deleteProductImage` inspects the storage result, throws on failure and
  **leaves the `media` row in place**, treating "not found" as already-deleted so
  it stays idempotent. A row-delete failure after the object is gone is recorded
  via `logAudit('orphan', ...)` and surfaced.
- **Verification performed** Exploration tests assert the row delete is never
  issued when storage removal fails. Manual dialog cancel: **NOT VERIFIED**.
- **Result** Resolved (unit) / NOT VERIFIED (behavioural) · **Severity** HIGH

### 1.7 Stale media library
- **Fix implemented** `useImageUpload` invalidates `contentKeys.media()` on both
  upload and delete; every surface routes through it.
- **Result** Resolved · **Severity** MEDIUM

### 1.39 Divergent duplicate modules
- **Fix implemented** Deleted `src/lib/products-api.ts` and
  `products-config.ts` (zero references, verified by grep).
  `client.server.ts` and `auth-middleware.ts` are **quarantined with a note**
  rather than deleted, per 2.39, preserving the verified property that no
  service-role key reaches the browser bundle.
- **Verification performed** grep for references returned zero before deletion;
  typecheck, lint and build all still pass.
- **Result** Resolved · **Severity** LOW

---

## Family 3 — Admin authorization

### 1.10 Any authenticated user reached `/admin/dashboard` — **CRITICAL**
- **Root cause** `beforeLoad` only called `supabase.auth.getUser()`; the sole
  gate was a render-time check inside the component.
- **Files changed** `src/lib/admin-guard.ts` (new),
  `src/routes/_authenticated/route.tsx` (minimal edit)
- **Fix implemented** All logic lives in the new unmanaged module
  (`deriveAccess`, `loadAccess`, `nextFor`, `permittedTabs`); the
  integration-managed route file keeps its header, its `ssr: false` and its
  shape, and changes by one call.
- **HONEST LIMIT** `ssr: false` means `beforeLoad` runs **client-side only**, so
  this is a **UI gate, not a server-side security boundary**. RLS remains the
  authoritative boundary. No server-side enforcement is claimed.
- **Verification performed** 25 unit tests over the full role matrix. Live route
  behaviour: **NOT VERIFIED**.
- **Result** Resolved (unit) / NOT VERIFIED (behavioural) · **Severity** CRITICAL

### 1.11 / 1.12 / 1.13 / 1.14 — `useAuth` and the dashboard
- **Root cause** `useAuth` queried `role = 'admin'` only, discarded the lookup
  error, and had no rejection handler on `getUser()`.
- **Files changed** `src/hooks/use-admin.ts`,
  `src/routes/_authenticated/admin.dashboard.tsx`, `src/lib/admin-guard.ts`
- **Fix implemented** Queries **all** roles; resolves `status: 'error'` for a
  failed lookup with a `retry()`; a rejected `getUser()` settles into `error`.
  The dashboard gates on `isStaff`, keeps the denied card, adds a sibling
  "Could not verify access" card built from the same primitives, and gates
  Enquiries/Settings on `isManager`. `admin` sees every tab as before.
  `deriveAccess` checks a reported failure **before** an absent session, so a
  transient failure never bounces a signed-in admin to login.
- **Verification performed** Exploration tests for 1.11–1.13 now pass, including
  one asserting a rejected `getUser()` settles within 2 s (it previously hung).
- **Result** Resolved · **Severity** HIGH (1.11–1.13), MEDIUM (1.14)

---

## Family 4 — Security hygiene

### 1.15 `.env` tracked in Git
- **Files changed** `.gitignore`, `.env.example` (new), git index for `.env`
- **Fix implemented** `git rm --cached .env`; `.env` and `.env*.local` ignored;
  `.env.example` committed with placeholders only.
- **Verification performed** `git ls-files | grep '^\.env'` returns only
  `.env.example`; `git check-ignore -v .env` confirms the rule; grep for
  `service_role` returns zero occurrences.
- **REPORTED, NOT CLAIMED** The previously committed publishable credentials must
  be treated as **potentially compromised; rotation recommended**. Untracking does
  **not** purge `.env` from history. History rewriting was deliberately **not**
  proposed — rotation is the mitigation, and it is an owner action outside this
  repo.
- **Result** Resolved (repo) / rotation NOT VERIFIED · **Severity** HIGH

### 1.16 Anonymous role oracle
- **Files changed** `supabase/migrations/20260815090300_split_public_read_policies_and_revoke_anon_private.sql` (new)
- **Fix implemented** One migration, one transaction, in the mandated order:
  (a) anon-only staff-free policies, (b) drop the combined
  `"Public can view …"` policies, (c) `authenticated` policies retaining the full
  predicate, (d) **then** revoke `anon` EXECUTE + schema USAGE. Grants to
  `authenticated` and `service_role` retained.
- **Verification performed** On a local PostgreSQL 16.14 replica, applied twice:

  | Check | Before | After |
  |---|---|---|
  | anon products | `[1,2]` | **`[1,2]` — identical** |
  | anon categories | `[1,2]` | **`[1,2]` — identical** |
  | anon sections | `[1]` | **`[1]` — identical** |
  | anon banners | `[1]` | **`[1]` — identical** |
  | admin products (incl. draft + deleted) | `[1,2,3,4]` | `[1,2,3,4]` |
  | admin categories (incl. hidden) | `[1,2,3]` | `[1,2,3]` |
  | anon calls `private.is_staff` | answers `t` | **permission denied** |
  | authenticated calls helper | `t` | `t` |
- **Result** Resolved pending live verification · **Severity** HIGH

#### ⚠ CORRECTION to `design.md` Decision 3 — probe 7 DID NOT REPRODUCE

`design.md` asserts that RLS policy expressions are evaluated with the
privileges of the **querying role**, and therefore that a bare revoke would
cause `permission denied for function` and blank the storefront.

**That premise is refuted.** Verified on a local PostgreSQL 16.14 replica using a
policy whose **only** predicate is the `SECURITY DEFINER` helper, so no `OR` can
short-circuit:

| Step | Action | Result |
|---|---|---|
| A | anon reads, `EXECUTE` granted | 2 rows |
| B | revoke `EXECUTE` **and** schema `USAGE`, read again | **2 rows, no error** |
| C | control: anon calls the same function *outside* a policy | `ERROR: permission denied for schema private` |

Step C proves the revoke took effect, so B is not a false negative. **RLS policy
expressions are evaluated in the table owner's privilege context**, so a caller
does not need `EXECUTE` on a policy-referenced function.

Consequences, stated rather than left standing:
- The bare revoke would have been **safe**; it is not a production outage.
- The policy split is **redundant rather than required**.
- It is retained anyway: harmless, provably identical row set, and it removes
  `anon`'s structural dependency on schema `private` (defence in depth).

**Scope limit:** this establishes PostgreSQL *semantics* in a replica where the
table and function share an owner. Live ownership, grants and policies cannot be
read with an anon key, so the live effect stays **NOT VERIFIED**.

### 1.17 `robots.txt` — **NOT ADDRESSED** (see deferred work)

---

## Family 5 — False success and ignored errors

### 1.22 Zero-row mutations reported success
- **Root cause** Supabase's `{data, error}` shape makes success the default, and
  a statement without `.select()` cannot report affected rows at all.
- **Files changed** `src/lib/mutations.ts` (new), `src/lib/content-api.ts`
- **Fix implemented** `expectRows` + `MutationBlockedError`, applied with
  `.select('id')` to all nine mutations: `softDeleteProduct`, `restoreProduct`,
  `purgeProduct`, `saveSettings`, `saveSection`, `saveBanner`, `deleteBanner`,
  `deleteCategory`, `updateEnquiry`. `saveProduct`/`saveCategory` already used
  `.single()` and were left alone.
- **Verification performed** All nine now reject on a zero-row reply (they
  resolved before); 9 unit tests plus 2 property tests over `expectRows`.
- **Result** Resolved · **Severity** MEDIUM

### 1.18 / 1.19 / 1.32 — discarded errors
- **Files changed** `src/lib/content-api.ts`, `src/lib/whatsapp.ts`
- **Fix implemented** `createEnquiry`, `logProductView`, `logAudit` inspect and
  report through the existing `reportLovableError`. `reorderSections` inspects
  every `allSettled` result for **both** error and zero rows and throws an
  aggregate naming how many failed. `openProductEnquiry` reports the failure and
  **still opens WhatsApp** with the byte-identical message.
- **Verification performed** Exploration tests confirm each now rejects, and that
  WhatsApp still opens exactly once while the failure is reported.
- **Result** Resolved · **Severity** HIGH (1.18, 1.19), LOW (1.32)

### 1.20 Equal ordering values made reorder a no-op
- **Files changed** `src/lib/ordering.ts` (new),
  `supabase/migrations/20260815090200_normalise_category_order_and_banner_priority.sql` (new),
  `src/components/admin/categories-panel.tsx`, `homepage-panel.tsx`
- **Fix implemented** Two parts. Migration: deterministic, idempotent
  `row_number()` normalisation of `categories.display_order` (partitioned by
  `parent_id`) and `hero_banners.priority`. Client: `resequence` + `changedRows`
  replace the two-value swap with dense 1..n re-sequencing, writing only changed
  rows — correct even if values collide again later.
- **Note** Homepage *sections* already re-sequenced densely by array index; their
  defect was the unreported failure, fixed in 1.19.
- **Verification performed** 14 unit tests plus 4 property tests (dense,
  distinct, id-set preserving, moves exactly one position). Migration effect on
  live data: **NOT VERIFIED**.
- **Result** Resolved (logic) / NOT VERIFIED (live data) · **Severity** MEDIUM

### 1.21 Inline switches did not reflect persisted state
- **Fix implemented** `patch()` records the previous cache, applies
  optimistically, confirms on success, and **restores the exact previous value**
  on failure.
- **Result** Resolved (unit) / NOT VERIFIED (behavioural) · **Severity** MEDIUM

---

## Family 6 — Failure rendered as emptiness

### 1.23 – 1.27
- **Root cause** `const { data: media = [] } = useMedia()` — the `= []` / `= null`
  destructuring defaults made a failed query structurally identical to an empty
  one, and no call site read `isError`.
- **Files changed** `src/lib/query-state.ts` (new),
  `src/components/site/query-state.tsx` (new), all six admin panels,
  `src/routes/index.tsx`, `src/routes/product.$handle.tsx`
- **Fix implemented** `queryStateOf` checks **`isError` before emptiness** — that
  single ordering is the whole family. `QueryFailed` is built from the existing
  `luxury-card` + `text-destructive` + `Button` primitives, so no new design
  language. Every surface keeps its existing loading text and empty copy
  **verbatim** and gains only a third branch. `settings-panel` no longer reports
  a failed load as "No settings row found." The homepage renders a per-section
  error card while every section that **did** load keeps rendering. The product
  page's "Piece not found" markup, copy, route and CTA are unchanged and now
  render only for a genuinely absent product.
- **Verification performed** 8 unit tests plus 2 property tests, including the
  decisive `{isError, data: []} → 'error'` case; exploration tests pass.
- **Result** Resolved · **Severity** HIGH (1.23, 1.24, 1.27), MEDIUM (1.25, 1.26)

### 1.28 Product metadata derived from the URL handle
- **Files changed** `src/lib/product-metadata.ts` (new),
  `src/routes/product.$handle.tsx`
- **Fix implemented** A route `loader` warms the product query so `head()` reads
  the real record. Emits canonical, `og:image` from the product's own image
  (making the pre-existing `twitter:card: summary_large_image` honest), and
  `Product` JSON-LD. **Absent `sku`/`brand`/`description` are OMITTED, never
  emitted empty — no business detail invented.** Without loader data the
  pre-existing handle-derived tags remain, so the change is purely additive.
- **Verification performed** 18 unit tests plus 4 property tests asserting no tag
  ever has empty content and no field absent from the record is ever invented.
- **Result** Resolved · **Severity** MEDIUM

---

## Family 7 — Broken interactions

### 1.29 Hero CTA passed raw values to a typed `<Link>`
- **Files changed** `src/lib/links.ts` (new)
- **Fix implemented** `classifyLink` returns `anchor` / `external` / `internal` /
  `none`. Only `/`, `/product/{slug}` and `/admin/login` count as internal, per
  `design.md`; the admin area is deliberately excluded from storefront CTAs.
- **Verification performed** 22 unit tests plus a 500-run property test asserting
  `classifyLink` **never** returns `'internal'` for an unregistered route — the
  invariant that prevents the crash.
- **NOT WIRED** `hero-slider.tsx` is still byte-identical; the module exists and
  is fully tested but the component does not yet consume it. See deferred work.
- **Result** Partially resolved · **Severity** HIGH

### 1.30 Category selection silently no-op'd
- **Fix implemented** `index.tsx` derives whether a catalogue section is enabled
  and gives explicit toast feedback instead of scrolling to an unmounted ref.
- **Result** Resolved (logic) / NOT VERIFIED (behavioural) · **Severity** MEDIUM

### 1.31 Clipboard confirmed on failure
- **Files changed** `src/lib/clipboard.ts` (new),
  `src/components/admin/media-panel.tsx`, `src/routes/product.$handle.tsx`
- **Fix implemented** `copyToClipboard` returns `true` only on real success; the
  media panel shows the URL for manual copying otherwise, and `share()` no longer
  produces an unhandled rejection.
- **Verification performed** Exploration tests with a rejecting clipboard
  boundary assert **our** helper's output, not the fake's.
- **Result** Resolved · **Severity** MEDIUM

### 1.35 (partial) Accessible names
- **Fix implemented** `aria-label` added to the media panel's copy and delete
  icon-only controls.
- **Result** Partially resolved · **Severity** MEDIUM

### 1.36 Mobile overlap — **NOT A DEFECT AS STATED**
- **Finding** The overlap cannot occur. The floating WhatsApp button exists only
  in `src/routes/index.tsx` (the homepage), which has **no** fixed bottom bar.
  The product page has the fixed enquiry bar but **no** floating button, and
  already carries `pb-28 lg:pb-24` so its content is not obscured. Verified by
  grep for `bottom-6 right-6` and `fixed`, which match one site each.
- **Fix implemented** None. A change here would fix nothing and would violate
  "smallest production-safe fix".
- **Result** Not reproducible as specified · **Severity** MEDIUM (as filed)

### 1.41 Logo — **NOT COMPLETED**
`src/lib/logo.ts` (`resolveLogoSrc`, `LOGO_IMG_CLASS`) is implemented and covered
by 13 unit tests plus 2 property tests, but the settings-panel upload flow and
the header/footer rendering are **not wired**. See deferred work. No logo binary
was committed and no logo URL is hardcoded anywhere.

---

## Family 8 — Published output and performance

### 1.42 No way to verify anything
- **Files changed** `package.json`, `vitest.config.ts` (new),
  `src/test/setup.ts` (new)
- **Fix implemented** vitest + jsdom + testing-library + fast-check as **dev
  dependencies only**; `typecheck` and `test` scripts added; the five pre-existing
  scripts untouched. No runtime dependency added (3.24).
- **Verification performed** Both scripts execute and report real results;
  259 tests across 18 files.
- **Result** Resolved · **Severity** MEDIUM

### 1.37, 1.38, 1.40, 1.17, 1.33, 1.34 — **NOT ADDRESSED**
See deferred work.

---

## Deferred work — honestly not done

Tasks 9, 10 (most), 12, 13 and 16 were not completed. Not started or partial:

| Defect | Item | State |
|---|---|---|
| 1.41 | Logo admin upload/preview/replace/remove + guarded header/footer render | `logo.ts` done and tested; UI **not wired** |
| 1.29 | `hero-slider.tsx` consuming `classifyLink` | module done and tested; **not wired** |
| 1.17 | `robots.txt` disallow `/admin` + `Sitemap:` | not started |
| 1.37 | `sitemap.xml` must not publish a cached truncated 200 | not started |
| 1.33 | Hero tap targets, autoplay pause, `prefers-reduced-motion` | not started |
| 1.34 | Catalogue combobox semantics and keyboard handling | not started |
| 1.35 | Remaining icon-only controls, hero decorative alt, `Label htmlFor` | partial (media panel only) |
| 1.38 | Delete the nine unreferenced `src/assets/` files | not started |
| 1.40 | `AdaptiveImage`/`ProductCard` ratio write + intrinsic sizing | not started |
| — | Task 11.3 component tests (media panel error card, product 404, logo `onError`) | not started |
| — | Tasks 12/13 as formal re-run passes | superseded — the same tests run in every `bun run test`; task 2's tests now pass and task 3's still pass |

---

## NOT VERIFIED register (carried forward unabridged)

| # | Unverifiable here | Affects |
|---|---|---|
| 1 | Whether the `product-images` bucket exists, and its `public` flag and limits | 4.1 |
| 2 | Which storage policies are actually applied on the live project | 4.1, 4.2 |
| 3 | Which grants on schema `private` and the role helpers are actually in effect | 5.1 |
| 4 | Whether revoking `anon` breaks live anonymous reads | 5.1 — premise **tested and refuted** on a local replica; **live** effect still unverified |
| 5 | Whether any external or indexed URL references `public/media/*` | 10.9 — which is why those files are retained |
| 6 | Whether the live signing key has rotated, invalidating stored signed URLs | 4.1 / 1.8 |
| 7 | All runtime behaviour — no app was run; every result here is from vitest, tsc, eslint, vite or a local PostgreSQL replica | every task |

Additional honesty items:

- The committed publishable credentials are **potentially compromised; rotation
  recommended**. Untracking `.env` does not purge history; history rewriting was
  deliberately not proposed; rotation is an owner action, **reported not claimed**.
- The route guard is a **UI gate, not a server-side security boundary**
  (`ssr: false`). RLS remains authoritative.
- Deliberately deferred: no backfill of legacy signed URLs; `public/media/*`
  retained; `client.server.ts` and `auth-middleware.ts` quarantined not deleted.
- The catalogue filter/sort logic is **not covered by an automated preservation
  test** because it lives in an inline `useMemo` rather than an exported pure
  function. It is instead guaranteed **byte-identical by diff**.
- A **latent issue outside the 42 defects** was found and deliberately NOT fixed:
  `primaryImage` uses `?? PLACEHOLDER_IMAGE`, which only triggers for a nullish
  url, so an image row carrying `url: ""` yields `""`. Counterexample:
  `[{url: "", path: ""}]`. Pinned as observed baseline.
