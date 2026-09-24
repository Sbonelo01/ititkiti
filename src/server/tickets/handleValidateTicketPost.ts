import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { extractBearerToken } from "@/server/auth/staffAuth";
import { requireSession } from "@/server/auth/sessionAuth";
import { linkPendingScannerMemberships } from "@/server/auth/scannerAuth";
import { validateAndMarkTicketUsedForScanner } from "@/server/tickets/validateTicket";

export async function handleValidateTicketPost(req: NextRequest): Promise<NextResponse> {
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

  await linkPendingScannerMemberships(session.user.id, session.user.email);

  try {
    const { qr_code_data } = await req.json();
    const result = await validateAndMarkTicketUsedForScanner(qr_code_data, session.user);

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
