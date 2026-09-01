/**
 * The pure loading / empty / error selector.
 *
 * Defects 1.23–1.27: every call site destructured with a default
 * (`const { data: media = [] } = useMedia()`), which makes a FAILED query
 * structurally identical to an EMPTY one. No call site read `isError`, so
 * offline and RLS-denied failures were rendered as "No media yet.",
 * "Trash is empty.", "No settings row found.", a near-blank homepage, and a
 * "Piece not found" 404 for a product that exists.
 *
 * The whole family reduces to ONE ordering rule: isError is checked BEFORE
 * emptiness.
 *
 * Lives in lib/ (not beside the component) so the rule is a pure, dependency-free
 * function and the component file exports only components.
 */

export type QueryStateInput = {
  isLoading: boolean;
  isError: boolean;
  data: unknown;
};

export type QueryState = "loading" | "error" | "empty" | "ready";

export function queryStateOf({ isLoading, isError, data }: QueryStateInput): QueryState {
  // Order is the fix: a failed query can never be reported as empty.
  if (isError) return "error";
  if (isLoading) return "loading";
  if (data === null || data === undefined) return "empty";
  if (Array.isArray(data) && data.length === 0) return "empty";
  return "ready";
}
