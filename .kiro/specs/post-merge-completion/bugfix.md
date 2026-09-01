# Bugfix Requirements Document

## Introduction

This spec completes the work that PR #1 (`fix/production-stability-pass`) explicitly deferred. PR #1 is **already merged into `main` at commit `9f434af`** and its fixes are present in the working tree. This is a **follow-up completion pass, not a redesign and not a new feature**. Nothing merged in PR #1 is reverted, redone or duplicated here — this spec builds on those modules and consumes them.

The authoritative background is the sibling spec at `.kiro/specs/production-stability-fixes/` — in particular `change-log.md`'s "Deferred work — honestly not done" table and its "NOT VERIFIED register", plus `bugfix.md`'s 42 numbered clauses. Those files are **read-only background for this spec and are not modified**.

### Already fixed and merged — explicitly out of scope

The following are done, tested and MUST NOT be re-fixed: the storage bucket migration; storage policy alignment to the staff model; the admin route guard and the `useAuth` staff model; anon role-oracle revocation; `.env` untracking; the shared validated upload pipeline (`src/lib/uploads.ts` + `src/hooks/use-image-upload.ts`); zero-row mutation detection (`src/lib/mutations.ts`); loading/empty/error separation (`src/lib/query-state.ts` + `QueryFailed`); product metadata (`src/lib/product-metadata.ts`); clipboard handling (`src/lib/clipboard.ts`); dead-code removal; and the vitest/typecheck test infrastructure.

### The shape of the remaining problem

The deferred work falls into three families:

1. **Two merged modules are orphaned — the fix exists but is inert.** `src/lib/logo.ts` and `src/lib/links.ts` were both implemented and covered by tests (15 and 26 tests respectively), but no application component imports either one. The defects they were written to fix are therefore still live in production exactly as they were before PR #1. This is the largest and most misleading category: the test suite is green and the bug is unfixed.
2. **Published output and crawler contract are still wrong.** `robots.txt` still permits everything and declares no sitemap, and the `sitemap.xml` handler still publishes *and caches* a truncated 200 response when its query fails.
3. **Accessibility, layout stability and test coverage gaps that PR #1 started but did not finish.** Hero slideshow tap targets and motion preferences, catalogue search combobox semantics, the remaining accessible-name gaps beyond the media panel, image intrinsic sizing, the unreferenced duplicate asset copies, and the three component tests from PR #1's unfinished task 11.3.

**Priority 1 is the logo (clauses 1.1–1.5).** It must become a real managed asset: the admin uploads, previews, replaces, removes and persists it, and the storefront renders it through a guard that keeps the existing `NGMonogram` fallback reachable.

**Priority 2 is everything else (clauses 1.6–1.22).**

### Verification status of the evidence

Everything below marked **VERIFIED** was established in this sandbox by direct inspection of merged `main` at `9f434af`: file reads, import-graph greps across `src/`, and executed `bun run test` and `bun run lint`.

**Measured baseline (executed, not assumed):**

- `bun run test` — **259 tests across 18 files, all passing.** This is the regression floor: it must still be 259-or-more passing at the end, with no test deleted to achieve it.
- `bun run lint` — **FAILS on `main` today** with **732 problems (726 errors, 6 warnings)**, of which **725 are `prettier/prettier`** and **6 are `react-refresh/only-export-components`**. This is a **pre-existing baseline, not a regression introduced here**. It must never be reported as passing. The bar for this spec is *do not increase the count*; a wholesale `prettier --write` is out of scope because it would be exactly the stylistic mass refactor these constraints forbid.

Recorded as **NOT VERIFIED** — treated as unknown, never assumed:

- **Live Supabase state.** Only an anon/publishable key is available here. The real contents of `site_settings`, whether any `logo_url` value is currently stored, the live storage bucket's public flag, and the live policy/grant state cannot be read.
- **Whether any external or indexed URL depends on `public/media/*`.** This is precisely why clause 2.20 keeps those files.
- **All runtime browser behaviour.** No dev server or browser was run. Findings are static plus vitest/jsdom. Nothing about real rendering, real touch targets, real layout shift or real screen-reader output has been observed on a device.

