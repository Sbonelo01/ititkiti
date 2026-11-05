import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { canAccessInvoice, requireSession } from "@/server/auth/sessionAuth";
import { getInvoiceById } from "@/server/invoices/generateOrganizerInvoice";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/auth/sessionAuth", () => ({
  requireSession: vi.fn(),
  canAccessInvoice: vi.fn(),
}));

vi.mock("@/server/invoices/generateOrganizerInvoice", () => ({
  getInvoiceById: vi.fn(),
}));

describe("GET /api/invoices/[id]", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(requireSession).mockReset();
    vi.mocked(canAccessInvoice).mockReset();
    vi.mocked(getInvoiceById).mockReset();
  });

  function getReq() {
    return new NextRequest("http://localhost/api/invoices/inv-1", {
      headers: { authorization: "Bearer token" },
    });
  }

  it("does not look up the invoice before authentication", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const res = await GET(getReq(), { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(401);
    expect(getInvoiceById).not.toHaveBeenCalled();
  });

  it("loads the invoice only after the session is valid", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      ok: true,
      user: { id: "org-1" },
    } as never);
    vi.mocked(getInvoiceById).mockResolvedValue({
      id: "inv-1",
      organizer_id: "org-1",
    } as never);
    vi.mocked(canAccessInvoice).mockResolvedValue({
      ok: true,
      user: { id: "org-1" },
      isStaff: false,
    } as never);
    const res = await GET(getReq(), { params: Promise.resolve({ id: "inv-1" }) });
    expect(res.status).toBe(200);
    expect(getInvoiceById).toHaveBeenCalledWith("inv-1");
  });
});
