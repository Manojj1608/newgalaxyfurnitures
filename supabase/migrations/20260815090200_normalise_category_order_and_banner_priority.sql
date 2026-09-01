-- Defect 1.20 — normalise degenerate ordering values.
--
-- APPEND-ONLY: no existing migration file is edited (3.13).
--
-- Part 1 of a two-part fix. The data is ALREADY degenerate: the seed in
-- 20260802160613 assigned `display_order = 99` to every category derived from
-- `products.category`. With siblings sharing a value, the admin panels' two-row
-- swap wrote 99 and 99, so nothing moved and nothing was reported.
--
-- Part 2 is client-side: `move()` in categories-panel.tsx and homepage-panel.tsx
-- now re-sequences the affected sibling list densely (1..n) instead of swapping
-- two values, which stays correct even if values collide again later. This
-- migration is therefore a data repair, not the mechanism the fix depends on.
--
-- Properties of the statements below:
--   * Deterministic — ties broken by name (categories) / created_at (banners),
--     then by id, so the result is reproducible.
--   * Idempotent and re-runnable — the `where` clause makes a second run a no-op.
--   * Changes only VALUES, never rows or visibility. Wherever values were
--     already distinct the visible order is exactly what admins see today; where
--     they collided it becomes deterministic (3.12).

-- Categories: dense 1..n within each parent (top-level rows share parent_id NULL).
with ranked as (
  select
    id,
    row_number() over (
      partition by parent_id
      order by display_order, name, id
    ) as rn
  from public.categories
)
update public.categories c
   set display_order = ranked.rn
  from ranked
 where ranked.id = c.id
   and c.display_order <> ranked.rn;

-- Hero banners: the same shape over `priority`, which carries the same
-- equal-value swap risk.
with ranked as (
  select
    id,
    row_number() over (
      order by priority, created_at, id
    ) as rn
  from public.hero_banners
)
update public.hero_banners b
   set priority = ranked.rn
  from ranked
 where ranked.id = b.id
   and b.priority <> ranked.rn;
