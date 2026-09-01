/**
 * EXPLORATION TESTS — family C2 "upload pipeline integrity" (defects 1.3, 1.4, 1.9).
 *
 * These encode the EXPECTED (post-fix) behaviour from bugfix.md section 2 and are
 * expected to FAIL against unfixed code. The Supabase storage client is faked as a
 * BOUNDARY only; assertions are about real exported functions in `src/`.
 *
 * Validates: Requirements 2.3, 2.4, 2.9
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeSupabase, postgrestError } from "@/test/supabase-fake";

let fake: FakeSupabase;

vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return fake;
  },
}));

beforeEach(() => {
  vi.resetModules();
  fake = new FakeSupabase({ user: { id: "user-1" } });
});

function fileOf(name: string, type: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("1.9 — the object key extension must come from the validated MIME type", () => {
  it("a JPEG named 'photo.tar.gz' is stored with a jpg key, not a gz key", async () => {
    const { uploadProductImage } = await import("@/lib/content-api");
    await uploadProductImage(fileOf("photo.tar.gz", "image/jpeg"));

    const upload = fake.storageOps.find((o) => o.kind === "upload");
    expect(upload?.path).toMatch(/\.jpg$/);
  });

  it("a PNG with no extension in its filename still gets a png key", async () => {
    const { uploadProductImage } = await import("@/lib/content-api");
    await uploadProductImage(fileOf("scan", "image/png"));

    const upload = fake.storageOps.find((o) => o.kind === "upload");
    expect(upload?.path).toMatch(/\.png$/);
  });

  it("a filename that lies about its type does not decide the key", async () => {
    const { uploadProductImage } = await import("@/lib/content-api");
    await uploadProductImage(fileOf("actually-a-png.jpeg", "image/png"));

    const upload = fake.storageOps.find((o) => o.kind === "upload");
    expect(upload?.path).toMatch(/\.png$/);
  });
});

describe("1.4 — unsupported types and oversize files are rejected before any network call", () => {
  it("rejects a PDF and never touches storage", async () => {
    const { uploadProductImage } = await import("@/lib/content-api");

    await expect(uploadProductImage(fileOf("catalogue.pdf", "application/pdf"))).rejects.toThrow();
    expect(fake.storageOps).toHaveLength(0);
  });

  it("rejects an SVG (not in the allow-list) and never touches storage", async () => {
    const { uploadProductImage } = await import("@/lib/content-api");

    await expect(uploadProductImage(fileOf("logo.svg", "image/svg+xml"))).rejects.toThrow();
    expect(fake.storageOps).toHaveLength(0);
  });

  it("rejects a file above the size cap and never touches storage", async () => {
    const { uploadProductImage } = await import("@/lib/content-api");
    const tooBig = fileOf("huge.jpg", "image/jpeg", 11 * 1024 * 1024);

    await expect(uploadProductImage(tooBig)).rejects.toThrow();
    expect(fake.storageOps).toHaveLength(0);
  });

  it("rejects a zero-byte file and never touches storage", async () => {
    const { uploadProductImage } = await import("@/lib/content-api");

    await expect(uploadProductImage(fileOf("empty.jpg", "image/jpeg", 0))).rejects.toThrow();
    expect(fake.storageOps).toHaveLength(0);
  });

  it("accepts each allow-listed type", async () => {
    const { uploadProductImage } = await import("@/lib/content-api");
    for (const [name, type] of [
      ["a.jpg", "image/jpeg"],
      ["b.png", "image/png"],
      ["c.webp", "image/webp"],
    ] as const) {
      await expect(uploadProductImage(fileOf(name, type))).resolves.toMatchObject({
        url: expect.any(String),
        path: expect.any(String),
      });
    }
  });
});
