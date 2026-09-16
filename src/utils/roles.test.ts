import { describe, it, expect } from "vitest";
import {
  assignableRoleOf,
  getPrivilegedRole,
  getProductRole,
  isStaffOrAdmin,
  roleUpdatePayload,
  sanitizeProductRole,
} from "./roles";

describe("getPrivilegedRole", () => {
  it("reads admin/staff from app_metadata only", () => {
    expect(getPrivilegedRole({ app_metadata: { role: "staff" } })).toBe("staff");
    expect(getPrivilegedRole({ app_metadata: { role: "admin" } })).toBe("admin");
  });

  it("ignores client-writable user_metadata.role", () => {
    expect(
      getPrivilegedRole({
        user_metadata: { role: "admin" },
        app_metadata: {},
      })
    ).toBeNull();
    expect(
      getPrivilegedRole({
        user_metadata: { role: "staff" },
        app_metadata: { role: "organizer" },
      })
    ).toBeNull();
  });

  it("does not treat organizer as privileged", () => {
    expect(getPrivilegedRole({ app_metadata: { role: "organizer" } })).toBeNull();
    expect(isStaffOrAdmin({ app_metadata: { role: "attendee" } })).toBe(false);
  });
});

describe("getProductRole", () => {
  it("keeps organizer as a non-privileged product role from user_metadata", () => {
    expect(getProductRole({ user_metadata: { role: "organizer" } })).toBe("organizer");
    expect(getProductRole({ user_metadata: { role: "attendee" } })).toBe("attendee");
  });

  it("does not treat user_metadata admin/staff as organizer", () => {
    expect(getProductRole({ user_metadata: { role: "admin" } })).toBe("attendee");
    expect(getProductRole({ user_metadata: { role: "staff" } })).toBe("attendee");
  });

  it("ignores app_metadata for product role", () => {
    expect(
      getProductRole({
        app_metadata: { role: "staff" },
        user_metadata: { role: "organizer" },
      })
    ).toBe("organizer");
  });
});

describe("sanitizeProductRole", () => {
  it("allows organizer and attendee only", () => {
    expect(sanitizeProductRole("organizer")).toBe("organizer");
    expect(sanitizeProductRole("attendee")).toBe("attendee");
  });

  it("drops privileged and unknown roles", () => {
    expect(sanitizeProductRole("admin")).toBe("attendee");
    expect(sanitizeProductRole("staff")).toBe("attendee");
    expect(sanitizeProductRole("superadmin")).toBe("attendee");
    expect(sanitizeProductRole(null)).toBe("attendee");
  });
});

describe("assignableRoleOf", () => {
  it("prefers privileged app_metadata over organizer", () => {
    expect(
      assignableRoleOf({
        app_metadata: { role: "staff" },
        user_metadata: { role: "organizer" },
      })
    ).toBe("staff");
    expect(assignableRoleOf({ app_metadata: { role: "admin" } })).toBe("admin");
  });

  it("maps organizer and attendee from user_metadata when not privileged", () => {
    expect(assignableRoleOf({ user_metadata: { role: "organizer" } })).toBe("organizer");
    expect(assignableRoleOf({ user_metadata: { role: "attendee" } })).toBe("clear");
  });
});

describe("roleUpdatePayload", () => {
  it("writes staff/admin to app_metadata and clears privileged user_metadata", () => {
    expect(roleUpdatePayload("staff")).toEqual({
      app_metadata: { role: "staff" },
      user_metadata: { role: "attendee" },
    });
    expect(roleUpdatePayload("admin")).toEqual({
      app_metadata: { role: "admin" },
      user_metadata: { role: "attendee" },
    });
  });

  it("clears app_metadata.role for organizer and attendee", () => {
    expect(roleUpdatePayload("organizer")).toEqual({
      app_metadata: { role: null },
      user_metadata: { role: "organizer" },
    });
    expect(roleUpdatePayload("clear")).toEqual({
      app_metadata: { role: null },
      user_metadata: { role: "attendee" },
    });
  });
});
