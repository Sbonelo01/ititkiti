import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyRateLimit } from "@/utils/rateLimit";
import { requireStaffAuth, extractBearerToken } from "@/server/auth/staffAuth";
import {
  getInvoiceById,
  updateInvoiceStatus,
} from "@/server/invoices/generateOrganizerInvoice";
import { type InvoiceStatus } from "@/constants/billing";

const bodySchema = z.object({
  status: z.enum(["paid", "void"] satisfies [InvoiceStatus, InvoiceStatus]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "invoices-status",
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (rateLimited) return rateLimited;

  const staff = await requireStaffAuth(extractBearerToken(req.headers.get("authorization")));
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await getInvoiceById(id);
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existing.status !== "issued") {
      return NextResponse.json(
        { error: `Cannot change status from ${existing.status}` },
        { status: 409 }
      );
    }

    const result = await updateInvoiceStatus(id, parsed.data.status);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, invoice: result.invoice });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
