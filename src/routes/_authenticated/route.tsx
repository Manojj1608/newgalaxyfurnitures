// This file is integration-managed.
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadAccess, nextFor } from "@/lib/admin-guard";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // All authorization logic lives in @/lib/admin-guard so this
    // integration-managed file keeps its shape and its ssr:false setting.
    const access = await loadAccess();
    if (access.status === "ready") return { user: access.user, roles: access.roles };
    // A transient failure is NOT an absent session: do not redirect, throw so
    // the route's existing errorComponent renders and the destination survives.
    if (access.status === "error") throw new Error(access.message);
    throw redirect({ to: "/admin/login", search: nextFor(location) });
  },
  component: () => <Outlet />,
});
