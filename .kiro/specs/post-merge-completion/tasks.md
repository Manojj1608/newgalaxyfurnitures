# Implementation Plan

## Overview

- Executes design families **F1–F12** against merged `main` @ `9f434af`. `bugfix.md` and `design.md` are authoritative and unmodified; clauses are **cited, not restated**.
- Five waves. Wave 1 is enablement only (baselines + the two property tests, **no source edits**). Wave 2 is Priority 1 (logo). Wave 3 is eight independent families. Wave 4 is the deferred component tests. Wave 5 is verification and the change log.
- Every task carries: defect IDs (1.x), fix clauses (2.x), exact files, a one-line `_Verify:_`, and an `_Env:_` claim boundary.
- `_Env:_` values — **SANDBOX-COMPLETE** = statically verifiable here (code, unit/component tests, typecheck, build, grep/diff). **NOT-VERIFIABLE-HERE** = needs a real browser/device or live Supabase. A task may carry both, split by scope; the split is the honest claim, not a hedge.
- Fix work is **import-and-wire** of already-merged modules. `src/lib/logo.ts` and `src/lib/links.ts` are **not edited**.

## Task Dependency Graph

| Wave | Tasks | Families | Depends on | Parallel |
|---|---|---|---|---|
| 1 | 1, 2, 3 | F12 baseline, Property 1, Property 2 | — | 2 and 3 after 1 |
| 2 | 4, 5 | F1, F2 | 4 → 1; 5 → 4 | no (5 reuses `BrandMark`) |
| 3 | 6–13 | F3, F4, F5, F6, F7, F8, F9, F10 | wave 1 | yes, all eight |
| 4 | 14 | F11 | 4 (logo `onError`), 8 (sitemap), 7 (robots) | no |
| 5 | 15, 16 | verification, change log | all above; 16 → 15 | no |

```
1 baseline (F12)
├─► 2 Property 1 (must FAIL)      ─┐
├─► 3 Property 2 (must PASS)      ─┤
│                                  │
├─► 4 F1 BrandMark ──► 5 F2 admin ─┤
│        │                         │
├─► 6 F3  7 F4  8 F5  9 F6         │  (wave 3: mutually independent)
│   10 F7 11 F8 12 F9 13 F10       │
│        │        │                │
└────────┴────────┴──► 14 F11 ─────┴──► 15 verify ──► 16 change log
              (14 needs 4 + 8 + 7)
```

```json
{
  "baseline": {
    "tests": 259,
    "testFiles": 18,
    "lintProblems": 732,
    "lintErrors": 726,
    "lintWarnings": 6,
    "prettierProblems": 725,
    "reactRefreshWarnings": 6,
    "commit": "9f434af"
  },
  "waves": [
    {
      "wave": 1,
      "name": "Enablement and baseline",
      "tasks": ["1", "2", "3"],
      "families": ["F12"],
      "dependsOn": [],
      "parallel": false,
      "sourceEdits": false,
      "gate": "per-file lint counts captured; 259-test floor confirmed; Property 1 FAILS; Property 2 PASSES"
    },
    {
      "wave": 2,
      "name": "Priority 1 - logo",
      "tasks": ["4", "5"],
      "families": ["F1", "F2"],
      "dependsOn": [1],
      "parallel": false,
      "note": "5 depends on 4: the settings preview reuses BrandMark"
    },
    {
      "wave": 3,
      "name": "Priority 2 - independent families",
      "tasks": ["6", "7", "8", "9", "10", "11", "12", "13"],
      "families": ["F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10"],
      "dependsOn": [1],
      "parallel": true,
      "note": "mutually independent; no shared file between any two"
    },
    {
      "wave": 4,
      "name": "Deferred component tests",
      "tasks": ["14"],
      "families": ["F11"],
      "dependsOn": [2, 4, 7, 8],
      "parallel": false
    },
    {
      "wave": 5,
      "name": "Verification and change log",
      "tasks": ["15", "16"],
      "families": ["F12"],
      "dependsOn": [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "parallel": false,
      "commandOrder": ["bun run typecheck", "bun run test", "bun run build", "bun run lint"]
    }
  ]
}
```

