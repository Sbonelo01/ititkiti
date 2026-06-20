import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { applyRateLimit } from "@/utils/rateLimit";
import { extractBearerToken, requireStaffAuth } from "@/server/auth/staffAuth";
import { validateAndMarkTicketUsed } from "@/server/tickets/validateTicket";

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "validate-ticket",
    windowMs: 60_000,
    maxRequests: 90,
  });
  if (rateLimited) return rateLimited;

  const authHeader = req.headers.get("authorization");
  const bearerToken = extractBearerToken(authHeader);
  let accessToken = bearerToken;

  if (!accessToken) {
    const cookieStore = await cookies();
    accessToken =
      cookieStore.get("sb-access-token")?.value ||
      cookieStore.get("sb-access-token.0")?.value ||
      null;
  }

  const auth = await requireStaffAuth(accessToken);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error, status: "unauthorized" }, { status: auth.status });
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
