# Post-Merge Completion Bugfix Design

## Overview

- Covers every clause of `bugfix.md` (defects 1.1–1.22, fixes 2.1–2.22, preservation 3.1–3.26). Clauses are **cited, not restated** — `bugfix.md` is authoritative and unmodified.
- Base: merged `main` @ `9f434af`. PR #1 modules are **consumed, never duplicated or reverted**: `resolveLogoSrc` + `LOGO_IMG_CLASS`, `classifyLink`, `useImageUpload` → `validateUploadFile`, `mutations.ts`, `query-state.ts`, `product-metadata.ts`, `src/test/supabase-fake.ts`. The sibling spec `.kiro/specs/production-stability-fixes/` is read-only background.
- Two merged modules are inert (`src/lib/logo.ts`, `src/lib/links.ts`). Their fix is **import-and-wire**, not re-implementation; neither file is edited.
- **Sequencing: Priority 1 = the logo (1.1–1.5), shipped first and independently.** It touches only `brand-mark.tsx` (new), `site-header.tsx`, `index.tsx`, `settings-panel.tsx`, and depends on nothing else here. Priority 2 (1.6–1.22) follows; families F3–F10 are mutually independent, F11 depends on F1 and F5, F12 gates all of them.
- **No redesign** (3.18): palette, typography, spacing, layout language, hero composition, card styling, routes, URLs and SEO are preserved. Visual change only where a named defect requires it, built from primitives already in the touched file.
- **No migration.** `site_settings.logo_url` already exists (`src/integrations/supabase/types.ts:476`); the 22 existing migrations are never edited (3.23). No new runtime dependency (3.26).

### Verified baseline (executed in this sandbox at `9f434af`)

- `bun run test` → **259 passing across 18 files**. Regression floor (3.25); no test deleted, skipped or weakened.
- `bun run lint` → **732 problems (726 errors, 6 warnings)**; 725 `prettier/prettier`, 6 `react-refresh/only-export-components`. Re-executed here, matches 1.22 exactly.
- Real route tree (F3 input): `/`, `/product/$handle`, `/admin/login`, `/_authenticated/admin/` → `/admin/`, `/_authenticated/admin/dashboard` → `/admin/dashboard`, plus non-page handlers `/sitemap.xml`, `/mcp`, `/.mcp/*`, `/.well-known/oauth-protected-resource`, `/.lovable/oauth/consent`.
- `SITE_ORIGIN = "https://newgalaxyfurnitures.lovable.app"` (`src/lib/product-metadata.ts:19`) — F4 input.

### NOT VERIFIED (carried forward, never assumed)

- **Live Supabase state** — anon/publishable key only: `site_settings` contents, whether any `logo_url` is stored, the bucket's public flag, live policies/grants.
- **All real-browser behaviour** — no dev server, no browser, no device. Real rendering, real tap-target size, real layout shift and real screen-reader output stay unverified; jsdom assertions are structural evidence, not device evidence.
- **External dependence on `public/media/*`** — why all nine are kept (2.20, 3.22).
- **Supabase image-transform (`/render/image/...`) availability** — constrains F9; no `srcSet` is synthesised on an unverified endpoint.
- **Logo artwork** — supplied as a chat attachment that cannot be written to disk. The deliverable is the runtime upload flow: no committed binary, no hardcoded logo URL anywhere, nothing pre-seeded.

## Glossary

- **C(X)** — bug condition: the input predicate that triggers a defect.
- **P(result)** — required behaviour for inputs satisfying C(X), per 2.x.
- **F / F'** — the code at `9f434af` / after this spec.
- **Preservation** — F(X) ≡ F'(X) for every X satisfying no C(X) (3.1–3.26).
- **BrandMark** — new shared component (F1) that resolves the configured logo and keeps `NGMonogram` reachable.
- **`resolveLogoSrc` / `LOGO_IMG_CLASS`** — merged `src/lib/logo.ts`: accepts only `http(s):` and `data:image/`, else `null`; `h-9 w-auto max-h-9 max-w-[180px] object-contain`. Unmodified.
- **`classifyLink`** — merged `src/lib/links.ts`: `anchor | external | internal | none`; internal only for a route in its registered set. Unmodified.
- **`useImageUpload`** — merged hook (`uploading`, `uploadOne`, `uploadMany`, `removeOne`, `summarise`, `invalidateMedia`) over `validateUploadFile`. **The only upload path.**
- **Draft** — `settings-panel.tsx`'s local `draft` map; `null` means nothing pending and Save is disabled.
- **Baseline count** — the 732 lint problems, captured **per file** before any edit.

## Bug Details

### Bug Condition

C(X) is a disjunction over ten independent families. Each row is checkable and cites its defect clauses.

