import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import {
  canScanEvent,
  getScannerRoleForClient,
  linkPendingScannerMemberships,
  listScannerEventsForUser,
  requireScannerAppAccess,
} from "@/server/auth/scannerAuth";
import { isScannerEventId } from "@/lib/scanner/scanRedirect";
import { requireSession } from "@/server/auth/sessionAuth";

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, {
    keyPrefix: "scanner-access",
    windowMs: 60_000,
    maxRequests: 60,
  });
  if (rateLimited) return rateLimited;

  const session = await requireSession(req.headers.get("authorization"));
  if (!session.ok) {
    return NextResponse.json(
      { allowed: false, error: session.error },
      { status: session.status }
    );
  }

  await linkPendingScannerMemberships(session.user);

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (eventId !== null) {
    if (!isScannerEventId(eventId)) {
      return NextResponse.json({ allowed: false, error: "Invalid event" }, { status: 400 });
    }
    const allowed = await canScanEvent(session.user, eventId);
    if (!allowed) {
      return NextResponse.json({
        allowed: false,
        error: "Your account is not authorized to scan this event.",
      });
    }
  } else {
    const allowed = await requireScannerAppAccess(session.user);
    if (!allowed) {
      return NextResponse.json({
        allowed: false,
        error: "Your account is not authorized to use the ticket scanner.",
      });
    }
  }

  const events = await listScannerEventsForUser(session.user);

  return NextResponse.json({
    allowed: true,
    role: getScannerRoleForClient(session.user),
    events,
  });
}
