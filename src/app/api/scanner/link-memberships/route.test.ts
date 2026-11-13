import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { requireSession } from "@/server/auth/sessionAuth";
import { linkPendingScannerMemberships } from "@/server/auth/scannerAuth";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/auth/sessionAuth", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/server/auth/scannerAuth", () => ({
  linkPendingScannerMemberships: vi.fn(),
}));

describe("POST /api/scanner/link-memberships", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(requireSession).mockReset();
    vi.mocked(linkPendingScannerMemberships).mockReset();
    vi.mocked(linkPendingScannerMemberships).mockResolvedValue(undefined);
  });

  it("rejects a missing session", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const res = await POST(
      new NextRequest("http://localhost/api/scanner/link-memberships", { method: "POST" })
    );
    expect(res.status).toBe(401);
    expect(linkPendingScannerMemberships).not.toHaveBeenCalled();
  });

  it("links the signed-in user without revealing invites", async () => {
    const user = { id: "volunteer", email: "door@example.com" };
    vi.mocked(requireSession).mockResolvedValue({ ok: true, user: user as never });
    const res = await POST(
      new NextRequest("http://localhost/api/scanner/link-memberships", {
        method: "POST",
        headers: { authorization: "Bearer token" },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(linkPendingScannerMemberships).toHaveBeenCalledWith(user);
  });
});
