/**
 * The single upload contract: validation, MIME-derived object keys and per-file
 * batch accounting.
 *
 * Defects addressed:
 *   1.4 — only `accept="image/*"` was applied, with no MIME allow-list and no
 *         size cap, so anything could be sent to storage and any rejection
 *         reached the admin as an opaque error.
 *   1.9 — the object key extension was taken unvalidated from the original
 *         filename (`file.name.split(".").pop() ?? "jpg"`) while the content
 *         type came from the blob, so the stored key could misdescribe the
 *         object. Verified counterexamples on unfixed code: a JPEG named
 *         `photo.tar.gz` was stored as `<uuid>.gz`, and a PNG named `scan`
 *         (no extension) as `<uuid>.scan` — the `?? "jpg"` fallback is in fact
 *         dead code, since `"scan".split(".").pop()` returns `"scan"`.
 *   1.3 — a batch aborted every remaining file on the first failure while still
 *         reporting `${files.length} file(s) uploaded`.
 *
 * Everything here is pure and dependency-free apart from the injected upload
 * boundary, so every rule is unit-testable without a database.
 */

/** The allow-list, and the canonical extension for each accepted type. */
export const ALLOWED_IMAGE_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedMime = keyof typeof ALLOWED_IMAGE_MIME;

/** Mirrors `file_size_limit` on the `product-images` bucket. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type ValidationFailure = {
  ok: false;
  code: "mime" | "size" | "empty";
  message: string;
};
export type ValidationResult = { ok: true } | ValidationFailure;

export function isAllowedMime(mime: string): mime is AllowedMime {
  return mime in ALLOWED_IMAGE_MIME;
}

/** The canonical extension for a validated MIME type. */
export function extensionForMime(mime: string): string {
  if (!isAllowedMime(mime)) {
    throw new Error(`Unsupported image type: ${mime || "unknown"}`);
  }
  return ALLOWED_IMAGE_MIME[mime];
}

/**
 * The object key is a UUID plus an extension derived ONLY from the validated
 * MIME type of the bytes actually being uploaded. Filenames with spaces, `#`,
 * `?`, Unicode, multiple extensions, no extension or duplicates are therefore
 * structurally irrelevant. The original name is still recorded as `media.alt`.
 */
export function buildObjectKey(mime: string): string {
  return `${crypto.randomUUID()}.${extensionForMime(mime)}`;
}

/** Runs BEFORE any network call, per file, with an actionable message. */
export function validateUploadFile(file: {
  type: string;
  size: number;
  name?: string;
}): ValidationResult {
  if (!isAllowedMime(file.type)) {
    return {
      ok: false,
      code: "mime",
      message: "PNG, JPG or WebP only — please convert this file and try again.",
    };
  }
  if (file.size === 0) {
    return { ok: false, code: "empty", message: "This file is empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      code: "size",
      message: `Must be under ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB — this file is ${(
        file.size /
        (1024 * 1024)
      ).toFixed(1)} MB.`,
    };
  }
  return { ok: true };
}

export type UploadFailure = { name: string; reason: string };
export type BatchResult<T> = { succeeded: T[]; failed: UploadFailure[] };

/**
 * Uploads every file INDEPENDENTLY: each is wrapped in its own try/catch so one
 * failure never aborts the remainder. The caller reports `summarise(...)`, never
 * `files.length`.
 *
 * `upload` is the injected boundary (the real one is `uploadProductImage`).
 */
export async function uploadImages<T>(
  files: File[],
  upload: (file: File) => Promise<T>,
): Promise<BatchResult<T>> {
  const succeeded: T[] = [];
  const failed: UploadFailure[] = [];

  for (const file of files) {
    try {
      succeeded.push(await upload(file));
    } catch (e) {
      failed.push({
        name: file.name,
        reason: e instanceof Error ? e.message : "Upload failed",
      });
    }
  }

  return { succeeded, failed };
}

/** The toast copy: reports exactly what happened, never what was attempted. */
export function summarise<T>(result: BatchResult<T>): string {
  const parts: string[] = [];
  if (result.succeeded.length > 0) parts.push(`${result.succeeded.length} uploaded`);
  if (result.failed.length > 0) parts.push(`${result.failed.length} failed`);
  if (parts.length === 0) return "Nothing to upload";
  let message = parts.join(" · ");
  if (result.failed.length > 0) {
    message += `\n${result.failed.map((f) => `${f.name}: ${f.reason}`).join("\n")}`;
  }
  return message;
}
