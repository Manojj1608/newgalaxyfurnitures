/**
 * PROPERTY-BASED TESTS over the real input domains (task 11.2).
 *
 * Every subject is a real exported function in `src/`. Where a boundary is
 * needed (the upload callback) it is injected, never asserted against.
 *
 * Validates: Requirements 2.3, 2.4, 2.9, 2.11, 2.20, 2.22, 2.23, 2.28, 2.29, 2.42
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { User } from "@supabase/supabase-js";

import { MAX_UPLOAD_BYTES, summarise, uploadImages, validateUploadFile } from "@/lib/uploads";
import { deriveAccess, isManagerRoles, isStaffRoles } from "@/lib/admin-guard";
import { queryStateOf } from "@/lib/query-state";
import { changedRows, resequence } from "@/lib/ordering";
import { classifyLink, isRegisteredRoute } from "@/lib/links";
import { buildProductMetadata } from "@/lib/product-metadata";
import { MutationBlockedError, expectRows } from "@/lib/mutations";
import { resolveLogoSrc } from "@/lib/logo";

const user = { id: "u1" } as User;

/* ------------------------------- uploads -------------------------------- */

const mimeArb = fc.constantFrom(
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "",
);
const adversarialName = fc.oneof(
  fc.constant("no-extension"),
  fc.constant("photo.tar.gz"),
  fc.constant("with spaces.jpg"),
  fc.constant("héllo-ünicode.png"),
  fc.constant("a#b?c.webp"),
  fc.constant(".hidden"),
  fc.constant(""),
  fc.string(),
);

const fileArb = fc
  .record({
    name: adversarialName,
    type: mimeArb,
    size: fc.integer({ min: 0, max: 20 * 1024 * 1024 }),
  })
  .map(({ name, type, size }) => new File([new Uint8Array(Math.min(size, 32))], name, { type }));

describe("upload batch accounting invariants", () => {
  it("accounts for every file exactly once, whatever the mix", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fileArb, { maxLength: 12 }),
        fc.array(fc.nat(), { maxLength: 12 }),
        async (files, failAt) => {
          const failIdx = new Set(failAt.map((n) => n % Math.max(files.length, 1)));
          let i = -1;
          const result = await uploadImages(files, async (f) => {
            i += 1;
            // Validation is part of the real path; the boundary only fails.
            const v = validateUploadFile(f);
            if (!v.ok) throw new Error(v.message);
            if (failIdx.has(i)) throw new Error("boundary failure");
            return { url: `u/${f.name}`, path: f.name };
          });
          expect(result.succeeded.length + result.failed.length).toBe(files.length);
        },
      ),
      { numRuns: 60 },
    );
  });

  it("every rejection carries a non-empty reason", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fileArb, { maxLength: 8 }), async (files) => {
        const result = await uploadImages(files, async (f) => {
          const v = validateUploadFile(f);
          if (!v.ok) throw new Error(v.message);
          return f.name;
        });
        for (const failure of result.failed) {
          expect(failure.reason.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 60 },
    );
  });

  it("no valid file is ever skipped because a sibling failed", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fileArb, { maxLength: 10 }), async (files) => {
        const attempted: string[] = [];
        await uploadImages(files, async (f) => {
          attempted.push(f.name);
          throw new Error("always fails");
        });
        // Every file is attempted regardless of earlier failures.
        expect(attempted.length).toBe(files.length);
      }),
      { numRuns: 40 },
    );
  });

  it("summarise never reports more successes than occurred", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 20 }),
        fc.array(fc.record({ name: fc.string(), reason: fc.string({ minLength: 1 }) }), {
          maxLength: 20,
        }),
        (succeeded, failed) => {
          const message = summarise({ succeeded, failed });
          if (succeeded.length === 0) expect(message).not.toMatch(/\d+ uploaded/);
          else expect(message).toContain(`${succeeded.length} uploaded`);
          if (failed.length > 0) expect(message).toContain(`${failed.length} failed`);
        },
      ),
    );
  });

  it("validateUploadFile accepts a file if and only if type and size both qualify", () => {
    fc.assert(
      fc.property(mimeArb, fc.integer({ min: 0, max: 20 * 1024 * 1024 }), (type, size) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"].includes(type);
        const ok = allowed && size > 0 && size <= MAX_UPLOAD_BYTES;
        expect(validateUploadFile({ name: "x", type, size }).ok).toBe(ok);
      }),
    );
  });
});

/* ------------------------------ authorization ----------------------------- */

const roleArb = fc.constantFrom("admin", "manager", "editor", "user", "wizard", "");