## Tasks

### Wave 1 — Enablement and baseline (no source edits)

- [x] 1. Capture pre-edit baselines (F12)
  - Run `bun run lint 2>&1 | tee .kiro/tmp-lint-before.txt` — record the **per-file** problem counts, not just the total, before any edit
  - Confirm the totals match 1.22 exactly: 732 problems (726 errors, 6 warnings; 725 `prettier/prettier`, 6 `react-refresh/only-export-components`)
  - Run `bun run test` — confirm the **259-test / 18-file floor**; this is the regression floor for the whole spec
  - Run `bun run typecheck` and `bun run build` — record real exit codes as the pre-change reference
  - Record the per-file table in the task notes; it is the comparison target for task 15
  - Lint is **never** reported as passing — it exits non-zero today and must be described that way
  - _Verify:_ per-file counts summing to 732 are recorded, and `bun run test` reports 259 passing.
  - _Env: SANDBOX-COMPLETE_
  - _Requirements: 1.22, 2.22, 3.25_

- [x] 2. Write bug condition exploration tests (BEFORE any fix)
  - **Property 1: Bug Condition** - Deferred Defects Behave Correctly
  - **CRITICAL**: these tests MUST FAIL on unfixed code — failure confirms the defects exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: these tests encode the expected 2.x behaviour and become the fix check in task 15
  - **Scoped PBT approach**: these defects are deterministic, so scope each property to its concrete failing case (design §Exploratory bug condition checking, cases 1–9)
  - Cover, one case per family: logo import-graph + `"   "` / `"javascript:alert(1)"` reaching the header `img` (1.1); header `img` has no `onError` (1.2); `classifyLink` has no `.tsx` consumer and `https://wa.me/…` reaches `<Link to>` (1.6); `robots.txt` lacks `Disallow: /admin` and `Sitemap:` (1.7); erroring products query yields a cacheable 200 (1.8); reduced-motion still auto-advances (1.11); suggestion region has no `role`/`aria-expanded`/`aria-activedescendant`/`onKeyDown` (1.13, 1.14); icon-only admin buttons unnamed and `htmlFor` count is 0 (1.16, 1.17); cached-complete image writes state in commit phase (1.18)
  - Use `src/test/supabase-fake.ts` as the **sole** boundary fake; never assert a mock's configured value back
  - **EXPECTED OUTCOME**: tests FAIL — this is correct
  - Document each counterexample and mark whether it **confirms or refutes** the matching root-cause hypothesis (design §Hypothesized Root Cause 1–7). A refutation means re-hypothesising, not editing the test
  - _Verify:_ every new exploration test fails on `9f434af`, with counterexamples and hypothesis outcomes recorded.
  - _Env: SANDBOX-COMPLETE (jsdom + static assertions) / NOT-VERIFIABLE-HERE (real screen-reader output, real device tap targets, real layout shift)_
  - _Requirements: 1.1, 1.2, 1.6, 1.7, 1.8, 1.11, 1.13, 1.14, 1.16, 1.17, 1.18_

- [x] 3. Write preservation property tests (BEFORE any fix)
  - **Property 2: Preservation** - Untriggered Surfaces Are Byte-Identical
  - **IMPORTANT**: observation-first — run the UNFIXED code, record the actual outputs, then assert those recorded values
  - Six properties, per design §Preservation checking: monogram fallback at `h-9 w-9` / `h-20 w-20` / `h-12 w-12` (3.1); applied clamped ratio in both components (3.2); suggestion array + every result set for generated queries/filters (3.8); `renderSitemapXml` golden bytes and the `max-age=3600` header (3.20); hero CTA continuity for anchors and `/` + `/product/{slug}` (3.10); `saveSettings` payload for every non-logo field (3.13)
  - Also pin the `PLACEHOLDER_IMAGE` `onError` fallback (3.3) and all nine `public/media/*` paths (3.22)
  - Property-based generation where the claim is universal; recorded golden values where it is byte-exactness
  - **EXPECTED OUTCOME**: tests PASS on unfixed code — this confirms the baseline to preserve
  - _Verify:_ all preservation tests pass on `9f434af` and the recorded golden values are committed alongside them.
  - _Env: SANDBOX-COMPLETE_
  - _Requirements: 3.1, 3.2, 3.3, 3.8, 3.10, 3.13, 3.20, 3.22, 3.25_

