import { NextRequest, NextResponse } from "next/server";
import {
  linkPendingScannerMemberships,
  listScannerEventsForUser,
  requireScannerAppAccess,
} from "@/server/auth/scannerAuth";
import { requireSession } from "@/server/auth/sessionAuth";

export async function GET(req: NextRequest) {
  const session = await requireSession(req.headers.get("authorization"));
  if (!session.ok) {
    return NextResponse.json(
      { allowed: false, error: session.error },
      { status: session.status }
    );
  }

  await linkPendingScannerMemberships(session.user.id, session.user.email);

  const allowed = await requireScannerAppAccess(session.user);
  if (!allowed) {
    return NextResponse.json({
      allowed: false,
      error: "Your account is not authorized to use the ticket scanner.",
    });
  }

  const role = session.user.user_metadata?.role as string | undefined;
  const events = await listScannerEventsForUser(session.user);

  return NextResponse.json({
    allowed: true,
    role: role ?? null,
    events,
  });
}
