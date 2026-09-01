# Exploration and Preservation Findings (tasks 2 and 3)

Recorded from tests executed against **UNFIXED** code on branch
`fix/production-stability-pass`. Every outcome below is a real command result.

## Task 2 — exploration tests: 31 failed, 3 passed (as required)

Command: `bun run test -- src/test/exploration`

The 3 passing tests are deliberate control cases (they confirm the fake boundary
does not mask genuine success), not defects that failed to reproduce.

### Counterexamples that reproduced (behavioural, against real exported functions)

| Defect | Counterexample observed on unfixed code |
|---|---|
| 1.22 | `softDeleteProduct`, `restoreProduct`, `purgeProduct`, `deleteCategory`, `deleteBanner`, `saveSettings`, `saveSection`, `updateEnquiry`, `saveBanner` all **resolve successfully** against a `{data: null, error: null}` zero-row reply. None carries `.select()`, so none can observe affected rows. This is the "Moved to trash" / "Settings saved" lie. |
| 1.18 | `createEnquiry`, `logProductView`, `logAudit` all **resolve successfully** when the insert returns a Postgrest error. The error is never read. |
| 1.19 | `reorderSections` **resolves successfully** when one of its parallel updates errors, and also when every update affects zero rows. |
| 1.32 | `openProductEnquiry` opens WhatsApp (correct) but **reports nothing** when the enquiry insert fails — the empty `catch {}` discards it. |
| 1.6 | `deleteProductImage` **resolves successfully** when storage `.remove()` fails, and still issues the `media` row delete — producing an orphaned object with no record, reported as a successful delete. |
| 1.9 | Object-key extension is taken from the filename, not the blob MIME. Observed keys: a JPEG named `photo.tar.gz` → `<uuid>.gz`; a PNG named `actually-a-png.jpeg` → `<uuid>.jpeg`. |
| 1.4 | A PDF, an SVG, an 11 MB file and a 0-byte file are **all sent to storage**. No MIME allow-list and no size cap exist. |
| 1.11 | `useAuth` resolves `isStaff`/`status` as undefined for `manager` and `editor`; it queries `role = 'admin'` only, so staff are denied. |
| 1.12 | A failed `user_roles` lookup is indistinguishable from "no role" — no error status is produced. |
| 1.13 | A rejected `supabase.auth.getUser()` leaves `loading` **permanently true**; the test timed out at 2 s waiting for it to settle. |

### Finding beyond bugfix.md (refinement to defect 1.9)

`bugfix.md` 1.9 describes the key extension as
`file.name.split(".").pop() ?? "jpg"`. In practice the `?? "jpg"` fallback is
**dead code**: `"scan".split(".")` yields `["scan"]`, and `.pop()` returns
`"scan"`, never `undefined`. A file named `scan` with MIME `image/png` is
therefore stored as `<uuid>.scan`. The whole filename becomes the extension.
Verified counterexample: `233540ca-3114-48d1-9672-8e265b1cf658.scan`.

### Cases NOT verifiable in this sandbox (require live Supabase or a branch DB)

Bucket absence (1.1), storage role disagreement (1.2), non-staff admin route
entry (1.10) and the live role oracle (1.16) all depend on live project state or
a running app. They remain **NOT VERIFIED** — see the register in `tasks.md`.

---

## Probe 7 — the decisive probe for task 5.1: **DID NOT REPRODUCE**

`design.md` Decision 3 asserts that RLS policy expressions are evaluated with
the privileges of the **querying role**, and therefore that revoking `anon`'s
`EXECUTE` on `private.is_staff` *before* splitting the public-read policies would
cause `permission denied for function` and blank the storefront.

**This premise is refuted.** Verified against a local PostgreSQL 16.14 cluster
built as a faithful replica of the live policy shape (`SECURITY DEFINER` helper,
`auth.uid()` returning NULL for anonymous requests, the exact combined
`(status = 'active' AND deleted_at IS NULL) OR private.is_staff(auth.uid())`
predicate, `anon` granted only `SELECT` on the table).

Isolating experiment, with a policy whose **only** predicate is the helper so no
`OR` short-circuit is possible:

| Step | Action | Result |
|---|---|---|
| A | `anon` reads the table, `EXECUTE` granted | 2 rows |
| B | `revoke execute` **and** `revoke usage on schema private` from `anon`, then read again | **2 rows — no error** |
| C | Control: `anon` calls the same function *outside* a policy | `ERROR: permission denied for schema private` |
| D | Ownership | table owner = function owner = same role |

Conclusion: **RLS policy expressions are evaluated in the table owner's
privilege context, not the querying role's.** A caller does not need `EXECUTE`
on a function referenced by an RLS policy. Step C proves the revoke really took
effect, so B is not a false negative.

### Consequence for task 5.1

- The bare revoke would have been **safe**; it is not the production outage the
  design predicted.
- The policy split is therefore **redundant rather than required**.
- It is still implemented as specified, because it is harmless, returns a
  provably identical row set, and removes `anon`'s structural dependency on
  schema `private` (defence in depth). The **stated justification is corrected
  here and in the change log** rather than left standing.
- Row-set equivalence was confirmed in the same run: `anon` saw the identical
  2 published rows before the split, after the bare revoke, and after the split
  — because `private.is_staff(NULL)` is always false, so
  `X OR is_staff(auth.uid()) ≡ X` for `anon`.

**Scope limit — still NOT VERIFIED:** this establishes PostgreSQL *semantics*,
using a replica in which the table and function share an owner. Whether the live
Supabase project has the same ownership, grants and policy set cannot be read
with an anon key. The live effect of the migration remains NOT VERIFIED.

---

## Task 3 — preservation tests: 44 passed (as required)

Command: `bun run test -- src/test/preservation`

Golden values were captured by executing the unfixed helpers and recording their
**actual** output, then pinning exactly those observations.

### Observations that contradicted assumption (why observation-first mattered)

1. **`productEnquiryMessage` has no blank lines.** The builder includes `""`
   entries intended as blank separators, but the trailing `.filter(Boolean)`
   strips them. The real message is 8 consecutive non-empty lines. Asserting the
   "obvious" format with blank lines would have produced a false regression
   signal in task 13.
2. **`discountPercent` can return exactly 100.** Counterexample `price 200,
   sale_price 1` → `round(99.5) = 100`. The pinned range is 0..100 inclusive.
3. **`primaryImage` does not fall back for an empty-string url.** The fallback is
   `?? PLACEHOLDER_IMAGE`, which only triggers on a nullish url, so an image row
   carrying `url: ""` yields `""`. Counterexample: `[{url: "", path: ""}]`.
   This is a **latent issue outside the 42 defects** in `bugfix.md`; it is
   deliberately NOT fixed here and is pinned as observed baseline.
4. **`slugify` strips accents as non-alphanumeric**: `Café Naïve Fauteuil` →
   `caf-na-ve-fauteuil`. Pinned, since product URLs depend on it.
5. **`inStock` returns true when `stock_quantity` is 0** but `in_stock` is true.
   Pinned as baseline quirk, not in scope.

### Preservation coverage gap, recorded honestly

The catalogue's filter/sort/pagination logic (3.5) lives in an inline `useMemo`
inside `Catalogue`; it is not an exported pure function, so it cannot be pinned
by a unit test without reimplementing it (which would violate the rule that the
subject must be real code in `src/`). It is **not covered by an automated
preservation test**. Instead, `src/components/site/catalogue.tsx` filter and sort
code is left byte-identical, verifiable by diff. Behavioural confirmation is
**NOT VERIFIED**.
