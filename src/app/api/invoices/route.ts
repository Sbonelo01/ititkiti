import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { requireSession } from "@/server/auth/sessionAuth";
import { requireStaffAuth, extractBearerToken } from "@/server/auth/staffAuth";
import { listInvoicesForUser } from "@/server/invoices/generateOrganizerInvoice";
import { getProductRole } from "@/utils/roles";

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "invoices-list",
    windowMs: 60_000,
    maxRequests: 60,
  });
  if (rateLimited) return rateLimited;

  const auth = await requireSession(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const staff = await requireStaffAuth(extractBearerToken(req.headers.get("authorization")));
  const isStaff = staff.ok;

  if (!isStaff && getProductRole(auth.user) !== "organizer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const invoices = await listInvoicesForUser(auth.user, isStaff);
    return NextResponse.json({ success: true, invoices });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