describe("deriveAccess agrees with the SQL model", () => {
  it("isStaff and isManager mirror the database predicates", () => {
    fc.assert(
      fc.property(fc.array(roleArb, { maxLength: 5 }), (roles) => {
        const access = deriveAccess(user, roles, null);
        const expectStaff = roles.some((r) => ["admin", "manager", "editor"].includes(r));
        const expectManager = roles.some((r) => ["admin", "manager"].includes(r));
        expect(access.status).toBe(expectStaff ? "ready" : "denied");
        if (access.status === "ready") {
          expect(access.isStaff).toBe(expectStaff);
          expect(access.isManager).toBe(expectManager);
          // isManager implies isStaff, always.
          if (access.isManager) expect(access.isStaff).toBe(true);
        }
      }),
    );
  });

  it("an admin never loses a capability", () => {
    fc.assert(
      fc.property(fc.array(roleArb, { maxLength: 4 }), (extra) => {
        const access = deriveAccess(user, ["admin", ...extra], null);
        expect(access).toMatchObject({ isAdmin: true, isManager: true, isStaff: true });
      }),
    );
  });

  it("any reported error yields 'error', never 'denied' or 'ready'", () => {
    fc.assert(
      fc.property(
        fc.array(roleArb, { maxLength: 4 }),
        fc.oneof(
          fc.constant(new Error("x")),
          fc.record({ message: fc.string() }),
          fc.string({ minLength: 1 }),
        ),
        (roles, err) => {
          expect(deriveAccess(user, roles, err).status).toBe("error");
        },
      ),
    );
  });

  it("isManagerRoles implies isStaffRoles for any role set", () => {
    fc.assert(
      fc.property(fc.array(roleArb, { maxLength: 5 }), (roles) => {
        if (isManagerRoles(roles)) expect(isStaffRoles(roles)).toBe(true);
      }),
    );
  });
});

/* ------------------------------ query state ------------------------------ */

describe("queryStateOf invariants", () => {
  it("never returns 'empty' when isError is true", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.oneof(fc.constant(undefined), fc.constant(null), fc.array(fc.nat()), fc.object()),
        (isLoading, isError, data) => {
          const state = queryStateOf({ isLoading, isError, data });
          if (isError) expect(state).toBe("error");
          expect(state).not.toBe(isError ? "empty" : "___never");
        },
      ),
    );
  });

  it("only ever returns one of the four known states", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fc.anything(), (isLoading, isError, data) => {
        expect(["loading", "error", "empty", "ready"]).toContain(
          queryStateOf({ isLoading, isError, data }),
        );
      }),
    );
  });
});

/* -------------------------------- ordering ------------------------------- */

describe("resequence invariants", () => {
  const siblingsArb = fc
    .array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 8 })
    .map((orders) => orders.map((order, i) => ({ id: `id-${i}`, order })));

  it("always yields dense, distinct 1..n values", () => {
    fc.assert(
      fc.property(
        siblingsArb,
        fc.nat(),
        fc.constantFrom(-1 as const, 1 as const),
        (siblings, pick, dir) => {
          const target = siblings[pick % siblings.length]!;
          const after = resequence(siblings, target.id, dir);
          expect(after.map((s) => s.order)).toEqual(
            Array.from({ length: siblings.length }, (_, i) => i + 1),
          );
        },
      ),
    );
  });

  it("preserves the exact set of ids", () => {
    fc.assert(
      fc.property(
        siblingsArb,
        fc.nat(),
        fc.constantFrom(-1 as const, 1 as const),
        (siblings, pick, dir) => {
          const target = siblings[pick % siblings.length]!;
          const after = resequence(siblings, target.id, dir);
          expect(after.map((s) => s.id).sort()).toEqual(siblings.map((s) => s.id).sort());
        },
      ),
    );
  });

  it("moves the target exactly one position, or not at all at a boundary", () => {
    fc.assert(
      fc.property(
        siblingsArb,
        fc.nat(),
        fc.constantFrom(-1 as const, 1 as const),
        (siblings, pick, dir) => {
          const target = siblings[pick % siblings.length]!;
          const beforeOrder = resequence(siblings, "___none", 1).map((s) => s.id);
          const afterOrder = resequence(siblings, target.id, dir).map((s) => s.id);
          const from = beforeOrder.indexOf(target.id);
          const to = afterOrder.indexOf(target.id);
          const expected = from + dir;
          expect(to).toBe(expected >= 0 && expected < siblings.length ? expected : from);
        },
      ),
    );
  });

  it("changedRows only ever reports rows whose value really differs", () => {
    fc.assert(
      fc.property(
        siblingsArb,
        fc.nat(),
        fc.constantFrom(-1 as const, 1 as const),
        (siblings, pick, dir) => {
          const target = siblings[pick % siblings.length]!;
          const after = resequence(siblings, target.id, dir);
          for (const row of changedRows(siblings, after)) {
            const original = siblings.find((s) => s.id === row.id)!;
            expect(row.order).not.toBe(original.order);
          }
        },
      ),
    );
  });
});

