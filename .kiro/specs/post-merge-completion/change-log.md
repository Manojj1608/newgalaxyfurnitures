# Post-Merge Completion — Change Log

Base: merged `main` @ `9f434af` (PR #1). Branch: `fix/post-merge-completion`.

Every claim below is backed by a command actually executed in this sandbox. Anything not
executed is recorded in section (c) as **NOT VERIFIED**.

## Verification evidence (real exit codes, run in this order)

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `bun run typecheck` | **0** | no diagnostics |
| 2 | `bun run test` | **0** | **384 passed / 26 files** (baseline 259 / 18); none deleted, skipped or weakened |
| 3 | `bun run build` | **0** | succeeds with the nine `src/assets/` files gone |
| 4 | `bun run lint` | **1** | **679 problems (673 errors, 6 warnings)** — 672 `prettier/prettier`, 6 `react-refresh/only-export-components` |

**Lint does NOT pass and is not reported as passing.** It exits non-zero, exactly as it did
on `main`. The bar was *do not increase* against the measured baseline of **732 problems
(726 errors, 6 warnings; 725 `prettier/prettier`, 6 `react-refresh/only-export-components`)`.

Per-file delta vs the task-1 baseline:

- **Files increased: NONE.**
- Files decreased (8): `products-panel.tsx` 21→0, `homepage-panel.tsx` 13→0,
  `categories-panel.tsx` 12→0, `product-card.tsx` 2→0, `enquiries-panel.tsx` 2→0,
  `settings-panel.tsx` 1→0, `adaptive-image.tsx` 1→0, `sitemap[.]xml.ts` 1→0 — all files this
  spec substantially edited, formatted with `prettier --write` **on those paths only**.
- Every other file is byte-identical in count, including `types.ts` (529), `catalogue.tsx` (5)
  and `routes/index.tsx` (2). Unrelated prettier reformats that `prettier` produced in
  `index.tsx`, `catalogue.tsx`, `settings-panel.tsx` and `product.$handle.tsx` were
  **manually reverted** so those diffs stay purely functional — in particular the catalogue
  `suggestions` `useMemo` and the sort/filter/paging code, which 3.8 forbids touching.
- `react-refresh` warnings remain **exactly 6**; no 7th was added. No component is exported
  from a route file, and no constant is exported from a component file.
- All 11 new files contribute **zero** lint problems (verified: they appear nowhere in the output).
- A repo-wide `prettier --write` was never run.

`3.23` confirmed by git: 22 migration files, `git diff 9f434af HEAD -- supabase/` is **empty**.
No migration was edited and none was added — `site_settings.logo_url` already existed.

---

## (a) Inherited already-fixed from PR #1 — not re-fixed, not re-claimed here

These were merged at `9f434af` and are explicitly **out of scope**. This spec consumes them and
reverted, duplicated or re-implemented none of them:

storage bucket migration · storage policy alignment to the staff model · admin route guard and
staff-model `useAuth` · anon role-oracle revocation · `.env` untracking · the shared validated
upload pipeline (`src/lib/uploads.ts` + `src/hooks/use-image-upload.ts`) · zero-row mutation
detection (`src/lib/mutations.ts`) · loading/empty/error separation (`src/lib/query-state.ts` +
`QueryFailed`) · product metadata (`src/lib/product-metadata.ts`) · clipboard handling
(`src/lib/clipboard.ts`) · dead-code removal · the vitest/typecheck test infrastructure.

`src/lib/logo.ts` and `src/lib/links.ts` were **not edited** — `git diff` on both is empty. Their
15 and 26 tests run unmodified and pass. The fix for those two families was import-and-wire.

---

## (b) Newly completed in this spec

### 1.1 — a stored `logo_url` bypassed the merged guard · **HIGH**

- **Issue** `site-header.tsx:84-87` rendered `settings?.logo_url ? <img src={settings.logo_url}>` — the raw stored string reached `src`, so `""`, `"   "`, `"javascript:alert(1)"` or `"ftp://x/y.png"` defeated the `NGMonogram` fallback.
- **Root cause** Wiring never happened, and the brand mark had no single owner. `resolveLogoSrc` was written and tested but no application component imported it (verified: importer set was empty).
- **Files changed** `src/components/site/brand-mark.tsx` (new), `src/components/site/site-header.tsx`.
- **Fix implemented** New `BrandMark` owns the mark and resolves through the merged `resolveLogoSrc`; `NGMonogram` moved **verbatim** into that file and is re-exported from `site-header.tsx` so `index.tsx`'s import path is untouched. Both files export components only. `src/lib/logo.ts` not edited.
- **Verification performed** Exploration case 1: three rejected values each render the monogram with no `img`; `importersOf("@/lib/logo")` is non-empty. Failed before the fix (`expected <img class="h-9 w-auto"> to be null`), passes after.
- **Result** Resolved.

### 1.2 — a logo that fails to load left a permanent broken image · **HIGH**

- **Issue** The header `img` had no `onError`, so a deleted object or network failure showed the browser's broken-image box for the life of the page and the fallback was unreachable.
- **Root cause** Same absent owner — there was nowhere to attach a handler once.
- **Files changed** `src/components/site/brand-mark.tsx`.
- **Fix implemented** `failed` state set by `onError`, reset by a `useEffect` on `src` change so a newly configured logo gets a fresh chance. Renders `NGMonogram` when `src === null || failed`. State-based, not `currentTarget.src` mutation, which is what makes the fallback reachable at runtime.
- **Verification performed** Exploration case 2 plus F11's component test: `fire.error` on the `img` at all three sizes reveals the monogram and removes the `img`; a later valid URL still renders.
- **Result** Resolved.

### 1.3 — an odd-ratio or oversized logo distorted the header · **MEDIUM**

- **Issue** `className="h-9 w-auto"` only — no `max-width`, no `max-height`, no `object-contain`, so a 3000×400 banner blew out the brand block.
- **Root cause** `LOGO_IMG_CLASS` existed but was applied nowhere.
- **Files changed** `src/components/site/brand-mark.tsx`.
- **Fix implemented** Module-private size map: `header` → `LOGO_IMG_CLASS` verbatim; `about` → `h-20 w-auto max-h-20 max-w-[400px] object-contain`; `footer` → `h-12 w-auto max-h-12 max-w-[240px] object-contain`. The two new max-widths keep `LOGO_IMG_CLASS`'s 5:1 ceiling at the existing heights.
- **Verification performed** Exploration case 1 asserts `max-h-9`, `max-w-[180px]` and `object-contain` on an accepted logo. Failed before (`expected 'h-9 w-auto' to contain 'max-h-9'`).
- **Result** Resolved.

### 1.4 — the logo was a free-text URL field · **HIGH**

- **Issue** The only control was `["logo_url", "Logo URL"]` inside `TEXT_FIELDS` — no upload, preview, replace, remove, validation or feedback.
- **Root cause** Settings treated a managed asset as free text; the generic map could only render a generic `Input`.
- **Files changed** `src/components/admin/settings-panel.tsx`.
- **Fix implemented** `logo_url` removed from `TEXT_FIELDS`; one `Label`/preview/actions block added above the grid using only `Button`, `Input` and `Label` already imported there. Preview renders `BrandMark` against the **pending draft**, so admin and storefront cannot disagree. Hidden file input → `validateUploadFile` → on failure `toast.error` and return without touching state → on success `uploadOne` then `set("logo_url", image.url)`. **Exactly one upload path** (`useImageUpload` over `validateUploadFile`). Draft model: persistence only via the existing `submit` → `saveSettings` → `logAudit` → invalidate flow. "Remove" sets `""`, which `submit` already maps to `null`.
- **Verification performed** 7 component tests driving the real panel with `FakeSupabase`: exactly one storage upload in the `product-images` bucket, one `media` insert, Save disabled until staged, payload `{logo_url: <public url>}` only on Save, an invalid file attempts no upload and preserves the previous logo, a thrown upload preserves it too, Remove yields `{logo_url: null}` and issues no storage remove. Greps confirm no `TEXT_FIELDS` entry and no `.storage.`/`uploadProductImage` in the file.
- **Result** Resolved. **No committed logo binary, no hardcoded logo URL, nothing pre-seeded, no migration.**
- **Accepted trade-off (recorded, not an oversight)** "Remove" deliberately does **not** call `removeOne`, so the storage object survives as an orphan manageable from the media panel. Deleting before Save would destroy the live logo while the column still pointed at it.
- **Reconciliation** `validateUploadFile` returns `message`, not `reason` as `tasks.md` states. The real merged API is used.

### 1.5 — the site showed two different brand marks at once · **MEDIUM**

- **Issue** `NGMonogram` was hardcoded at `index.tsx:260` (about) and `:395` (footer), so a configured logo appeared in the header only.
- **Root cause** No single owner for the mark.
- **Files changed** `src/routes/index.tsx`.
- **Fix implemented** Both call sites became `<BrandMark settings={settings} size="about"|"footer" />`; `settings` was already in scope. `grep NGMonogram src/routes/index.tsx` now returns nothing. Diff confined to the import plus the two call sites.
- **Verification performed** F11 tests the `onError` fallback at all three sizes; preservation 3.1 pins `h-20 w-20` and `h-12 w-12` for the no-logo case.
- **Result** Resolved.

### 1.6 — hero CTAs were passed raw to a typed `<Link>` · **HIGH**

- **Issue** Any `button_link` not starting with `#` went straight into `<Link to={banner.button_link}>` — `https://wa.me/…` or an unregistered path produced a failed navigation or an error boundary.
- **Root cause** Wiring never happened: no `.tsx` file imported `classifyLink` (verified empty).
- **Files changed** `src/components/site/hero-slider.tsx`. `src/lib/links.ts` **not edited**.
- **Fix implemented** Four-way render from `classifyLink`: `anchor` → today's `<a href>`; `external` → `<a href rel="noopener noreferrer">`; `internal` → `<Link to>`; `none` → nothing. Classes, copy and position unchanged (extracted to one shared `CTA_CLASS` constant with the identical string).
- **Verification performed** Exploration case 3 (external gets `rel`, unregistered path renders no CTA, module is imported) and preservation 3.10 (six exact link/href/class cases plus a 20-run property). The merged 26 `links.test.ts` tests pass untouched.
- **Result** Resolved.
- **Accepted narrowing (recorded)** `/admin/`, `/admin/dashboard` and the non-page handlers now classify as `none`. Neither is a working storefront CTA; widening would require weakening `src/lib/links.test.ts:34`, which 3.25 forbids.

### 1.7 — `robots.txt` allowed everything and declared no sitemap · **MEDIUM**

- **Issue** The file was exactly `User-agent: *` / `Allow: /`.
- **Root cause** Hygiene debt.
- **Files changed** `public/robots.txt`.
- **Fix implemented** Exactly two added lines: `Disallow: /admin` and `Sitemap: https://newgalaxyfurnitures.lovable.app/sitemap.xml`. `Allow: /` retained, so nothing indexable today is disallowed. Origin reconciled with `SITE_ORIGIN` (`product-metadata.ts:19`) — no URL invented. Supplements the per-route `noindex` and the login `next` guard rather than replacing them.
- **Verification performed** `git diff` shows exactly two added lines; three F11 tests read the file from disk and pin the `Sitemap:` value to `` `${SITE_ORIGIN}/sitemap.xml` `` so the two can only drift deliberately.
- **Result** Resolved (file bytes). See (c) for the served-domain caveat.

### 1.8 — a failing sitemap query published a cacheable truncated 200 · **MEDIUM**

- **Issue** The handler destructured only `data`; on failure `(data ?? [])` yielded a 200 containing just `/` with `Cache-Control: public, max-age=3600` — a truncated sitemap both published and cached for an hour, failure never reported.
- **Root cause** Server-side failures were silently degraded — the same class `query-state.ts` fixed on the client, not yet applied on the server.
- **Files changed** `src/lib/sitemap.ts` (new), `src/routes/sitemap[.]xml.ts`.
- **Fix implemented** `renderSitemapXml` and `sitemapResponse` lifted verbatim. Non-null `error` → **503 + `Cache-Control: no-store`**; null `error` → today's XML with `application/xml` and `max-age=3600`, byte-identical. Handler is now a thin adapter that inspects the previously discarded `error` and logs `console.error("[sitemap]", error)` — the correct server channel, since `reportLovableError` no-ops without `window`. No error module added or deleted. The builder lives in `src/lib/` so the route still exports only `Route`.
- **Verification performed** 10 unit tests (golden bytes, empty rows, `lastmod` presence, row order, 503 + `no-store`, no `<urlset>` on failure, error-with-partial-data still 503, success headers, null-data success, `undefined` error treated as success) **plus** three preservation tests that invoke the **real route handler** and assert the recorded pre-change bytes and headers. Exploration case 4 failed before the fix with `Cannot find module '/src/lib/sitemap'`.
- **Result** Resolved.

### 1.9 — hero pagination controls were 4px tap targets · **MEDIUM**

- **Issue** The indicators are `h-1`, far below a usable minimum touch size.
- **Root cause** Interaction contracts were implemented visually.
- **Files changed** `src/components/site/hero-slider.tsx`.
- **Fix implemented** The `<button>` keeps its exact `h-1 rounded-full … w-10/w-4` visual classes and gains `relative` plus `after:absolute after:inset-x-0 after:-inset-y-5 after:content-['']` → ~44px. Growing the button box would have grown the `mt-12 flex gap-2` row and moved the hero copy; a pseudo-element changes no pixel.
- **Verification performed** `git diff` shows the visual classes unchanged; preservation 3.9 confirms rotation, ordering and styling. **Real tap size on a device: NOT VERIFIED — see (c).**
- **Result** Structurally resolved; device behaviour unverified.

### 1.10 — autoplay never paused on interaction · **MEDIUM**

- **Issue** The 7-second interval ran unconditionally, so a slide could change mid-read or immediately after a manual selection.
- **Root cause** Interaction contracts implemented visually.
- **Files changed** `src/components/site/hero-slider.tsx`.
- **Fix implemented** `paused` state set on the pagination `onClick` and on `onMouseEnter`/`onFocus`/`onTouchStart` of the `<section>`, cleared on leave/blur; the interval effect early-returns. The `7000` constant, the `banners.length < 2` guard and priority ordering are untouched.
- **Verification performed** jsdom: after clicking "Show banner 2", advancing 7100ms leaves the heading on "Second" (before the fix it moved to "Third"). The control case still advances First→Second on the 7s timer.
- **Result** Resolved.

### 1.11 — `prefers-reduced-motion` was never consulted · **MEDIUM**

- **Issue** Automatic rotation ran regardless of an explicit OS-level request not to.
- **Root cause** Interaction contracts implemented visually.
- **Files changed** `src/hooks/use-prefers-reduced-motion.tsx` (new), `src/components/site/hero-slider.tsx`.
- **Fix implemented** New hook mirrors the `use-mobile.tsx` matchMedia pattern exactly (SSR-safe initial `false`, `addEventListener("change")`, cleanup). Autoplay early-returns when true; **manual selection stays fully functional** so no slide becomes unreachable. Existing opacity transitions untouched.
- **Verification performed** 5 hook unit tests (current value, no-preference, subscribe/unsubscribe lifecycle, live change, SSR-safe when `matchMedia` is absent) plus the jsdom hero case: under reduce the heading stays "First" across 7.1s and a further 21s. Before the fix it advanced to "Second".
- **Result** Resolved.

### 1.12 — decorative hero background images were announced · **LOW**

- **Issue** `alt={b.title}` on purely decorative background imagery, so the banner title was announced twice — once as the image and again as the `<h1>`.
- **Root cause** Interaction contracts implemented visually.
- **Files changed** `src/components/site/hero-slider.tsx`.
- **Fix implemented** `alt=""` + `aria-hidden`. `fetchPriority`, `loading`, `object-[38%_center]` and the scrim unchanged.
- **Verification performed** jsdom asserts `alt === ""` and `aria-hidden` present. Failed before with `expected 'Crafted for living' to be ''`.
- **Result** Resolved. **Real screen-reader output: NOT VERIFIED — see (c).**

### 1.13 — the suggestion popup had no combobox semantics · **MEDIUM**

- **Issue** A plain `<ul>` of `<button>`s: no `role="combobox"`, no `role="listbox"`, no `role="option"`, no `aria-expanded`, no `aria-activedescendant`.
- **Root cause** Interaction contracts implemented visually.
- **Files changed** `src/components/site/catalogue.tsx`.
- **Fix implemented** Input gains `role="combobox"`, `aria-controls`, `aria-expanded` reflecting real state, `aria-autocomplete="list"` and `aria-activedescendant` when highlighted; the list becomes `role="listbox"` with `role="option"` + `aria-selected` items wrapping the same `<button>`. Highlight uses the existing `hover:bg-accent` token. `useId()` scopes all ids.
- **Verification performed** Exploration case 7 plus 13 dedicated component tests. **The `suggestions` `useMemo` and every filter/sort/paging path were not touched** — verified by the 8 recorded suggestion arrays AND result sets still matching exactly, and by manually reverting the formatting `prettier` tried to apply to that block.
- **Result** Resolved.

### 1.14 — the suggestion list had no keyboard model · **MEDIUM**

- **Issue** No `onKeyDown` at all — no traversal, no Enter selection, no Escape dismissal.
- **Root cause** As 1.13.
- **Files changed** `src/components/site/catalogue.tsx`.
- **Fix implemented** ArrowDown/ArrowUp with wraparound (opening the list if closed), Enter applies the highlighted suggestion (otherwise falls through to today's submit), Escape closes **without clearing the query**, Tab unchanged.
- **Verification performed** 8 tests: ArrowDown wraps last→first, ArrowUp wraps first→last, ArrowUp opens a closed list at the last option, Enter applies and closes, Enter with nothing highlighted changes nothing, Escape keeps the query, typing reopens and clears the highlight, `aria-selected` on exactly one option.
- **Result** Resolved.

### 1.15 — the popup covered the results and never closed · **MEDIUM**

- **Issue** `onClick={() => setSearch(s.name)}` left the list open over the results, and there was no outside-click dismissal.
- **Root cause** As 1.13.
- **Files changed** `src/components/site/catalogue.tsx`.
- **Fix implemented** Selection keeps `setSearch(s.name)` and adds `setOpen(false); setActive(-1)`. Outside dismissal via one `document` `pointerdown` listener with cleanup, scoped by a `boxRef`.
- **Verification performed** 3 tests: clicking an option applies the name and closes; a pointer press on `document.body` closes; a press inside the region does not.
- **Result** Resolved.

### 1.16 — icon-only admin controls had no accessible name · **MEDIUM**

- **Issue** 16 `Pencil`/`Trash2`/`ChevronUp`/`ChevronDown` buttons across `products-panel.tsx` (3), `categories-panel.tsx` (6) and `homepage-panel.tsx` (7) carried no name.
- **Root cause** Interaction contracts implemented visually.
- **Files changed** `products-panel.tsx`, `categories-panel.tsx`, `homepage-panel.tsx`.
- **Fix implemented** `aria-label` stating **action + target** in PR #1's media-panel pattern — `Edit ${p.name}`, `Move ${p.name} to trash`, `Permanently delete ${p.name}`, `Move ${c.name} up`/`down`, `Edit banner ${b.title}`, and so on. A module-private `sectionLabel()` helper (not exported, so no react-refresh warning) names homepage sections the way the visible row label does. Attribute-only; no visual change. `enquiries-panel.tsx` correctly excluded — its icons sit beside visible text.
- **Verification performed** A source scan resolves every icon tag to its enclosing `Button` opening tag and asserts an `aria-label`: **16 unnamed before, 0 after**.
- **Result** Resolved. **Real screen-reader output: NOT VERIFIED — see (c).**

### 1.17 — no admin field was associated with its label · **MEDIUM**

- **Issue** 40 `<Label>` elements across five panels and **zero** `htmlFor` anywhere in `src/components/admin/`.
- **Root cause** As 1.16.
- **Files changed** `products-panel.tsx` (20), `homepage-panel.tsx` (9), `categories-panel.tsx` (8), `settings-panel.tsx` (2), `enquiries-panel.tsx` (1).
- **Fix implemented** `useId()` per mounted component instance (`ProductDialog`, `CategoryDialog`, `SectionForm`, `BannerDialog`, `NotesForm`, `SettingsPanel`), then matching `htmlFor`/`id` pairs. For fields inside a `map` the row key is included, so a reopened dialog or two adjacent rows cannot collide. No index-based or module-counter ids. Rendered layout and label copy unchanged.
- **Verification performed** Per-file counts: `products 20/20`, `homepage 9/9`, `categories 8/8`, `settings 3/3`, `enquiries 1/1`, `media 0/0` — every Label associated.
- **Result** Resolved.
- **Recorded reconciliation** The total is **41**, not the 40 in `1.17`: F2's managed-asset logo control legitimately adds one further associated `Label` to `settings-panel.tsx`. Every site is accounted for and none was removed; the exploration test pins the stronger per-file "every Label is associated" invariant plus the explicit `settings-panel 3/3`.

### 1.18 — cached-complete images wrote state during commit · **MEDIUM**

- **Issue** Both `adaptive-image.tsx` and `product-card.tsx:54` called a state setter from a `ref` callback, forcing extra renders on every mount of a cached image.
- **Root cause** Measuring intrinsic size after mount is inherently a second pass, so the author reached for the earliest hook available — which lands in commit phase.
- **Files changed** `src/components/site/adaptive-image.tsx`, `src/components/site/product-card.tsx`.
- **Fix implemented** `useRef` + a post-commit `useEffect` that measures when `complete && naturalWidth && naturalHeight` and commits **only when the clamped applied ratio actually changes**. The `onLoad` path for non-cached images is unchanged.
- **Verification performed** React `Profiler` commit counting with a cached square image simulated at the jsdom DOM boundary: **3 commits before, exactly 1 after**, for both components. `grep "ref={(el)"` returns nothing.
- **Result** Resolved. **Not over-claimed:** a genuinely different ratio still costs one re-render, which is inherent to measuring after load.

### 1.19 — no intrinsic sizing or responsive hints · **MEDIUM**

- **Issue** No `width`/`height` and no `sizes`, so grids shifted as ratios arrived and the full-size original was served to every viewport.
- **Root cause** Nothing supplied sizing hints ahead of load.
- **Files changed** `src/components/site/adaptive-image.tsx`, `src/components/site/product-card.tsx`.
- **Fix implemented** `width` (nominal 1200) and `height` derived from the applied clamped ratio, so the assumed intrinsic ratio matches the reserved frame, plus `sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"`. `loading="lazy"` / `decoding="async"` unchanged. The `sizes` string is module-private and repeated in both files on purpose: exporting a constant from a component file would trip a 7th `react-refresh` warning.
- **Verification performed** Attribute assertions for `width`, `height` and the exact `sizes` value; the 3.2 clamp property (40 generated dimension pairs) and both golden ratio tables still pass.
- **Result** **PARTIALLY delivered — recorded as a gap, not a pass.** See (c): no `srcSet` is synthesised, so the "appropriately sized per viewport" half of **2.19 is NOT delivered**.

### 1.20 — eighteen unreferenced image files shipped · **LOW**

- **Issue** All nine filenames existed in both `src/assets/` and `public/media/`, and neither set was referenced anywhere in `src/`.
- **Root cause** Reference-checking was manual.
- **Files changed** Nine deletions under `src/assets/`.
- **Fix implemented** Deleted exactly the nine bundler-scoped `src/assets/*.jpg` copies, which no external URL can resolve to. **Kept all nine `public/media/*`** — directly addressable, external dependence NOT VERIFIED.
- **Verification performed** `git grep -e "@/assets" -e "src/assets" -- src` returned **0** before deleting; after, `src/assets` is gone, `public/media` still holds exactly the nine recorded filenames, `git diff --stat 9f434af HEAD` shows exactly nine `src/assets/` deletions and **zero** under `public/media/`, and `bun run build` exits 0.
- **Result** Resolved.

### 1.21 — three deferred component behaviours were uncovered · **MEDIUM**

- **Issue** PR #1's task 11.3 was not done: no component test for the media-panel error card, the product 404-vs-load-failure distinction, or the logo `onError` fallback.
- **Root cause** Cut for time.
- **Files changed** `src/components/site/product-not-found.tsx` (new), `src/routes/product.$handle.tsx`, `src/test/deferred-components.test.tsx` (new), plus `src/test/render-harness.tsx` (new).
- **Fix implemented** Media-panel error card tested by rendering the real `MediaPanel` with `FakeSupabase` returning `postgrestError(...)`. The product 404 state moved **verbatim** into `ProductNotFound` in `src/components/site/` and imported by the route — **no component is exported from the route file**, which would have added a 7th `react-refresh` warning. Logo `onError` tested on the real `BrandMark`. A new `render-harness.tsx` supplies a genuine memory router carrying the real route set (`/`, `/product/$handle`, `/admin/login`) so components rendering `<Link>` can be exercised for real; it is a real router, never an assertion subject.
- **Verification performed** 21 tests in `deferred-components.test.tsx`: error copy + retry + re-issued query, empty-vs-error separation, the exact 404 copy and `/` CTA, the load-failure state with retry and no 404 copy, branch selection pinned through the merged `queryStateOf`, `onError` at all three mark sizes, five `resolveLogoSrc`-rejected values, recovery after a failure, three robots.txt assertions and three asset-deletion assertions. `src/test/supabase-fake.ts` is the sole fake; no test asserts a mock's configured value back.
- **Result** Resolved.

### 1.22 — lint carried no signal · **LOW**

- **Issue** `bun run lint` exited non-zero with 732 pre-existing problems, so a genuinely new violation was indistinguishable from the noise and no baseline was recorded.
- **Root cause** Hygiene and signal debt.
- **Files changed** None (measurement and this record).
- **Fix implemented** The baseline was measured **per file** before any edit and re-measured after. The bar was *do not increase*; reformatting the repository to clear it stayed out of scope, being exactly the stylistic mass refactor the constraints forbid.
- **Verification performed** Baseline **732 (726 errors, 6 warnings; 725 `prettier/prettier`, 6 `react-refresh/only-export-components`)** → after **679 (673 errors, 6 warnings; 672 `prettier/prettier`, 6 `react-refresh`)**. **No file increased**; 8 decreased; 11 new files contribute zero. `react-refresh` stayed at exactly 6.
- **Result** Recorded and honoured. **Lint still exits non-zero and is never reported as passing.**

---

## (c) Still NOT VERIFIED

Nothing below was observed. It is listed as unknown, not assumed.

**Live Supabase state** — only an anon/publishable key is available here:
- the real contents of `site_settings`, and whether any `logo_url` is currently stored;
- the live storage bucket's public flag;
- live policy and grant state;
- a real upload against live Supabase storage (the F2 flow is verified only against `FakeSupabase`).

**All real-browser and real-device behaviour** — no dev server, no browser, no device was run. jsdom assertions are structural evidence, not device evidence:
- real rendering of the logo, the hero or the catalogue;
- **real tap-target size** for the ~44px hero pagination hit area (1.9);
- **real layout shift** with the new `width`/`height` hints (1.19);
- **real screen-reader output** for the combobox announcements (1.13–1.15), the admin accessible names (1.16), the label associations (1.17) and the decorative hero background (1.12);
- real motion rendering under `prefers-reduced-motion`.

**External dependence on `public/media/*`** — unknown, which is exactly why all nine files were kept (2.20, 3.22).

**Supabase image-transform (`/render/image/…`) availability** — and therefore the **undelivered `srcSet` half of 2.19**. No `srcSet` was synthesised: smaller variants would require transforms whose availability on this project is NOT VERIFIED, and a wrong transform URL would 404 live product imagery. Consequently `sizes` cannot yet affect selection, and "appropriately sized images per viewport" is **NOT delivered** — a follow-up gated on verifying transforms, recorded here as a gap rather than a silent pass.

**Which domain production actually serves** for the `Sitemap:` directive — a static file cannot read the request origin. The directive is reconciled with `SITE_ORIGIN` and pinned by a test so it and the handler's request-derived `<loc>` can only drift deliberately, but the served domain itself is unverified.

**The logo artwork** — supplied as a chat image attachment that cannot be written to disk from this environment. The deliverable is the runtime upload flow; the owner uploads the artwork through the admin panel after deploy. **No binary is committed and no logo URL is hardcoded anywhere.**

---

## Accepted trade-offs, recorded verbatim

1. **Orphaned storage object on logo Remove.** "Remove" sets `""` (which `submit` maps to `null`) and deliberately does **not** call `removeOne`. Deleting the object before Save would destroy the live logo while the column still pointed at it; orphans remain manageable in the media panel.
2. **`/admin/*` hero-CTA narrowing.** `/admin/`, `/admin/dashboard` and the non-page handlers now classify as `none`. Neither is a working storefront CTA, both are `noindex` territory, and widening the set would require weakening `src/lib/links.test.ts:34`, which 3.25 forbids.
3. **Duplicated accessible name in the header link.** `BrandMark`'s `alt` is the configured company name, which duplicates the adjacent header `<span>` inside the link's accessible name. Accepted, because 2.1 requires the mark to be named in its own right rather than depending on neighbouring text that only the header happens to have.
4. **The `sizes` string is duplicated** between `adaptive-image.tsx` and `product-card.tsx` rather than shared, because exporting a constant from a component file would add a 7th `react-refresh/only-export-components` warning and breach the 2.22 no-increase bar.
