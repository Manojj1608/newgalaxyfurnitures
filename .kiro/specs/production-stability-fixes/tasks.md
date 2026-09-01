# Implementation Plan

Derived from `bugfix.md` (42 defects) and `design.md` (11 correctness properties, 8-phase sequencing).
Neither source document is modified by this plan.

## Overview

The 42 defects in `bugfix.md` are not 42 unrelated bugs: they cluster into eight families, each with a
single root cause and therefore a single fix shape. The shared shape is **a failure boundary that is
never inspected** — a bucket that was never created, a policy that disagrees with the table policy
beside it, a role check that asks the wrong question, a mutation issued without `.select()`, a query
whose `isError` is never read, a `.catch(() => {})`.

This plan implements the design in eight phases, ordered so that CRITICAL items land first and
independently:

- **Task 1 — Phase 0 (Enablement).** Install dependencies, stand up vitest, add `typecheck`/`test`
  scripts, untrack `.env`. Sequenced first because nothing else here can be verified without it.
- **Tasks 2–3 — Exploration and preservation tests on UNFIXED code.** Task 2 must FAIL (it proves the
  bugs exist and confirms or refutes the root-cause analysis); task 3 must PASS (it pins the baseline
  behaviour to preserve, observation-first).
- **Task 4 — Phase 1 (CRITICAL).** Bucket migration, storage policy alignment, admin route guard.
- **Task 5 — Phase 2.** Public-read policy role-split then `anon` revoke; `useAuth` rewrite; dashboard
  denied-vs-error.
- **Task 6 — Phase 3.** One shared, validated upload path.
- **Task 7 — Phase 4.** No operation reports success it cannot demonstrate.
- **Task 8 — Phase 5.** loading / empty / error separated everywhere.
- **Task 9 — Phase 6.** Logo: runtime admin upload, reachable monogram fallback.
- **Task 10 — Phase 7.** Long tail: navigation, clipboard, a11y/responsive, SEO, assets, performance.
- **Tasks 11–16.** Tests over real exported logic, re-running tasks 2 and 3, the final verification
  run, the change log, and the checkpoint.

Four new append-only migrations in total. No existing migration file is edited. Every fix is the
smallest production-safe change, additive wherever possible, with new pure modules (`uploads.ts`,
`links.ts`, `admin-guard.ts`, `query-state.tsx`) holding the new logic so it is unit-testable without
a database.

## Standing constraints on every task below

- **No redesign.** Colour palette, typography, spacing, card styling, hero composition, design-system
  components, routes and URLs stay as they are. No new gradients, no new animations. Visual change only
  where it directly fixes a broken state, usability, responsiveness, accessibility or performance
  defect named in `bugfix.md`. (3.14, 3.16, 3.17)
- **Append-only migrations.** The existing 18 files in `supabase/migrations/` are never edited. Every
  schema, policy, grant or data correction is a NEW timestamped migration file. Four new migrations
  total. (3.13)
- **Smallest production-safe fix per defect**, additive wherever possible. No stylistic mass refactors.
- **Verification honesty.** Anything not actually executed is recorded as NOT VERIFIED. No claimed
  outcomes, no fabricated evidence.

## Environment legend

Each task carries an `_Env:_` annotation stating what is honestly achievable in this sandbox:

- `SANDBOX-COMPLETE` — fully implementable and verifiable here (static code, pure functions, unit tests,
  lint, typecheck, build).
- `SANDBOX-PARTIAL` — code is implementable and unit-testable here; behavioural confirmation needs a
  running app or a branch database.
- `NOT-VERIFIABLE-HERE` — correctness depends on live Supabase state (bucket existence, its `public`
  flag, applied policies, actual grants, real RLS row sets). Only an anon/publishable key exists in this
  sandbox, so this state cannot be read. These tasks MUST be reported as **NOT VERIFIED** in the PR
  until run against the live project or a branch/shadow database.

---

## Task Dependency Graph

```
1  Phase 0 — Enablement (bun install, vitest, typecheck/test scripts, .env hygiene)
│  gates EVERYTHING: node_modules is absent and there is no test or typecheck
│  script, so no task below can be verified until 1.1 lands
│  1.1 install + runner ──┐
│  1.2 .env hygiene       │ (independent of 1.1; no downstream dependents)
│                         │
├─────────────────────────┴──────────────────────────────────────────────┐
│                                                                        │
2  Exploration tests — MUST run on UNFIXED code, MUST FAIL       3  Preservation tests — MUST run on
   (needs 1.1 for a runner; must precede every fix in 4–10)        UNFIXED code, MUST PASS
   │  refutes/confirms the design's root causes                    │  (needs 1.1; records golden values
   │  probe 7 is decisive for 5.1                                  │   that 5.1 and 13 assert against)
   │                                                              │
   └──────────────────────────┬───────────────────────────────────┘
                              │  no fix may be written until BOTH have run
                              ▼
4  Phase 1 — CRITICAL (independently shippable, in this internal order)
   4.1 create product-images bucket ──► 4.2 align storage write policies to staff model
   4.3 route guard denies non-staff (shares deriveAccess with 5.2)
   │
   ├──────────────────────────────┬─────────────────────────────────────┐
   ▼                              ▼                                     ▼
5  Phase 2 — authz + oracle    6  Phase 3 — upload pipeline          7  Phase 4 — false success
   MUST ship AFTER Phase 1       depends on 4.1: the bucket             (depends only on Phase 0)
   │                             MUST exist before any upload           7.1 .select() + expectRows
   │ 5.1 ONE migration, ONE      path is exercised                      7.2 report discarded errors
   │     transaction, strict     │ 6.1 uploads.ts (validation,          7.3 order migration + dense
   │     statement order:        │     MIME-derived keys, batch)            client re-sequencing
   │       (a) create anon-only  │ 6.2 deletion ordering ───┐           7.4 switch reverts on failure
   │           staff-free        │     (needs 6.1)          │
   │           policies          │ 6.3 one upload hook ─────┤
   │       (b) drop combined     │     (needs 6.1)          │
   │           "Public can       │ 6.4 delete dead dup      │
   │           view …"           │     (needs 6.1/6.3)      │
   │       (c) create            │                          │
   │           authenticated     ▼                          │
   │           policies          9  Phase 6 — Logo ◄────────┘
   │       (d) THEN revoke          depends on Phase 3's shared upload
   │           anon EXECUTE +       path (9.1 uses the 6.3 hook)
   │           USAGE               9.1 admin upload/preview/replace/remove
   │   ⚠ the role-split MUST       9.2 guarded render + NGMonogram fallback
   │     NEVER be preceded by
   │     the revoke — a bare     8  Phase 5 — loading/empty/error
   │     revoke is a production     8.1 queryStateOf + QueryFailed ──┐
   │     outage (3.1/3.2)           8.2 admin panels ◄───────────────┤
   │ 5.2 useAuth rewrite            8.3 homepage ◄───────────────────┤
   │     (shares the Access         8.4 product page ◄───────────────┘
   │      union with 4.3)               (8.2–8.4 all need 8.1)
   │ 5.3 dashboard denied vs
   │     error (needs 5.2)       10 Phase 7 — long tail
   │                                10.1–10.10 independent of each other;
   │                                10.1 links.ts feeds hero-slider only
   └──────────────────┬─────────────────────┬────────────────────────┘
                      ▼                     ▼
11 Unit / property / component tests over the real exported logic from 4–10
   11.1 unit · 11.2 property-based · 11.3 component
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
12 Re-run the SAME tests      13 Re-run the SAME tests
   from task 2 — now MUST        from task 3 — MUST STILL
   PASS (bug fixed)             PASS (no regressions)
        └─────────────┬─────────────┘
                      ▼
14 Final verification run (install → lint → typecheck → test → build)
                      ▼
15 Change log for the PR (needs 14's REAL outcomes, and task 2's actual
   findings, including whether probe 7 reproduced)
                      ▼
16 Checkpoint — all tests pass, no migration edited, no redesign,
   no mock-asserting test, no committed logo binary
```

**Hard ordering constraints (violating any of these invalidates the work):**

| Constraint | Why |
|---|---|
| 1.1 before everything | `node_modules` is absent; there is no `test` or `typecheck` script |
| 2 and 3 before 4–10 | Both must run on UNFIXED code: 2 must FAIL, 3 must PASS |
| 4 before 5 | The guard is safe alone, but the `anon` revoke must not precede its policy split |
| 4.1 before 4.2 | Policies keyed on `bucket_id = 'product-images'` need the bucket to exist |
| 5.1(a–c) before 5.1(d) | Bare revoke = `permission denied for function` on anonymous reads |
| 4.1 before 6 | Uploads cannot be exercised until the bucket exists |
| 6 (esp. 6.3) before 9 | The logo reuses the shared validated upload path |
| 8.1 before 8.2–8.4 | All three consume `queryStateOf` / `QueryFailed` |
| 2 → 12, 3 → 13 | 12 and 13 re-run the SAME tests; they do NOT write new ones |
| 14 before 15 before 16 | The change log records 14's real outcomes; the checkpoint closes both |

**Parallelisable once their gates are met:** 1.2 (independent of 1.1); 7 and 8 (both need only Phase 0);
10.1–10.10 (independent of each other); 6.2/6.3/6.4 after 6.1.

**Wave definitions** (the same dependency structure as the diagram and table above, in machine-readable
form; tasks within a wave may run in parallel, waves run in order):

