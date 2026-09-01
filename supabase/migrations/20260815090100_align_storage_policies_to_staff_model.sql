-- Defect 1.2 [CRITICAL] — align the storage write policies to the staff model
-- the database already enforces on the owning tables.
--
-- APPEND-ONLY: no existing migration file is edited (3.13).
--
-- The three storage write policies created in 20260627095713 require
-- `private.has_role(auth.uid(), 'admin')`, while the table policies introduced
-- later in 20260802160613 accept `private.is_staff(auth.uid())` for
-- products / media / categories / hero_banners. A `manager` or `editor` is
-- therefore allowed to write the ROW that references an image but denied the
-- write of the image itself, and the admin panel surfaces a raw policy error.
--
-- Root cause: 20260802160613 widened the role model and rewrote the TABLE
-- policies, but left the four STORAGE policies on the pre-widening
-- `has_role(..., 'admin')` predicate.
--
-- Every predicate below is copied from a policy that ALREADY governs the
-- corresponding table, so no actor gains a capability it does not already hold
-- on the owning row. Security is not weakened to make the feature work:
--
--   INSERT -> private.is_staff    mirrors "Staff can insert products/media/
--                                 categories/banners"
--   UPDATE -> private.is_staff    mirrors the matching "Staff can update ..."
--   DELETE -> private.is_manager  mirrors "Managers can delete products/media/
--                                 categories/sections/banners"
--
-- Consequently `editor` GAINS image write — which it needs, since it can already
-- write the products/media rows that reference the image — and does NOT gain
-- image delete, matching its lack of table DELETE. `admin` is unaffected: it
-- satisfies both is_staff and is_manager (3.9, 3.10).
--
-- Both SELECT policies are deliberately left untouched, so read behaviour is
-- unchanged.
--
-- `drop policy if exists` before each create keeps this idempotent and tolerant
-- of a live policy set that differs from migration history.

drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Staff can upload product images" on storage.objects;
create policy "Staff can upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and private.is_staff(auth.uid()));

drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Staff can update product images" on storage.objects;
create policy "Staff can update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and private.is_staff(auth.uid()));

drop policy if exists "Admins can delete product images" on storage.objects;
drop policy if exists "Managers can delete product images" on storage.objects;
create policy "Managers can delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and private.is_manager(auth.uid()));
