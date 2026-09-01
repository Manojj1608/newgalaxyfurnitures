/**
 * EXPLORATION TESTS — family C5 "false success" (defects 1.18, 1.19, 1.22, 1.32).
 *
 * These tests encode the EXPECTED (post-fix) behaviour from bugfix.md section 2.
 * They are expected to FAIL against unfixed code; each failure is a counterexample
 * proving the defect is real. Task 12 re-runs these same tests, where they must pass.
 *
 * The Supabase client is faked as a BOUNDARY only. Every assertion below is about
 * the observable behaviour of a real exported function in `src/`.
 *
 * Validates: Requirements 2.18, 2.19, 2.22, 2.32
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FakeSupabase,
  noSelectNoError,
  postgrestError,
  zeroRowsNoError,
} from "@/test/supabase-fake";

let fake: FakeSupabase;

vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return fake;
  },
}));

beforeEach(() => {
  vi.resetModules();
});

describe("1.22 — a mutation that changed zero rows must not report success", () => {
  it("softDeleteProduct rejects when RLS excluded the row (zero rows, no error)", async () => {
    fake = new FakeSupabase({ tables: { products: zeroRowsNoError } });
    const { softDeleteProduct } = await import("@/lib/content-api");

    // Expected: a trash operation that changed nothing is a failure, never
    // "Moved to trash". Unfixed code resolves successfully here.
    await expect(softDeleteProduct("prod-1")).rejects.toThrow();
  });

  it("softDeleteProduct asks the database to report affected rows", async () => {
    fake = new FakeSupabase({ tables: { products: zeroRowsNoError } });
    const { softDeleteProduct } = await import("@/lib/content-api");
    await softDeleteProduct("prod-1").catch(() => {});

    // Without .select() the statement cannot report affected rows at all.
    const update = fake.opsFor("products", "update")[0];
    expect(update?.selected).toBeDefined();
  });

  it.each([
    ["restoreProduct", "products"],
    ["purgeProduct", "products"],
    ["deleteCategory", "categories"],
    ["deleteBanner", "hero_banners"],
  ] as const)("%s rejects on a zero-row result", async (fnName, table) => {
    fake = new FakeSupabase({ tables: { [table]: zeroRowsNoError } });
    const api = (await import("@/lib/content-api")) as unknown as Record<
      string,
      (id: string) => Promise<void>
    >;
    await expect(api[fnName]!("row-1")).rejects.toThrow();
  });

  it("saveSettings rejects when no settings row was updated", async () => {
    fake = new FakeSupabase({ tables: { site_settings: zeroRowsNoError } });
    const { saveSettings } = await import("@/lib/content-api");
    await expect(saveSettings({ company_name: "New Galaxy" })).rejects.toThrow();
  });

  it("saveSection rejects when no section row was updated", async () => {
    fake = new FakeSupabase({ tables: { homepage_sections: zeroRowsNoError } });
    const { saveSection } = await import("@/lib/content-api");
    await expect(saveSection({ enabled: false }, "sec-1")).rejects.toThrow();
  });

  it("updateEnquiry rejects when no enquiry row was updated", async () => {
    fake = new FakeSupabase({ tables: { enquiries: zeroRowsNoError } });
    const { updateEnquiry } = await import("@/lib/content-api");
    await expect(updateEnquiry("enq-1", { notes: "called back" })).rejects.toThrow();
  });

  it("saveBanner rejects when no banner row was updated", async () => {
    fake = new FakeSupabase({ tables: { hero_banners: zeroRowsNoError } });
    const { saveBanner } = await import("@/lib/content-api");
    await expect(saveBanner({ active: true }, "ban-1")).rejects.toThrow();
  });
});

describe("1.18 — discarded database errors must be surfaced", () => {
  it("createEnquiry rejects when the insert fails", async () => {
    fake = new FakeSupabase({ tables: { enquiries: postgrestError("permission denied") } });
    const { createEnquiry } = await import("@/lib/content-api");

    // A lost enquiry is lost revenue; the failure must not be swallowed.
    await expect(createEnquiry({ product_name: "Oak table" })).rejects.toThrow();
  });

  it("logProductView rejects when the insert fails", async () => {
    fake = new FakeSupabase({ tables: { product_views: postgrestError("permission denied") } });
    const { logProductView } = await import("@/lib/content-api");
    await expect(logProductView("prod-1")).rejects.toThrow();
  });

  it("logAudit rejects when the insert fails", async () => {
    fake = new FakeSupabase({
      user: { id: "user-1", email: "admin@example.test" },
      tables: { audit_logs: postgrestError("permission denied") },
    });
    const { logAudit } = await import("@/lib/content-api");
    await expect(logAudit("update", "product", "prod-1")).rejects.toThrow();
  });
});

describe("1.19 — a partially failed reorder must not report success", () => {
  it("reorderSections rejects when one of the parallel updates fails", async () => {
    fake = new FakeSupabase({
      tables: {
        homepage_sections: (op) => {
          const id = op.filters.find((f) => f.column === "id")?.value;
          return id === "sec-2" ? postgrestError("permission denied") : { data: [{ id }], error: null };
        },
      },
    });
    const { reorderSections } = await import("@/lib/content-api");

    await expect(
      reorderSections([
        { id: "sec-1", sort_order: 1 },
        { id: "sec-2", sort_order: 2 },
        { id: "sec-3", sort_order: 3 },
      ]),
    ).rejects.toThrow();
  });

  it("reorderSections rejects when an update silently affects zero rows", async () => {
    fake = new FakeSupabase({ tables: { homepage_sections: zeroRowsNoError } });
    const { reorderSections } = await import("@/lib/content-api");

    await expect(
      reorderSections([
        { id: "sec-1", sort_order: 1 },
        { id: "sec-2", sort_order: 2 },
      ]),
    ).rejects.toThrow();
  });
});

describe("1.32 — a failed enquiry insert is reported but never blocks the customer", () => {
  it("openProductEnquiry still opens WhatsApp when the enquiry insert fails", async () => {
    fake = new FakeSupabase({ tables: { enquiries: postgrestError("permission denied") } });
    const reportSpy = vi.fn();
    vi.doMock("@/lib/lovable-error-reporting", () => ({ reportLovableError: reportSpy }));

    const openSpy = vi.fn();
    vi.stubGlobal("window", {
      location: { origin: "https://newgalaxy.test" },
      open: openSpy,
    });

    const { openProductEnquiry } = await import("@/lib/whatsapp");
    const product = {
      id: "prod-1",
      name: "Oak Dining Table",
      slug: "oak-dining-table",
      sku: "NG-001",
      price: 50000,
      sale_price: null,
      images: [{ url: "https://img.test/a.webp", path: "a.webp" }],
    } as never;

    await openProductEnquiry(product, "+91 90000 00000", "/product/oak-dining-table");

    // The customer must never be blocked...
    expect(openSpy).toHaveBeenCalledTimes(1);
    // ...but the loss must be reported rather than discarded by an empty catch.
    expect(reportSpy).toHaveBeenCalled();

    vi.unstubAllGlobals();
    vi.doUnmock("@/lib/lovable-error-reporting");
  });
});

describe("1.6 — storage failure must block the media row delete", () => {
  it("deleteProductImage rejects and leaves the media row in place when removal fails", async () => {
    fake = new FakeSupabase({
      storage: { remove: postgrestError("storage object could not be removed") },
    });
    const { deleteProductImage } = await import("@/lib/content-api");

    await expect(deleteProductImage("abc.webp")).rejects.toThrow();

    // An orphaned storage object with no record is worse than no delete at all.
    expect(fake.opsFor("media", "delete")).toHaveLength(0);
  });

  it("deleteProductImage rejects when the media row delete itself fails", async () => {
    fake = new FakeSupabase({ tables: { media: postgrestError("permission denied") } });
    const { deleteProductImage } = await import("@/lib/content-api");
    await expect(deleteProductImage("abc.webp")).rejects.toThrow();
  });
});

describe("baseline: the fake boundary does not mask genuine success", () => {
  it("softDeleteProduct resolves when a row really was updated", async () => {
    fake = new FakeSupabase({ tables: { products: { data: [{ id: "prod-1" }], error: null } } });
    const { softDeleteProduct } = await import("@/lib/content-api");
    await expect(softDeleteProduct("prod-1")).resolves.toBeUndefined();
  });

  it("a statement replying the way an un-selected update does is still recognised", () => {
    // Guards the fake itself: this is the exact shape that makes 1.22 invisible.
    expect(noSelectNoError).toEqual({ data: null, error: null });
  });
});
