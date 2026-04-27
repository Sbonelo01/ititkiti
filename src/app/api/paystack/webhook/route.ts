import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { finalizePurchaseAtomic, TicketSelection } from "@/server/payments/finalizePurchase";

type PaystackChargeSuccessPayload = {
  event?: string;
  data?: {
    reference?: string;
    metadata?: {
      event_id?: string;
      ticket_selections?: unknown;
      quantity?: number;
      buyer_id?: string;
      buyer_name?: string;
      email?: string;
    };
    customer?: {
      email?: string;
      name?: string;
    };
  };
};

function extractEventIdFromReference(reference: string): string | null {
  const parts = reference.split("-");
  if (parts.length >= 2 && parts[0] === "EVT") {
    return parts[1];
  }
  return null;
}

function normalizeSelections(value: unknown): TicketSelection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const ticketTypeId = typeof item?.ticketTypeId === "string" ? item.ticketTypeId : null;
      const quantity = Number(item?.quantity);
      if (!ticketTypeId || !Number.isFinite(quantity) || quantity < 1) return null;
      return { ticketTypeId, quantity };
    })
    .filter((v): v is TicketSelection => Boolean(v));
}

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "paystack-webhook",
    windowMs: 60_000,
    maxRequests: 120,
  });
  if (rateLimited) return rateLimited;

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
  }

  const expectedSignature = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: PaystackChargeSuccessPayload;
  try {
    payload = JSON.parse(rawBody) as PaystackChargeSuccessPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (payload?.event !== "charge.success") {
    return NextResponse.json({ success: true, ignored: true });
  }

  const chargeData = payload?.data || {};
  const reference = chargeData?.reference;
  const metadata = chargeData?.metadata || {};
  const eventId = metadata?.event_id || extractEventIdFromReference(reference || "");
  const ticketSelections = normalizeSelections(metadata?.ticket_selections);
  const quantity = Number(metadata?.quantity || 0);
  const customerEmail = chargeData?.customer?.email || metadata?.email;

  if (!reference || !eventId || !customerEmail) {
    return NextResponse.json({ error: "Missing required payment metadata" }, { status: 400 });
  }

  const ticketUser = {
    email: customerEmail,
    name: metadata?.buyer_name || chargeData?.customer?.name || customerEmail.split("@")[0],
    userId: metadata?.buyer_id || undefined,
  };

  const finalized = await finalizePurchaseAtomic({
    reference,
    eventId,
    ticketSelections: ticketSelections.length > 0 ? ticketSelections : undefined,
    quantity: ticketSelections.length > 0 ? undefined : quantity || undefined,
    ticketUser,
  });

  if (!finalized.success) {
    return NextResponse.json({ error: finalized.error || "Failed to finalize purchase" }, { status: finalized.status || 500 });
  }

  return NextResponse.json({
    success: true,
    alreadyProcessed: finalized.alreadyProcessed || false,
    createdTickets: finalized.createdTickets || 0,
  });
}
