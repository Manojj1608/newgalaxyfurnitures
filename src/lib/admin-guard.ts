/**
 * Admin authorization decisions, kept OUT of the integration-managed route file
 * so the edit there stays a single call and the logic is unit-testable without a
 * router or a database.
 *
 * Defects addressed: 1.10 (any authenticated user could reach /admin/dashboard),
 * 1.14 (a transient session failure was indistinguishable from "not signed in"
 * and lost the intended destination).
 *
 * HONEST SCOPE — read this before claiming anything about security:
 * `_authenticated/route.tsx` sets `ssr: false`, so `beforeLoad` runs
 * CLIENT-SIDE ONLY and therefore CANNOT be a security boundary. This guard is a
 * UI gate. It delivers exactly what requirement 2.10 asks — denial before the
 * admin route and its queries load — and nothing more. The authoritative
 * boundary remains RLS, hardened by the storage-policy and role-helper
 * migrations. `ssr: false` is deliberately KEPT: enabling SSR would require
 * server-side auth cookie reads and risks session persistence (3.8), far outside
 * "smallest production-safe fix".
 */
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "manager" | "editor" | "user";

/** Mirrors private.is_staff(uuid): admin | manager | editor. */
export const STAFF_ROLES: readonly AppRole[] = ["admin", "manager", "editor"];
/** Mirrors private.is_manager(uuid): admin | manager. */
export const MANAGER_ROLES: readonly AppRole[] = ["admin", "manager"];

export type Access =
  | { status: "anonymous" }
  /** The check could not be COMPLETED. Never conflate this with a denial. */
  | { status: "error"; message: string }
  /** Authenticated, but holds no staff role. */
  | { status: "denied"; user: User }
  | {
      status: "ready";
      user: User;
      roles: AppRole[];
      isAdmin: boolean;
      isManager: boolean;
      isStaff: boolean;
    };

export function isStaffRoles(roles: readonly string[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r as AppRole));
}

export function isManagerRoles(roles: readonly string[]): boolean {
  return roles.some((r) => MANAGER_ROLES.includes(r as AppRole));
}

/**
 * Pure authorization decision. Kept pure so the full role matrix is testable.
 *
 * Order matters: a lookup error outranks everything except an absent session,
 * because "we could not determine your role" must never be rendered as
 * "access denied" (defect 1.12).
 */
export function deriveAccess(
  user: User | null,
  roles: readonly string[],
  lookupError: unknown,
): Access {
  if (!user) return { status: "anonymous" };
  if (lookupError) {
    return {
      status: "error",
      message:
        lookupError instanceof Error
          ? lookupError.message
          : typeof lookupError === "object" && lookupError && "message" in lookupError
            ? String((lookupError as { message: unknown }).message)
            : "Could not verify your access. Please retry.",
    };
  }
  const isStaff = isStaffRoles(roles);
  if (!isStaff) return { status: "denied", user };
  return {
    status: "ready",
    user,
    roles: roles as AppRole[],
    isAdmin: roles.includes("admin"),
    isManager: isManagerRoles(roles),
    isStaff: true,
  };
}

/**
 * Reuses the login route's EXISTING validation contract verbatim
 * (`startsWith('/')` and `!startsWith('//')`), so no external or
 * protocol-relative destination can ever be produced (3.20).
 */
export function nextFor(location: { href?: string }): { next?: string } {
  const href = location?.href;
  if (typeof href !== "string") return {};
  if (!href.startsWith("/") || href.startsWith("//")) return {};
  return { next: href };
}

/** Fetches the session and role set, inspecting BOTH error paths (1.12, 1.13). */
export async function loadAccess(): Promise<Access> {
  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return deriveAccess({} as User, [], error);
    user = data.user ?? null;
  } catch (e) {
    // A rejected getUser() is a transient failure, NOT an absent session.
    return { status: "error", message: e instanceof Error ? e.message : "Session check failed" };
  }
  if (!user) return { status: "anonymous" };

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (data ?? []).map((r) => (r as { role: string }).role);
  return deriveAccess(user, roles, error);
}

/** Tabs each role may operate, mirroring the table policies. */
export function permittedTabs(access: Access): string[] {
  if (access.status !== "ready") return [];
  const tabs: string[] = [];
  if (access.isStaff) tabs.push("products", "categories", "homepage", "media");
  // Enquiries reads are manager-level ("Managers can view enquiries"), and
  // settings writes are manager-level in intent.
  if (access.isManager) tabs.push("enquiries", "settings");
  return tabs;
}