```json
{
  "waves": [
    {
      "wave": 1,
      "name": "Enablement",
      "tasks": ["1"],
      "depends_on": [],
      "parallel": ["1.1", "1.2"],
      "notes": "Gates everything: node_modules is absent and there is no test or typecheck script. 1.2 is independent of 1.1 and has no downstream dependents."
    },
    {
      "wave": 2,
      "name": "Exploration and preservation on UNFIXED code",
      "tasks": ["2", "3"],
      "depends_on": ["1.1"],
      "parallel": ["2", "3"],
      "notes": "Both MUST run before any fix in tasks 4-10. Task 2 MUST FAIL (proves the bugs exist); task 3 MUST PASS (pins the baseline to preserve, observation-first)."
    },
    {
      "wave": 3,
      "name": "CRITICAL and Phase-0-only fixes",
      "tasks": ["4", "7", "8", "10"],
      "depends_on": ["2", "3"],
      "parallel": ["4", "7", "8", "10"],
      "internal_order": {
        "4": ["4.1", "4.2"],
        "8": ["8.1", "8.2", "8.3", "8.4"]
      },
      "notes": "4 is Phase 1 CRITICAL and independently shippable; 4.1 (create bucket) MUST precede 4.2 (policies keyed on bucket_id). 7 and 8 depend only on Phase 0. 8.1 MUST precede 8.2-8.4, which all consume queryStateOf / QueryFailed. 10.1-10.10 are independent of each other."
    },
    {
      "wave": 4,
      "name": "Authz oracle and upload pipeline",
      "tasks": ["5", "6"],
      "depends_on": ["4", "4.1"],
      "parallel": ["5", "6"],
      "internal_order": {
        "5": ["5.1", "5.2", "5.3"],
        "6": ["6.1", "6.2", "6.3", "6.4"]
      },
      "notes": "5 MUST ship after Phase 1. 5.1 is ONE migration in ONE transaction with a strict statement order: (a) anon-only staff-free policies, (b) drop the combined \"Public can view ...\" policies, (c) authenticated policies, (d) THEN revoke anon EXECUTE + USAGE - the role-split MUST NEVER be preceded by the revoke, since a bare revoke is a production outage. 5.2 precedes 5.3. 6 depends on 4.1: the bucket MUST exist before any upload path is exercised; 6.2/6.3/6.4 follow 6.1."
    },
    {
      "wave": 5,
      "name": "Logo",
      "tasks": ["9"],
      "depends_on": ["6", "6.3"],
      "parallel": ["9.1", "9.2"],
      "notes": "Reuses the shared validated upload path: 9.1 consumes the 6.3 hook."
    },
    {
      "wave": 6,
      "name": "Tests over real exported logic",
      "tasks": ["11"],
      "depends_on": ["4", "5", "6", "7", "8", "9", "10"],
      "parallel": ["11.1", "11.2", "11.3"],
      "notes": "Unit, property-based and component tests against the real exported logic produced by tasks 4-10."
    },
    {
      "wave": 7,
      "name": "Re-run the same tests",
      "tasks": ["12", "13"],
      "depends_on": ["11"],
      "parallel": ["12", "13"],
      "notes": "12 re-runs the SAME tests from task 2 - now MUST PASS (bug fixed). 13 re-runs the SAME tests from task 3 - MUST STILL PASS (no regressions). Neither writes new tests."
    },
    {
      "wave": 8,
      "name": "Final verification run",
      "tasks": ["14"],
      "depends_on": ["12", "13"],
      "parallel": [],
      "notes": "install -> lint -> typecheck -> test -> build. Anything not actually executed is recorded as NOT VERIFIED."
    },
    {
      "wave": 9,
      "name": "Change log",
      "tasks": ["15"],
      "depends_on": ["14"],
      "parallel": [],
      "notes": "Records 14's REAL outcomes and task 2's actual findings, including whether probe 7 reproduced."
    },
    {
      "wave": 10,
      "name": "Checkpoint",
      "tasks": ["16"],
      "depends_on": ["15"],
      "parallel": [],
      "notes": "All tests pass, no migration edited, no redesign, no mock-asserting test, no committed logo binary."
    }
  ]
}
```

---

## Tasks

- [x] 1. Phase 0 — Enablement: make verification possible at all

  Sequenced first because nothing else in this plan can be verified without it: `node_modules` is absent
  and there is no test or typecheck script, so every finding behind this spec is currently static. This
  phase must land before the exploration tests in task 2, which have to run against UNFIXED code.

  - [x] 1.1 Install dependencies and stand up the test runner
    - Run `bun install` (uses the existing `bun.lock`; no lockfile rewrite)
    - Add dev dependencies only: `bun add -d vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom`
    - Create `vitest.config.ts` reusing the already-present `vite-tsconfig-paths` plugin so the `@/` alias
      resolves without duplicating path config; `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`
    - Create `src/test/setup.ts` importing `@testing-library/jest-dom` matchers
    - Add to `package.json` scripts, leaving `dev`/`build`/`build:dev`/`preview`/`lint`/`format` untouched:
      `"typecheck": "tsc --noEmit"` and `"test": "vitest --run"`
    - `--run` for single-shot execution; watch mode is never invoked by tooling
    - No runtime dependency is added (3.24)
    - _Files: `package.json`, `vitest.config.ts` (new), `src/test/setup.ts` (new)_
    - _Defects: 1.42_
    - _Requirements: 2.42, 3.24_
    - _Design_Property: 10_
    - _Verification: `bun run typecheck` and `bun run test` both execute and report real results; `bun run lint`, `bun run build` still succeed; confirm the five pre-existing scripts are byte-identical_
    - _Env: SANDBOX-COMPLETE_

  - [x] 1.2 Security hygiene — untrack `.env`, ignore it, document it
    - `git rm --cached .env` (the file stays on disk; `git ls-files` currently returns it — VERIFIED)
    - Add `.env` and `.env*.local` to `.gitignore`, which today contains no env entry at all
    - Commit `.env.example` documenting `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and
      `SUPABASE_PROJECT_ID` with placeholder values only — no real credentials
    - Record the previously committed publishable credentials as **potentially compromised, rotation
      recommended**. Rotation is an owner action outside this repo: report it, never claim it
    - Untracking does NOT purge the file from history; history rewriting is deliberately NOT proposed —
      rotation is the mitigation. State this explicitly in the change log
    - Preserve the verified client/server split: introduce no service-role key, leave
      `src/integrations/supabase/client.server.ts` unreferenced
    - _Files: `.gitignore`, `.env.example` (new), git index only for `.env`_
    - _Defects: 1.15_
    - _Requirements: 2.15_
    - _Verification: `git ls-files | grep -E '^\.env'` returns only `.env.example`; `git check-ignore -v .env` confirms the ignore rule; grep the repo for `service_role` and confirm zero occurrences_
    - _Env: SANDBOX-COMPLETE (credential rotation itself: NOT-VERIFIABLE-HERE)_

- [ ] 2. Write bug condition exploration test
  - **Property 1: Bug Condition** - Uninspected failure boundaries reported as success or emptiness
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist, and confirm or refute the root-cause
    analysis in `design.md`. If a counterexample fails to reproduce, the hypothesis is WRONG and must be
    re-formed before any fix is written
  - **Scoped PBT Approach**: These defects are deterministic, so scope each property to the concrete
    failing case(s) for reproducibility, then widen to generated inputs where the input domain is real
    (file sets, role sets, query-state combinations, link strings)
  - Bug condition under test — `isBugCondition(input)` from the design, the union of eight family
    predicates: `storageBlocked OR uploadUnsafe OR authzWrong OR oracleOpen OR falseSuccess OR
    failureLooksEmpty OR interactionBroken OR outputDerivedFromFailure`
  - Assertions must match the Expected Behavior Properties (design Properties 1–10 / requirements 2.1–2.42)
  - Runnable-here exploration cases (vitest, against unfixed `src/`):
    - Batch accounting (1.3): drive the current media-panel `onFiles` path with five files where the third
      throws; assert files 4–5 were never attempted and the reported count was `files.length`
    - Validation absence (1.4, 1.9): assert no MIME allow-list and no size cap gate the current upload, and
      that the object-key extension is taken from `file.name.split(".").pop()` rather than the blob MIME
    - Zero-rows false success (1.22): call the current `softDeleteProduct` against a boundary returning
      `{data: null, error: null}`; assert it resolves successfully — the counterexample for "Moved to trash"
    - Discarded errors (1.18, 1.19, 1.32): assert `createEnquiry`, `logProductView`, `logAudit`,
      `reorderSections` and `openProductEnquiry` all resolve successfully when their boundary returns an error
    - Failure-as-emptiness (1.23–1.26): assert the current panels render empty-state copy ("No media yet.",
      "No settings row found.", "Trash is empty.") when the query is in an error state
    - False 404 (1.27): assert the product route renders "Piece not found" when the query errors on a valid slug
    - Role gating (1.11, 1.12, 1.13): assert the current `useAuth` resolves `isAdmin: false` for a `manager`
      and for a failed role lookup — collapsing "no role" into "denied" — and never settles when
      `getUser()` rejects
    - Hero CTA (1.29): assert `https://example.com` and `/not-a-route` are passed to a typed `<Link to>`
    - Equal ordering (1.20): assert the two-row swap over siblings sharing `display_order = 99` writes 99 and 99
  - Branch-database / manual exploration cases (record as NOT VERIFIED until executed):
    - Bucket absence (1.1): apply all 18 migrations to a clean database, upload as `admin`, expect a storage
      error naming a missing bucket. This is the ONLY place the missing bucket is observable, since live state
      is NOT VERIFIED
    - Role disagreement (1.2): as `editor`, insert a `media` row (succeeds) and upload the object (denied) —
      the asymmetry is the counterexample
    - Non-staff admin entry (1.10): with a `user`-only account request `/admin/dashboard`; observe the route
      load and its admin queries fire
    - Role oracle (1.16): with only the anon key, invoke `private.is_staff` with an arbitrary UUID and observe
      it answer
    - **Decisive probe for task 5 (1.16)**: on a branch database revoke `anon` execute on `private.is_staff`
      WITHOUT splitting the policies, then read `products` with the anon key. Expect
      `permission denied for function`. This is the counterexample that justifies the policy split. If it does
      NOT reproduce, the caller-privilege premise is wrong and the split is merely redundant rather than
      required — the design is safe either way, but the conclusion MUST be corrected in the change log
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document every counterexample found, and explicitly note any that failed to reproduce
  - Mark task complete when tests are written, run, and failures are documented
  - _Files: `src/**/*.test.ts(x)` (new)_
  - _Defects: 1.1–1.14, 1.16, 1.18–1.31, 1.37, 1.41_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.16, 2.18, 2.19, 2.20, 2.21, 2.22, 2.23, 2.24, 2.25, 2.26, 2.27, 2.28, 2.29, 2.30, 2.31, 2.37_
  - _Env: SANDBOX-PARTIAL (schema and live-state probes: NOT-VERIFIABLE-HERE)_

