import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { validateAndMarkTicketUsed } from "@/server/tickets/validateTicket";
import { requireStaffAuth } from "@/server/auth/staffAuth";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: () => undefined,
  }),
}));

vi.mock("@/server/tickets/validateTicket", () => ({
  validateAndMarkTicketUsed: vi.fn(),
}));

vi.mock("@/server/auth/staffAuth", () => ({
  requireStaffAuth: vi.fn(),
  extractBearerToken: (header: string | null) =>
    header?.startsWith("Bearer ") ? header.slice(7) : null,
}));

describe("POST /api/validate-ticket", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(validateAndMarkTicketUsed).mockReset();
    vi.mocked(requireStaffAuth).mockReset();
  });

  function post(body: unknown, token?: string) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    return new NextRequest("http://localhost/api/validate-ticket", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  it("returns 401 without staff auth", async () => {
    vi.mocked(requireStaffAuth).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const res = await POST(post({ qr_code_data: "qr-1" }));
    expect(res.status).toBe(401);
  });

  it("returns valid ticket on success", async () => {
    vi.mocked(requireStaffAuth).mockResolvedValue({
      ok: true,
      userId: "u1",
      role: "staff",
    });
    vi.mocked(validateAndMarkTicketUsed).mockResolvedValue({
      success: true,
      status: "valid",
      ticket: {
        id: "t1",
        attendee_name: "Ann",
        email: "a@b.com",
        used: true,
        event_id: "e1",
        created_at: "2024-01-01",
      },
    });
    const res = await POST(post({ qr_code_data: "qr-1" }, "token"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.ticket.attendee_name).toBe("Ann");
  });

  it("returns already_used with ticket payload", async () => {
    vi.mocked(requireStaffAuth).mockResolvedValue({
      ok: true,
      userId: "u1",
      role: "admin",
    });
    vi.mocked(validateAndMarkTicketUsed).mockResolvedValue({
      success: false,
      status: "already_used",
      error: "Ticket has already been used",
      ticket: {
        id: "t1",
        attendee_name: "Bob",
        email: "b@b.com",
        used: true,
        event_id: "e1",
        created_at: "2024-01-01",
      },
    });
    const res = await POST(post({ qr_code_data: "qr-2" }, "token"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("already_used");
  });
});