/* --------------------------------- links -------------------------------- */

describe("classifyLink invariants", () => {
  it("NEVER returns 'internal' for a value that is not a registered route", () => {
    // The invariant that prevents the typed-<Link> crash.
    fc.assert(
      fc.property(fc.string(), (value) => {
        const result = classifyLink(value);
        if (result.kind === "internal") expect(isRegisteredRoute(value.trim())).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("only ever returns one of the four kinds, and 'none' carries an empty href", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)), (value) => {
        const result = classifyLink(value);
        expect(["anchor", "external", "internal", "none"]).toContain(result.kind);
        if (result.kind === "none") expect(result.href).toBe("");
        else expect(result.href.length).toBeGreaterThan(0);
      }),
      { numRuns: 300 },
    );
  });

  it("never classifies a protocol-relative value as internal or anchor", () => {
    fc.assert(
      fc.property(fc.string(), (rest) => {
        expect(["external", "none"]).toContain(classifyLink(`//${rest}`).kind);
      }),
    );
  });
});

/* ------------------------------- metadata -------------------------------- */

describe("product metadata invariants", () => {
  const nullableText = fc.oneof(fc.constant(null), fc.string());
  const productArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 40 }),
    slug: fc.stringMatching(/^[a-z0-9-]{1,30}$/),
    price: fc.integer({ min: 1, max: 1_000_000 }),
    sale_price: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 1_000_000 })),
    in_stock: fc.boolean(),
    images: fc.array(fc.record({ url: fc.webUrl(), path: fc.string() }), { maxLength: 3 }),
    sku: nullableText,
    product_code: nullableText,
    brand: nullableText,
    description: nullableText,
    short_description: nullableText,
    meta_title: nullableText,
    meta_description: nullableText,
  });

  it("never emits a tag with empty content", () => {
    fc.assert(
      fc.property(productArb, (product) => {
        for (const tag of buildProductMetadata(product).meta) {
          if ("content" in tag) expect(tag.content).not.toBe("");
          if ("title" in tag) expect(tag.title.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("never invents a field the record does not have", () => {
    fc.assert(
      fc.property(productArb, (product) => {
        const { jsonLd } = buildProductMetadata(product);
        const hasSku = [product.sku, product.product_code].some(
          (v) => typeof v === "string" && v.trim() !== "",
        );
        const hasBrand = typeof product.brand === "string" && product.brand.trim() !== "";
        expect("sku" in jsonLd).toBe(hasSku);
        expect("brand" in jsonLd).toBe(hasBrand);
      }),
      { numRuns: 200 },
    );
  });

  it("always emits exactly one canonical link matching the slug", () => {
    fc.assert(
      fc.property(productArb, (product) => {
        const { links } = buildProductMetadata(product);
        expect(links).toHaveLength(1);
        expect(links[0]!.href.endsWith(`/product/${product.slug}`)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("offers.price always equals the effective price", () => {
    fc.assert(
      fc.property(productArb, (product) => {
        const { jsonLd } = buildProductMetadata(product);
        const expected =
          product.sale_price && product.sale_price > 0 ? product.sale_price : product.price;
        expect((jsonLd.offers as { price: number }).price).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});

/* ------------------------------- mutations ------------------------------- */

describe("expectRows invariants", () => {
  it("throws for any zero-row result and returns rows otherwise", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.array(fc.record({ id: fc.uuid() }), { maxLength: 5 })),
        (data) => {
          const rows = Array.isArray(data) ? data : [];
          if (rows.length === 0) {
            expect(() => expectRows({ data, error: null }, "entity")).toThrow(MutationBlockedError);
          } else {
            expect(expectRows({ data, error: null }, "entity")).toEqual(rows);
          }
        },
      ),
    );
  });

  it("always throws when an error is present, regardless of data", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.array(fc.record({ id: fc.uuid() }), { maxLength: 3 })),
        fc.string(),
        (data, message) => {
          expect(() => expectRows({ data, error: { message } }, "entity")).toThrow();
        },
      ),
    );
  });
});

/* --------------------------------- logo --------------------------------- */

describe("resolveLogoSrc invariants", () => {
  it("only ever returns null or an http(s)/data-image URL", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.webUrl(), fc.constant(null)), (value) => {
        const out = resolveLogoSrc(value);
        if (out !== null) expect(out).toMatch(/^(https?:\/\/|data:image\/)/i);
      }),
      { numRuns: 300 },
    );
  });

  it("never returns a blank string", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.constant(null)), (value) => {
        const out = resolveLogoSrc(value);
        if (out !== null) expect(out.trim()).not.toBe("");
      }),
    );
  });
});
