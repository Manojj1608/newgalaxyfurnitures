/**
 * Logo source resolution.
 *
 * Defect 1.41: the header rendered `<img src={settings.logo_url} alt="" />` with
 * no guard, so ANY stored value — empty string, whitespace, a broken or hostile
 * URL — permanently defeated the existing `NGMonogram` fallback and could yield a
 * broken or distorted header.
 *
 * This guard is what makes the EXISTING fallback reachable again (3.23). Pure, so
 * every case is unit-testable.
 */

/**
 * Returns a usable image src, or null when the configured value should be
 * treated as absent (so the caller renders `NGMonogram`).
 *
 * Only http(s) and data: URLs are accepted; anything else — including
 * `javascript:` and other schemes — is treated as absent.
 */
export function resolveLogoSrc(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^data:image\//i.test(trimmed)) return trimmed;
  return null;
}

/**
 * Constrained, ratio-preserving sizing so a wrong-ratio or oversized image
 * cannot distort or blow out the header bar. Kept as a shared constant so the
 * header, footer and the settings preview all agree.
 */
export const LOGO_IMG_CLASS = "h-9 w-auto max-h-9 max-w-[180px] object-contain";
