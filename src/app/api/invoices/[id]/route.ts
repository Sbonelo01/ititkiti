import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { canAccessInvoice } from "@/server/auth/sessionAuth";
import { getInvoiceById } from "@/server/invoices/generateOrganizerInvoice";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "invoices-get",
    windowMs: 60_000,
    maxRequests: 60,
  });
  if (rateLimited) return rateLimited;

  const { id } = await context.params;

  try {
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const access = await canAccessInvoice(req.headers.get("authorization"), invoice.organizer_id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json({ success: true, invoice });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