### Corrections to the reported defect list — recorded for honesty

Two sub-claims in the incoming report did not survive direct inspection and are restated accurately rather than copied:

- **`enquiries-panel.tsx` has no icon-only control gap.** Its three `lucide` icons (`Phone`, `MessageCircle`, `Mail`) each sit inside an anchor alongside visible text (the phone number, the word "WhatsApp", the email address), so each link already has an accessible name. VERIFIED at `enquiries-panel.tsx:121-142`. What the file *does* have is the unassociated-`Label` defect, which is clause 1.17. Clause 1.16 is therefore scoped to `products-panel.tsx`, `categories-panel.tsx` and `homepage-panel.tsx` only.
- **The header brand *link* is not nameless.** `site-header.tsx:83-97` wraps the mark and a company-name `<span>` in one `<Link to="/">`, so the link is already named by that text. The genuine defects on that element are the missing `onError`, the missing dimension guard and the bypassed fallback — clauses 1.1–1.3 — not a null accessible name. The `alt=""` on the `img` is defensible while the adjacent text exists; clause 2.1 still requires the rendered logo to carry a correct accessible name rather than relying on that coincidence.

### Logo artwork constraint

The user supplied the logo as a **chat image attachment, which cannot be written to disk from this environment**. This does **not** block the work. The deliverable is the **runtime upload flow**; the owner uploads the artwork through the admin panel after deploy.

Therefore: no committed binary may be required, and no logo URL may be hardcoded anywhere. Pre-seeding a URL would itself violate the no-hardcoded-URL requirement. `site_settings.logo_url` already exists (`src/integrations/supabase/types.ts:476`), so **no migration is needed for the logo**.

### Hard constraints on every fix

- **ABSOLUTELY NO REDESIGN.** The colour palette, typography, layout language, hero composition, card styling, spacing philosophy, design system, routes, URLs and existing SEO all stay as they are. No gradients, no new animations. Visual change **only** where it directly fixes a defect named below.
- **New UI is built from primitives already used in the affected file** — `luxury-card`, `Button`, `Input`, `Label` and the existing `product-media` classes — so no new design vocabulary enters the codebase.
- **Do not revert, redo or duplicate anything merged in PR #1.** Reuse its modules. In particular there must be exactly one upload path: `useImageUpload` (`uploading`, `uploadOne`, `uploadMany`, `removeOne`, `summarise`, `invalidateMedia`) over `validateUploadFile` from `src/lib/uploads.ts`. A second upload implementation is a defect, not a fix.
- **Every PR #1 preservation clause continues to hold**, especially its 3.17 (the shared `product-media` no-crop `object-contain` framing with clamped ratios) and its 3.23 (`NGMonogram` still renders when no logo is configured).
- **Append-only migrations** if any prove necessary — likely none. The 22 existing migration files are never edited.
- **Smallest production-safe fix per defect**, additive wherever possible. No stylistic mass refactors, no rewriting unrelated code.
- **Tests must exercise real exported application logic.** Never configure a mock and then assert that the mock returned its configured value. Fakes are permitted only at true boundaries; reuse `src/test/supabase-fake.ts`.
- **Verification honesty.** Anything not actually executed is recorded as NOT VERIFIED. No fabricated evidence, no claimed-but-unrun commands.

## Bug Analysis

Each clause in section 1 states a checkable bug condition C(X) as its WHEN predicate, carrying a severity of **CRITICAL / HIGH / MEDIUM / LOW**. Section 2 states the required behaviour for that same condition (fix check). Section 3 states the behaviour that must be identical before and after for every input satisfying no C(X) (preservation check).

### Current Behavior (Defect)

**Logo — Priority 1 (D1)**