### Wave 2 — Priority 1: logo

- [x] 4. F1 — Wire the guarded brand mark into all three sites

  - [x] 4.1 Create `src/components/site/brand-mark.tsx`
    - Move `NGMonogram` **verbatim** out of `site-header.tsx`; keep `aria-hidden` on it
    - `site-header.tsx` re-exports it (`export { NGMonogram } from "./brand-mark"`) so `index.tsx`'s existing import path is untouched
    - `BrandMark({ settings, size: "header" | "about" | "footer" })`: `resolveLogoSrc(settings?.logo_url)`, `failed` state reset by `useEffect` on `src` change, monogram when `src === null || failed`, else `<img>` with `onError={() => setFailed(true)}`
    - `alt` = configured company name — the mark is named in its own right, not by adjacent text (2.1)
    - Module-private size map: `header` → `LOGO_IMG_CLASS` **verbatim** + `h-9 w-9`; `about` → `h-20 w-auto max-h-20 max-w-[400px] object-contain` + `h-20 w-20`; `footer` → `h-12 w-auto max-h-12 max-w-[240px] object-contain` + `h-12 w-12`
    - `src/lib/logo.ts` is **NOT edited** — import and wire only
    - Both files export components only; **no non-component export from any route file** (would add a 7th `react-refresh` warning and breach 2.22)
    - _Verify:_ `grep -n "resolveLogoSrc\|LOGO_IMG_CLASS" src/components/site/brand-mark.tsx` matches and `git diff src/lib/logo.ts` is empty.
    - _Env: SANDBOX-COMPLETE_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

  - [x] 4.2 Replace the header ternary
    - `site-header.tsx:84-87` → `<BrandMark settings={settings} size="header" />`
    - Nothing else changes: fixed positioning, `h-20` bar, scroll-transition colours, company name, tagline, nav, mobile sheet (3.4)
    - _Verify:_ `git diff src/components/site/site-header.tsx` is confined to the mark call site plus the `NGMonogram` re-export.
    - _Env: SANDBOX-COMPLETE_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.4_

  - [x] 4.3 Wire the about and footer marks
    - `src/routes/index.tsx:260` → `size="about"`; `:395` → `size="footer"`; `settings` is already in scope at both
    - Removes the two-simultaneous-marks defect (1.5) while keeping both existing sizes for the no-logo case (3.1)
    - _Verify:_ `grep -n "NGMonogram" src/routes/index.tsx` returns no direct render, and `git diff` touches only those two call sites.
    - _Env: SANDBOX-COMPLETE_
    - _Requirements: 1.5, 2.5, 3.1_

- [x] 5. F2 — Managed-asset logo control in the settings panel (depends on 4)
  - Edit `src/components/admin/settings-panel.tsx` **only**
  - Remove `["logo_url", "Logo URL"]` from `TEXT_FIELDS`; every other field keeps its position, copy and save path (3.13)
  - Add one `Label` / preview / actions block above the text grid, built from `Button` + `Input` + `Label` already imported there — no new design vocabulary (3.18)
  - Preview renders `BrandMark` with the pending draft value, so admin and storefront cannot disagree
  - Upload: hidden `<Input type="file" accept="image/*">` → `validateUploadFile(file)` → on failure `toast.error(result.reason)` and **return without touching state** → on success `await uploadOne(file)` then `set("logo_url", image.url)`
  - **Exactly one upload path**: `useImageUpload` over `validateUploadFile`. A second path is a defect (3.11). `uploading` drives the button label/`disabled`; `summarise` supplies the batch-shaped message
  - Draft model, not immediate write: upload/remove call `set(...)`, enabling the existing "Save changes"; persistence only via the existing `submit` → `saveSettings` → `logAudit` → invalidate flow
  - "Remove" = `set("logo_url", "")`; `submit` already maps `"" → null`, clearing the column so 3.1 restores `NGMonogram`. `removeOne` is deliberately **not** called — the storage object survives (recorded trade-off, not an oversight)
  - Failure preserves the previous logo: rejected validation or a thrown `uploadOne` leaves `draft` untouched
  - **No migration** (`site_settings.logo_url` already exists; the 22 existing migrations are never edited), **no committed logo binary**, **no hardcoded logo URL**, nothing pre-seeded
  - _Verify:_ `grep -n "logo_url" src/components/admin/settings-panel.tsx` shows no `TEXT_FIELDS` entry and `grep -rn "\.storage\.\|uploadProductImage" src/components/admin/settings-panel.tsx` returns nothing.
  - _Env: SANDBOX-COMPLETE (control wiring, single-path grep, draft/save flow, typecheck) / NOT-VERIFIABLE-HERE (real upload against live Supabase storage, live bucket public flag, live `site_settings` contents)_
  - _Requirements: 1.4, 2.4, 3.11, 3.13, 3.23_

