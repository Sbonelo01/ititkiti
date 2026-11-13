import { NextRequest, NextResponse } from "next/server";
import { linkPendingScannerMemberships } from "@/server/auth/scannerAuth";
import { requireSession } from "@/server/auth/sessionAuth";
import { applyRateLimit } from "@/utils/rateLimit";

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, {
    keyPrefix: "scanner-link-memberships",
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (rateLimited) return rateLimited;

  const session = await requireSession(req.headers.get("authorization"));
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  await linkPendingScannerMemberships(session.user);
  return NextResponse.json({ ok: true });
}
