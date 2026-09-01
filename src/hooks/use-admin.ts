import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { type AppRole, deriveAccess, isManagerRoles, isStaffRoles } from "@/lib/admin-guard";

/**
 * Defects addressed:
 *   1.11 — the role lookup filtered `role = 'admin'`, so `manager` and `editor`
 *          were shown "Admins only / Access denied" even though database policies
 *          already grant them content rights via private.is_staff.
 *   1.12 — a failed lookup was discarded and collapsed into `isAdmin: false`, so
 *          a genuine admin saw "Access denied" with no retry and no indication
 *          that the CHECK itself had failed.
 *   1.13 — `supabase.auth.getUser()` had no rejection handler, so a rejected
 *          promise never cleared `loading` and the dashboard sat on "Loading…"
 *          forever.
 *
 * `status` distinguishes the four outcomes; `isStaff`/`isManager` mirror the SQL
 * helpers exactly so the UI and the database agree by construction.
 *
 * Deliberately UNCHANGED: the onAuthStateChange subscription and its event list,
 * the user_roles realtime channel, focus revalidation, the `mounted` guard and
 * all cleanup (3.8, 3.11).
 */
export type AuthState = {
  loading: boolean;
  user: User | null;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  roles: AppRole[];
  status: "loading" | "anonymous" | "error" | "denied" | "ready";
  error: string | null;
};

const INITIAL: AuthState = {
  loading: true,
  user: null,
  isAdmin: false,
  isManager: false,
  isStaff: false,
  roles: [],
  status: "loading",
  error: null,
};

export function useAuth(): AuthState & { retry: () => void } {
  const [state, setState] = useState<AuthState>(INITIAL);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, status: "loading", error: null }));
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    let roleChannel: ReturnType<typeof supabase.channel> | null = null;

    function apply(user: User | null, roles: string[], lookupError: unknown) {
      if (!mounted) return;
      const access = deriveAccess(user, roles, lookupError);
      if (access.status === "ready") {
        setState({
          loading: false,
          user: access.user,
          isAdmin: access.isAdmin,
          isManager: access.isManager,
          isStaff: access.isStaff,
          roles: access.roles,
          status: "ready",
          error: null,
        });
        return;
      }
      if (access.status === "error") {
        setState({ ...INITIAL, loading: false, user, status: "error", error: access.message });
        return;
      }
      if (access.status === "denied") {
        setState({ ...INITIAL, loading: false, user: access.user, status: "denied" });
        return;
      }
      setState({ ...INITIAL, loading: false, status: "anonymous" });
    }

    async function checkRole(user: User | null) {
      if (!user) {
        apply(null, [], null);
        return;
      }
      try {
        // 1.11: query ALL roles, not just `role = 'admin'`.
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        // 1.12: inspect the error instead of discarding it.
        apply(
          user,
          (data ?? []).map((r) => (r as { role: string }).role),
          error,
        );
      } catch (e) {
        apply(user, [], e ?? new Error("Role check failed"));
      }
    }

    function subscribeRoles(user: User) {
      if (roleChannel) supabase.removeChannel(roleChannel);
      roleChannel = supabase
        .channel(`user_roles:${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` },
          () => checkRole(user),
        )
        .subscribe();
    }

    async function refresh(user: User | null) {
      await checkRole(user);
      if (user) subscribeRoles(user);
      else if (roleChannel) {
        supabase.removeChannel(roleChannel);
        roleChannel = null;
      }
    }

    // 1.13: a rejection handler, so a failed session check always settles.
    supabase.auth.getUser().then(
      ({ data, error }) => {
        if (error) apply(null, [], error);
        else refresh(data.user ?? null);
      },
      (e) => apply(null, [], e ?? new Error("Session check failed")),
    );

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        refresh(session?.user ?? null);
      }
    });

    // Re-validate when the tab regains focus so external role changes apply immediately.
    function onFocus() {
      supabase.auth.getUser().then(
        ({ data }) => checkRole(data.user ?? null),
        (e) => apply(null, [], e ?? new Error("Session check failed")),
      );
    }
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (roleChannel) supabase.removeChannel(roleChannel);
      window.removeEventListener("focus", onFocus);
    };
  }, [reloadToken]);

  return { ...state, retry };
}

export { isStaffRoles, isManagerRoles };