1.1 **[HIGH]** WHEN any non-empty value is stored in `site_settings.logo_url` THEN `src/components/site/site-header.tsx:84-87` renders `settings?.logo_url ? <img src={settings.logo_url} alt="" className="h-9 w-auto" /> : <NGMonogram />`, passing the raw stored string straight to `src`, so the merged `resolveLogoSrc` guard is never consulted and a value of `""`, `"   "`, `"javascript:alert(1)"` or `"ftp://x/y.png"` defeats the `NGMonogram` fallback and yields a broken or hostile header mark. *VERIFIED: import-graph grep shows the only importers of `src/lib/logo.ts` are `src/lib/logo.test.ts`, `src/test/exploration/states-and-navigation.test.ts` and `src/test/fix.property.test.ts` — no application component imports it. The module and its 15 tests are inert.*

1.2 **[HIGH]** WHEN the stored `logo_url` points at a URL that fails to load at runtime (deleted object, expired signature, network failure) THEN the header `img` has no `onError` handler, so the browser renders its broken-image state permanently and the `NGMonogram` fallback is unreachable for the life of the page.

1.3 **[MEDIUM]** WHEN the stored logo has an unexpected aspect ratio or very large intrinsic dimensions THEN the header `img` carries only `className="h-9 w-auto"` with no `max-width`, no `object-contain` and no `max-height` ceiling, so a wide or oversized image stretches the brand block and distorts the header bar. *The merged `LOGO_IMG_CLASS` (`h-9 w-auto max-h-9 max-w-[180px] object-contain`) exists to prevent exactly this and is not applied anywhere.*

1.4 **[HIGH]** WHEN the owner sets the site logo THEN the only control is `["logo_url", "Logo URL"]` declared inside `TEXT_FIELDS` at `src/components/admin/settings-panel.tsx:25` — a plain free-text input. There is no upload, no preview, no replace, no remove, no validation and no per-file feedback, so the owner must obtain a URL by some other means and paste it, with no way to see whether it is correct before saving and no way to clear it safely.

1.5 **[MEDIUM]** WHEN the site is rendered anywhere other than the header THEN the configured logo is never used: `NGMonogram` is hardcoded at `src/routes/index.tsx:260` (about) and `:395` (footer), so a configured brand asset appears in one place only and the site presents two different brand marks simultaneously.

**Hero call-to-action navigation (D2)**

1.6 **[HIGH]** WHEN a hero banner's `button_link` is any admin-entered value that does not start with `#` — an absolute URL such as `https://wa.me/...`, or a path that is not a registered route — THEN `src/components/site/hero-slider.tsx:49-64` passes it straight into a typed `<Link to={banner.button_link}>`, producing a failed navigation or an error boundary instead of a working call to action. *VERIFIED: grep for consumers of `src/lib/links.ts` / `classifyLink` across `.tsx` files returns nothing (exit 1). The module and its 26 tests are inert.*

**Crawler contract and published output (D3, D4)**

1.7 **[MEDIUM]** WHEN a crawler fetches `public/robots.txt` THEN it receives exactly `User-agent: *` / `Allow: /` — no admin `Disallow`, and no `Sitemap:` directive. Admin routes are therefore crawlable except for their per-route `noindex` meta, and the existing `sitemap.xml` is undeclared. *VERIFIED by reading the file.*

1.8 **[MEDIUM]** WHEN the products query inside `src/routes/sitemap[.]xml.ts` fails THEN the handler destructures only `const { data } = await supabase.from("products")...` — `error` is never destructured or inspected. On failure `data` is `null`, `(data ?? [])` contributes no entries, and the handler returns a **200** containing only `/` together with `Cache-Control: public, max-age=3600`, so a truncated sitemap is both **published and cached for an hour** while the real failure is never reported. *VERIFIED by reading the handler.*

**Hero slideshow accessibility and motion (D5)**

1.9 **[MEDIUM]** WHEN the hero slideshow is used on a touch device THEN the pagination controls at `hero-slider.tsx:78` are `h-1` — 4px tall — which is far below any usable minimum tap-target size, so selecting a specific slide by touch is unreliable.