### Wave 3 — Priority 2: independent families (6–13 parallelisable)

- [x] 6. F3 — Classify hero CTA links
  - Edit `src/components/site/hero-slider.tsx` only; `src/lib/links.ts` is **NOT edited**
  - Replace the `startsWith("#")` ternary (`:49-64`) with `classifyLink(banner.button_link)` and a four-way render: `anchor` → today's `<a href>`; `external` → `<a href rel="noopener noreferrer">`; `internal` → `<Link to={cta.href}>`; `none` → render nothing
  - Classes, copy and position unchanged (3.9)
  - Recorded narrowing: `/admin/`, `/admin/dashboard` and the non-page handlers classify as `none`. Neither is a working storefront CTA; widening would require weakening `src/lib/links.test.ts:34`, which 3.25 forbids
  - _Verify:_ `grep -n "classifyLink" src/components/site/hero-slider.tsx` matches, no `startsWith("#")` remains, and the merged 26 `links.test.ts` tests pass untouched.
  - _Env: SANDBOX-COMPLETE_
  - _Requirements: 1.6, 2.6, 3.9, 3.10_

- [x] 7. F4 — robots.txt crawler contract
  - Edit `public/robots.txt`: keep `User-agent: *` and `Allow: /`, add `Disallow: /admin` and `Sitemap: https://newgalaxyfurnitures.lovable.app/sitemap.xml`
  - Origin reconciled with `SITE_ORIGIN` (`src/lib/product-metadata.ts:19`) — no new URL invented
  - Supplements the per-route `noindex` and the login `next` guard; replaces neither (3.21). No public URL changes; nothing indexable today is disallowed
  - _Verify:_ `git diff public/robots.txt` shows exactly two added lines.
  - _Env: SANDBOX-COMPLETE (file bytes) / NOT-VERIFIABLE-HERE (which domain production actually serves — a static file cannot read the request origin)_
  - _Requirements: 1.7, 2.7, 3.20, 3.21_

- [x] 8. F5 — Sitemap failure handling
  - **New** `src/lib/sitemap.ts`; **edit** `src/routes/sitemap[.]xml.ts`
  - Lift `renderSitemapXml(origin, rows)` and `sitemapResponse({ origin, data, error })` **verbatim** out of the handler
  - `error` non-null → `503` + `Cache-Control: no-store`, so no crawler can cache an incomplete document; `error` null → today's XML with `application/xml` + `max-age=3600`, **byte-identical** (3.20)
  - Handler becomes a thin adapter: destructure `error` (previously discarded), `console.error("[sitemap]", error)` on failure, return `sitemapResponse(...)`. `console.error` is the correct server channel — `reportLovableError` no-ops without `window`. No error module added or deleted (3.24)
  - Builder lives in `src/lib/`, **not exported from the route file** — a route exporting `Route` plus a function trips `react-refresh/only-export-components` and would raise the 732 baseline (2.22)
  - _Verify:_ golden-string test shows `renderSitemapXml` equals the pre-change bytes, and `sitemapResponse` with a non-null `error` returns 503 + `no-store`.
  - _Env: SANDBOX-COMPLETE_
  - _Requirements: 1.8, 2.8, 2.22, 3.20, 3.24_

