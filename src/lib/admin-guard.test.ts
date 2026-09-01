/**
 * Unit tests for the authorization decision (task 11.1).
 *
 * Validates: Requirements 2.10, 2.11, 2.12, 2.13, 2.14, 2.42
 */
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { deriveAccess, isManagerRoles, isStaffRoles, nextFor, permittedTabs } from "./admin-guard";

const user = { id: "u1", email: "a@b.test" } as User;

describe("deriveAccess role matrix", () => {
  it("no session is anonymous", () => {
    expect(deriveAccess(null, [], null)).toEqual({ status: "anonymous" });
  });

  it("a signed-in user with no roles is denied", () => {
    expect(deriveAccess(user, [], null).status).toBe("denied");
  });

  it("a signed-in user with only the default 'user' role is denied", () => {
    expect(deriveAccess(user, ["user"], null).status).toBe("denied");
  });

  it.each([
    ["admin", { isAdmin: true, isManager: true, isStaff: true }],
    ["manager", { isAdmin: false, isManager: true, isStaff: true }],
    ["editor", { isAdmin: false, isManager: false, isStaff: true }],
  ] as const)("a %s is ready with the right capabilities", (role, expected) => {
    const access = deriveAccess(user, [role], null);
    expect(access.status).toBe("ready");
    expect(access).toMatchObject(expected);
  });

  it("a lookup error is an ERROR, never a denial (1.12)", () => {
    const access = deriveAccess(user, [], { message: "network unreachable" });
    expect(access.status).toBe("error");
    expect(access.status).not.toBe("denied");
    if (access.status === "error") expect(access.message).toBe("network unreachable");
  });

  it("a rejected session check with no user is an ERROR, not anonymous (1.13)", () => {
    // Ordering matters: reporting this as 'anonymous' would bounce a signed-in
    // admin to the login page on a transient failure.
    expect(deriveAccess(null, [], new Error("getUser failed")).status).toBe("error");
  });

  it("an error outranks any roles that were returned", () => {
    expect(deriveAccess(user, ["admin"], { message: "stale" }).status).toBe("error");
  });

  it("falls back to a readable message for an opaque error", () => {
    const access = deriveAccess(user, [], "just a string");
    expect(access.status).toBe("error");
    if (access.status === "error") expect(access.message).toMatch(/Could not verify/i);
  });

  it("ignores unknown roles when deciding staff status", () => {
    expect(deriveAccess(user, ["wizard"], null).status).toBe("denied");
  });

  it("admits a user holding several roles including a staff one", () => {
    expect(deriveAccess(user, ["user", "editor"], null).status).toBe("ready");
  });
});

describe("role predicates mirror the SQL helpers", () => {
  it("isStaffRoles matches private.is_staff", () => {
    expect(isStaffRoles(["admin"])).toBe(true);
    expect(isStaffRoles(["manager"])).toBe(true);
    expect(isStaffRoles(["editor"])).toBe(true);
    expect(isStaffRoles(["user"])).toBe(false);
    expect(isStaffRoles([])).toBe(false);
  });

  it("isManagerRoles matches private.is_manager", () => {
    expect(isManagerRoles(["admin"])).toBe(true);
    expect(isManagerRoles(["manager"])).toBe(true);
    expect(isManagerRoles(["editor"])).toBe(false);
    expect(isManagerRoles(["user"])).toBe(false);
  });
});

describe("permittedTabs", () => {
  it("an admin sees every tab", () => {
    expect(permittedTabs(deriveAccess(user, ["admin"], null)).sort()).toEqual(
      ["categories", "enquiries", "homepage", "media", "products", "settings"].sort(),
    );
  });

  it("a manager sees every tab", () => {
    expect(permittedTabs(deriveAccess(user, ["manager"], null))).toContain("settings");
    expect(permittedTabs(deriveAccess(user, ["manager"], null))).toContain("enquiries");
  });

  it("an editor sees the content tabs but not enquiries or settings", () => {
    const tabs = permittedTabs(deriveAccess(user, ["editor"], null));
    expect(tabs.sort()).toEqual(["categories", "homepage", "media", "products"].sort());
    expect(tabs).not.toContain("enquiries");
    expect(tabs).not.toContain("settings");
  });

  it("a denied or errored access has no tabs", () => {
    expect(permittedTabs(deriveAccess(user, ["user"], null))).toEqual([]);
    expect(permittedTabs(deriveAccess(user, [], { message: "x" }))).toEqual([]);
    expect(permittedTabs({ status: "anonymous" })).toEqual([]);
  });
});

describe("nextFor reuses the login route's validation contract (3.20)", () => {
  it("keeps an internal path", () => {
    expect(nextFor({ href: "/admin/dashboard" })).toEqual({ next: "/admin/dashboard" });
  });

  it("rejects a protocol-relative value", () => {
    expect(nextFor({ href: "//evil.test/admin" })).toEqual({});
  });

  it("rejects an absolute external URL", () => {
    expect(nextFor({ href: "https://evil.test/admin" })).toEqual({});
  });

  it("rejects a non-path value and a missing href", () => {
    expect(nextFor({ href: "admin/dashboard" })).toEqual({});
    expect(nextFor({})).toEqual({});
  });
});
