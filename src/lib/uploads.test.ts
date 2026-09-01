/**
 * Unit tests for the upload contract (task 11.1).
 *
 * Every subject is a real exported function in `src/`. No mock is configured and
 * then asserted against; the only injected boundary is the `upload` callback,
 * which stands in for the network.
 *
 * Validates: Requirements 2.3, 2.4, 2.9, 2.42
 */
import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_MIME,
  MAX_UPLOAD_BYTES,
  buildObjectKey,
  extensionForMime,
  isAllowedMime,
  summarise,
  uploadImages,
  validateUploadFile,
} from "./uploads";

const file = (name: string, type: string, size = 1024) => ({ name, type, size });

describe("validateUploadFile", () => {
  it.each(Object.keys(ALLOWED_IMAGE_MIME))("accepts %s", (mime) => {
    expect(validateUploadFile(file("x", mime))).toEqual({ ok: true });
  });

  it.each([
    ["application/pdf", "a PDF"],
    ["image/svg+xml", "an SVG"],
    ["image/gif", "a GIF"],
    ["text/plain", "plain text"],
    ["", "an unknown type"],
  ])("rejects %s (%s) with code 'mime'", (mime) => {
    const result = validateUploadFile(file("x", mime));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("mime");
      expect(result.message).toMatch(/PNG, JPG or WebP/i);
    }
  });

  it("rejects a zero-byte file with code 'empty'", () => {
    const result = validateUploadFile(file("x", "image/png", 0));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("empty");
  });

  it("rejects an oversize file with code 'size' and an actionable message", () => {
    const result = validateUploadFile(file("x", "image/png", MAX_UPLOAD_BYTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("size");
      expect(result.message).toMatch(/under 10 MB/i);
    }
  });

  it("accepts a file exactly at the cap (boundary)", () => {
    expect(validateUploadFile(file("x", "image/png", MAX_UPLOAD_BYTES))).toEqual({ ok: true });
  });
});

describe("extensionForMime / buildObjectKey", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("maps %s to .%s", (mime, ext) => {
    expect(extensionForMime(mime)).toBe(ext);
  });

  it("throws for a type outside the allow-list", () => {
    expect(() => extensionForMime("image/gif")).toThrow(/Unsupported/i);
  });

  it("derives the key extension from the MIME, never the filename", () => {
    // The regression this prevents: on unfixed code a JPEG named photo.tar.gz
    // was stored as <uuid>.gz, and a PNG named `scan` as <uuid>.scan.
    expect(buildObjectKey("image/jpeg")).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(buildObjectKey("image/png")).toMatch(/^[0-9a-f-]{36}\.png$/);
  });

  it("produces a unique key per call", () => {
    const keys = new Set(Array.from({ length: 50 }, () => buildObjectKey("image/webp")));
    expect(keys.size).toBe(50);
  });

  it("isAllowedMime narrows only the three accepted types", () => {
    expect(isAllowedMime("image/webp")).toBe(true);
    expect(isAllowedMime("image/bmp")).toBe(false);
  });
});

describe("uploadImages batch accounting", () => {
  const asFile = (name: string) => new File([new Uint8Array(8)], name, { type: "image/png" });

  it("attempts every file even when one fails part-way through", async () => {
    const attempted: string[] = [];
    const result = await uploadImages(
      ["1.png", "2.png", "3.png", "4.png", "5.png"].map(asFile),
      async (f) => {
        attempted.push(f.name);
        if (f.name === "3.png") throw new Error("payload too large");
        return { url: `u/${f.name}`, path: f.name };
      },
    );

    // The whole point of 1.3: files after the failure are still attempted.
    expect(attempted).toEqual(["1.png", "2.png", "3.png", "4.png", "5.png"]);
    expect(result.succeeded).toHaveLength(4);
    expect(result.failed).toEqual([{ name: "3.png", reason: "payload too large" }]);
  });

  it("accounts for every file exactly once", async () => {
    const files = ["a.png", "b.png", "c.png"].map(asFile);
    const result = await uploadImages(files, async (f) => {
      if (f.name === "b.png") throw new Error("nope");
      return f.name;
    });
    expect(result.succeeded.length + result.failed.length).toBe(files.length);
  });

  it("carries a reason for every failure", async () => {
    const result = await uploadImages([asFile("x.png")], async () => {
      throw new Error("storage unreachable");
    });
    expect(result.failed[0]!.reason).toBe("storage unreachable");
  });

  it("handles a non-Error rejection without losing the file", async () => {
    const result = await uploadImages([asFile("x.png")], async () => {
      throw "weird";
    });
    expect(result.failed).toEqual([{ name: "x.png", reason: "Upload failed" }]);
  });

  it("returns empty counts for an empty selection", async () => {
    const result = await uploadImages([], async () => "unused");
    expect(result).toEqual({ succeeded: [], failed: [] });
  });
});

describe("summarise", () => {
  it("reports only what actually succeeded", () => {
    expect(summarise({ succeeded: ["a", "b", "c"], failed: [] })).toBe("3 uploaded");
  });

  it("reports both counts and every reason", () => {
    const message = summarise({
      succeeded: ["a"],
      failed: [
        { name: "big.png", reason: "Must be under 10 MB" },
        { name: "doc.pdf", reason: "PNG, JPG or WebP only" },
      ],
    });
    expect(message).toContain("1 uploaded");
    expect(message).toContain("2 failed");
    expect(message).toContain("big.png: Must be under 10 MB");
    expect(message).toContain("doc.pdf: PNG, JPG or WebP only");
  });

  it("never claims a success when everything failed", () => {
    const message = summarise({ succeeded: [], failed: [{ name: "a", reason: "r" }] });
    expect(message).not.toMatch(/uploaded/);
    expect(message).toContain("1 failed");
  });

  it("says nothing to upload for an empty batch", () => {
    expect(summarise({ succeeded: [], failed: [] })).toBe("Nothing to upload");
  });
});