1.10 **[MEDIUM]** WHEN a visitor interacts with the hero — selecting a slide, or reading a slide's copy — THEN the 7-second autoplay interval at `hero-slider.tsx:11` continues unconditionally and never pauses, so the slide can change under the visitor mid-read and immediately after a manual selection.

1.11 **[MEDIUM]** WHEN a visitor has `prefers-reduced-motion: reduce` set THEN the preference is not consulted anywhere in `hero-slider.tsx`, so automatic rotation and transitions run regardless of an explicit OS-level request not to.

1.12 **[LOW]** WHEN a hero background image is rendered THEN `hero-slider.tsx:24` sets `alt={b.title}` on purely decorative background imagery, so a screen reader announces the banner title twice — once as the image and again as the `<h1>` that follows.

**Catalogue search suggestions (D6)**

1.13 **[MEDIUM]** WHEN the catalogue search suggestion list is open THEN `src/components/site/catalogue.tsx:319-334` renders a plain `<ul>` of `<button>` elements with no `role="combobox"` on the input, no `role="listbox"` on the list, no `role="option"` on the items, no `aria-expanded` and no `aria-activedescendant`, so assistive technology is given no indication that a suggestion popup exists or which item is current. *VERIFIED: grep for `role=`, `aria-expanded` and `aria-activedescendant` in that file returns no matches in the suggestion region.*

1.14 **[MEDIUM]** WHEN a keyboard user reaches the search input while suggestions are open THEN there is no `onKeyDown` handling at all — no ArrowDown/ArrowUp traversal, no Enter selection, no Escape dismissal — so the list can only be operated by tabbing through every option or by pointer.

1.15 **[MEDIUM]** WHEN a suggestion is selected THEN the handler is `onClick={() => setSearch(s.name)}`, and because the chosen name still matches the query the suggestion list stays open, covering the results the visitor just asked for. There is also no outside-click dismissal, so the popup can only be closed by clearing or changing the query.

**Remaining accessible-name gaps (D7)**

1.16 **[MEDIUM]** WHEN a screen-reader or keyboard user operates the admin dashboard THEN icon-only controls still have no accessible name: `Pencil` and `Trash2` buttons in `products-panel.tsx:452,455,505`; `ChevronUp`/`ChevronDown`/`Pencil`/`Trash2` in `categories-panel.tsx:171-195`; and `ChevronUp`/`ChevronDown`/`Pencil`/`Trash2` in `homepage-panel.tsx:126-133,303-313`. *VERIFIED: PR #1 added `aria-label` to the media panel and to `Switch` controls only; the icon-only buttons above carry none. `enquiries-panel.tsx` is correctly excluded — see the corrections note in the Introduction.*

1.17 **[MEDIUM]** WHEN a screen-reader user fills in any admin form THEN the field is not programmatically associated with its label: there are **40 `<Label>` elements** across `products-panel.tsx` (20), `homepage-panel.tsx` (9), `categories-panel.tsx` (8), `settings-panel.tsx` (2) and `enquiries-panel.tsx` (1), and **zero `htmlFor` attributes** anywhere in `src/components/admin/`, with **zero `id=` attributes** in `settings-panel.tsx`. *VERIFIED by grep count.*

**Image sizing and layout shift (D8)**

1.18 **[MEDIUM]** WHEN an image that is already complete in cache is mounted THEN both `src/components/site/adaptive-image.tsx` (`ref={(el) => { if (el?.complete …) setRatio(…) }}`) and `src/components/site/product-card.tsx:54` call a state setter from a `ref` callback during commit, forcing an additional render per image on every mount of a cached image.

1.19 **[MEDIUM]** WHEN a catalogue or homepage grid of images resolves THEN no intrinsic `width`/`height` and no responsive `sizes` attribute is supplied on any of those images, so the grid shifts as each image's real ratio arrives and the full-size uploaded original is served to every viewport including small mobile screens.

