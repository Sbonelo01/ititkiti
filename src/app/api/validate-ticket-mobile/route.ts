import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { extractBearerToken, requireStaffAuth } from "@/server/auth/staffAuth";
import { validateAndMarkTicketUsed } from "@/server/tickets/validateTicket";

/**
 * Mobile-compatible alias for /api/validate-ticket.
 * Requires staff/admin Bearer token (same as web scanner).
 */
export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "validate-ticket-mobile",
    windowMs: 60_000,
    maxRequests: 120,
  });
  if (rateLimited) return rateLimited;

  const authHeader = req.headers.get("authorization");
  const accessToken = extractBearerToken(authHeader);
  const auth = await requireStaffAuth(accessToken);

  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error, status: "unauthorized" },
      { status: auth.status }
    );
  }

  try {
    const { qr_code_data } = await req.json();
    const result = await validateAndMarkTicketUsed(qr_code_data);

    if (result.status === "not_found") {
      return NextResponse.json(
        { success: false, error: result.error, status: result.status },
        { status: 404 }
      );
    }

    if (result.status === "already_used") {
      return NextResponse.json({
        success: false,
        error: result.error,
        status: result.status,
        ticket: result.ticket,
      });
    }

    if (result.status === "error") {
      return NextResponse.json(
        { success: false, error: result.error, status: result.status },
        { status: result.error === "Missing QR code data" ? 400 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      ticket: result.ticket,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error", status: "error" },
      { status: 500 }
    );
  }
}