| Family | C(X) holds when | Defects |
|---|---|---|
| F1 logo render | a `site_settings.logo_url` value reaches a brand mark, or a brand mark renders outside the header | 1.1, 1.2, 1.3, 1.5 |
| F2 logo admin | an admin sets/changes/clears the logo | 1.4 |
| F3 hero CTA | `banner.button_link` is non-empty and does not start with `#` | 1.6 |
| F4 robots | a crawler fetches `/robots.txt` | 1.7 |
| F5 sitemap | the products query inside the `sitemap.xml` handler returns an `error` | 1.8 |
| F6 hero a11y | the hero renders, is touched, autoplays, or `prefers-reduced-motion: reduce` is set | 1.9–1.12 |
| F7 combobox | the catalogue suggestion list is open (`suggestions.length > 0`) | 1.13–1.15 |
| F8 names/labels | an icon-only admin control renders, or any admin `<Label>` renders | 1.16, 1.17 |
| F9 image sizing | an image mounts already `complete`, or an image grid resolves | 1.18, 1.19 |
| F10 assets | the project is built with the nine unreferenced `src/assets/` copies present | 1.20 |
| F11 coverage | media-panel error card, product 404-vs-failure, or logo `onError` changes | 1.21 |
| F12 lint | `bun run lint` is run | 1.22 |

**Formal specification:**

```
FUNCTION isBugCondition(X)
  INPUT:  X — a rendered surface, a stored setting, a request, or a repo state
  OUTPUT: boolean

  RETURN logoValueReachesMark(X)      // raw src, no onError, no size clamp, header-only
      OR adminSetsLogo(X)            // free-text field only
      OR heroLinkNotAnchor(X)        // typed <Link to={freeText}>
      OR crawlerFetchesRobots(X)     // no Disallow, no Sitemap
      OR sitemapQueryErrors(X)       // error discarded, truncated 200 cached 1h
      OR heroInteractionOrMotion(X)  // 4px target, unpausable, motion ignored, alt=title
      OR suggestionListOpen(X)       // no combobox roles, no keyboard, never closes
      OR adminControlUnnamed(X)      // icon-only button / unassociated Label
      OR imageMountsOrGridResolves(X)// commit-time setState, no intrinsic sizing
      OR unreferencedAssetsPresent(X)
      OR deferredBehaviourUncovered(X)
      OR lintRun(X)
END FUNCTION
```

### Examples

- `logo_url = "   "` → header renders `<img src="   ">`, monogram unreachable (1.1).
- `logo_url = "javascript:alert(1)"` → passed to `src` verbatim (1.1).
- `logo_url` points at a deleted storage object → permanent broken-image box, no `onError` (1.2).
- `logo_url` is a 3000×400 banner → header bar distorts; `LOGO_IMG_CLASS` exists but is applied nowhere (1.3).
- Valid logo configured → header shows it, about (`index.tsx:260`) and footer (`:395`) still show `NGMonogram`: two marks at once (1.5).
- Admin has only a `["logo_url", "Logo URL"]` text input inside `TEXT_FIELDS` (`settings-panel.tsx:25`) — no upload, preview or remove (1.4).
- `button_link = "https://wa.me/91…"` → `<Link to="https://wa.me/91…">` → failed navigation / error boundary (1.6).
- `button_link = "/collections/sofas"` (unregistered) → same failure (1.6).
- `robots.txt` is exactly `User-agent: *` / `Allow: /` — no `Disallow`, no `Sitemap:` (1.7).
- Products query fails → 200 containing only `/`, with `Cache-Control: public, max-age=3600` (1.8).
- Hero pagination buttons are `h-1` = 4px tall (1.9); the 7s interval never pauses (1.10); reduced-motion is never read (1.11); `alt={b.title}` duplicates the `<h1>` (1.12).
- Suggestion `<ul>`/`<button>` list has no `role`, `aria-expanded`, `aria-activedescendant`, no `onKeyDown`, and stays open over the results after selection (1.13–1.15).
- 40 `<Label>` elements across five admin panels, **zero** `htmlFor` in `src/components/admin/` (1.17).
- Cached-complete image writes state from a `ref` callback during commit (`adaptive-image.tsx`, `product-card.tsx:54`) → extra render per image (1.18).
- Nine filenames exist in both `src/assets/` and `public/media/`; neither set is referenced in `src/` (1.20).

## Expected Behavior

### Preservation Requirements

