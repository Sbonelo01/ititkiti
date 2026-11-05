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

  it("returns 403 for an app_metadata admin who is not the intended account", async () => {
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

  it("rejects the intended email when app_metadata is not admin", async () => {
    mockGetUser({
      id: "founder-1",
      email: "SboneloMkhize15@Gmail.com",
      app_metadata: {},
      user_metadata: { role: "admin" },
    });
    await expect(requireSuperAdminAuth("token")).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("accepts the intended account only with server-written admin metadata", async () => {
    mockGetUser({
      id: "founder-1",
      email: "SboneloMkhize15@Gmail.com",
      app_metadata: { role: "admin" },
      user_metadata: { role: "attendee" },
    });
    await expect(requireSuperAdminAuth("token")).resolves.toEqual({
      ok: true,
      userId: "founder-1",
      email: "SboneloMkhize15@Gmail.com",
    });
  });
});
