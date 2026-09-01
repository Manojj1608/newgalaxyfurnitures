/**
 * A fake Supabase client used ONLY as a boundary (network / storage), never as
 * the subject of an assertion.
 *
 * Every test that uses this asserts the behaviour of a real exported function in
 * `src/` — this module only stands in for the remote service so that behaviour
 * can be exercised without a database. It also records every operation it was
 * asked to perform, so a test can assert what our code did or did not attempt
 * (e.g. "the media row delete was never issued").
 */

export type PostgrestLike = { data: unknown; error: unknown };

export type RecordedOp = {
  table: string;
  kind: "select" | "insert" | "update" | "delete";
  values?: unknown;
  filters: { column: string; value: unknown; op: string }[];
  selected?: string;
};

export type RecordedStorageOp = {
  bucket: string;
  kind: "upload" | "remove" | "createSignedUrl" | "getPublicUrl";
  path?: string | string[];
  contentType?: string;
};

export type TableResponder = PostgrestLike | ((op: RecordedOp) => PostgrestLike);

export type FakeSupabaseConfig = {
  /** Per-table response. Keyed by table name; `default` applies to the rest. */
  tables?: Record<string, TableResponder>;
  storage?: {
    upload?: PostgrestLike | ((path: string) => PostgrestLike);
    remove?: PostgrestLike | ((paths: string[]) => PostgrestLike);
    createSignedUrl?: PostgrestLike | ((path: string) => PostgrestLike);
  };
  user?: { id: string; email?: string | null } | null;
  /** Roles returned for a `user_roles` select. */
  roles?: string[];
  /** When set, a `user_roles` select rejects with this error object. */
  rolesError?: unknown;
  /** When true, auth.getUser() returns a rejected promise. */
  getUserRejects?: boolean;
};

const OK: PostgrestLike = { data: null, error: null };

function respond(responder: TableResponder | undefined, op: RecordedOp): PostgrestLike {
  if (!responder) return OK;
  return typeof responder === "function" ? responder(op) : responder;
}

export class FakeSupabase {
  readonly ops: RecordedOp[] = [];
  readonly storageOps: RecordedStorageOp[] = [];

  constructor(private config: FakeSupabaseConfig = {}) {}

  /** Ops recorded for a given table, optionally filtered by kind. */
  opsFor(table: string, kind?: RecordedOp["kind"]): RecordedOp[] {
    return this.ops.filter((o) => o.table === table && (!kind || o.kind === kind));
  }

  from(table: string) {
    const makeBuilder = (kind: RecordedOp["kind"], values?: unknown) => {
      const op: RecordedOp = { table, kind, values, filters: [] };
      this.ops.push(op);

      const resolveResult = (): PostgrestLike => {
        if (table === "user_roles" && kind === "select") {
          if (this.config.rolesError) return { data: null, error: this.config.rolesError };
          const rows = (this.config.roles ?? []).map((role) => ({ role }));
          // `useAuth` filters on role and uses maybeSingle(): emulate that shape.
          const roleFilter = op.filters.find((f) => f.column === "role");
          if (roleFilter) {
            const match = rows.find((r) => r.role === roleFilter.value);
            return { data: match ?? null, error: null };
          }
          return { data: rows, error: null };
        }
        return respond(this.config.tables?.[table] ?? this.config.tables?.default, op);
      };

      const builder: Record<string, unknown> = {};
      const chain = (name: string, isFilter = false) => {
        builder[name] = (column?: unknown, value?: unknown) => {
          if (isFilter) {
            op.filters.push({ column: String(column), value, op: name });
          }
          if (name === "select") op.selected = (column as string) ?? "*";
          return builder;
        };
      };
      for (const m of ["eq", "is", "not", "neq", "in", "gte", "lte", "filter"]) chain(m, true);
      for (const m of ["select", "order", "limit", "range", "maybeSingle", "single"]) chain(m);

      (builder as { then: unknown }).then = (
        onFulfilled?: (v: PostgrestLike) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => Promise.resolve(resolveResult()).then(onFulfilled, onRejected);

      return builder;
    };

    return {
      select: (cols?: string) => {
        const b = makeBuilder("select");
        (b as { select: (c?: string) => unknown }).select(cols);
        return b;
      },
      insert: (values: unknown) => makeBuilder("insert", values),
      update: (values: unknown) => makeBuilder("update", values),
      delete: () => makeBuilder("delete"),
    };
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, _blob: unknown, opts?: { contentType?: string }) => {
        this.storageOps.push({ bucket, kind: "upload", path, contentType: opts?.contentType });
        const r = this.config.storage?.upload;
        return typeof r === "function" ? r(path) : (r ?? { data: { path }, error: null });
      },
      remove: async (paths: string[]) => {
        this.storageOps.push({ bucket, kind: "remove", path: paths });
        const r = this.config.storage?.remove;
        return typeof r === "function" ? r(paths) : (r ?? { data: [{}], error: null });
      },
      createSignedUrl: async (path: string, _ttl: number) => {
        this.storageOps.push({ bucket, kind: "createSignedUrl", path });
        const r = this.config.storage?.createSignedUrl;
        if (r) return typeof r === "function" ? r(path) : r;
        return { data: { signedUrl: `https://example.test/sign/${path}?token=fake` }, error: null };
      },
      getPublicUrl: (path: string) => {
        this.storageOps.push({ bucket, kind: "getPublicUrl", path });
        return { data: { publicUrl: `https://example.test/public/${path}` } };
      },
    }),
  };

  auth = {
    getUser: () => {
      if (this.config.getUserRejects) {
        return Promise.reject(new Error("network failure resolving session"));
      }
      return Promise.resolve({
        data: { user: this.config.user ?? null },
        error: null,
      });
    },
    onAuthStateChange: (_cb: unknown) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  };

  channel = (_name: string) => {
    const ch = { on: () => ch, subscribe: () => ch };
    return ch;
  };

  removeChannel = (_ch: unknown) => {};
}

/** Convenience: a responder that reports zero affected rows with no error. */
export const zeroRowsNoError: PostgrestLike = { data: [], error: null };

/** Convenience: a responder shaped the way a statement without .select() replies. */
export const noSelectNoError: PostgrestLike = { data: null, error: null };

/** Convenience: a responder that fails the way RLS/network failures do. */
export function postgrestError(message: string): PostgrestLike {
  return { data: null, error: { message, code: "42501", details: "", hint: "" } };
}
