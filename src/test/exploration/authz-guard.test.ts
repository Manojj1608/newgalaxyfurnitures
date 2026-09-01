/**
 * EXPLORATION TESTS — defects 1.10, 1.14 (route guard authorization).
 *
 * Split from the useAuth tests because `@/lib/admin-guard` does not exist on
 * unfixed code: `_authenticated/route.tsx` beforeLoad only calls
 * supabase.auth.getUser() with no role check at all, so there is no guard logic
 * to exercise. This file failing to resolve its import IS the counterexample.
 *
 * Validates: Requirements 2.10, 2.11, 2.14
 */
import { describe, expect, it } from "vitest";

describe("1.10 / 1.11 — deriveAccess mirrors the SQL staff model exactly", () => {
  it("classifies every role the database knows about", async () => {
    const { deriveAccess } = await import("@/lib/admin-guard");
    const user = { id: "u1" } as never;

    expect(deriveAccess(null, [], null).status).toBe("anonymous");
    expect(deriveAccess(user, [], { message: "boom" }).status).toBe("error");
    expect(deriveAccess(user, [], null).status).toBe("denied");
    expect(deriveAccess(user, ["user"], null).status).toBe("denied");

    for (const role of ["admin", "manager", "editor"] as const) {
      const access = deriveAccess(user, [role], null);
      expect(access.status).toBe("ready");
    }
  });

  it("isManager implies isStaff, and admin holds every capability", async () => {
    const { deriveAccess } = await import("@/lib/admin-guard");
    const user = { id: "u1" } as never;

    const admin = deriveAccess(user, ["admin"], null);
    expect(admin).toMatchObject({ isAdmin: true, isManager: true, isStaff: true });

    const editor = deriveAccess(user, ["editor"], null);
    expect(editor).toMatchObject({ isAdmin: false, isManager: false, isStaff: true });
  });

  it("an error is never reported as a denial", async () => {
    const { deriveAccess } = await import("@/lib/admin-guard");
    const user = { id: "u1" } as never;
    expect(deriveAccess(user, [], { message: "rls" }).status).not.toBe("denied");
  });
});

describe("1.14 — a transient session failure preserves the intended destination", () => {
  it("nextFor only ever produces a safe internal path", async () => {
    const { nextFor } = await import("@/lib/admin-guard");

    expect(nextFor({ href: "/admin/dashboard" })).toEqual({ next: "/admin/dashboard" });
    // External and protocol-relative values must never survive.
    expect(nextFor({ href: "//evil.test/admin" }).next).toBeUndefined();
    expect(nextFor({ href: "https://evil.test" }).next).toBeUndefined();
  });
});
