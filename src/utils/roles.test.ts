import { describe, it, expect } from "vitest";
import {
  getPrivilegedRole,
  getProductRole,
  isStaffOrAdmin,
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