- [x] 9. F6 — Hero accessibility and motion
  - **New** `src/hooks/use-prefers-reduced-motion.tsx`; **edit** `src/components/site/hero-slider.tsx`
  - Tap target (2.9): pagination `<button>` keeps its exact `h-1 rounded-full … w-10/w-4` visual classes and gains `relative` + `after:absolute after:inset-x-0 after:-inset-y-5 after:content-['']` → ~44px. Growing the button box would move the hero copy; the pseudo-element changes no pixel (3.9, 3.18)
  - Pause (2.10): `paused` state set on pagination `onClick` and on `onMouseEnter`/`onFocus`/`onTouchStart` of the `<section>`, cleared on leave/blur; the interval effect early-returns. `7000`, the `banners.length < 2` guard and priority ordering untouched
  - Reduced motion (2.11): new hook mirrors the `use-mobile.tsx` matchMedia pattern exactly (SSR-safe initial `false`, `addEventListener("change")`, cleanup). Autoplay early-returns when true; manual selection stays fully functional so no slide becomes unreachable. Existing opacity transitions left alone
  - Decorative background (2.12): background `<img>` gets `alt=""` + `aria-hidden`; `fetchPriority`, `loading`, `object-[38%_center]` and the scrim unchanged
  - _Verify:_ jsdom test shows no advance under reduce and none after a pagination click, advance on the 7s timer otherwise; `git diff` shows indicator visual classes unchanged.
  - _Env: SANDBOX-COMPLETE (jsdom timer/matchMedia behaviour, class diff) / NOT-VERIFIABLE-HERE (real tap-target size on a device, real motion rendering)_
  - _Requirements: 1.9, 1.10, 1.11, 1.12, 2.9, 2.10, 2.11, 2.12, 3.9, 3.18_

