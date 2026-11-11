import { describe, it, expect } from "vitest";
import { SUPER_ADMIN_EMAIL, isSuperAdminEmail, isSuperAdminUser } from "./superAdmin";

describe("isSuperAdminEmail", () => {
  it("matches the allowlisted email case-insensitively", () => {
    expect(SUPER_ADMIN_EMAIL).toBe("sbonelomkhize15@gmail.com");
    expect(isSuperAdminEmail("sbonelomkhize15@gmail.com")).toBe(true);
    expect(isSuperAdminEmail("  SBONELOMKHIZE15@GMAIL.COM  ")).toBe(true);
  });

  it("rejects every other value", () => {
    expect(isSuperAdminEmail("admin@example.com")).toBe(false);
    expect(isSuperAdminEmail("sbonelomkhize15@gmail.com.evil.com")).toBe(false);
    expect(isSuperAdminEmail("")).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
  });

  it("requires the intended email and app_metadata admin together", () => {
    expect(
      isSuperAdminUser({
        email: SUPER_ADMIN_EMAIL,
        app_metadata: { role: "admin" },
        user_metadata: { role: "attendee" },
      })
    ).toBe(true);
    expect(
      isSuperAdminUser({
        email: SUPER_ADMIN_EMAIL,
        app_metadata: {},
        user_metadata: { role: "admin" },
      })
    ).toBe(false);
    expect(
      isSuperAdminUser({
        email: "other@example.com",
        app_metadata: { role: "admin" },
      })
    ).toBe(false);
  });
});