- [ ] 3. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Every input outside the bug condition behaves identically
  - **IMPORTANT**: Follow observation-first methodology — run the UNFIXED code first, record the ACTUAL
    outputs as golden values, then assert exactly those observations. Do not assert assumed behaviour
  - Non-bug condition under test: all inputs where `isBugCondition(input)` is false — anonymous storefront
    reads, already-persisted image URLs, any mutation an `admin` already completes successfully, and every
    filter/sort/search/pagination/hero/trash interaction
  - Observe on UNFIXED code, then pin as golden values (pure functions — runnable here):
    - `productEnquiryMessage` for products with and without `sku`, with and without `sale_price` → assert
      byte-identical message format, product link and image line (3.4)
    - `normalizeImages` for string entries, object entries and malformed entries → unchanged (3.3)
    - `slugify` for awkward names → unchanged, so every `/product/{slug}` still resolves (3.2)
    - `effectivePrice` and `discountPercent` across zero, null, equal and greater `sale_price` → unchanged (3.5)
    - Catalogue filtering and sorting: capture the filtered/sorted ID order for a fixed product fixture across
      every filter and all six sort options, the 12-per-page "Load more" and clear/reset → identical order (3.5)
  - Property-based preservation (generated inputs, stronger guarantees than fixed examples):
    - Arbitrary role sets → `deriveAccess` agrees with the SQL model
      (`isStaff ⟺ roles ∩ {admin,manager,editor} ≠ ∅`, `isManager ⟺ roles ∩ {admin,manager} ≠ ∅`,
      `isManager ⟹ isStaff`), and `admin` never loses a capability (3.9, 3.10)
    - Arbitrary `{isLoading, isError, data}` → `queryStateOf` never returns `'empty'` when `isError` is true
    - Arbitrary file sets → `succeeded.length + failed.length === files.length`, no valid file skipped
      because a sibling failed
    - Arbitrary product records → the metadata builder never emits an empty-valued tag and never invents a
      field absent from the record (3.15)
  - Branch-database / manual preservation cases (record as NOT VERIFIED until executed):
    - **The single most important preservation check in this spec (3.1)**: record anon-key row counts and IDs
      for `products`, `categories`, `homepage_sections` and `hero_banners` on unfixed code, then assert the
      IDENTICAL sets after the policy split and revoke in task 5
    - Already-stored image URLs (3.3): record a set of live signed URLs that render today; assert each still
      renders after the bucket is made public and that NO row was modified
    - `admin` capability (3.9): walk every panel and action as `admin` before and after; same tabs, same outcomes
    - Hero rotation (3.6): 7-second cycle, priority order, working manual selection when
      `prefers-reduced-motion` is not set
    - Trash workflow (3.7): soft-delete, restore, purge — same transitions and counts
    - Session lifecycle (3.8): sign in, reload, refocus, sign out — persistence, focus revalidation, clean sign-out
    - Metadata (3.15): existing homepage `FurnitureStore` JSON-LD and all existing meta tags byte-identical;
      product-page additions purely additive
    - Routes and public paths (3.2, 3.16): every route, `/product/{slug}`, the `sitemap.xml` URL set and
      `robots.txt` availability unchanged
    - Realtime (3.11): the single channel still propagates admin changes to every storefront surface and still
      removes subscriptions on unmount
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Files: `src/**/*.test.ts(x)` (new)_
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 3.20, 3.21, 3.22, 3.23, 3.24_
  - _Design_Property: 11_
  - _Env: SANDBOX-PARTIAL (live row sets and rendering: NOT-VERIFIABLE-HERE)_

- [ ] 4. Phase 1 — CRITICAL fixes (independently shippable, before anything else is touched)

  These three items share no code with the long tail and ship on their own, in this order.

  - [ ] 4.1 Create the `product-images` storage bucket (new append-only migration)
    - New file `supabase/migrations/<ts>_create_product_images_bucket.sql`. Do NOT edit any of the 18 existing
      migrations (3.13)
    - All 18 existing migrations contain zero `storage.buckets` writes, yet four RLS policies are keyed on
      `bucket_id = 'product-images'` (VERIFIED by grep)
    - `insert into storage.buckets (...) values ('product-images', 'product-images', true, <MAX_UPLOAD_BYTES>,
      array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public = true,
      file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;`
    - `on conflict do update` makes it idempotent and safe against a live project whose state differs from
      migration history — the bucket was likely created out-of-band via the dashboard
    - Bucket is **public** for three reasons that must be preserved in the change log: (a) a signed URL is
      authorised by its token, not the `public` flag, so every already-persisted ~10-year signed URL keeps
      resolving with ZERO row rewrites; (b) `"Public can view product images"` already grants `anon` SELECT on
      every object in this bucket, so `public = true` changes the URL shape available, not the audience — no
      confidentiality regression; (c) only a public bucket lets new uploads escape the signing key and the TTL
      ceiling, which is what defect 1.8 actually is
    - `allowed_mime_types` and `file_size_limit` mirror the client allow-list from task 6.1 so the server
      enforces the same contract; they apply to new uploads only and cannot affect stored objects
    - Do NOT backfill or rewrite existing rows. Both URL forms coexist during the transition; both resolve; no
      render-path code branches on which form a URL takes. A one-off reconciliation of legacy rows is
      explicitly OUT OF SCOPE and recorded as deliberately deferred
    - _Files: `supabase/migrations/<ts>_create_product_images_bucket.sql` (new)_
    - _Defects: 1.1 [CRITICAL], 1.8_
    - _Requirements: 2.1, 2.8, 3.3, 3.13_
    - _Design_Property: 1, 3_
    - _Bug_Condition: `isBugCondition(input)` where `NOT bucketExists('product-images', liveState)`_
    - _Verification: apply all migrations to a clean local/branch database; assert one row in `storage.buckets` with `public = true` and the expected limits; run the migration TWICE and assert the second run is a no-op. Then in the admin upload a JPEG/PNG/WebP and confirm it renders, and confirm a pre-existing signed URL still renders on the same page_
    - _**NOT VERIFIED**: bucket existence, its current `public` flag, its current limits, and whether the four storage policies are actually applied on the live project are all unreadable with an anon key. This migration's effect on production MUST be reported as NOT VERIFIED until run against the live project or a branch/shadow database_
    - _Env: NOT-VERIFIABLE-HERE_

  - [ ] 4.2 Align storage write policies to the staff model (new append-only migration)
    - New file `supabase/migrations/<ts>_align_storage_policies_to_staff_model.sql`
    - Replace `private.has_role(auth.uid(), 'admin')` in the three storage write policies from
      `20260627095713`: INSERT → `private.is_staff(auth.uid())`, UPDATE → `private.is_staff(auth.uid())`,
      DELETE → `private.is_manager(auth.uid())`
    - Every predicate is copied from a policy that ALREADY governs the corresponding table, so no actor gains a
      capability it does not already hold on the owning row. `editor` gains image write (it can already write
      the `products`/`media` rows that reference the image) and does NOT gain image delete, matching its lack
      of table DELETE. Security is not weakened to make the feature work
    - `admin` is unaffected — it satisfies both `is_staff` and `is_manager` (3.9)
    - Leave both SELECT policies untouched so read behaviour is unchanged
    - Use `drop policy if exists` before each `create policy` for idempotence against a live policy set that
      may differ from history
    - _Files: `supabase/migrations/<ts>_align_storage_policies_to_staff_model.sql` (new)_
    - _Defects: 1.2 [CRITICAL]_
    - _Requirements: 2.2, 3.9, 3.10, 3.13_
    - _Design_Property: 1_
    - _Bug_Condition: `roleOf(actor) IN {'manager','editor'} AND storageWritePolicyRequires('admin')`_
    - _Verification: on a branch database seed one user per role; assert INSERT/UPDATE succeeds for all three staff roles, DELETE succeeds for `admin`/`manager` and is denied for `editor`, and every operation is denied for a plain `user` and for `anon`_
    - _**NOT VERIFIED**: live policy state_
    - _Env: NOT-VERIFIABLE-HERE_

  - [ ] 4.3 Route guard denies non-staff before the admin route and its queries load
    - New `src/lib/admin-guard.ts` holds ALL logic so it is unit-testable without a router. Export:
      `type Access = {status:'anonymous'} | {status:'error';message} | {status:'denied';user} |
      {status:'ready';user;roles;isAdmin;isManager;isStaff}`, plus pure `deriveAccess(user, roles, lookupError)`
      and `loadAccess()` which inspects BOTH errors
    - `isStaff`/`isManager` mirror the SQL helpers exactly (`admin|manager|editor`, `admin|manager`) so the UI
      and database agree by construction
    - `src/routes/_authenticated/route.tsx` is **integration-managed**: keep its header, keep `ssr: false`, keep
      its shape, and reduce the edit to a single call into the guard. If the integration regenerates the file,
      one small call is lost rather than a block of authorization logic
    - `beforeLoad`: `'ready'` → return `{user, roles}` as route context; `'anonymous'`/`'denied'` → `throw
      redirect({to: '/admin/login', search: nextFor(location)})`; `'error'` → do NOT redirect (a transient
      failure is not an absent session, 1.14), throw so the route's EXISTING `errorComponent` renders. No new
      markup, no destination lost
    - `nextFor` reuses the login route's existing validation contract (`startsWith('/')` and
      `!startsWith('//')`), so no external or protocol-relative value is ever produced (3.20)
    - **Honest scope**: `ssr: false` means `beforeLoad` runs client-side only and therefore CANNOT be a security
      boundary. Do NOT claim server-side enforcement. The authoritative boundary remains RLS, hardened by tasks
      4.2 and 5.1. The guard delivers exactly what 2.10 asks: denial before the admin route and its queries
      load. `ssr: false` is KEPT — enabling SSR would require server-side cookie reads and risks session
      persistence (3.8), far outside "smallest production-safe fix"
    - _Files: `src/lib/admin-guard.ts` (new), `src/routes/_authenticated/route.tsx` (minimal edit)_
    - _Defects: 1.10 [CRITICAL], 1.14_
    - _Requirements: 2.10, 2.14, 3.20_
    - _Design_Property: 4_
    - _Bug_Condition: `operation = 'ENTER_ADMIN' AND isAuthenticated(actor) AND NOT isStaff(actor) AND routeGuardAdmits(actor)`_
    - _Verification: unit tests over `deriveAccess` for {anonymous, lookup error, no roles, `user`, `editor`, `manager`, `admin`}; manual check that a `user`-only account is bounced from `/admin/dashboard` before any admin query fires — visible as ZERO admin requests in the network panel_
    - _Env: SANDBOX-PARTIAL (unit tests here; live role behaviour NOT-VERIFIABLE-HERE)_

