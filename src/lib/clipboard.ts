/**
 * Clipboard writes that only report success when they actually succeeded.
 *
 * Defect 1.31: `navigator.clipboard.writeText` was called with no error handling,
 * so the media panel showed "URL copied" even in a non-secure context or with
 * the permission denied, and the product page's `share()` fell through to it with
 * no catch — producing an unhandled rejection and a possibly false
 * "Link copied" state.
 */

/** Returns true only if the text really reached the clipboard. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard?.writeText) return false;
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