- [x] 10. F7 — Catalogue suggestion combobox
  - Edit `src/components/site/catalogue.tsx` only. **Do NOT touch the `suggestions` useMemo at `:174`, nor any filter, sort, paging or clear/reset logic** (3.8)
  - Local state only: `open`, `active`, `useId()`, `boxRef`
  - Input gains `role="combobox"`, `aria-controls`, `aria-expanded` reflecting real state, `aria-autocomplete="list"`, `aria-activedescendant` when `active >= 0`; existing `aria-label="Search products"`, classes and `onChange` kept
  - List becomes `role="listbox"` with `role="option"` + `aria-selected` items wrapping the same `<button>`; render condition `open && suggestions.length > 0`; highlight uses the existing `hover:bg-accent` token
  - `onKeyDown`: ArrowDown/ArrowUp with wraparound (opening if closed), Enter applies the highlighted suggestion (otherwise falls through to today's submit), Escape closes **without clearing the query**, Tab unchanged
  - Selection keeps `setSearch(s.name)` and adds `setOpen(false); setActive(-1)`; outside dismissal via one `document` `pointerdown` listener with cleanup
  - Diff confined to the state declarations plus `:300-335`
  - _Verify:_ component test drives ArrowDown → Enter → asserts the search value and a closed list, then Escape → closed with the query intact; the task 3 suggestion-set property still passes unchanged.
  - _Env: SANDBOX-COMPLETE (roles, keyboard model, result-set preservation) / NOT-VERIFIABLE-HERE (real screen-reader announcement)_
  - _Requirements: 1.13, 1.14, 1.15, 2.13, 2.14, 2.15, 3.8_

- [x] 11. F8 — Accessible names and label association
  - Edit `products-panel.tsx`, `categories-panel.tsx`, `homepage-panel.tsx`, `settings-panel.tsx`, `enquiries-panel.tsx`
  - Icon-only controls (2.16) get `aria-label` naming **action + target** in PR #1's media-panel pattern — `products-panel.tsx:452,455,505`, `categories-panel.tsx:171-195`, `homepage-panel.tsx:126-133,303-313`. Attribute-only, no visual change
  - `enquiries-panel.tsx` is excluded from 2.16 (its icons sit beside visible text) but carries one `<Label>` for 2.17
  - Label association (2.17) for all 40 labels (products 20, homepage 9, categories 8, settings 2, enquiries 1): `useId()` per instance, `htmlFor`/`id` pairs; for mapped rows include the row key (`${uid}-${row.id}-title`) so no duplicate id can exist and reopened dialogs stay unique. No index-based or module-counter ids
  - Rendered layout and label copy unchanged (3.13)
  - _Verify:_ `grep -c "htmlFor" src/components/admin/*.tsx` sums to 40 and `grep -rn "<Pencil\|<Trash2\|<ChevronUp\|<ChevronDown" src/components/admin/ | grep -v "aria-label"` returns nothing.
  - _Env: SANDBOX-COMPLETE (attribute presence, id uniqueness) / NOT-VERIFIABLE-HERE (real screen-reader output)_
  - _Requirements: 1.16, 1.17, 2.16, 2.17, 3.13_

- [x] 12. F9 — Image intrinsic sizing without commit-phase writes
  - Edit `src/components/site/adaptive-image.tsx`, `src/components/site/product-card.tsx`
  - Replace the `ref={(el) => …}` callback with `useRef` + a post-commit `useEffect` that measures when `complete && naturalWidth && naturalHeight`, committing only when the **clamped applied** ratio actually changes. The `onLoad` path for non-cached images is unchanged. A genuinely different ratio still costs one re-render — inherent to measuring after load, not over-claimed
  - **Preserve byte-identically** (3.2): `product-media` / `product-media-img` classes, `minRatio 0.75` / `maxRatio 1.5` / `fallbackRatio 1` in `AdaptiveImage`, `Math.min(1.25, Math.max(0.8, …))` in `ProductCard`, the `style={{ aspectRatio }}` frame, and the `PLACEHOLDER_IMAGE` `onError` fallback (3.3). Hover image, badges and "Made to order" overlay untouched
  - Add `width`/`height` from the applied clamped ratio (nominal `width = 1200`) and `sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"`; `loading="lazy"` / `decoding="async"` unchanged
  - **Deliberate gap, must be recorded in task 16:** no `srcSet` is synthesised. Smaller variants need Supabase image transforms whose availability is **NOT VERIFIED**, and a wrong transform URL 404s live imagery. So `sizes` cannot affect selection yet and the "right size per viewport" half of **2.19 is not delivered** — a follow-up gated on verifying transforms, not a silent pass
  - _Verify:_ the task 3 clamp property still passes, a render-count test asserts one commit for a cached image at the fallback ratio, and `grep -n "ref={(el)" src/components/site/adaptive-image.tsx src/components/site/product-card.tsx` returns nothing.
  - _Env: SANDBOX-COMPLETE (render counts, clamp preservation, attribute presence) / NOT-VERIFIABLE-HERE (real layout shift, per-viewport selection, Supabase transform availability)_
  - _Requirements: 1.18, 1.19, 2.18, 2.19, 3.2, 3.3_

- [x] 13. F10 — Delete unreferenced bundler assets
  - Delete exactly nine files: `src/assets/{category-bedroom,category-chairs,category-dining,category-office,category-outdoor,category-sofas,category-storage,category-tables,hero-luxury-living}.jpg` — bundler-scoped, so no external URL can resolve to them
  - **Keep all nine `public/media/*` files** — directly addressable, external dependence **NOT VERIFIED** (3.22). Nothing a production URL could resolve to is touched
  - _Verify:_ `git grep -n -e "@/assets" -e "src/assets" -- src | wc -l` → 0 before deleting; after, `ls src/assets 2>/dev/null | wc -l` → 0, `ls public/media | wc -l` → 9, and `bun run build` succeeds.
  - _Env: SANDBOX-COMPLETE_
  - _Requirements: 1.20, 2.20, 3.22_

### Wave 4 — Deferred component tests

- [ ] 14. F11 — Add the three deferred component tests (depends on 4, 7, 8)
  - New test files under the existing `src/test/` convention; **no test deleted, skipped or weakened** (3.25)
  - Media-panel error card: render the real `MediaPanel` with `FakeSupabase` returning `postgrestError(...)`; assert the `QueryFailed` copy "Could not load the media library." and its retry control
  - Product 404 vs load failure: move the two states into a small presentational component in `src/components/site/` with markup and copy **verbatim** ("Piece not found", the removed-from-showroom line, the Back-to-collection CTA); the route imports it. **Do not export a component from the route file** — that would add a 7th `react-refresh` warning and breach 2.22. Test the real component for not-found and the real `QueryFailed` for failure, pinning branch selection through the merged `queryStateOf`
  - Logo `onError`: render the real `BrandMark` with a valid `http(s)` `logo_url`, fire `error` on the `img`, assert the `NGMonogram` `svg` is present and the `img` gone; plus `resolveLogoSrc`-rejected values rendering the monogram directly
  - robots.txt assertion: read `public/robots.txt` from disk; `Allow: /` retained, `Disallow: /admin` present, `Sitemap:` equal to `` `${SITE_ORIGIN}/sitemap.xml` `` so the two can only drift deliberately
  - Asset-deletion assertion: F10 grep counts plus `git diff --stat` showing exactly nine deletions under `src/assets/` and zero under `public/media/`
  - `src/test/supabase-fake.ts` is the **sole** fake; no test configures a mock and asserts the mock's configured value back
  - _Verify:_ `bun run test` reports ≥ 259 + new passing with none skipped, and `git diff --stat -- src/test` shows additions only.
  - _Env: SANDBOX-COMPLETE_
  - _Requirements: 1.21, 2.21, 2.22, 3.25_

### Wave 5 — Verification and change log

- [ ] 15. Final verification run — real exit codes only

  - [ ] 15.1 Run the four commands in this exact order and record real output
    - `bun run typecheck` → record exit code and any diagnostics
    - `bun run test` → record exit code, test count and file count; must be **≥ 259 passing, none deleted, skipped or weakened** (3.25)
    - `bun run build` → record exit code; must succeed with the nine `src/assets/` files gone
    - `bun run lint` → record exit code and the tail total, then **diff per-file counts against the task 1 baseline**
    - Lint bar is **do not increase** vs 732 problems (726 errors, 6 warnings). Any per-file increase is a defect in this spec's own work, to be fixed by making the edited lines prettier-clean — never by a repo-wide `prettier --write`, which is the forbidden mass refactor
    - New files (`brand-mark.tsx`, `sitemap.ts`, `use-prefers-reduced-motion.tsx`, new tests, the extracted product-state component) are formatted with `prettier --write` **on those paths only** and must contribute **zero** problems
    - **Lint is NEVER reported as passing** — it exits non-zero and every report must say so
    - No fabricated evidence: a command not actually executed is recorded as not run
    - _Verify:_ all four exit codes and the per-file lint delta are recorded verbatim, with the lint total ≤ 732 and new files absent from its output.
    - _Env: SANDBOX-COMPLETE_
    - _Requirements: 2.22, 3.25, 3.26_

  - [ ] 15.2 Confirm the exploration tests now pass
    - **Property 1: Expected Behavior** - Deferred Defects Behave Correctly
    - **IMPORTANT**: re-run the SAME tests from task 2 — do NOT write new ones and do NOT add assertions to make them pass
    - **EXPECTED OUTCOME**: tests PASS, confirming each 2.x clause is satisfied
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 2.22_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 15.3 Confirm the preservation tests still pass
    - **Property 2: Preservation** - Untriggered Surfaces Are Byte-Identical
    - **IMPORTANT**: re-run the SAME tests from task 3 — do NOT write new ones
    - **EXPECTED OUTCOME**: tests PASS, confirming no regressions across 3.1–3.26
    - Confirm the 22 existing migrations are untouched and no migration was added
    - _Requirements: 3.1, 3.2, 3.3, 3.8, 3.10, 3.13, 3.20, 3.22, 3.23, 3.25_
    - _Env: SANDBOX-COMPLETE_

- [ ] 16. Write the change log
  - One entry per resolved defect with all seven fields: **Issue, Root cause, Files changed, Fix implemented, Verification performed, Result, Severity** (severity taken from the 1.x clause)
  - Three clearly separated sections:
    - **(a) Inherited already-fixed from PR #1** — bucket migration, storage policies, admin guard + staff `useAuth`, anon role-oracle revocation, `.env` untracking, the shared upload pipeline, `mutations.ts`, `query-state.ts` + `QueryFailed`, `product-metadata.ts`, `clipboard.ts`, dead-code removal, test infrastructure. **Not re-fixed, not re-claimed here**
    - **(b) Newly completed in this spec** — the F1–F12 entries with their real verification evidence
    - **(c) Still NOT VERIFIED** — live Supabase state (anon key only: `site_settings` contents, stored `logo_url`, bucket public flag, live policies/grants); all real-browser and real-device behaviour (rendering, tap targets, layout shift, screen-reader output); external dependence on `public/media/*`; Supabase image-transform availability and therefore the **undelivered `srcSet` half of 2.19**; which domain production serves for the `Sitemap:` directive; the logo artwork itself (uploaded by the owner post-deploy — no committed binary, no hardcoded URL)
  - Record the lint baseline as measured (732 / 726 / 6; 725 `prettier/prettier`, 6 `react-refresh/only-export-components`) and state that lint still exits non-zero
  - Record the accepted trade-offs verbatim: the orphaned storage object on logo Remove, the `/admin/*` hero-CTA narrowing, and the duplicated accessible name in the header link
  - _Verify:_ every resolved 1.x defect has all seven fields, and each of (a), (b), (c) is a distinct labelled section with nothing double-counted.
  - _Env: SANDBOX-COMPLETE_
  - _Requirements: 2.22, 3.25_

## Notes

**Hard rules — a violation of any is a defect in this spec's own work:**

- **Reuse PR #1 modules.** `src/lib/logo.ts` and `src/lib/links.ts` are **NOT edited** — the fix is import-and-wire. Nothing merged in PR #1 is reverted, redone or duplicated.
- **Exactly one upload path**: `useImageUpload` over `validateUploadFile`. A second upload implementation is a defect, not a fix (3.11).
- **Preserve `product-media` framing byte-identically**, including the clamps `0.75–1.5` (`AdaptiveImage`) and `0.8–1.25` (`ProductCard`) and the `PLACEHOLDER_IMAGE` `onError` fallback (3.2, 3.3).
- **Do not touch** the catalogue `suggestions` `useMemo` or any filter/sort/paging logic (3.8).
- **259-test floor.** No test deleted, skipped or weakened to accommodate a change (3.25).
- **Never edit the 22 existing migrations**; no migration is expected (`site_settings.logo_url` already exists) (3.23).
- **No committed logo binary, no hardcoded logo URL, nothing pre-seeded.** The deliverable is the runtime upload flow.
- **F9 delivers `sizes` + intrinsic `width`/`height` but NOT `srcSet`.** The "right size per viewport" half of 2.19 is **deliberately not delivered** because Supabase transform availability is **NOT VERIFIED**. Recorded as a gap in task 16, never as a pass.
- **Never export a component from a route file** — a 7th `react-refresh/only-export-components` warning would breach the 2.22 no-increase bar.
- **No redesign** (3.18). New UI uses only primitives already present in the touched file.
- **Verification honesty.** Anything not actually executed is recorded as NOT VERIFIED. No fabricated evidence, no claimed-but-unrun commands. Lint is never reported as passing.

**Workflow reminders:**

- Write the task 2 exploration tests **before** any fix, run them on **unfixed** code, and expect them to FAIL — that failure is the evidence the defects exist. Do not fix the test or the code when they fail.
- Task 3 follows the **observation-first** methodology: observe the unfixed behaviour, record it, then assert the recorded values; the tests must PASS before any fix.
- Wave 3 tasks 6–13 share no file and may be executed in any order or in parallel.
- Delete `.kiro/tmp-lint-before.txt` after task 15 records the delta; it is scratch, not a deliverable.
