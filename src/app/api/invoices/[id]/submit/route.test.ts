import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import { submitOrganizerInvoice } from "@/server/invoices/generateOrganizerInvoice";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/auth/sessionAuth", () => ({
  requireOrganizerAuth: vi.fn(),
}));

vi.mock("@/server/invoices/generateOrganizerInvoice", () => ({
  submitOrganizerInvoice: vi.fn(),
}));

const INVOICE_ID = "660e8400-e29b-41d4-a716-446655440000";
const organizer = { id: "org-1", email: "org@test.com" };

describe("POST /api/invoices/[id]/submit", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(requireOrganizerAuth).mockReset();
    vi.mocked(submitOrganizerInvoice).mockReset();
    vi.mocked(requireOrganizerAuth).mockResolvedValue({
      ok: true,
      user: organizer,
    } as never);
  });

  function post() {
    return POST(
      new NextRequest(`http://localhost/api/invoices/${INVOICE_ID}/submit`, {
        method: "POST",
        headers: { authorization: "Bearer token" },
      }),
      { params: Promise.resolve({ id: INVOICE_ID }) }
    );
  }

  it("rejects attendees / missing auth", async () => {
    vi.mocked(requireOrganizerAuth).mockResolvedValue({
      ok: false,
      status: 403,
      error: "Organizer access required",
    });
    const res = await post();
    expect(res.status).toBe(403);
    expect(submitOrganizerInvoice).not.toHaveBeenCalled();
  });

  it("does not mark paid or void — only submitOrganizerInvoice is used", async () => {
    vi.mocked(submitOrganizerInvoice).mockResolvedValue({
      ok: true,
      invoice: { id: INVOICE_ID, status: "issued" },
    } as never);
    const res = await post();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoice.status).toBe("issued");
    expect(submitOrganizerInvoice).toHaveBeenCalledWith(organizer, INVOICE_ID);
  });

  it("returns 409 when the invoice is already submitted", async () => {
    vi.mocked(submitOrganizerInvoice).mockResolvedValue({
      ok: false,
      status: 409,
      error: "This invoice is already submitted for Tikiti settlement review.",
    });
    const res = await post();
    expect(res.status).toBe(409);
  });
});