**Repository hygiene (D9)**

1.20 **[LOW]** WHEN the project is built THEN all nine filenames exist in **both** `src/assets/` and `public/media/` (`category-bedroom|chairs|dining|office|outdoor|sofas|storage|tables.jpg` and `hero-luxury-living.jpg`) and **neither set is referenced anywhere in `src/`** — greps for `@/assets`, `src/assets` and `/media/` all return zero matches. Eighteen unreferenced image files ship with the project. *VERIFIED by grep. Whether any external or indexed URL points at `/media/*` remains NOT VERIFIED, which is why PR #1 retained both copies.*

**Verification coverage (D10)**

1.21 **[MEDIUM]** WHEN the three deferred component behaviours regress THEN nothing catches it: PR #1's task 11.3 was not done, so there is no component-level test for the media-panel error card, none for the product page's 404-versus-load-failure distinction, and none for the logo `onError` fallback. *VERIFIED: 18 test files, 259 tests, none rendering those components.*

1.22 **[LOW]** WHEN a contributor runs `bun run lint` to check their work THEN it exits non-zero with 732 pre-existing problems, so lint carries no signal: a genuinely new violation is indistinguishable from the existing noise, and there is no recorded baseline to compare against. *VERIFIED by execution: 726 errors + 6 warnings; 725 `prettier/prettier`, 6 `react-refresh/only-export-components`.*

### Expected Behavior (Correct)

**Logo — Priority 1**

2.1 WHEN any value is stored in `site_settings.logo_url` THEN the header SHALL resolve it through the merged `resolveLogoSrc` from `src/lib/logo.ts` and SHALL render the image only when that guard returns a usable src, SHALL render the existing `NGMonogram` whenever the guard returns `null` — so empty, whitespace-only, `javascript:` and other non-`http(s)`/non-`data:image` values reach the fallback — and the rendered logo SHALL carry a correct accessible name derived from the configured company name rather than depending on adjacent text.

2.2 WHEN the resolved logo fails to load at runtime THEN the system SHALL handle the error and SHALL fall back to the existing `NGMonogram` mark, so a broken stored URL degrades to the brand monogram instead of a broken-image box.

2.3 WHEN the stored logo has an unexpected ratio or large intrinsic dimensions THEN the system SHALL apply the merged `LOGO_IMG_CLASS` so the mark is constrained by both a maximum height and a maximum width and is scaled with `object-contain`, preserving its ratio without distorting it and without altering the header's existing height or spacing.

2.4 WHEN the owner sets the site logo THEN the settings panel SHALL provide a real managed-asset control that lets an admin **upload, preview, replace and remove** the logo and persists the result to the existing `site_settings.logo_url` column. It SHALL reuse the merged shared pipeline exclusively — `useImageUpload` from `src/hooks/use-image-upload.ts` over `validateUploadFile` from `src/lib/uploads.ts` — and SHALL NOT introduce a second upload path. It SHALL present distinct loading, success and error states using the `uploading` flag and `summarise` already exposed by that hook, SHALL leave the previous logo intact when an upload fails, and SHALL be built from primitives already present in `settings-panel.tsx` (`Button`, `Input`, `Label`) so no new design vocabulary is introduced. No migration SHALL be required and no logo URL SHALL be hardcoded.

2.5 WHEN the site renders its brand mark in the footer and about locations THEN the system SHALL use the same guarded resolution as the header so a configured logo appears consistently, and SHALL fall back to `NGMonogram` at those locations' existing sizes whenever no valid logo is configured — leaving their surrounding layout, spacing and sizing unchanged.

**Hero call-to-action navigation**

2.6 WHEN a hero banner's `button_link` is an in-page anchor, an absolute external URL, a registered internal path, or an unusable value THEN the system SHALL classify it through the merged `classifyLink` from `src/lib/links.ts` and SHALL respectively scroll to the anchor, open it as an external anchor, navigate internally, or omit the call to action entirely — and SHALL never break the slide, the route, or render an error boundary. The button's existing classes, copy and position SHALL be unchanged.

