import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import { requireSuperAdminAuth } from "@/server/auth/superAdminAuth";
import {
  findAuthUsersByEmail,
  updateAuthUserRole,
} from "@/server/auth/userRoleAdmin";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/auth/superAdminAuth", () => ({
  requireSuperAdminAuth: vi.fn(),
}));

vi.mock("@/server/auth/userRoleAdmin", async () => {
  const actual = await vi.importActual<typeof import("@/server/auth/userRoleAdmin")>(
    "@/server/auth/userRoleAdmin"
  );
  return {
    ...actual,
    findAuthUsersByEmail: vi.fn(),
    updateAuthUserRole: vi.fn(),
  };
});

const SUPER_ADMIN = {
  ok: true as const,
  userId: "founder-1",
  email: "sbonelomkhize15@gmail.com",
};

function staffUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "staff@test.com",
    app_metadata: { role: "staff" },
    user_metadata: { role: "attendee" },
    ...overrides,
  };
}

describe("/api/admin/users", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(requireSuperAdminAuth).mockReset();
    vi.mocked(findAuthUsersByEmail).mockReset();
    vi.mocked(updateAuthUserRole).mockReset();
    vi.mocked(requireSuperAdminAuth).mockResolvedValue(SUPER_ADMIN);
  });

  function getReq(email?: string, token = "token") {
    const url = new URL("http://localhost/api/admin/users");
    if (email) url.searchParams.set("email", email);
    const headers: Record<string, string> = {};
    if (token) headers.authorization = `Bearer ${token}`;
    return new NextRequest(url, { headers });
  }

  function patchReq(body: unknown, token = "token") {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    return new NextRequest("http://localhost/api/admin/users", {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when the session is missing", async () => {
    vi.mocked(requireSuperAdminAuth).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const res = await PATCH(patchReq({ email: "a@b.com", role: "staff" }, ""));
    expect(res.status).toBe(401);
    expect(updateAuthUserRole).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated non-super-admins", async () => {
    vi.mocked(requireSuperAdminAuth).mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    const res = await PATCH(patchReq({ email: "a@b.com", role: "admin" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(updateAuthUserRole).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid PATCH bodies", async () => {
    const res = await PATCH(patchReq({ email: "not-an-email", role: "superuser" }));
    expect(res.status).toBe(400);
    expect(updateAuthUserRole).not.toHaveBeenCalled();
  });

  it("searches users by email for the super admin", async () => {
    vi.mocked(findAuthUsersByEmail).mockResolvedValue([staffUser()] as never);
    const res = await GET(getReq("staff@test.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toEqual([
      { id: "u1", email: "staff@test.com", role: "staff" },
    ]);
  });

  it("returns 404 when adding staff for an email that has not signed up", async () => {
    vi.mocked(findAuthUsersByEmail).mockResolvedValue([]);
    const res = await PATCH(patchReq({ email: "missing@test.com", role: "staff" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/sign up first/i);
    expect(updateAuthUserRole).not.toHaveBeenCalled();
  });

  it("updates the role via the admin helper", async () => {
    vi.mocked(findAuthUsersByEmail).mockResolvedValue([staffUser()] as never);
    vi.mocked(updateAuthUserRole).mockResolvedValue({
      ok: true,
      user: staffUser({
        app_metadata: { role: "admin" },
        user_metadata: { role: "attendee" },
      }),
    } as never);
    const res = await PATCH(patchReq({ email: "staff@test.com", role: "admin" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.role).toBe("admin");
    expect(updateAuthUserRole).toHaveBeenCalledWith("u1", "admin");
  });
});