- [ ] 5. Phase 2 — Close the role oracle and fix admin authorization

  Must ship AFTER Phase 1: the guard change is safe alone, but the `anon` revocation must not precede the
  policy split it depends on.

  - [ ] 5.1 Split public-read policies by role, THEN revoke `anon` — one migration, one transaction
    - New file `supabase/migrations/<ts>_split_public_read_policies_and_revoke_anon_private.sql`
    - **CRITICAL ORDERING CONSTRAINT — the highest-risk item in this spec.** The `anon` revocation MUST NEVER
      precede the public-read policy role-split it depends on. Both belong in a SINGLE migration executed as a
      SINGLE transaction, in this exact statement order:
      1. `create policy` for the anon-only, staff-free predicate on each of the four tables
      2. `drop policy if exists` for the combined `"Public can view …"` policy
      3. `create policy` for the `authenticated` policy retaining the full predicate
      4. `revoke execute` on `private.is_staff(uuid)`, `private.is_manager(uuid)`,
         `private.has_role(uuid, public.app_role)` from `anon`, then `revoke usage on schema private from anon`
    - **Why a bare revoke would be a production outage.** RLS policy expressions are inlined into the querying
      statement and evaluated with the PRIVILEGES OF THE QUERYING ROLE. `SECURITY DEFINER` governs what the
      function body may touch once it runs; it does not exempt the CALLER from needing `EXECUTE`. Four policies
      that `anon` evaluates call `private.is_staff` (VERIFIED by grep across all 18 migrations): `products`
      ("Public can view published products"), `categories` ("Public can view visible categories"),
      `homepage_sections` ("Public can view sections"), `hero_banners` ("Public can view active banners"). The
      `OR` does not rescue us — privilege checks on a referenced function are not skipped by runtime
      short-circuiting. This also explains WHY the grants in `20260627101920`/`20260806143302` exist: they were
      almost certainly added to clear `permission denied for function` on anonymous reads. **Revoking first
      would break anonymous storefront reads of `products`, `categories`, `homepage_sections` and
      `hero_banners` — a 3.1/3.2 regression far worse than the oracle it closes.**
    - **Why the split preserves row sets exactly.** `is_staff` is provably `false` for `anon`: an anonymous
      request has no `auth.uid()`, so `private.is_staff(NULL)` evaluates
      `EXISTS (SELECT 1 FROM user_roles WHERE user_id = NULL AND …)`, always false. Therefore
      `X OR is_staff(auth.uid()) ≡ X` for `anon`, and an anon-only policy carrying just `X` returns an
      IDENTICAL row set. Predicates: `products` → `status = 'active' and deleted_at is null`; `categories` →
      `visible = true`; `homepage_sections` → `enabled = true`; `hero_banners` → `active = true`
    - Because create-before-drop runs inside one transaction, there is NO window in which anonymous reads are
      unserved
    - Retain grants to `authenticated` and `service_role` — the authenticated policies still need them
    - No policy predicate is weakened. `anon` loses schema `private` entirely; the oracle closes
    - If exploration probe 7 in task 2 does NOT reproduce `permission denied for function`, the
      caller-privilege premise is wrong and the split is merely redundant rather than required. The design is
      safe either way, but the change log MUST be corrected to say so
    - _Files: `supabase/migrations/<ts>_split_public_read_policies_and_revoke_anon_private.sql` (new)_
    - _Defects: 1.16_
    - _Requirements: 2.16, 3.1, 3.2, 3.10, 3.13_
    - _Design_Property: 5_
    - _Bug_Condition: `actor = 'anon' AND canExecute(actor, PRIVATE_ROLE_HELPERS)`_
    - _Preservation: 3.1 — anonymous row sets must be identical before and after_
    - _Verification: on a branch database — (a) with the anon key assert `select` on all four tables returns the SAME rows and counts as the golden values recorded in task 3; (b) assert a direct anon call to `private.is_staff(...)` now fails with `permission denied`; (c) as `admin` assert draft/hidden/deleted products, hidden categories, disabled sections and inactive banners are STILL visible. A post-deploy anon-key smoke check over these four tables is REQUIRED before this is called done_
    - _**NOT VERIFIED**: live grant and policy state; whether revoking breaks live anonymous reads. Must be reported NOT VERIFIED until the branch-database probe and the post-deploy smoke check both run_
    - _Env: NOT-VERIFIABLE-HERE_

  - [ ] 5.2 Rewrite `useAuth` onto the staff model with a distinguishable error state
    - Query ALL roles for the user (`select role from user_roles where user_id = ...`) instead of filtering
      `role = 'admin'`, so `manager` and `editor` resolve correctly (1.11)
    - Inspect the lookup `error` and resolve `status: 'error'` rather than collapsing to `isAdmin: false`, so
      "no staff role" is distinguishable from "the check could not be completed" (1.12)
    - Attach a rejection handler to `supabase.auth.getUser()` so a rejected promise settles into
      `status: 'error'` and the dashboard NEVER stays on "Loading…" (1.13)
    - Return the same `Access` union as `admin-guard.ts` plus a `retry()`
    - Keep UNCHANGED: the `onAuthStateChange` subscription and its event list, the `user_roles` realtime
      channel, focus revalidation, the `mounted` guard and all cleanup (3.8, 3.11)
    - _Files: `src/hooks/use-admin.ts`_
    - _Defects: 1.11, 1.12, 1.13_
    - _Requirements: 2.11, 2.12, 2.13, 3.8, 3.10, 3.11_
    - _Design_Property: 4_
    - _Verification: unit tests over `deriveAccess` for the full role matrix; a test that a rejected `getUser()` yields `status: 'error'` and never leaves loading; manual check that sign-out and reload behave as before_
    - _Env: SANDBOX-PARTIAL_

  - [ ] 5.3 Dashboard renders denied vs error, and gates tabs by capability
    - Keep the existing "Access denied / Admins only" card VERBATIM; it now renders for `status: 'denied'` only
    - Add a sibling card for `status: 'error'` with a Retry wired to `retry()`, built from the same
      `luxury-card` + `text-destructive` + `Button` primitives already used by this file's `errorComponent` —
      no new design language, no new markup vocabulary (3.14)
    - Filter tabs by capability: Products / Collections / Homepage / Media require `isStaff`; Enquiries and
      Settings require `isManager` (matching `"Managers can view enquiries"` and the manager-level intent of
      settings writes)
    - `admin` sees every tab exactly as today; no role is removed or collapsed (3.9, 3.10)
    - _Files: `src/routes/_authenticated/admin.dashboard.tsx`_
    - _Defects: 1.11, 1.12_
    - _Requirements: 2.11, 2.12, 3.9, 3.10, 3.14_
    - _Verification: unit tests asserting the permitted tab set per role and that error ≠ denied; manual check that an `editor` sees the staff tabs and an `admin` sees all of them_
    - _Env: SANDBOX-PARTIAL_

