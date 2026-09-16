import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireSuperAdminAuth } from "./superAdminAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function mockGetUser(
  user: Record<string, unknown> | null,
  error: { message: string } | null = null
) {
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error });
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    auth: { getUser },
  } as never);
  return getUser;
}

describe("requireSuperAdminAuth", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("rejects a missing access token without hitting supabase", async () => {
    await expect(requireSuperAdminAuth(null)).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("returns 401 when the session is invalid", async () => {
    mockGetUser(null, { message: "invalid" });
    await expect(requireSuperAdminAuth("token")).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  });

  it("returns 403 for staff/admin sessions that are not the allowlisted email", async () => {
    mockGetUser({
      id: "admin-1",
      email: "other-admin@example.com",
      app_metadata: { role: "admin" },
    });
    await expect(requireSuperAdminAuth("token")).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("accepts the allowlisted email regardless of role metadata", async () => {
    mockGetUser({
      id: "founder-1",
      email: "SboneloMkhize15@Gmail.com",
      app_metadata: {},
      user_metadata: { role: "attendee" },
    });
    await expect(requireSuperAdminAuth("token")).resolves.toEqual({
      ok: true,
      userId: "founder-1",
      email: "SboneloMkhize15@Gmail.com",
    });
  });
});