**Crawler contract and published output**

2.7 WHEN a crawler fetches `robots.txt` THEN the system SHALL disallow the admin paths and SHALL declare the existing `sitemap.xml` via a `Sitemap:` directive, without changing any public URL and without disallowing any path a crawler can legitimately index today.

2.8 WHEN the products query inside the `sitemap.xml` handler fails THEN the system SHALL inspect the returned `error`, SHALL NOT publish a truncated sitemap as a cacheable 200, SHALL respond in a way that prevents a crawler caching the incomplete document, and SHALL report the failure through the existing error-reporting infrastructure. WHEN the query succeeds THEN the emitted XML, its entries, its ordering and its cache header SHALL be byte-for-byte what they are today.

**Hero slideshow accessibility and motion**

2.9 WHEN the hero slideshow is used on a touch device THEN the pagination controls SHALL present a tap target meeting a documented minimum size, while their visible appearance — the existing thin indicator look — SHALL be preserved by enlarging the interactive area rather than by restyling the indicator.

2.10 WHEN a visitor interacts with the hero THEN the system SHALL pause the autoplay rotation, and SHALL leave the 7-second interval and the priority ordering unchanged for the non-interacting case.

2.11 WHEN a visitor has `prefers-reduced-motion: reduce` set THEN the system SHALL respect it by not auto-rotating, while keeping manual slide selection fully functional so no content becomes unreachable.

2.12 WHEN a hero background image is rendered THEN the system SHALL mark it as decorative so it is not announced, leaving the visible composition, positioning and scrim exactly as they are.

**Catalogue search suggestions**

2.13 WHEN the catalogue search suggestion list is open THEN the system SHALL expose correct combobox semantics — the input as a combobox with `aria-expanded` reflecting real state, the list as a listbox, each item as an option, and `aria-activedescendant` pointing at the currently highlighted option.

2.14 WHEN a keyboard user operates the search field THEN the system SHALL support ArrowDown/ArrowUp traversal of the suggestions, Enter to select the highlighted suggestion, and Escape to dismiss the list without clearing the query.

2.15 WHEN a suggestion is selected, or a click occurs outside the suggestion region THEN the system SHALL close the list so it never covers the results, and SHALL apply the selected name to the search exactly as it does today.

**Remaining accessible-name gaps**

2.16 WHEN a screen-reader or keyboard user operates the admin dashboard THEN every icon-only control in `products-panel.tsx`, `categories-panel.tsx` and `homepage-panel.tsx` SHALL have an accessible name that states its action and its target, matching the pattern PR #1 already established in the media panel, with no visual change to any control.

2.17 WHEN a screen-reader user fills in any admin form THEN every field SHALL be programmatically associated with its label through matching `htmlFor`/`id`, with unique ids, and with no change to the rendered layout or label copy.

**Image sizing and layout shift**

2.18 WHEN an already-complete cached image is mounted THEN the system SHALL determine its ratio without writing state from a `ref` callback during commit, eliminating the extra render per image.

2.19 WHEN a grid of images resolves THEN the system SHALL supply intrinsic sizing hints and a responsive `sizes` attribute so the grid does not shift as ratios arrive and appropriately sized images are served per viewport. The shared `product-media` no-crop `object-contain` framing and the existing clamped aspect-ratio ranges (`0.75`–`1.5` in `AdaptiveImage`, `0.8`–`1.25` in `ProductCard`) SHALL be preserved **exactly** — this is PR #1 preservation clause 3.17 and is non-negotiable.

**Repository hygiene**

2.20 WHEN the project is built THEN the system SHALL delete only the nine unreferenced `src/assets/` copies, which are bundler-scoped and therefore cannot be the target of any external URL, and SHALL **keep** all nine `public/media/` files because those are directly addressable and external dependence on them is NOT VERIFIED. No destructive cleanup SHALL touch anything a production URL could resolve to.