- [ ] 6. Phase 3 — One shared, validated upload path

  Depends on Phase 1: the bucket must exist.

  - [ ] 6.1 Create `src/lib/uploads.ts` — validation, MIME-derived keys, batch accounting
    - Pure, dependency-free exports so every rule is unit-testable without a database:
      `ALLOWED_IMAGE_MIME = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}`,
      `MAX_UPLOAD_BYTES = 10 * 1024 * 1024`,
      `validateUploadFile(file) -> {ok:true} | {ok:false; code:'mime'|'size'|'empty'; message}`,
      `extensionForMime(mime)`, `buildObjectKey(mime)` → `${crypto.randomUUID()}.${ext}`,
      `summarise(results)` → the toast copy
    - Validation runs BEFORE any network call, per file, with actionable messages ("PNG, JPG or WebP only",
      "Must be under 10 MB"). Rejected files leave every existing image untouched (1.4)
    - `buildObjectKey` takes ONLY the validated MIME of the bytes actually uploaded — after compression that is
      the blob's type, not the original file's. Filenames with spaces, `#`, `?`, Unicode, multiple extensions,
      no extension or duplicates are structurally irrelevant: the key is a UUID plus a derived extension. The
      original name is still recorded as `media.alt` exactly as today (1.9)
    - `uploadImages(files)` wraps each file in its own `try`/`catch` so one failure never aborts the remainder,
      returning `{succeeded: ProductImage[], failed: {name, reason}[]}`. Call sites report `summarise(...)` —
      "3 uploaded · 2 failed" plus each reason — NEVER `files.length`. A `retry(failed)` path re-attempts only
      the failures (1.3)
    - `compressImage` keeps its current behaviour (max side 1800, WebP q0.82, fall back to the original when
      compression does not help) and now runs only AFTER validation passes
    - _Files: `src/lib/uploads.ts` (new), `src/lib/content-api.ts`_
    - _Defects: 1.3, 1.4, 1.9_
    - _Requirements: 2.3, 2.4, 2.9_
    - _Design_Property: 2_
    - _Verification: unit tests per task 11.1_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 6.2 Fix deletion ordering and make storage failure block the row delete
    - `removeImage` in the product dialog STOPS calling `deleteProductImage`. It only mutates form state and
      pushes the object key onto a local `pendingDeletions` list. Objects are deleted AFTER `saveProduct`
      resolves. Cancelling the dialog discards the list and leaves every object intact. Deletion failures are
      reported, not swallowed — remove the `.catch(() => {})` (1.5)
    - `deleteProductImage` inspects the `.remove()` result: on error it THROWS and the `media` row is LEFT IN
      PLACE, so there is never an orphaned object without a record. A "not found" result is treated as
      already-deleted so the call stays idempotent. Only once the object is gone is the `media` row deleted,
      and that result is inspected too. If the row delete fails after the object is gone, record the mismatch
      via `logAudit('orphan', 'media', …)` and surface it to the admin — no new table, no background job (1.6)
    - _Files: `src/lib/content-api.ts`, `src/components/admin/products-panel.tsx`_
    - _Defects: 1.5, 1.6_
    - _Requirements: 2.5, 2.6_
    - _Design_Property: 2_
    - _Verification: unit test that a failing `.remove()` leaves the `media` row intact; manual product-dialog check — remove an image, CANCEL the dialog, confirm the object still exists_
    - _Env: SANDBOX-PARTIAL_

  - [ ] 6.3 Route every upload surface through one hook that invalidates the media query
    - New `src/hooks/use-image-upload.ts` owns the mutation and invalidates `contentKeys.media()` on BOTH
      upload and delete
    - Every panel — products, categories, banners, homepage, media, logo — goes through this hook, so the
      library can no longer go stale (1.7)
    - _Files: `src/hooks/use-image-upload.ts` (new), `src/components/admin/media-panel.tsx`, `products-panel.tsx`, `categories-panel.tsx`, `homepage-panel.tsx`, `settings-panel.tsx`_
    - _Defects: 1.7_
    - _Requirements: 2.7_
    - _Verification: assert `contentKeys.media()` is invalidated on upload and delete; manual check that uploading from the product dialog refreshes the media library immediately_
    - _Env: SANDBOX-PARTIAL_

  - [ ] 6.4 Delete the dead duplicate upload implementation; quarantine managed files
    - Delete `src/lib/products-api.ts` and `src/lib/products-config.ts` — a second upload/fetch implementation
      with no compression and no validation. Grep confirms nothing imports them (VERIFIED)
    - KEEP `src/integrations/supabase/client.server.ts` and `auth-middleware.ts`: they are integration-managed
      generated files, referenced only from a comment. Mark them with a quarantine note rather than deleting,
      per 2.39's instruction to leave integration-managed generated files intact. This preserves the VERIFIED
      property that no service-role key reaches the browser bundle
    - _Files: deleted `src/lib/products-api.ts`, `src/lib/products-config.ts`; annotated `src/integrations/supabase/client.server.ts`, `auth-middleware.ts`_
    - _Defects: 1.39_
    - _Requirements: 2.39, 2.15_
    - _Verification: re-run the import grep to confirm zero references before deleting; `bun run typecheck`, `bun run lint` and `bun run build` all still pass after deletion_
    - _Env: SANDBOX-COMPLETE_

- [ ] 7. Phase 4 — No operation reports success it cannot demonstrate

  - [ ] 7.1 Add `.select()` + zero-rows detection to every mutation that must change a row
    - Add one shared helper: `expectRows<T>(result, entity): T[]` — throws on `error`, throws
      `MutationBlockedError(entity)` when `data` is empty
    - Add `.select('id')` and route through `expectRows` for: `softDeleteProduct`, `restoreProduct`,
      `purgeProduct`, `saveSettings`, `saveSection`, `saveBanner`, `deleteBanner`, `deleteCategory`,
      `updateEnquiry`
    - `MutationBlockedError` carries copy along the lines of "No rows were changed — you may not have
      permission to update this record", so the admin sees a real failure instead of "Moved to trash" /
      "Settings saved" / "Deleted" / "Notes saved"
    - `saveProduct`/`saveCategory` already use `.single()` and already throw — leave them alone
    - _Files: `src/lib/content-api.ts`, `src/components/admin/products-panel.tsx`, `categories-panel.tsx`, `homepage-panel.tsx`, `enquiries-panel.tsx`, `settings-panel.tsx`_
    - _Defects: 1.22_
    - _Requirements: 2.22_
    - _Design_Property: 6_
    - _Bug_Condition: `affectedRows(operation) = 0 AND NOT operationInspectsAffectedRows(operation)`_
    - _Verification: unit tests over `expectRows` per task 11.1; manually revoke a role's UPDATE, delete a product, confirm an error rather than "Moved to trash"_
    - _Env: SANDBOX-PARTIAL_

  - [ ] 7.2 Inspect and report the errors currently discarded
    - `createEnquiry`, `logProductView` and `logAudit` inspect their `error` and report through the existing
      `reportLovableError` — do not introduce new error infrastructure (3.18)
    - `openProductEnquiry`: remove the empty `catch {}`; catch, report, and STILL open WhatsApp with the
      identical message so the customer is never blocked (2.32, 3.4)
    - Remove the `.catch(() => {})` around image deletion (covered by task 6.2)
    - `reorderSections`: collect every `Promise.allSettled` result, inspect each for BOTH `error` and zero
      rows, and throw an aggregate naming how many updates failed. The homepage panel reports it instead of
      refreshing into a silently reverted order
    - _Files: `src/lib/content-api.ts`, `src/lib/whatsapp.ts`, `src/components/admin/homepage-panel.tsx`_
    - _Defects: 1.18, 1.19, 1.32_
    - _Requirements: 2.18, 2.19, 2.32, 3.4, 3.18_
    - _Design_Property: 6_
    - _Verification: unit tests asserting each function reports when its boundary errors, and that `openProductEnquiry` still returns the byte-identical WhatsApp message (golden value from task 3)_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 7.3 Normalise degenerate ordering values (new append-only migration) and re-sequence densely client-side
    - Two-part fix because the data is ALREADY degenerate: the seed in `20260802160613` gave
      `display_order = 99` to every category derived from `products.category`
    - New file `supabase/migrations/<ts>_normalise_category_order_and_banner_priority.sql`: a `row_number()
      over (partition by parent_id order by display_order, name, id)` update for `public.categories`, and the
      same shape for `public.hero_banners` using `(order by priority, created_at, id)`. Deterministic (ties
      broken by `name`/`created_at` then `id`), idempotent, re-runnable. It changes only VALUES, so the visible
      order matches what admins see today wherever values were already distinct and becomes deterministic
      where they were not
    - Client: `move()` in `categories-panel.tsx` and `homepage-panel.tsx` stops swapping two values and instead
      re-sequences the affected sibling list densely (`1..n`), writing the changed rows and checking affected
      rows on each. Correct even if values collide again later, so the fix does not depend on the migration
      holding forever
    - _Files: `supabase/migrations/<ts>_normalise_category_order_and_banner_priority.sql` (new), `src/components/admin/categories-panel.tsx`, `homepage-panel.tsx`_
    - _Defects: 1.20_
    - _Requirements: 2.20, 3.12, 3.13_
    - _Design_Property: 6_
    - _Verification: unit tests over the dense re-sequencing helper (all-equal input, already-dense, single item, first/last moves); run the migration TWICE on a branch database seeded with duplicate `99`s and assert a dense distinct sequence plus a stable second run_
    - _**NOT VERIFIED**: the live `display_order`/`priority` distribution. The migration is idempotent and safe regardless, but its effect on production data must be reported NOT VERIFIED until run_
    - _Env: SANDBOX-PARTIAL (helper unit-testable here; migration effect NOT-VERIFIABLE-HERE)_

  - [ ] 7.4 Make inline switches reflect persisted state
    - `patch()` in `products-panel.tsx` records the previous value, applies it optimistically to the `products`
      query cache, toasts confirmation on success, and on failure RESTORES the previous value and toasts the
      error — so the switch always reflects persisted state
    - _Files: `src/components/admin/products-panel.tsx`_
    - _Defects: 1.21_
    - _Requirements: 2.21_
    - _Verification: unit test that a failing write restores the prior cache value; manually revoke UPDATE, click a switch, confirm the error and the reverted position_
    - _Env: SANDBOX-PARTIAL_