**Unchanged behaviours** (F'(X) ≡ F(X) for all X outside C(X)):

- `NGMonogram` still renders at `h-9 w-9` header, `h-20 w-20` about, `h-12 w-12` footer whenever no valid logo is configured — 3.1 / PR #1 3.23.
- `product-media` no-crop `object-contain` framing with clamps `0.75–1.5` (`AdaptiveImage`) and `0.8–1.25` (`ProductCard`) **byte-identical**, plus the `PLACEHOLDER_IMAGE` `onError` fallback — 3.2, 3.3 / PR #1 3.17, 3.19. Binding constraint on F9.
- Header shell: fixed positioning, `h-20` bar, scroll-transition colours, company name, tagline, nav, mobile sheet — 3.4.
- Catalogue: same search fields, filters, six sorts, 12-per-page load-more, clear/reset; **the computed suggestion set and every result set are untouched** — 3.8. Binding constraint on F7.
- Hero: 7s cycle in priority order for the non-interacting case, same title/eyebrow/subtitle/scrim/button styling, working manual selection — 3.9.
- Hero CTAs that work today (in-page anchors, registered internal paths) navigate identically — 3.10. Binding constraint on F3.
- Exactly one upload path; no existing upload caller altered — 3.11 / PR #1 pipeline.
- Every other `TEXT_FIELDS` / `LONG_FIELDS` field saves as it does now, same layout and copy — 3.13.
- Routes, URLs, product slugs, WhatsApp enquiry format, auth/session/staff model, trash workflow, realtime propagation, metadata and structured data, `sitemap.xml` success output and path, admin `noindex` and login `next` rejection — 3.5–3.7, 3.14–3.17, 3.19–3.21.
- All nine `public/media/*` files still served at their current URLs — 3.22.
- 259 tests still pass; existing migrations, error infrastructure and Bun scripts unchanged — 3.24–3.26.

**Scope:** any X satisfying no C(X) above must produce byte-identical output. In particular a site with no configured logo, a hero with an anchor CTA, a successful sitemap request, a mouse-only catalogue session and a product grid of ordinary images must all be indistinguishable before and after.

## Hypothesized Root Cause

1. **Wiring never happened.** `logo.ts` and `links.ts` were written, tested (15 + 26 tests) and then not imported — import-graph greps confirm only test files import them. The suite went green while both defects stayed live. Cause: PR #1 treated "module + tests" as done rather than "module consumed by the caller".
2. **Brand mark has no single owner.** The header inlines its own ternary and `index.tsx` hardcodes `NGMonogram` twice, so there is no place where a guard, an `onError` and a size clamp could be applied once (1.1–1.3, 1.5).
3. **Settings treats a managed asset as free text.** `logo_url` living in `TEXT_FIELDS` is the entire cause of 1.4: the generic map renders a generic `Input`, so no upload affordance can exist.
4. **Server-side failures are silently degraded.** The sitemap handler destructures only `data`; `(data ?? [])` turns a failure into a valid-looking short document, and the unconditional cache header makes it durable (1.8). Same class of defect PR #1 fixed on the client with `query-state.ts`, not yet applied on the server.
5. **Interaction contracts were implemented visually.** Hero pagination, the suggestion list and the admin icon buttons were built as pixels first: correct-looking output with no roles, no keyboard model, no accessible names, no motion preference (1.9–1.17).
6. **Ratio measurement fights the render cycle.** Measuring intrinsic size after mount is inherently a second pass, so the author reached for a `ref` callback — the earliest hook available — which lands in commit phase (1.18); nothing supplies sizing hints ahead of load (1.19).
7. **Hygiene and signal debt.** Duplicate assets survived because reference-checking was manual (1.20); the three component tests were cut for time (1.21); and 732 pre-existing lint problems mean a new violation is invisible (1.22).

## Correctness Properties

Property 1: Bug Condition - Deferred Defects Behave Correctly

_For any_ input where the bug condition holds (`isBugCondition` returns true) — a stored `logo_url` of any shape reaching any brand mark, an admin logo upload/replace/remove, a non-anchor hero `button_link`, a robots fetch, a failing sitemap query, hero interaction or reduced-motion, an open suggestion list, an unnamed admin control, or an image mount — the fixed code SHALL produce the behaviour required by the corresponding 2.x clause: guarded resolution with a reachable `NGMonogram` fallback and clamped sizing, a single-pipeline managed-asset control, a classified CTA that never breaks the route, an admin-disallowing robots with a `Sitemap:` directive, an uncacheable reported failure instead of a truncated 200, a ≥44px pause-aware motion-respecting hero, full combobox semantics and keyboard operation, an accessible name and label association for every control, and ratio measurement without a commit-phase state write.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 2.22**

Property 2: Preservation - Untriggered Surfaces Are Byte-Identical

_For any_ input where the bug condition does NOT hold (`isBugCondition` returns false), the fixed code SHALL produce the same result as the original, preserving the `NGMonogram` fallback at its three existing sizes, the `product-media` framing with its exact clamps and placeholder fallback, every other settings field, the computed suggestions and every catalogue result set, the hero's 7s priority-ordered rotation and styling, hero CTAs that already work, the single upload pipeline, the successful sitemap's XML and cache header, all `public/media/*` URLs, and the 259-test suite.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 3.20, 3.21, 3.22, 3.23, 3.24, 3.25, 3.26**

## Fix Implementation

Smallest production-safe change per family; additive wherever possible.

### F1 — Logo render, Priority 1 (2.1, 2.2, 2.3, 2.5)

**New** `src/components/site/brand-mark.tsx`; **edit** `site-header.tsx`, `src/routes/index.tsx`.

- `NGMonogram` **moves verbatim** into `brand-mark.tsx`; `site-header.tsx` re-exports it (`export { NGMonogram } from "./brand-mark"`) so `index.tsx`'s existing import path is untouched. Both files then export components only — no new `react-refresh` warning.
- New component, one owner for all three sites:
  ```tsx
  export function BrandMark({ settings, size }: { settings: SiteSettings | null; size: "header" | "about" | "footer" })
  ```
- Body: `const src = resolveLogoSrc(settings?.logo_url)`; `const [failed, setFailed] = useState(false)`; `useEffect` resets `failed` when `src` changes; render `NGMonogram` when `src === null || failed`, else `<img src={src} alt={settings?.company_name ?? "New Galaxy Furniture"} className={imgClass} onError={() => setFailed(true)} />`. The `onError` → state → monogram path is what keeps the fallback **reachable at runtime** (2.2); mutating `currentTarget.src` would not.
- Size map (module-private, not exported): `header` → `LOGO_IMG_CLASS` **verbatim** + monogram default `h-9 w-9`; `about` → `h-20 w-auto max-h-20 max-w-[400px] object-contain` + `h-20 w-20`; `footer` → `h-12 w-auto max-h-12 max-w-[240px] object-contain` + `h-12 w-12`. The two new max-widths keep `LOGO_IMG_CLASS`'s 5:1 ceiling at the existing heights. `src/lib/logo.ts` is **not edited**.
- Accessible name: `alt` = configured company name (2.1). This duplicates the adjacent header `<span>` in the link's accessible name; accepted, because 2.1 requires the mark to be named rather than to depend on neighbouring text. `NGMonogram` keeps `aria-hidden`.
- Call sites: `site-header.tsx:84-87` ternary → `<BrandMark settings={settings} size="header" />`; `index.tsx:260` → `size="about"`; `index.tsx:395` → `size="footer"` (`settings` is already in scope at both — About section and `SiteFooter`). Nothing else in those files changes (3.4).

**Verify:** `bun run test` green plus the new logo `onError` component test (F11) shows the monogram after an error, and `git diff` on `site-header.tsx`/`index.tsx` is confined to the three mark call sites.

### F2 — Logo admin control (2.4)

**Edit** `src/components/admin/settings-panel.tsx` only.

- Remove `["logo_url", "Logo URL"]` from `TEXT_FIELDS`; every other field keeps its position, copy and save path (3.13).
- Add one `Label`/preview/actions block above the text grid, built from `Button` + `Input` + `Label` already imported there. Preview is `<BrandMark settings={{…settings, logo_url: value("logo_url")} as SiteSettings} size="header" />` so admin and storefront cannot disagree.
- Upload: hidden `<Input type="file" accept="image/*">` → `validateUploadFile(file)`; on failure `toast.error(result.reason)` and **return without touching state**; on success `await uploadOne(file)` then `set("logo_url", image.url)`. `uploading` drives the button label/`disabled`; `summarise` is used for the batch-shaped message if a multi-select ever arrives. **No second upload path** (3.11).
- State model — **draft, not immediate write**: upload/remove call `set("logo_url", …)`, which populates `draft` and enables the existing "Save changes" button; persistence happens only through the existing `submit` → `saveSettings` → `logAudit` → invalidate flow. Reload without saving discards the change.
- "Remove" = `set("logo_url", "")`; `submit` already maps `"" → null`, so the **column is cleared** and 3.1 puts `NGMonogram` back. The **storage object is deliberately not deleted** (`removeOne` is not called): deletion before Save would destroy the live logo while the column still points at it, and orphaned objects remain manageable in the media panel. Recorded as an accepted trade-off, not an oversight.
- Failure preserves the previous logo (2.4): a rejected validation or a thrown `uploadOne` leaves `draft` untouched, so `value("logo_url")` still reads the saved value and the storefront is unaffected.
- No migration, no hardcoded URL, nothing pre-seeded.

**Verify:** `grep -n "logo_url" src/components/admin/settings-panel.tsx` shows no `TEXT_FIELDS` entry, and `grep -rn "\.storage\.\|uploadProductImage" src/components/admin/settings-panel.tsx` returns nothing (proving the shared hook is the only path).

### F3 — Hero CTA classification (2.6)

**Edit** `src/components/site/hero-slider.tsx` only; `src/lib/links.ts` unchanged.

- Replace the `button_link.startsWith("#")` ternary (`:49-64`) with `const cta = classifyLink(banner.button_link)` and a four-way render: `anchor` → `<a href>` (today's markup), `external` → `<a href rel="noopener noreferrer">`, `internal` → `<Link to={cta.href}>`, `none` → render nothing. Classes, copy and position are unchanged.
- **Registered-route set reconciled against the real tree** (verified above). `links.ts` accepts `/`, `/admin/login`, `/product/{slug}` — a strict subset of the real routes, so it can never mark an unregistered path internal. Delta: `/admin/`, `/admin/dashboard` and the non-page handlers (`/sitemap.xml`, `/mcp`, `/.mcp/*`, `/.well-known/*`, `/.lovable/oauth/consent`) classify as `none`.
- 3.10 assessment: anchors and every storefront-legitimate path (`/`, `/product/{slug}`, `/admin/login`) navigate **exactly as today**. The only narrowing is a hero CTA pointing into the guarded dashboard or at a non-page endpoint — neither is a working storefront CTA (the dashboard guard-redirects, endpoints return XML/JSON), both are `noindex` territory (3.21), and the exclusion is already pinned by the merged test at `src/lib/links.test.ts:34`. Widening the set would require weakening that test, which 3.25 forbids. Accepted and recorded.

**Verify:** `grep -n "classifyLink" src/components/site/hero-slider.tsx` returns a match and no `startsWith("#")` remains; the merged 26 `links.test.ts` tests still pass untouched.

### F4 — robots.txt (2.7)

**Edit** `public/robots.txt` — final content:

```
User-agent: *
Allow: /
Disallow: /admin
Sitemap: https://newgalaxyfurnitures.lovable.app/sitemap.xml
```

- `Allow: /` retained, so nothing indexable today is disallowed. `Disallow: /admin` covers `/admin/`, `/admin/login` and `/admin/dashboard` by prefix; it **supplements** the per-route `noindex` and the login `next` guard rather than replacing them (3.21).
- Origin reconciled with `SITE_ORIGIN` (`src/lib/product-metadata.ts:19`), the project's already-declared canonical origin — no new URL is invented. A static file cannot read the request origin, so if production ever serves another domain this directive and the handler's request-derived `<loc>` would diverge; the served domain is **NOT VERIFIED**, and F11 pins the directive to `SITE_ORIGIN` so the two can only ever drift deliberately.

**Verify:** `git diff public/robots.txt` shows exactly two added lines, and the F11 robots test asserts the `Sitemap:` value equals `` `${SITE_ORIGIN}/sitemap.xml` ``.

### F5 — sitemap failure handling and testability (2.8)

**New** `src/lib/sitemap.ts`; **edit** `src/routes/sitemap[.]xml.ts`.

- `src/lib/sitemap.ts` exports the pure builder and the response policy, lifted **verbatim** from the handler:
  ```ts
  export function renderSitemapXml(origin: string, rows: { slug: string; updated_at?: string | null }[]): string
  export function sitemapResponse(args: { origin: string; data: Rows | null; error: unknown }): Response
  ```
- `sitemapResponse`: when `error` is non-null → `new Response("sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } })`, so no crawler can cache an incomplete document; when `error` is null → today's `renderSitemapXml` output with `Content-Type: application/xml` and `Cache-Control: public, max-age=3600`, **byte-identical** (3.20).
- The handler becomes a thin adapter: `const { data, error } = await supabase…` (the discarded `error` is now inspected) → `console.error("[sitemap]", error)` on failure → `return sitemapResponse({ origin, data, error })`. `console.error` is the correct channel here: `reportLovableError` no-ops when `window` is undefined, and `src/server.ts` / the Supabase clients already report server-side failures this way. No error module is added or deleted (3.24).
- Testability comes from the extraction: both functions are importable and asserted without a server or a network (previously the logic was unreachable inside `createFileRoute`). The builder lives in `src/lib/` rather than being exported from the route file because a route module exporting `Route` plus a function trips `react-refresh/only-export-components` — verified as the exact shape of the existing 6 warnings — and would raise the 732 baseline (2.22).

**Verify:** a golden-string test asserts `renderSitemapXml` output equals the pre-change bytes for a fixed row set, and `sitemapResponse` with a non-null `error` returns 503 + `no-store`.

### F6 — Hero accessibility and motion (2.9–2.12)

**New** `src/hooks/use-prefers-reduced-motion.tsx`; **edit** `src/components/site/hero-slider.tsx`.

- **Tap target (2.9), zero layout change:** the pagination `<button>` keeps its exact `h-1 rounded-full … w-10/w-4` visual classes and gains `relative` plus an invisible expanded hit area — `after:absolute after:inset-x-0 after:-inset-y-5 after:content-['']` → ~44px tall. Enlarging the button box itself would grow the `mt-12 flex gap-2` row and move the hero copy; a pseudo-element overlay changes no pixel of the composition (3.9, 3.18).
- **Pause on interaction (2.10):** `const [paused, setPaused] = useState(false)`; set on the pagination `onClick`, and on `onMouseEnter`/`onFocus`/`onTouchStart` of the `<section>` with the pointer/focus leave handlers clearing it. The interval effect early-returns while `paused`; the `7000` constant, the `banners.length < 2` guard and priority ordering are untouched.
- **Reduced motion (2.11):** new hook mirroring the `use-mobile.tsx` matchMedia pattern exactly (`useState` + `useEffect`, `matchMedia("(prefers-reduced-motion: reduce)")`, `addEventListener("change")`, cleanup `removeEventListener`, SSR-safe initial `false`). The autoplay effect early-returns when it is true; manual selection stays fully functional so no slide becomes unreachable. Existing opacity transitions are left alone — 2.11 requires no auto-rotation, and restyling transitions would be a visual change beyond the defect.
- **Decorative background (2.12):** background `<img>` gets `alt=""` and `aria-hidden`, dropping the duplicate announcement; `fetchPriority`, `loading`, positioning, `object-[38%_center]` and the scrim are unchanged.

**Verify:** jsdom test asserts autoplay does not advance when `matchMedia` reports reduce and does not advance after a pagination click, while advancing on the 7s timer otherwise; `git diff` shows the indicator's visual classes unchanged. Real tap-target size on a device stays **NOT VERIFIED**.

### F7 — Catalogue suggestion combobox (2.13–2.15)

**Edit** `src/components/site/catalogue.tsx` only; the `useMemo` at `:174` that computes `suggestions` is **not touched** (3.8).

- Local state only: `const [open, setOpen] = useState(false)`, `const [active, setActive] = useState(-1)`, `const uid = useId()`, `const boxRef = useRef<HTMLDivElement>(null)`. `useId` is already used in this codebase (`ui/form.tsx`, `ui/chart.tsx`).
- Input gains `role="combobox"`, ``aria-controls={`${uid}-listbox`}``, `aria-expanded={listOpen}`, `aria-autocomplete="list"`, and `aria-activedescendant` set to ``  `${uid}-opt-${active}` `` when `active >= 0` else `undefined`; existing `aria-label="Search products"`, classes and `onChange` are kept. `onChange` also does `setOpen(true); setActive(-1)`.
- List: ``<ul id={`${uid}-listbox`} role="listbox">``, items ``<li role="option" id={`${uid}-opt-${i}`} aria-selected={i === active}>`` with the same `<button>` inside; render condition becomes `listOpen = open && suggestions.length > 0`. Highlight uses the existing `hover:bg-accent` token — no new visual vocabulary.
- `onKeyDown` on the input: ArrowDown/ArrowUp move `active` with wraparound (opening the list if closed), Enter applies `suggestions[active]` when one is highlighted (otherwise falls through, leaving today's submit behaviour), Escape calls `setOpen(false)` **without clearing the query**, Tab leaves as-is.
- Selection and dismissal (2.15): the item handler stays `setSearch(s.name)` and adds `setOpen(false); setActive(-1)`, so the popup no longer covers the results. Outside click via one `pointerdown` listener on `document` in a `useEffect`, closing when the event target is outside `boxRef`; cleanup removes the listener.
- Diff is confined to the state declarations plus the suggestion region (`:300-335`). Filters, sorts, paging, clear/reset and every result set are untouched.

**Verify:** component test drives ArrowDown → Enter → assert `search` value and closed list, then Escape → assert list closed with the query intact; a preservation test asserts the suggestion array for a fixed dataset is identical to the pre-change values.

### F8 — Accessible names and label association (2.16, 2.17)

**Edit** `products-panel.tsx`, `categories-panel.tsx`, `homepage-panel.tsx`, `settings-panel.tsx`, `enquiries-panel.tsx`.

- Icon-only controls (2.16) get `aria-label` naming **action + target**, matching PR #1's media-panel pattern: `aria-label={`Edit ${p.name}`}`, `Delete ${p.name}`, `Move ${c.name} up`, `Move ${c.name} down` — `products-panel.tsx:452,455,505`, `categories-panel.tsx:171-195`, `homepage-panel.tsx:126-133,303-313`. Attribute-only; no visual change. `enquiries-panel.tsx` is correctly excluded (its icons sit beside visible text).
- Label association (2.17) for all 40 labels (products 20, homepage 9, categories 8, settings 2, enquiries 1): `const uid = useId()` per component instance, then ``<Label htmlFor={`${uid}-name`}>`` paired with ``<Input id={`${uid}-name`}>``.
- **Ids survive repeated dialogs:** `useId` is per mounted instance, so a dialog closed and reopened, or two rows rendered side by side, get distinct prefixes. For fields rendered inside a `map`, the row key is included — `` `${uid}-${row.id}-title` `` — so no duplicate id can exist in the document. No index-based or module-counter ids.
- Rendered layout and label copy unchanged (3.13).

**Verify:** `grep -c "htmlFor" src/components/admin/*.tsx` sums to 40 and `grep -rn "<Pencil\|<Trash2\|<ChevronUp\|<ChevronDown" src/components/admin/ | grep -v "aria-label"` returns nothing.

### F9 — Image intrinsic sizing (2.18, 2.19)

**Edit** `src/components/site/adaptive-image.tsx`, `src/components/site/product-card.tsx`.

- **No commit-phase state write (2.18):** replace the `ref={(el) => { if (el?.complete) … }}` callback with `const imgRef = useRef<HTMLImageElement>(null)` plus a `useEffect` (post-commit) that measures `imgRef.current` when `complete && naturalWidth && naturalHeight`, guarded so it commits only when the **clamped applied** ratio actually changes. The existing `onLoad` path is unchanged for non-cached images. Effect-phase measurement removes the commit-phase write outright and removes the redundant render whenever the clamped ratio already equals the applied value; a genuinely different ratio still costs one re-render, which is inherent to measuring after load. No over-claim.
- **Clamps and framing preserved exactly (3.2):** `product-media` / `product-media-img` classes, `minRatio 0.75` / `maxRatio 1.5` / `fallbackRatio 1` in `AdaptiveImage`, `Math.min(1.25, Math.max(0.8, …))` in `ProductCard`, the `style={{ aspectRatio }}` frame and the `PLACEHOLDER_IMAGE` `onError` handler are byte-identical. The hover image, badges and "Made to order" overlay are untouched.
- **Sizing hints (2.19):** add `width`/`height` attributes derived from the applied clamped ratio (nominal `width = 1200`, `height = Math.round(1200 / applied)`), so the intrinsic ratio the browser assumes matches the reserved frame, and a `sizes` attribute reflecting the real grid (`(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw`). `loading="lazy"` / `decoding="async"` stay as they are.
- **Deliberate gap, recorded:** no `srcSet` is synthesised. Serving smaller variants would require Supabase image transforms (`/render/image/public/...`), whose availability on this project is **NOT VERIFIED**, and a wrong transform URL 404s live product imagery. Consequence: `sizes` has no effect on selection until a verified variant source exists, so the "appropriately sized per viewport" half of 2.19 is **not delivered** here — it is a follow-up gated on verifying transforms, not a silent pass.

**Verify:** existing `product-media` preservation tests still pass; a render-count test asserts one commit for a cached image whose clamped ratio equals the fallback; `grep -n "ref={(el)" src/components/site/adaptive-image.tsx src/components/site/product-card.tsx` returns nothing.

### F10 — Unreferenced assets (2.20)

- Delete exactly nine files: `src/assets/{category-bedroom,category-chairs,category-dining,category-office,category-outdoor,category-sofas,category-storage,category-tables,hero-luxury-living}.jpg`. These are bundler-scoped, so no external URL can resolve to them.
- **Keep all nine `public/media/*` files** — directly addressable, external dependence **NOT VERIFIED** (3.22). Nothing a production URL could resolve to is touched.

**Verify:** `git grep -n -e "@/assets" -e "src/assets" -- src | wc -l` → 0 before deleting and `ls src/assets 2>/dev/null | wc -l` → 0 after, with `ls public/media | wc -l` → 9 unchanged; `bun run build` succeeds.

### F11 — Deferred component tests (2.21)

**New** test files under the existing `src/test/` convention; no source behaviour changes beyond F5's extraction.

- **Media-panel error card:** render the real `MediaPanel` with `FakeSupabase` returning `postgrestError(...)`; assert the rendered `QueryFailed` copy "Could not load the media library." and its retry control.
- **Product 404 vs load failure:** `ProductPage` is not exported and exporting it from a route file would add a 7th `react-refresh` warning (verified shape of the existing 6), so the two states move into a small presentational component in `src/components/site/` with markup and copy **verbatim** ("Piece not found", the removed-from-showroom line, the Back-to-collection CTA); the route imports it. The test renders the real component for the not-found state and the real `QueryFailed` for the failure state, and pins branch selection through the merged `queryStateOf`.
- **Logo `onError` fallback:** render the real `BrandMark` with a valid `http(s)` `logo_url`, fire `error` on the `img`, assert the `NGMonogram` `svg` is present and the `img` gone; plus `resolveLogoSrc`-rejected values rendering the monogram directly.
- Boundary discipline: `src/test/supabase-fake.ts` is the **sole** fake; no test configures a mock and asserts the mock's configured value back.
- **Grep/diff verification for the non-renderable fixes:** robots.txt is asserted by reading `public/robots.txt` from disk and checking `Allow: /` retained, `Disallow: /admin` present and `Sitemap:` equal to `` `${SITE_ORIGIN}/sitemap.xml` ``; the asset deletion is asserted by the F10 grep counts plus `git diff --stat` showing exactly nine deletions under `src/assets/` and zero under `public/media/`.

**Verify:** `bun run test` reports **≥ 259 + new** passing with no test skipped, and `git diff --stat -- src/test` shows additions only.

### F12 — Lint baseline (2.22)

- Record the measured baseline in the change log: **732 problems (726 errors, 6 warnings); 725 `prettier/prettier`, 6 `react-refresh/only-export-components`.** Re-measured here at `9f434af`.
- Bar: **do not increase.** Capture per-file counts before edits (`bun run lint 2>&1 | grep -E "^/|problems"`), re-measure after, and treat any per-file increase as a defect in this spec's own work. Edited lines are written prettier-clean so a modified file gains no new `prettier/prettier` location.
- New files (`brand-mark.tsx`, `sitemap.ts`, `use-prefers-reduced-motion.tsx`, the new test files) are formatted with `prettier --write` **on those paths only** and must contribute **zero** problems. Repo-wide `prettier --write` is out of scope — it is exactly the stylistic mass refactor the constraints forbid.
- Lint is **never reported as passing**; it exits non-zero and every report says so.

**Verify:** post-change `bun run lint` tail reads no more than `732 problems (726 errors, 6 warnings)`, and the new files appear nowhere in its output.

## Testing Strategy

### Validation approach

Two phases. First surface counterexamples on **unfixed** code so the root-cause hypotheses are confirmed or refuted; only then fix, and re-run the same tests plus the preservation baseline. Property 1 tests must fail before the fix; Property 2 tests must pass before the fix.

### Exploratory bug condition checking

**Goal:** demonstrate each family's defect on `9f434af` and confirm or refute §Hypothesized Root Cause. A refutation means re-hypothesising, not adjusting the test.

**Test plan:** scope each property to the concrete failing case — these defects are deterministic, so reproducibility beats breadth.

1. **Logo wiring** — assert no application component imports `src/lib/logo.ts` (import-graph assertion) and that a `"   "` / `"javascript:…"` `logo_url` reaches the header `img`. Fails on unfixed code → confirms cause 1.
2. **Logo onError** — render the header mark, fire `error`, assert `NGMonogram`. Fails: no handler exists (1.2).
3. **Hero CTA** — `classifyLink` has no `.tsx` consumer; a `https://wa.me/…` `button_link` reaches `<Link to>`. Fails → confirms cause 1 again.
4. **Sitemap** — with the products query erroring, assert the response is not a cacheable 200. Fails today: 200 + `max-age=3600` (1.8).
5. **robots.txt** — assert `Disallow: /admin` and a `Sitemap:` directive. Fails (1.7).
6. **Hero motion** — with `matchMedia` reporting reduce, assert the slide index does not advance across the 7s timer. Fails (1.11).
7. **Combobox** — assert `role="combobox"`, `aria-expanded`, `role="option"`, and ArrowDown moving `aria-activedescendant`. Fails (1.13, 1.14).
8. **Admin names/labels** — assert every icon-only button has an accessible name and `htmlFor` count is 40. Fails: 0 today (1.16, 1.17).
9. **Commit-phase write** — assert a cached-complete image mount produces no extra commit. Fails (1.18).

**Expected counterexamples:** raw unguarded `src` values in the header; `<Link to="https://…">`; a 200 sitemap containing only `/` with an hour-long cache; zero ARIA attributes in the suggestion region; zero `htmlFor` in `src/components/admin/`. Likely causes: modules written but never imported (F1, F3), `error` never destructured (F5), and interaction contracts implemented visually (F6–F8).

### Fix checking

```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)   // the matching 2.x clause
END FOR
```

Same tests as above, re-run unchanged after the fix; each must now pass. No new assertions are written to make them pass.

### Preservation checking

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Approach:** property-based, because preservation is a universal claim over the non-buggy domain and generated cases reach edges hand-written ones miss. **Observation-first:** run the unfixed code, record actual outputs, assert those recorded values, and confirm the tests pass **before** the fix.

1. **Monogram fallback** — for all `logo_url` values `resolveLogoSrc` rejects, all three sites render `NGMonogram` at `h-9 w-9` / `h-20 w-20` / `h-12 w-12` (3.1).
2. **Ratio clamping** — for all generated `naturalWidth`/`naturalHeight`, applied ratio equals the recorded pre-change clamp in both components (3.2).
3. **Suggestions and results** — for generated queries and filter combinations, the suggestion array and the result set equal the recorded pre-change values (3.8).
4. **Sitemap success bytes** — for generated row sets, `renderSitemapXml` output and the cache header equal the recorded pre-change bytes (3.20).
5. **Hero CTA continuity** — for all anchors and all `/` + `/product/{slug}` paths, the rendered element and href equal today's (3.10).
6. **Settings fields** — for generated edits to every non-logo field, the `saveSettings` payload equals the pre-change payload (3.13).

### Unit tests

- `renderSitemapXml` golden bytes; `sitemapResponse` → 503 + `no-store` on error, 200 + `max-age=3600` on success.
- `usePrefersReducedMotion` add/remove listener lifecycle.
- Keyboard reducer behaviour for the combobox: ArrowDown/ArrowUp wraparound, Enter selection, Escape keeping the query.
- Existing merged `logo.test.ts` (15) and `links.test.ts` (26) run **unmodified** — the wiring is what changes, not the modules.

### Property-based tests

- The six preservation properties above, over generated logo values, image dimensions, queries, row sets, links and settings edits.
- Fix-side: for every value `resolveLogoSrc` accepts, the header renders an `img` with a non-empty accessible name; for every value it rejects, `NGMonogram`.
- For every generated `button_link`, the render is one of anchor / external `<a>` / internal `<Link>` / nothing, and never a `<Link>` to an unregistered path.

### Integration tests

- Admin logo round trip in one harness: upload → preview → Save → storefront header, about and footer all show the resolved logo → Remove → Save → all three revert to `NGMonogram`; a forced upload failure leaves the previous logo intact.
- Hero: interact → autoplay pauses; reduced-motion → no rotation, manual selection still reaches every slide.
- Catalogue keyboard journey: type → ArrowDown → Enter → list closed, results visible and identical to the mouse path.
- Crawler contract: `robots.txt` bytes plus a failing and a succeeding `sitemap.xml` request.

**Not covered by any of the above, and stated as such:** real-device tap targets, real layout shift, real screen-reader output, live Supabase state, and per-viewport image selection (F9's `srcSet` gap). These remain **NOT VERIFIED**.