**Verification coverage**

2.21 WHEN the three deferred component behaviours are exercised THEN component tests SHALL cover the media-panel error card, the product page's 404-versus-load-failure distinction, and the logo `onError` fallback. Each SHALL render the real component and assert real rendered output through the existing boundary fake in `src/test/supabase-fake.ts`; none SHALL configure a mock and then assert that the mock returned its configured value.

2.22 WHEN lint is run THEN the pre-existing baseline SHALL be recorded as measured — 732 problems (726 errors, 6 warnings; 725 `prettier/prettier`, 6 `react-refresh/only-export-components`) — the work in this spec SHALL NOT increase it, and lint SHALL NEVER be reported as passing. Reformatting the repository to clear the baseline is out of scope, being precisely the stylistic mass refactor these constraints forbid.

### Unchanged Behavior (Regression Prevention)

Clauses 3.1–3.24 of the merged `production-stability-fixes` spec remain in force in full. The clauses below restate the ones this spec's changes can actually reach, plus the new preservation obligations these fixes create. Where a clause corresponds to a PR #1 clause, that number is cited.

3.1 WHEN no logo is configured, or the configured value is not a usable image src THEN the system SHALL CONTINUE TO render the existing `NGMonogram` mark in the header, the footer and the about section at their current sizes (`h-9 w-9` default, `h-20 w-20` at `index.tsx:260`, `h-12 w-12` at `index.tsx:395`). *PR #1 clause 3.23.*

3.2 WHEN a product image is framed THEN the system SHALL CONTINUE TO use the shared `product-media` treatment that never crops or distorts furniture, with ratios clamped to the current ranges. *PR #1 clause 3.17 — the binding constraint on 2.18 and 2.19.*

3.3 WHEN a product, category or banner has no usable image THEN the system SHALL CONTINUE TO fall back to the existing inline `PLACEHOLDER_IMAGE`, including via the existing `onError` handler in `AdaptiveImage`. *PR #1 clause 3.19.*

3.4 WHEN the header is rendered THEN the system SHALL CONTINUE TO present its existing fixed positioning, `h-20` bar, scroll-transition colours, company name, tagline, navigation and mobile sheet unchanged. Adding the guarded logo SHALL change no other element of the header.

3.5 WHEN an existing product URL `/product/{slug}` is requested THEN the system SHALL CONTINUE TO resolve the same slugs to the same products, with no route or URL changes anywhere in the app. *PR #1 clause 3.2.*

3.6 WHEN a page renders an image whose URL is already stored in the database THEN the system SHALL CONTINUE TO display it from that URL, including any `logo_url` already stored that `resolveLogoSrc` accepts. *PR #1 clause 3.3.*

3.7 WHEN a customer taps Enquire anywhere THEN the system SHALL CONTINUE TO open WhatsApp with the same message format, product link and image line, and SHALL CONTINUE TO record the enquiry. *PR #1 clause 3.4.*

3.8 WHEN a visitor uses the catalogue THEN the system SHALL CONTINUE TO apply the same search fields, collection/sub-collection, price, material, colour and availability filters, the same six sort options, the same 12-per-page "Load more", and the same clear/reset behaviour. Adding combobox semantics SHALL change neither which suggestions are computed nor the result set any query produces. *PR #1 clause 3.5.*

3.9 WHEN the homepage hero has multiple banners THEN the system SHALL CONTINUE TO rotate them on the existing 7-second cycle in priority order with working manual selection, and SHALL CONTINUE TO render the same title, eyebrow, subtitle, scrim and button styling. *PR #1 clause 3.6.*

3.10 WHEN a hero banner's `button_link` already works today — an in-page anchor, or a registered internal path — THEN the system SHALL CONTINUE TO produce exactly the same navigation it produces now.