- [ ] 8. Phase 5 — loading / empty / error, separated everywhere

  - [ ] 8.1 Add one pure state selector and one presentational error card
    - New `src/components/site/query-state.tsx` exporting
      `queryStateOf({isLoading, isError, data}): 'loading' | 'error' | 'empty' | 'ready'` — **`isError` is
      checked BEFORE emptiness**, so a failed query can never be reported as empty. This single ordering is
      the whole 1.23–1.26 family
    - `<QueryFailed message onRetry />` built from `luxury-card` + `text-destructive` + `Button` — existing
      primitives only, no new design language (3.14)
    - _Files: `src/components/site/query-state.tsx` (new)_
    - _Requirements: 2.23, 2.24, 2.25, 2.26_
    - _Design_Property: 7_
    - _Verification: unit test per task 11.1, including the `{isError, data: []} → 'error'` case that is the regression this family is about_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 8.2 Apply the third branch across every admin panel
    - Each surface keeps its EXISTING loading text and empty copy VERBATIM ("Loading…", "No media yet.",
      "Trash is empty.", "No products match these filters.", "No hero banners yet.") and gains only the error
      branch. No markup, class or copy is otherwise changed (3.14)
    - `media-panel.tsx` (1.23), `settings-panel.tsx` (1.25), `enquiries-panel.tsx`, `products-panel.tsx` trash
      view, `categories-panel.tsx`, `homepage-panel.tsx` (1.26)
    - `settings-panel.tsx` specifically STOPS reporting a failed load as "No settings row found."; that copy now
      renders only when the query SUCCEEDED and returned `null`
    - _Files: `src/components/admin/media-panel.tsx`, `settings-panel.tsx`, `enquiries-panel.tsx`, `products-panel.tsx`, `categories-panel.tsx`, `homepage-panel.tsx`_
    - _Defects: 1.23, 1.25, 1.26_
    - _Requirements: 2.23, 2.25, 2.26, 3.14_
    - _Verification: component test asserting the media panel renders the error card and NOT "No media yet." when the query fails_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 8.3 Homepage keeps rendering the sections that did load
    - The hooks already return `isError`/`refetch`; `index.tsx` stops discarding them (the `= []`/`= null`
      destructuring defaults are the direct cause)
    - Sections whose data failed render `<QueryFailed onRetry={refetch} />` in place of their content while
      EVERY section that did load keeps rendering, so a single failure never blanks the page. Section types
      that legitimately render `null` on genuinely empty data keep doing so
    - Homepage stays driven by `homepage_sections` order and `enabled` flags (3.12)
    - _Files: `src/routes/index.tsx`, `src/hooks/use-content.ts`_
    - _Defects: 1.24_
    - _Requirements: 2.24, 3.12_
    - _Verification: with the network offline, assert an error state with a working retry for the failed section and that other sections still render_
    - _Env: SANDBOX-PARTIAL_

  - [ ] 8.4 Product page: real 404s and metadata from the real record
    - Split the single `if (!product)` branch in three: `isLoading` → the existing skeleton; `isError` → a
      load-failure card with Retry (`refetch`); `data === null` → the existing "Piece not found" markup, copy,
      route and CTA UNCHANGED. Only a genuinely absent or unpublished product now yields the 404 page (1.27)
    - Add a route `loader` that warms the product query via
      `queryClient.ensureQueryData(productQuery(handle))` so `head({loaderData})` can read the real record.
      Rendering keeps using `useQuery` against the same key — no double fetch, no render-path change
    - `head` emits, IN ADDITION to the existing tags: `<link rel="canonical">` at `/product/{slug}`;
      `og:image` = `primaryImage(product)`, which makes the existing `twitter:card: summary_large_image`
      honest; title from `meta_title ?? name`; description from
      `meta_description ?? short_description ?? description`; `Product` JSON-LD with `name`, `image`,
      `description`, `sku` (only when present), `brand` (only when set), and `offers` with
      `priceCurrency: 'INR'`, `price: effectivePrice(product)` and `availability` from `in_stock`
    - Every field comes from the product row or from helpers already in `content-types.ts`. **Absent fields are
      OMITTED, never filled in — no business detail is invented** (3.15). Reuse the base URL already present in
      `index.tsx`'s `FurnitureStore` JSON-LD rather than introducing a new domain
    - When `loaderData` is unavailable the existing handle-derived tags remain as fallback, so this is purely
      additive. No route or URL changes (3.2, 3.16)
    - _Files: `src/routes/product.$handle.tsx`_
    - _Defects: 1.27, 1.28_
    - _Requirements: 2.27, 2.28, 3.2, 3.15, 3.16_
    - _Design_Property: 7, 8_
    - _Verification: unit tests over the metadata builder — a full product yields canonical, `og:image`, real title and complete JSON-LD; a SPARSE product OMITS `sku` and `brand` rather than emitting empty strings; `sale_price` drives `offers.price`. Component test that `isError` renders the retry card while `data: null` renders "Piece not found"_
    - _Env: SANDBOX-COMPLETE_

- [ ] 9. Phase 6 — Logo: runtime admin upload, reachable monogram fallback

  Depends on Phase 3 (the validated upload path).

  - [ ] 9.1 Admin upload / preview / replace / remove, persisted to existing `site_settings.logo_url`
    - **No binary is committed and no logo URL is hardcoded anywhere.** The artwork arrived as a chat
      attachment and cannot be written to disk from this environment. The logo arrives at RUNTIME through this
      admin flow and is persisted in the EXISTING `site_settings.logo_url` column — so there is no migration
      and no schema change
    - Keep the existing `logo_url` free-text input (capability is never removed) and join it with a small
      control group built from existing primitives: **Upload** via the shared `useImageUpload` path from task
      6.3, so the logo gets the same MIME allow-list, size cap and UUID key; **preview** at the same
      constrained size the header uses; **Replace**; **Remove** (sets `logo_url` to `null`, reachable back to
      the monogram)
    - Write the new URL to the draft only AFTER the upload resolves, so a failed upload leaves the previous
      logo intact and reports the reason
    - _Files: `src/components/admin/settings-panel.tsx`_
    - _Defects: 1.41_
    - _Requirements: 2.41_
    - _Design_Property: 9_
    - _Verification: manual upload, preview, replace, remove; confirm a deliberately failed upload leaves the previous logo intact_
    - _Env: SANDBOX-PARTIAL_

  - [ ] 9.2 Render the logo safely and restore the `NGMonogram` fallback
    - `alt={settings.company_name}` — a real accessible name instead of today's `alt=""` (also part of 1.35)
    - Constrained ratio-preserving sizing `h-9 w-auto max-h-9 max-w-[180px] object-contain` so a wrong-ratio or
      oversized image cannot distort or blow out the header bar
    - `onError` → fall back to `<NGMonogram />`
    - Treat-as-absent guard: empty, whitespace-only, or non-`http(s)`/non-`data:` values fall back to
      `NGMonogram` too. This is what makes the EXISTING fallback reachable again — today any stored value
      permanently defeats it (3.23)
    - The footer, which currently never uses the logo, renders it with the same guarded component; when absent
      it keeps rendering `NGMonogram` exactly as today. No spacing, colour or type change (3.14)
    - _Files: `src/components/site/site-header.tsx`, `src/routes/index.tsx` (footer)_
    - _Defects: 1.41, 1.35_
    - _Requirements: 2.41, 2.35, 3.23, 3.14_
    - _Verification: unit tests over the guard (`null`, `''`, `'   '`, `'javascript:…'`, a valid https URL, a `data:` URL → monogram vs image); component tests that `onError` swaps in the monogram and that `alt` equals the company name_
    - _Env: SANDBOX-COMPLETE_

