import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { declaredBodyTooLarge, readBoundedJson, REQUEST_LIMITS } from "@/server/http/boundedBody";
import { extractBearerToken } from "@/server/auth/staffAuth";
import { requireSession } from "@/server/auth/sessionAuth";
import { linkPendingScannerMemberships } from "@/server/auth/scannerAuth";
import { validateAndMarkTicketUsedForScanner } from "@/server/tickets/validateTicket";

export async function handleValidateTicketPost(req: NextRequest): Promise<NextResponse> {
  const oversized = declaredBodyTooLarge(req, REQUEST_LIMITS.ticketScanBytes);
  if (oversized) return oversized;

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

  const session = await requireSession(
    accessToken ? `Bearer ${accessToken}` : authHeader
  );

  if (!session.ok) {
    return NextResponse.json(
      { success: false, error: session.error, status: "unauthorized" },
      { status: session.status }
    );
  }

  await linkPendingScannerMemberships(session.user);

  try {
    const bounded = await readBoundedJson(req, REQUEST_LIMITS.ticketScanBytes);
    if (!bounded.ok) return bounded.response;
    const { qr_code_data } = bounded.value as { qr_code_data?: string };
    const result = await validateAndMarkTicketUsedForScanner(qr_code_data ?? "", session.user);

    if (result.status === "unauthorized") {
      return NextResponse.json(
        { success: false, error: result.error, status: result.status },
        { status: 403 }
      );
    }

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
