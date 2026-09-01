/**
 * EXPLORATION TESTS — family C3 "admin authorization" (defects 1.10, 1.11, 1.12, 1.13).
 *
 * These encode the EXPECTED (post-fix) behaviour from bugfix.md section 2 and are
 * expected to FAIL against unfixed code. Supabase is faked as a BOUNDARY only.
 *
 * Validates: Requirements 2.10, 2.11, 2.12, 2.13
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { FakeSupabase } from "@/test/supabase-fake";

let fake: FakeSupabase;

vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return fake;
  },
}));

beforeEach(() => {
  vi.resetModules();
});

describe("1.11 — managers and editors are staff and must not be told 'Admins only'", () => {
  it.each(["manager", "editor"] as const)("a %s resolves as staff", async (role) => {
    fake = new FakeSupabase({ user: { id: "u1" }, roles: [role] });
    const { useAuth } = await import("@/hooks/use-admin");

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // The database already grants these roles content rights via private.is_staff.
    expect(result.current.isStaff).toBe(true);
  });

  it("an admin is both staff and manager", async () => {
    fake = new FakeSupabase({ user: { id: "u1" }, roles: ["admin"] });
    const { useAuth } = await import("@/hooks/use-admin");

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isStaff).toBe(true);
    expect(result.current.isManager).toBe(true);
  });

  it("a plain 'user' role is not staff", async () => {
    fake = new FakeSupabase({ user: { id: "u1" }, roles: ["user"] });
    const { useAuth } = await import("@/hooks/use-admin");

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isStaff).toBe(false);
    expect(result.current.status).toBe("denied");
  });
});

describe("1.12 — a failed role lookup is not the same as 'access denied'", () => {
  it("surfaces an error status rather than silently denying", async () => {
    fake = new FakeSupabase({
      user: { id: "u1" },
      rolesError: { message: "network unreachable" },
    });
    const { useAuth } = await import("@/hooks/use-admin");

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Unfixed code collapses this into isAdmin:false → "Access denied", locking
    // out a genuine admin with no retry and no indication the check failed.
    expect(result.current.status).toBe("error");
  });
});

describe("1.13 — a rejected getUser() must settle out of the loading state", () => {
  it("never leaves the dashboard on 'Loading…' forever", async () => {
    fake = new FakeSupabase({ getUserRejects: true });
    const { useAuth } = await import("@/hooks/use-admin");

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 2000 });
    expect(result.current.status).toBe("error");
  });
});