- [ ] 10. Phase 7 — Long tail: navigation, clipboard, a11y/responsive, SEO, assets, performance

  - [ ] 10.1 Classify hero CTA links instead of passing raw values to a typed `<Link>`
    - New pure `src/lib/links.ts`: `classifyLink(value) -> {kind: 'anchor'|'external'|'internal'|'none'}`.
      `#…` → anchor (`<a href>`); `http(s)://…` → external (`<a target="_blank" rel="noopener noreferrer">`);
      a path matching a REGISTERED route (`/`, `/product/{slug}`, `/admin/login`) → internal (`<Link>`);
      anything else — an unregistered path, a `javascript:` URL, an empty value → `none` and the CTA is OMITTED
    - `hero-slider.tsx` changes ONLY where it chooses the element. This removes the typed-`Link` crash for
      admin-entered values while never breaking the slide
    - _Files: `src/lib/links.ts` (new), `src/components/site/hero-slider.tsx`_
    - _Defects: 1.29_
    - _Requirements: 2.29_
    - _Design_Property: 9_
    - _Verification: unit tests per task 11.1, plus the property that `classifyLink` NEVER returns `'internal'` for a value that is not a registered route — the invariant preventing the crash_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 10.2 Category selection never silently no-ops
    - `index.tsx` derives whether a `catalogue` section is enabled. When it IS, behaviour is unchanged (set
      state, scroll to the ref). When it is NOT, the click gives explicit feedback via the existing `sonner`
      toast instead of scrolling to an unmounted ref
    - _Files: `src/routes/index.tsx`_
    - _Defects: 1.30_
    - _Requirements: 2.30_
    - _Verification: assert feedback is produced when no catalogue section is enabled, and that the unchanged path still sets state and scrolls_
    - _Env: SANDBOX-PARTIAL_

  - [ ] 10.3 Clipboard confirms only on real success
    - One `copyToClipboard(text): Promise<boolean>` helper. The media panel AWAITS it and toasts "URL copied"
      only on `true`; on `false` it shows the URL for manual copying
    - `share()` on the product page wraps its `navigator.clipboard` call so there is no unhandled rejection and
      no false "Link copied"
    - _Files: `src/components/admin/media-panel.tsx`, `src/routes/product.$handle.tsx`_
    - _Defects: 1.31_
    - _Requirements: 2.31_
    - _Verification: unit test with a rejecting clipboard boundary asserting `false` is returned and the fallback path is taken — assert OUR behaviour, not the fake's return value_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 10.4 Hero: tap targets, autoplay pause, reduced motion
    - Pagination controls keep the EXACT 4px visual bar and gain a ≥44px hit area via transparent padding with
      a negative margin, so the composition is pixel-identical (3.14)
    - Autoplay pauses on pointer/focus interaction
    - `prefers-reduced-motion: reduce` disables both autoplay and the opacity cross-fade
    - The 7-second cycle, priority ordering and manual selection are otherwise unchanged (3.6)
    - _Files: `src/components/site/hero-slider.tsx`_
    - _Defects: 1.33_
    - _Requirements: 2.33, 3.6, 3.14_
    - _Verification: assert the rendered hit area meets the minimum while the visual bar height is unchanged; assert autoplay is disabled under a mocked reduced-motion media query_
    - _Env: SANDBOX-PARTIAL_

  - [ ] 10.5 Catalogue suggestions get real combobox semantics
    - `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"`/`option`;
      ↑/↓ navigation, Enter to select, Escape to dismiss, outside-click dismissal, and close-on-select so the
      list stops covering the results
    - Markup and classes unchanged apart from the added attributes and handlers (3.14)
    - Search fields, filters, sorts and pagination behaviour unchanged (3.5)
    - _Files: `src/components/site/catalogue.tsx`_
    - _Defects: 1.34_
    - _Requirements: 2.34, 3.5, 3.14_
    - _Verification: component test over keyboard navigation, Escape, close-on-select and outside-click; assert the golden filter/sort order from task 3 is unchanged_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 10.6 Accessible names throughout
    - `aria-label` on every icon-only admin control (edit, delete, move up/down, copy URL, delete media,
      restore, purge)
    - Hero background images become `alt=""` + `aria-hidden` (decorative) while product imagery keeps
      MEANINGFUL alt text
    - Admin `Label`s gain `htmlFor` with matching input `id`s, following the pattern `admin.login.tsx` already
      uses — no new pattern invented
    - Brand mark accessible name is covered by task 9.2
    - _Files: `src/components/admin/*.tsx`, `src/components/site/hero-slider.tsx`_
    - _Defects: 1.35_
    - _Requirements: 2.35_
    - _Verification: component tests querying controls by accessible name; assert decorative hero images are hidden from the accessibility tree_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 10.7 Mobile overlap on the product page
    - The floating WhatsApp button clears the fixed enquiry bar (`bottom-24 lg:bottom-6`) and the page gains
      matching bottom padding so content is not obscured at the end of scroll
    - No layout-language change (3.14)
    - _Files: `src/routes/product.$handle.tsx`_
    - _Defects: 1.36_
    - _Requirements: 2.36, 3.14_
    - _Verification: manual check at a mobile viewport that neither fixed element overlaps the other or the final content_
    - _Env: SANDBOX-PARTIAL_

  - [ ] 10.8 `robots.txt` and `sitemap.xml`
    - `robots.txt`: KEEP `User-agent: *` and `Allow: /`; ADD `Disallow: /admin` and a `Sitemap:` line pointing
      at the existing `sitemap.xml`. No public URL changes (3.16)
    - `sitemap.xml` handler: inspect the query `error`; on failure return a 5xx with NO `Cache-Control` and
      report via `reportLovableError`, so a truncated sitemap is never published or cached. The success path —
      same URL set, same ordering, same `max-age=3600` — is untouched
    - Admin routes keep their per-route `noindex,nofollow` (3.20)
    - _Files: `public/robots.txt`, `src/routes/sitemap[.]xml.ts`_
    - _Defects: 1.17, 1.37_
    - _Requirements: 2.17, 2.37, 3.16, 3.20_
    - _Design_Property: 8_
    - _Verification: unit test that a failing query yields a non-200 with no cache header and reports the error, while the success path emits the identical URL set; assert `robots.txt` disallows `/admin` and declares the sitemap_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 10.9 Remove unreferenced duplicate assets — conservatively
    - Delete the nine files in `src/assets/`; they are unreferenced (VERIFIED by grep)
    - **KEEP the nine identical files in `public/media/`**, exactly as 2.38 requires, because an external or
      indexed URL may point at `/media/*`. No blind destructive cleanup of anything a production URL could
      depend on
    - _Files: deleted `src/assets/*.jpg`_
    - _Defects: 1.38_
    - _Requirements: 2.38_
    - _Verification: re-run the grep to confirm zero references before deleting; `bun run build` still succeeds_
    - _**NOT VERIFIED**: whether any external or indexed URL references `public/media/*`. This is precisely why those files are retained_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 10.10 Image measurement: no extra commit-time render, intrinsic sizing hints
    - In `adaptive-image.tsx` and `product-card.tsx` write the ratio state ONLY when the measured value actually
      differs, removing the guaranteed extra commit-time render for already-complete images
    - Add `width`/`height` intrinsic hints and a `sizes` attribute matching the EXISTING grid breakpoints
    - **Preserve exactly**: the `object-contain` no-crop treatment, the `product-media` classes and the clamp
      ranges (`0.75–1.5` and `0.8–1.25`) (3.17)
    - _Files: `src/components/site/adaptive-image.tsx`, `src/components/site/product-card.tsx`_
    - _Defects: 1.40_
    - _Requirements: 2.40, 3.17_
    - _Verification: assert no state write occurs when the measured ratio is unchanged, and that the clamp bounds and `product-media` classes are byte-identical to current behaviour_
    - _Env: SANDBOX-COMPLETE_

- [ ] 11. Write the unit and property tests over real exported logic

  - [ ] 11.1 Unit tests whose subjects are real exported functions in `src/`
    - **PROHIBITED — this is a hard rule.** No test may configure a mock and then assert that the mock returned
      its configured value; that asserts the test's own setup and proves nothing. Injected fakes are permitted
      ONLY as boundaries (Supabase storage, the network, the clipboard) and NEVER as the subject. Every
      assertion must be about the output of a real exported function in `src/`. **A test whose failure could
      not be caused by a change to `src/` does not belong in the suite.**
    - `validateUploadFile` — each allowed MIME accepted; disallowed MIME, oversize and zero-byte rejected with
      the correct `code`
    - `extensionForMime` / `buildObjectKey` — extension follows the validated MIME, NEVER the filename; names
      with spaces, Unicode, multiple extensions or no extension still yield valid keys
    - `uploadImages` / `summarise` — with a fake storage BOUNDARY failing chosen indices: every file attempted,
      counts exact, one reason per failure, `succeeded.length + failed.length === files.length`
    - `expectRows` — `error` → throws; `data: []` → `MutationBlockedError`; `data: [row]` → returns rows
    - Dense re-sequencing helper — all-equal values, already-dense, single item, first/last moves all yield a
      distinct deterministic order
    - `deriveAccess` — {anonymous, lookup error, no roles, `user`, `editor`, `manager`, `admin`} → expected
      status and permitted tab set; **error ≠ denied**
    - `queryStateOf` — full matrix including `{isError, data: []} → 'error'`
    - `classifyLink` — anchor / external / registered-internal / unregistered / `javascript:` / empty
    - Logo-source guard — `null`, `''`, whitespace, `javascript:`, valid https, `data:`
    - Product metadata builder — canonical + `og:image` + real title present; absent `sku`/`brand` OMITTED, not
      emptied
    - Preservation locks — `productEnquiryMessage`, `normalizeImages`, `slugify`, `effectivePrice`,
      `discountPercent` byte-identical to the golden values recorded in task 3
    - _Files: `src/**/*.test.ts`_
    - _Requirements: 2.42_
    - _Design_Property: 10_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 11.2 Property-based tests over the real input domains
    - Arbitrary file sets (mixed MIME types, sizes, adversarial filenames) → `succeeded.length +
      failed.length === files.length`, every rejection carries a reason, no valid file skipped because a
      sibling failed
    - Arbitrary role sets → `deriveAccess` agrees with the SQL model and `isManager ⟹ isStaff`
    - Arbitrary `{isLoading, isError, data}` → `queryStateOf` never returns `'empty'` when `isError` is true
    - Arbitrary sibling ordering arrays (including all-equal) → re-sequencing always yields distinct, dense,
      deterministic values and moves the target exactly one position
    - Arbitrary product records → the metadata builder never emits an empty-valued tag and never invents a
      field absent from the record
    - Arbitrary strings → `classifyLink` never returns `'internal'` for a value that is not a registered route
    - _Files: `src/**/*.test.ts`_
    - _Requirements: 2.42_
    - _Design_Property: 10_
    - _Env: SANDBOX-COMPLETE_

  - [ ] 11.3 Component tests for the rendering that unit tests cannot reach
    - The media panel renders the error card and **NOT** "No media yet." on failure
    - The product page renders retry on `isError` and "Piece not found" on `data: null`
    - A broken logo `onError` swaps in `NGMonogram`
    - _Files: `src/**/*.test.tsx`_
    - _Requirements: 2.23, 2.27, 2.41, 2.42_
    - _Env: SANDBOX-COMPLETE_

