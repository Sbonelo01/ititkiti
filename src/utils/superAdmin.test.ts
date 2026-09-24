import { describe, it, expect } from "vitest";
import { SUPER_ADMIN_EMAIL, isSuperAdminEmail } from "./superAdmin";

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
});
