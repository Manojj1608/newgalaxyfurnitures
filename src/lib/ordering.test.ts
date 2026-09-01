/**
 * Unit tests for dense re-sequencing (task 11.1).
 *
 * Validates: Requirements 2.20, 2.42
 */
import { describe, expect, it } from "vitest";
import { changedRows, resequence } from "./ordering";

const list = (...pairs: [string, number][]) => pairs.map(([id, order]) => ({ id, order }));

describe("resequence", () => {
  it("moves an item up when every sibling shares the same order value", () => {
    // The exact 20260802160613 seed condition: display_order = 99 everywhere.
    const before = list(["a", 99], ["b", 99], ["c", 99]);
    const after = resequence(before, "c", -1);
    expect(after).toEqual(list(["a", 1], ["c", 2], ["b", 3]));
  });

  it("moves an item down when values collide", () => {
    const before = list(["a", 99], ["b", 99], ["c", 99]);
    expect(resequence(before, "a", 1).map((s) => s.id)).toEqual(["b", "a", "c"]);
  });

  it("always produces dense, distinct 1..n values", () => {
    const after = resequence(list(["a", 5], ["b", 5], ["c", 5], ["d", 5]), "d", -1);
    expect(after.map((s) => s.order)).toEqual([1, 2, 3, 4]);
  });

  it("is a no-op in ORDER when moving the first item up, but still densifies", () => {
    const after = resequence(list(["a", 99], ["b", 99]), "a", -1);
    expect(after.map((s) => s.id)).toEqual(["a", "b"]);
    // The repair still happens, which is what fixes pre-existing duplicates.
    expect(after.map((s) => s.order)).toEqual([1, 2]);
  });

  it("is a no-op in ORDER when moving the last item down", () => {
    const after = resequence(list(["a", 1], ["b", 2]), "b", 1);
    expect(after.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("leaves an already-dense list unchanged when moving is impossible", () => {
    const before = list(["a", 1], ["b", 2], ["c", 3]);
    expect(resequence(before, "a", -1)).toEqual(before);
  });

  it("handles a single item", () => {
    expect(resequence(list(["only", 42]), "only", -1)).toEqual(list(["only", 1]));
    expect(resequence(list(["only", 42]), "only", 1)).toEqual(list(["only", 1]));
  });

  it("handles an empty list without throwing", () => {
    expect(resequence([], "missing", 1)).toEqual([]);
  });

  it("ignores an unknown id but still densifies", () => {
    expect(resequence(list(["a", 7], ["b", 9]), "nope", 1)).toEqual(list(["a", 1], ["b", 2]));
  });

  it("respects existing distinct order values when sorting", () => {
    const after = resequence(list(["c", 30], ["a", 10], ["b", 20]), "a", 1);
    expect(after.map((s) => s.id)).toEqual(["b", "a", "c"]);
  });

  it("preserves other fields on the moved rows", () => {
    const before = [
      { id: "a", order: 2, name: "Alpha" },
      { id: "b", order: 1, name: "Beta" },
    ];
    expect(resequence(before, "a", -1)).toEqual([
      { id: "a", order: 1, name: "Alpha" },
      { id: "b", order: 2, name: "Beta" },
    ]);
  });
});

describe("changedRows", () => {
  it("returns only the rows whose order actually changed", () => {
    const before = list(["a", 1], ["b", 2], ["c", 3]);
    const after = resequence(before, "c", -1);
    expect(
      changedRows(before, after)
        .map((r) => r.id)
        .sort(),
    ).toEqual(["b", "c"]);
  });

  it("returns every row when repairing an all-equal list", () => {
    const before = list(["a", 99], ["b", 99], ["c", 99]);
    // Moving 'a' up is a positional no-op, but EVERY row's value still changes
    // from 99 to its dense position — which is exactly the data repair that
    // makes a subsequent reorder work.
    const after = resequence(before, "a", -1);
    expect(changedRows(before, after).map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(after.map((r) => r.order)).toEqual([1, 2, 3]);
  });

  it("returns nothing when the order is already correct", () => {
    const before = list(["a", 1], ["b", 2]);
    expect(changedRows(before, before)).toEqual([]);
  });
});
