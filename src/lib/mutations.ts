/**
 * Shared mutation-result inspection.
 *
 * Defect 1.22: Supabase's `{data, error}` shape makes success the default, and a
 * statement issued without `.select()` cannot report affected rows AT ALL. So a
 * mutation that RLS excluded from every candidate row returns
 * `{data: null, error: null}` — indistinguishable from success — and the caller
 * cheerfully reports "Moved to trash" / "Settings saved" / "Deleted" /
 * "Notes saved" for an operation that changed nothing.
 *
 * Kept as a pure function so the whole rule is unit-testable without a database.
 */

/** Raised when a mutation completed without error but changed no rows. */
export class MutationBlockedError extends Error {
  readonly entity: string;

  constructor(entity: string) {
    super(
      `No rows were changed while updating ${entity} — you may not have permission to modify this record.`,
    );
    this.name = "MutationBlockedError";
    this.entity = entity;
  }
}

export type MutationResult<T> = {
  data: T[] | T | null;
  error: { message?: string } | null;
};

/**
 * Throws on a reported error, throws MutationBlockedError when the statement
 * affected zero rows, and otherwise returns the affected rows.
 *
 * Every mutation that MUST have changed a row is routed through this.
 */
export function expectRows<T>(result: MutationResult<T>, entity: string): T[] {
  if (result.error) {
    const message = result.error.message ?? `Failed to update ${entity}`;
    throw new Error(message);
  }
  const rows =
    result.data === null || result.data === undefined
      ? []
      : Array.isArray(result.data)
        ? result.data
        : [result.data];
  if (rows.length === 0) throw new MutationBlockedError(entity);
  return rows;
}
