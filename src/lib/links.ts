/**
 * Hero CTA link classification.
 *
 * Defect 1.29: a hero banner's `button_link` is admin-entered free text, and any
 * value not starting with `#` was passed straight to a typed
 * `<Link to={…}>` — producing a failed navigation or an error boundary instead
 * of a working call to action.
 *
 * Pure, so the crash-preventing invariant ("never classify an unregistered path
 * as internal") is unit- and property-testable.
 */

/**
 * Routes a hero CTA may legitimately target: `/`, `/product/{slug}` and
 * `/admin/login`, exactly as design.md Decision 10 specifies.
 *
 * The admin area itself is deliberately EXCLUDED even though those routes exist:
 * a storefront call to action must not deep-link into the dashboard, and admin
 * routes are `noindex,nofollow` (3.20). A path is only ever treated as internal
 * if it matches this set.
 */
const EXACT_ROUTES = new Set(["/", "/admin/login"]);
const PATTERN_ROUTES: RegExp[] = [/^\/product\/[^/]+$/];

export type LinkKind = "anchor" | "external" | "internal" | "none";
export type ClassifiedLink = { kind: LinkKind; href: string };

export function isRegisteredRoute(path: string): boolean {
  const withoutQuery = path.split(/[?#]/)[0] ?? path;
  if (EXACT_ROUTES.has(withoutQuery)) return true;
  return PATTERN_ROUTES.some((re) => re.test(withoutQuery));
}

export function classifyLink(value: string | null | undefined): ClassifiedLink {
  if (typeof value !== "string") return { kind: "none", href: "" };
  const trimmed = value.trim();
  if (trimmed === "") return { kind: "none", href: "" };

  // In-page anchor.
  if (trimmed.startsWith("#")) return { kind: "anchor", href: trimmed };

  // Absolute http(s) URL — opened as an external anchor.
  if (/^https?:\/\//i.test(trimmed)) return { kind: "external", href: trimmed };

  // A path, but only internal if it is a route that actually exists. Reject
  // protocol-relative values, which would navigate off-site.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return isRegisteredRoute(trimmed)
      ? { kind: "internal", href: trimmed }
      : { kind: "none", href: "" };
  }

  // Anything else — javascript:, mailto:, bare words, protocol-relative — yields
  // no call to action rather than a broken one.
  return { kind: "none", href: "" };
}
