/**
 * Unit tests for the loading / empty / error selector (task 11.1).
 *
 * Validates: Requirements 2.23, 2.24, 2.25, 2.26, 2.42
 */
import { describe, expect, it } from "vitest";
import { queryStateOf } from "./query-state";

describe("queryStateOf", () => {
  it("reports an error even when data is an empty array", () => {
    // THE regression this whole family is about: on unfixed code this rendered
    // as "No media yet." / "Trash is empty." / "No settings row found."
    expect(queryStateOf({ isLoading: false, isError: true, data: [] })).toBe("error");
  });

  it("reports an error when data is undefined or null", () => {
    expect(queryStateOf({ isLoading: false, isError: true, data: undefined })).toBe("error");
    expect(queryStateOf({ isLoading: false, isError: true, data: null })).toBe("error");
  });

  it("lets an error outrank a concurrent loading state", () => {
    expect(queryStateOf({ isLoading: true, isError: true, data: [] })).toBe("error");
  });

  it("reports loading when a first fetch is in flight", () => {
    expect(queryStateOf({ isLoading: true, isError: false, data: undefined })).toBe("loading");
  });

  it("reports empty for a successful query with no rows", () => {
    expect(queryStateOf({ isLoading: false, isError: false, data: [] })).toBe("empty");
  });

  it("reports empty for a successful query returning null (a missing row)", () => {
    expect(queryStateOf({ isLoading: false, isError: false, data: null })).toBe("empty");
    expect(queryStateOf({ isLoading: false, isError: false, data: undefined })).toBe("empty");
  });

  it("reports ready for a populated collection", () => {
    expect(queryStateOf({ isLoading: false, isError: false, data: [{ id: 1 }] })).toBe("ready");
  });

  it("reports ready for a non-collection payload such as a settings row", () => {
    expect(queryStateOf({ isLoading: false, isError: false, data: { id: true } })).toBe("ready");
  });
});