- [ ] 12. Verify bug condition exploration test now passes
  - **Property 1: Expected Behavior** - Uninspected failure boundaries now surfaced and handled
  - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
  - The tests from task 2 encode the expected behavior
  - When they pass, they confirm the expected behavior is satisfied
  - Run the bug condition exploration tests from task 2
  - **EXPECTED OUTCOME**: Tests PASS (confirms the bugs are fixed)
  - Per family, confirm: uploads by any staff role succeed against an existing bucket; invalid files are
    rejected with a reason while every valid sibling still uploads; keys derive from MIME; objects survive a
    cancelled dialog; non-staff never reach the admin route and managers/editors do; `anon` cannot execute the
    role helpers; no mutation reports success without a changed row; every failed query renders a distinct
    error state with retry; the product page 404s only for genuinely absent products; the sitemap never
    publishes a truncated 200
  - Any case that remains NOT VERIFIED because it needs live Supabase state or a branch database must be listed
    as such — not silently counted as passing
  - _Requirements: Expected Behavior Properties 2.1–2.42 / design Properties 1–10_
  - _Env: SANDBOX-PARTIAL (live-state cases: NOT-VERIFIABLE-HERE)_

- [ ] 13. Verify preservation tests still pass
  - **Property 2: Preservation** - Every input outside the bug condition behaves identically
  - **IMPORTANT**: Re-run the SAME tests from task 3 - do NOT write new tests
  - Run the preservation property tests from task 3
  - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
  - Confirm all tests still pass after the fix, in particular: anonymous row sets identical (3.1), every
    already-stored image URL still renders with no row rewritten (3.3), WhatsApp message byte-identical (3.4),
    catalogue filter/sort/pagination order identical (3.5), `admin` retains full capability (3.9), the existing
    18 migrations still apply unmodified (3.13), and existing metadata and structured data are byte-identical
    with only additive changes (3.15)
  - _Requirements: 3.1–3.24 / design Property 11_
  - _Env: SANDBOX-PARTIAL (live row sets and rendering: NOT-VERIFIABLE-HERE)_

- [ ] 14. Final verification run — record real outcomes only
  - Run these commands IN THIS ORDER and record the ACTUAL result of each. **Never record a claimed or assumed
    outcome.** If a command fails, record the failure and its output rather than a success:
    1. `bun install`
    2. `bun run lint`
    3. `bun run typecheck`
    4. `bun run test`
    5. `bun run build`
  - For each: capture the command, the exit status, and the salient output (test counts, error counts)
  - Confirm the five pre-existing scripts (`dev`, `build`, `build:dev`, `preview`, `lint`, `format`) still work
    and that no runtime dependency was added (3.24)
  - Explicitly list everything the run could NOT cover: all live Supabase state — bucket existence and flags,
    applied policies, actual grants, real RLS row sets — is unreachable from vitest with an anon key, plus all
    end-to-end runtime behaviour. These stay **NOT VERIFIED**
  - _Requirements: 2.42, 3.24_
  - _Env: SANDBOX-COMPLETE (the five commands); the NOT VERIFIED register is NOT-VERIFIABLE-HERE by definition_

- [ ] 15. Write the change log for the PR
  - For EVERY resolved defect record all seven fields:
    - **Issue** — the defect ID and its one-line statement from `bugfix.md`
    - **Root cause** — the actual mechanism, from the design's Hypothesized Root Cause, corrected by whatever
      the task 2 exploration actually found
    - **Files changed** — exact paths
    - **Fix implemented** — what was done, and what was deliberately NOT done
    - **Verification performed** — the real commands run and their real results; branch-database probes and
      manual checks named individually
    - **Result** — resolved / resolved pending live verification / NOT VERIFIED
    - **Severity** — CRITICAL / HIGH / MEDIUM / LOW as recorded in `bugfix.md`
  - Group by the eight families so the 42 defects read as eight root causes, not 42 unrelated fixes
  - Carry forward the full **NOT VERIFIED register** from the design, unabridged: (1) bucket existence, flag
    and limits; (2) which storage policies are actually applied; (3) which grants on schema `private` are in
    effect; (4) whether revoking `anon` breaks live anonymous reads; (5) whether any external or indexed URL
    references `public/media/*`; (6) whether the live signing key has rotated, invalidating stored signed URLs;
    (7) all runtime behaviour not executed here
  - Record explicitly: the committed publishable credentials are **potentially compromised, rotation
    recommended**; untracking `.env` does not purge it from history; history rewriting was deliberately not
    proposed; rotation is an owner action outside this repo and is REPORTED, not claimed
  - Record the deliberately deferred items: no backfill or reconciliation of legacy signed URLs in existing
    rows; `public/media/*` retained; `client.server.ts` and `auth-middleware.ts` quarantined rather than deleted
  - State the honest limit of the route guard: `ssr: false` means it is a UI gate, not a server-side security
    boundary; RLS remains the authoritative boundary
  - If the decisive anon-revoke probe (task 2, probe 7) did not reproduce, correct the conclusion here rather
    than leaving the design's stated premise standing
  - Distinguish clearly, per defect, what was verified in this environment from what could not be — so the PR
    is honest about its own evidence
  - _Requirements: verification honesty constraint from `bugfix.md`; 2.15_
  - _Env: SANDBOX-COMPLETE_

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm no existing migration file was modified — the 18 original files are byte-identical and exactly four
    new migrations were added (3.13)
  - Confirm no redesign crept in: colour palette, typography, spacing, card styling, hero composition, design
    system, routes and URLs unchanged; no new gradients, no new animations (3.14, 3.16)
  - Confirm no test in the suite configures a mock and then asserts the mock returned its configured value
  - Confirm no logo binary was committed and no logo URL is hardcoded anywhere
  - Confirm every item that depends on live Supabase state is labelled NOT VERIFIED in the change log


---

## Notes

### What the `_Env:_` annotation on each task means

Every task carries an `_Env:_` line stating what is honestly achievable in this sandbox. It is not a
difficulty rating — it is a claim boundary:

- **`SANDBOX-COMPLETE`** — the task is fully implementable AND fully verifiable here: static code
  changes, pure functions, unit and component tests, `lint`, `typecheck`, `build`. A completed
  `SANDBOX-COMPLETE` task may be reported as verified, citing the real command output.
- **`SANDBOX-PARTIAL`** — the code is implementable and its pure logic is unit-testable here, but
  behavioural confirmation needs a running app or a branch database. Report the unit-level result as
  verified and the behavioural result as NOT VERIFIED. Do not let the former stand in for the latter.
- **`NOT-VERIFIABLE-HERE`** — correctness depends on live Supabase state (bucket existence, its
  `public` flag, applied policies, actual grants, real RLS row sets). Only an anon/publishable key
  exists in this sandbox, so that state cannot be read at all. These tasks MUST be reported as **NOT
  VERIFIED** in the PR until run against the live project or a branch/shadow database. Writing the
  migration is not the same as knowing what it did.

The rule behind all three: **anything not actually executed is recorded as NOT VERIFIED.** No claimed
outcomes, no assumed results, no fabricated evidence. If a command fails, record the failure and its
output rather than a success.

### NOT VERIFIED register

Carried forward from `design.md` and `bugfix.md`, unabridged. Each item must be reported as NOT
VERIFIED, never claimed, until executed against the live project:

| # | Unverifiable here | Affects |
|---|---|---|
| 1 | Whether the `product-images` bucket exists, and its `public` flag and limits | Task 4.1 |
| 2 | Which storage policies are actually applied on the live project | Tasks 4.1, 4.2 |
| 3 | Which grants on schema `private` and the role helpers are actually in effect | Task 5.1 |
| 4 | Whether revoking `anon` breaks live anonymous reads (probe 7 in task 2 must run on a branch DB) | Task 5.1 |
| 5 | Whether any external or indexed URL references `public/media/*` | Task 10.9 |
| 6 | Whether the live signing key has rotated, invalidating already-stored signed URLs | Task 4.1 (defect 1.8) |
| 7 | All runtime behaviour — `node_modules` is absent and nothing in this repo has been executed | Every task |

Additional honesty items the change log (task 15) must carry:

- The committed publishable credentials are **potentially compromised, rotation recommended**.
  Untracking `.env` does not purge it from history; history rewriting is deliberately NOT proposed;
  rotation is an owner action outside this repo and is REPORTED, not claimed.
- The route guard is a **UI gate, not a server-side security boundary** — `ssr: false` means
  `beforeLoad` runs client-side only. RLS remains the authoritative boundary.
- Deliberately deferred: no backfill or reconciliation of legacy signed URLs in existing rows;
  `public/media/*` retained; `client.server.ts` and `auth-middleware.ts` quarantined rather than
  deleted.
- If the decisive anon-revoke probe (task 2, probe 7) does NOT reproduce
  `permission denied for function`, the caller-privilege premise is wrong and the policy split is
  merely redundant rather than required. The design is safe either way, but the conclusion MUST be
  corrected rather than left standing.

### Test-suite prohibition (hard rule)

**No test may configure a mock and then assert that the mock returned its configured value.** That
asserts the test's own setup and proves nothing.

- Injected fakes are permitted **ONLY as boundaries** — Supabase storage, the network, the clipboard,
  the reduced-motion media query — and **NEVER as the subject**.
- Every assertion must be about the output of a real exported function in `src/`.
- **A test whose failure could not be caused by a change to `src/` does not belong in the suite.**

This is why each fix deliberately places its decision logic in a pure exported function
(`validateUploadFile`, `buildObjectKey`, `uploadImages`/`summarise`, `expectRows`, the re-sequencing
helper, `deriveAccess`, `queryStateOf`, `classifyLink`, the logo guard, the metadata builder): so it
can be tested without a database, a browser or a network, and so the test subject is always production
code. Task 16 re-checks the suite against this rule before the work is called done.
