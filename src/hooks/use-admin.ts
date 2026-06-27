import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AuthState = {
  loading: boolean;
  user: User | null;
  isAdmin: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, isAdmin: false });

  useEffect(() => {
    let mounted = true;
    let roleChannel: ReturnType<typeof supabase.channel> | null = null;

    async function checkRole(user: User | null) {
      if (!user) {
        if (mounted) setState({ loading: false, user: null, isAdmin: false });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (mounted) setState({ loading: false, user, isAdmin: !!data });
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

    supabase.auth.getUser().then(({ data }) => refresh(data.user ?? null));

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
      supabase.auth.getUser().then(({ data }) => checkRole(data.user ?? null));
    }
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (roleChannel) supabase.removeChannel(roleChannel);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return state;
}
