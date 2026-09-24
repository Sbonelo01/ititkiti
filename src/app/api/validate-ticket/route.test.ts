import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { validateAndMarkTicketUsedForScanner } from "@/server/tickets/validateTicket";
import { requireSession } from "@/server/auth/sessionAuth";
import { linkPendingScannerMemberships } from "@/server/auth/scannerAuth";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: () => undefined,
  }),
}));

vi.mock("@/server/tickets/validateTicket", () => ({
  validateAndMarkTicketUsedForScanner: vi.fn(),
}));

vi.mock("@/server/auth/sessionAuth", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/server/auth/scannerAuth", () => ({
  linkPendingScannerMemberships: vi.fn(),
}));

vi.mock("@/server/auth/staffAuth", () => ({
  extractBearerToken: (header: string | null) =>
    header?.startsWith("Bearer ") ? header.slice(7) : null,
}));

const mockUser = {
  id: "u1",
  email: "staff@example.com",
  user_metadata: { role: "staff" },
};

describe("POST /api/validate-ticket", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(validateAndMarkTicketUsedForScanner).mockReset();
    vi.mocked(requireSession).mockReset();
    vi.mocked(linkPendingScannerMemberships).mockReset();
    vi.mocked(linkPendingScannerMemberships).mockResolvedValue(undefined);
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

  it("returns 401 without session", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const res = await POST(post({ qr_code_data: "qr-1" }));
    expect(res.status).toBe(401);
  });

  it("returns valid ticket on success", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      ok: true,
      user: mockUser as never,
    });
    vi.mocked(validateAndMarkTicketUsedForScanner).mockResolvedValue({
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
    expect(validateAndMarkTicketUsedForScanner).toHaveBeenCalledWith("qr-1", mockUser);
  });

  it("returns 403 when not authorized for event", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      ok: true,
      user: mockUser as never,
    });
    vi.mocked(validateAndMarkTicketUsedForScanner).mockResolvedValue({
      success: false,
      status: "unauthorized",
      error: "Not authorized to scan tickets for this event",
    });
    const res = await POST(post({ qr_code_data: "qr-1" }, "token"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.status).toBe("unauthorized");
  });

  it("returns already_used with ticket payload", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      ok: true,
      user: mockUser as never,
    });
    vi.mocked(validateAndMarkTicketUsedForScanner).mockResolvedValue({
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
