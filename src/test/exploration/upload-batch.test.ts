/**
 * EXPLORATION TESTS — defect 1.3 (batch upload accounting).
 *
 * Split from upload-pipeline.test.ts because the shared batch upload path
 * (`@/lib/uploads`) does not exist on unfixed code: the media panel inlines a
 * single try/around a sequential for-await loop, so one failure aborts every
 * remaining file while still reporting `${files.length} file(s) uploaded`.
 * This file therefore fails to resolve its import on unfixed code, which is
 * itself the counterexample: there is no per-file accounting to test.
 *
 * Validates: Requirements 2.3
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

describe("1.3 — a batch upload reports exactly what succeeded and what failed", () => {
  it("attempts every file even when one fails part-way through", async () => {
    let calls = 0;
    fake = new FakeSupabase({
      user: { id: "user-1" },
      storage: {
        upload: () => {
          calls += 1;
          // Third attempt fails; files 4 and 5 must still be attempted.
          return calls === 3 ? postgrestError("payload too large") : { data: {}, error: null };
        },
      },
    });

    const { uploadImages } = await import("@/lib/uploads");
    const files = [
      fileOf("1.jpg", "image/jpeg"),
      fileOf("2.jpg", "image/jpeg"),
      fileOf("3.jpg", "image/jpeg"),
      fileOf("4.jpg", "image/jpeg"),
      fileOf("5.jpg", "image/jpeg"),
    ];

    const result = await uploadImages(files);

    expect(result.succeeded).toHaveLength(4);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.name).toBe("3.jpg");
    expect(result.failed[0]!.reason).toBeTruthy();
    // Every file accounted for — never `files.length` reported as success.
    expect(result.succeeded.length + result.failed.length).toBe(files.length);
  });

  it("summarise never claims more successes than actually happened", async () => {
    const { summarise } = await import("@/lib/uploads");
    const message = summarise({
      succeeded: [{ url: "u1", path: "p1" }],
      failed: [{ name: "bad.pdf", reason: "PNG, JPG or WebP only" }],
    });
    expect(message).toContain("1");
    expect(message).not.toMatch(/^2 /);
  });

  it("an invalid file in the batch does not prevent its valid siblings uploading", async () => {
    const { uploadImages } = await import("@/lib/uploads");
    const result = await uploadImages([
      fileOf("good-1.jpg", "image/jpeg"),
      fileOf("bad.pdf", "application/pdf"),
      fileOf("good-2.png", "image/png"),
    ]);

    expect(result.succeeded).toHaveLength(2);
    expect(result.failed.map((f) => f.name)).toEqual(["bad.pdf"]);
  });
});
