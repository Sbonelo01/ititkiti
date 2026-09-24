import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  getScannerRoleForClient,
  hasOrganizerProductRole,
  hasPlatformScannerAccess,
} from "@/server/auth/scannerAuth";

function mockUser(partial: Partial<User>): User {
  return {
    id: "user-1",
    aud: "authenticated",
    created_at: "",
    app_metadata: {},
    user_metadata: {},
    ...partial,
  } as User;
}

describe("scannerAuth role helpers", () => {
  it("grants platform access from app_metadata admin", () => {
    const user = mockUser({
      app_metadata: { role: "admin" },
      user_metadata: { role: "attendee" },
    });
    expect(hasPlatformScannerAccess(user)).toBe(true);
    expect(getScannerRoleForClient(user)).toBe("admin");
  });

  it("grants platform access from app_metadata staff", () => {
    const user = mockUser({
      app_metadata: { role: "staff" },
      user_metadata: { role: "organizer" },
    });
    expect(hasPlatformScannerAccess(user)).toBe(true);
    expect(getScannerRoleForClient(user)).toBe("staff");
  });

  it("does not treat user_metadata admin as platform access", () => {
    const user = mockUser({
      app_metadata: {},
      user_metadata: { role: "admin" },
    });
    expect(hasPlatformScannerAccess(user)).toBe(false);
    expect(getScannerRoleForClient(user)).toBe("attendee");
  });

  it("detects organizer from user_metadata only", () => {
    const user = mockUser({
      app_metadata: {},
      user_metadata: { role: "organizer" },
    });
    expect(hasOrganizerProductRole(user)).toBe(true);
    expect(getScannerRoleForClient(user)).toBe("organizer");
  });
});
