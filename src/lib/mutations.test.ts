/**
 * Unit tests for zero-rows detection (task 11.1).
 *
 * Validates: Requirements 2.22, 2.42
 */
import { describe, expect, it } from "vitest";
import { MutationBlockedError, expectRows } from "./mutations";

describe("expectRows", () => {
  it("returns the affected rows when the mutation changed something", () => {
    expect(expectRows({ data: [{ id: "a" }], error: null }, "product")).toEqual([{ id: "a" }]);
  });

  it("throws MutationBlockedError when zero rows were affected", () => {
    // The exact shape a .select() mutation returns when RLS excluded every row.
    expect(() => expectRows({ data: [], error: null }, "product")).toThrow(MutationBlockedError);
  });

  it("throws MutationBlockedError when data is null with no error", () => {
    // The shape a mutation WITHOUT .select() returns — the original 1.22 defect.
    expect(() => expectRows({ data: null, error: null }, "settings")).toThrow(MutationBlockedError);
  });

  it("names the entity in the blocked message so the admin knows what failed", () => {
    expect(() => expectRows({ data: [], error: null }, "collection")).toThrow(/collection/);
    expect(() => expectRows({ data: [], error: null }, "collection")).toThrow(/permission/i);
  });

  it("throws the reported error message when the mutation errored", () => {
    expect(() =>
      expectRows(
        { data: null, error: { message: "permission denied for table products" } },
        "product",
      ),
    ).toThrow("permission denied for table products");
  });

  it("prefers the error over the zero-row check", () => {
    let caught: unknown;
    try {
      expectRows({ data: [], error: { message: "boom" } }, "product");
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeInstanceOf(MutationBlockedError);
    expect((caught as Error).message).toBe("boom");
  });

  it("falls back to a generic message when the error carries none", () => {
    expect(() => expectRows({ data: null, error: {} }, "banner")).toThrow(
      /Failed to update banner/,
    );
  });

  it("accepts a single non-array row (a .single() shaped result)", () => {
    expect(expectRows({ data: { id: "x" }, error: null }, "product")).toEqual([{ id: "x" }]);
  });

  it("MutationBlockedError exposes the entity for callers to inspect", () => {
    const error = new MutationBlockedError("enquiry");
    expect(error.entity).toBe("enquiry");
    expect(error.name).toBe("MutationBlockedError");
    expect(error).toBeInstanceOf(Error);
  });
});
