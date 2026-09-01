-- Defect 1.1 [CRITICAL] / 1.8 — create the `product-images` storage bucket.
--
-- All 18 preceding migrations contain ZERO `storage.buckets` writes (verified by
-- grep), yet four RLS policies on `storage.objects` are keyed on
-- `bucket_id = 'product-images'` (20260626155029 and 20260627095713). Applied
-- from migrations alone the bucket therefore never exists and every upload
-- fails, so no image can be added to products, categories, banners, the
-- homepage or the media library.
--
-- APPEND-ONLY: no existing migration file is edited (3.13).
--
-- Idempotent by design. The live project very likely already has this bucket,
-- created out-of-band through the Supabase dashboard, which is exactly why
-- migration history is not a complete description of the project. `ON CONFLICT
-- DO UPDATE` makes this safe whether or not the bucket already exists.
--
-- The bucket is PUBLIC. Three reasons, all of which matter for regression
-- safety and none of which broaden the read audience:
--
--   (a) A signed URL is authorised by its token, not by the bucket's `public`
--       flag, and is served from /storage/v1/object/sign/... Flipping `public`
--       to true does not invalidate it. Every already-persisted ~10-year signed
--       URL in products.images / media.url / categories.thumbnail_url /
--       categories.banner_url / hero_banners.image_url keeps resolving, with
--       ZERO row rewrites (2.8, 3.3).
--   (b) "Public can view product images" (20260626155029) already grants anon
--       SELECT on every object in this bucket, and the cleanup loop in
--       20260627095713 only drops policies whose qual matches '%has_role%', so
--       that policy survives. Anonymous read of this bucket is ALREADY
--       permitted. `public = true` changes the URL shape available, not the
--       audience. No confidentiality regression; the bucket holds only public
--       storefront imagery.
--   (c) Only a public bucket lets NEW uploads escape the signing key and its
--       TTL ceiling, which is what defect 1.8 actually is.
--
-- `allowed_mime_types` and `file_size_limit` mirror the client-side allow-list
-- and cap in src/lib/uploads.ts so the server enforces the same contract. Both
-- apply to NEW uploads only and cannot affect objects already stored.
--
-- Deliberately OUT OF SCOPE: no backfill or reconciliation of legacy signed
-- URLs in existing rows. Both URL forms coexist during the transition, both
-- resolve, and no render-path code branches on which form a URL takes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760, -- 10 MiB, mirrors MAX_UPLOAD_BYTES in src/lib/uploads.ts
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
