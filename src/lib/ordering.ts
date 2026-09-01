/**
 * Dense re-sequencing for sibling ordering values.
 *
 * Defect 1.20: the admin panels moved an item by SWAPPING two ordering values.
 * When siblings share a value — and they do, because the seed in 20260802160613
 * assigned `display_order = 99` to every category derived from
 * `products.category` — the swap writes the same number twice, nothing moves,
 * and nothing is reported.
 *
 * Re-sequencing the affected sibling list densely (1..n) is correct even if
 * values collide again later, so the fix does not depend on the accompanying
 * normalisation migration holding forever.
 *
 * Pure, so every edge case is unit-testable without a database.
 */

export type Orderable = { id: string; order: number };

/**
 * Returns the sibling list in its new order, with dense 1..n `order` values.
 *
 * `dir` is -1 to move the item one place earlier, +1 one place later. Moving the
 * first item earlier, or the last item later, is a no-op (but still returns a
 * densely numbered list, which is what repairs pre-existing duplicates).
 *
 * Ties in the incoming data are broken deterministically by the caller's array
 * position, so the result is stable and reproducible.
 */
export function resequence<T extends Orderable>(siblings: T[], id: string, dir: -1 | 1): T[] {
  // Sort by order, breaking ties by existing array position so equal values
  // produce a deterministic sequence rather than an arbitrary one.
  const sorted = siblings
    .map((s, index) => ({ s, index }))
    .sort((a, b) => a.s.order - b.s.order || a.index - b.index)
    .map(({ s }) => s);

  const from = sorted.findIndex((s) => s.id === id);
  const to = from + dir;

  if (from !== -1 && to >= 0 && to < sorted.length) {
    const [moved] = sorted.splice(from, 1);
    if (moved) sorted.splice(to, 0, moved);
  }

  return sorted.map((s, i) => ({ ...s, order: i + 1 }));
}

/**
 * The subset of rows whose order value actually changed, so a reorder writes the
 * minimum number of rows.
 */
export function changedRows<T extends Orderable>(before: T[], after: T[]): T[] {
  const previous = new Map(before.map((s) => [s.id, s.order]));
  return after.filter((s) => previous.get(s.id) !== s.order);
}