3.11 WHEN an admin uploads any image from the products, categories, homepage or media panels THEN the system SHALL CONTINUE TO use the merged shared pipeline with its existing validation, batch reporting and media-query invalidation, unchanged. Adding the logo upload SHALL add no second pipeline and SHALL alter no existing caller.

3.12 WHEN any admin mutation runs THEN the system SHALL CONTINUE TO apply the merged zero-row detection from `src/lib/mutations.ts` and the merged loading/empty/error separation from `src/lib/query-state.ts` and `QueryFailed`, unchanged.

3.13 WHEN the settings panel is used THEN the system SHALL CONTINUE TO save every other field in `TEXT_FIELDS` and `LONG_FIELDS` exactly as it does now, with the same layout and copy. Replacing the `logo_url` text input SHALL affect no other field.

3.14 WHEN an admin signs in, reloads, returns to a tab, or signs out THEN the system SHALL CONTINUE TO persist and refresh the session, revalidate the role on focus and on realtime role changes, and clear the session on sign-out. *PR #1 clause 3.8.*

3.15 WHEN the merged admin route guard and staff-model `useAuth` evaluate access THEN the system SHALL CONTINUE TO honour the three-tier `admin`/`manager`/`editor` model and every capability each role holds today. No role SHALL be removed or collapsed. *PR #1 clauses 3.9, 3.10.*

3.16 WHEN an admin soft-deletes, restores or purges a product THEN the system SHALL CONTINUE TO support the same trash workflow and counts. *PR #1 clause 3.7.*

3.17 WHEN an admin changes products, categories, sections, banners or settings THEN the system SHALL CONTINUE TO propagate the change to every open storefront surface through the existing single realtime channel and SHALL CONTINUE TO remove its subscriptions on unmount. *PR #1 clause 3.11.*

3.18 WHEN any page is viewed THEN the system SHALL CONTINUE TO present the existing colour palette, typography, spacing, card styling, hero composition and design-system components, with no redesign, no new gradients and no new animations. *PR #1 clause 3.14.*

3.19 WHEN metadata is emitted THEN the system SHALL CONTINUE TO serve the existing titles, descriptions, Open Graph and Twitter tags, the merged product metadata, and the existing `FurnitureStore` structured data with the project's real business details — none invented or altered. *PR #1 clause 3.15.*

3.20 WHEN `sitemap.xml` and `robots.txt` are fetched THEN the system SHALL CONTINUE TO serve them at the same paths, and `sitemap.xml` SHALL CONTINUE TO list the same set of public URLs whenever its query succeeds. *PR #1 clause 3.16.*

3.21 WHEN an admin route is loaded or a login redirect is issued THEN the system SHALL CONTINUE TO mark admin pages `noindex,nofollow` and SHALL CONTINUE TO reject external or protocol-relative `next` values at the login route. The `robots.txt` change SHALL supplement these, not replace them. *PR #1 clause 3.20.*

3.22 WHEN a request resolves any `public/media/*` path THEN the system SHALL CONTINUE TO serve those nine files at their current URLs, because external dependence on them is NOT VERIFIED.

3.23 WHEN migrations are applied THEN the system SHALL CONTINUE TO apply the existing 22 files unmodified, with any correction added as a new append-only migration and no rewriting of migration history. *PR #1 clause 3.13.*

3.24 WHEN an unexpected error occurs THEN the system SHALL CONTINUE TO use the existing `error-capture`, `error-page` and `lovable-error-reporting` infrastructure and the existing root error and 404 components; none SHALL be deleted. *PR #1 clause 3.18.*

3.25 WHEN the test suite is run THEN all **259 currently passing tests across 18 files** SHALL CONTINUE TO pass, and no existing test SHALL be deleted, skipped or weakened to accommodate a change in this spec.

3.26 WHEN the project is installed and run THEN the system SHALL CONTINUE TO work with Bun, the existing lockfile and the existing `dev`/`build`/`preview`/`lint`/`format`/`typecheck`/`test` scripts, with no runtime dependency added beyond what a fix strictly requires. *PR #1 clause 3.24.*
