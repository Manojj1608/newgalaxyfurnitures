-- Defect 1.16 — close the anonymous role oracle.
--
-- APPEND-ONLY: no existing migration file is edited (3.13).
--
-- `20260627101920` and `20260806143302` grant `anon` both USAGE ON SCHEMA private
-- and EXECUTE on private.has_role / private.is_staff / private.is_manager. That
-- lets any unauthenticated caller probe whether an ARBITRARY account is staff.
--
-- ============================================================================
-- CORRECTION TO design.md Decision 3 — READ THIS BEFORE CHANGING THE ORDER
-- ============================================================================
-- design.md asserts that RLS policy expressions are evaluated with the
-- privileges of the QUERYING role, and therefore that revoking `anon`'s EXECUTE
-- before splitting the public-read policies would cause
-- `permission denied for function` and blank the storefront.
--
-- That premise was TESTED and is REFUTED. Verified against a local PostgreSQL
-- 16.14 replica of the live policy shape (see exploration-findings.md, probe 7):
-- with a policy whose ONLY predicate is private.is_staff(auth.uid()) — so no OR
-- can short-circuit — revoking both EXECUTE and schema USAGE from `anon` left
-- anonymous reads working normally, while the identical call made OUTSIDE a
-- policy failed with `permission denied for schema private`. RLS policy
-- expressions are evaluated in the TABLE OWNER's privilege context, so a caller
-- does not need EXECUTE on a policy-referenced function.
--
-- Consequences, stated honestly:
--   * The bare revoke would have been SAFE. It is not a production outage.
--   * The policy split below is therefore REDUNDANT rather than REQUIRED.
--   * It is retained anyway because it is harmless, provably returns an
--     IDENTICAL row set, and removes anon's structural dependency on schema
--     private altogether (defence in depth).
--
-- The create-before-drop ordering and the single transaction are likewise
-- retained: they cost nothing and guarantee no window in which anonymous reads
-- are unserved, regardless of which privilege model applies.
-- ============================================================================
--
-- WHY THE SPLIT PRESERVES ROW SETS EXACTLY (3.1):
-- `private.is_staff` is provably false for `anon`. An anonymous request has no
-- auth.uid(), so private.is_staff(NULL) evaluates
-- `EXISTS (SELECT 1 FROM user_roles WHERE user_id = NULL AND ...)`, which is
-- always false. Therefore `X OR is_staff(auth.uid()) ≡ X` for anon, and an
-- anon-only policy carrying just X returns an identical row set. Confirmed in
-- the same probe run: anon saw the same rows before the revoke, after the bare
-- revoke, and after the split.
--
-- Note `"Public can view settings"` uses `USING (true)` and references no role
-- helper, so site_settings needs no split.

begin;

-- ---------------------------------------------------------------------------
-- (a) Create the anon-only, staff-free policies FIRST, so anonymous reads are
--     served continuously across the change.
-- ---------------------------------------------------------------------------
drop policy if exists "Anon can view published products" on public.products;
create policy "Anon can view published products" on public.products
  for select to anon
  using (status = 'active' and deleted_at is null);

drop policy if exists "Anon can view visible categories" on public.categories;
create policy "Anon can view visible categories" on public.categories
  for select to anon
  using (visible = true);

drop policy if exists "Anon can view sections" on public.homepage_sections;
create policy "Anon can view sections" on public.homepage_sections
  for select to anon
  using (enabled = true);

drop policy if exists "Anon can view active banners" on public.hero_banners;
create policy "Anon can view active banners" on public.hero_banners
  for select to anon
  using (active = true);

-- ---------------------------------------------------------------------------
-- (b) Drop the combined "Public can view ..." policies.
-- ---------------------------------------------------------------------------
drop policy if exists "Public can view published products" on public.products;
drop policy if exists "Public can view visible categories" on public.categories;
drop policy if exists "Public can view sections" on public.homepage_sections;
drop policy if exists "Public can view active banners" on public.hero_banners;

-- ---------------------------------------------------------------------------
-- (c) Recreate the authenticated policies, retaining the FULL predicate so
--     staff keep seeing draft / hidden / disabled / inactive rows (3.9, 3.10).
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated can view published products" on public.products;
create policy "Authenticated can view published products" on public.products
  for select to authenticated
  using ((status = 'active' and deleted_at is null) or private.is_staff(auth.uid()));

drop policy if exists "Authenticated can view visible categories" on public.categories;
create policy "Authenticated can view visible categories" on public.categories
  for select to authenticated
  using (visible = true or private.is_staff(auth.uid()));

drop policy if exists "Authenticated can view sections" on public.homepage_sections;
create policy "Authenticated can view sections" on public.homepage_sections
  for select to authenticated
  using (enabled = true or private.is_staff(auth.uid()));

drop policy if exists "Authenticated can view active banners" on public.hero_banners;
create policy "Authenticated can view active banners" on public.hero_banners
  for select to authenticated
  using (active = true or private.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- (d) ONLY NOW revoke anon's access to schema private. Grants to
--     `authenticated` and `service_role` are deliberately RETAINED — the
--     authenticated policies above still reference the helpers.
-- ---------------------------------------------------------------------------
revoke execute on function private.is_staff(uuid) from anon;
revoke execute on function private.is_manager(uuid) from anon;
revoke execute on function private.has_role(uuid, public.app_role) from anon;
revoke usage on schema private from anon;

commit;
