import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import { submitOrganizerInvoice } from "@/server/invoices/generateOrganizerInvoice";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "invoices-submit",
    windowMs: 60_000,
    maxRequests: 20,
  });
  if (rateLimited) return rateLimited;

  const auth = await requireOrganizerAuth(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const result = await submitOrganizerInvoice(auth.user, id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, invoice: result.invoice });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
