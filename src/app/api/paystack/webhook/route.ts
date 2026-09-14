import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { finalizePurchaseAtomic } from "@/server/payments/finalizePurchase";
import { computeExpectedAmountKobo } from "@/server/payments/computeExpectedAmountKobo";
import {
  assertPaystackAmountMatches,
  resolvePurchaseFromWebhookCharge,
  type PaystackChargeData,
} from "@/server/payments/verifyPaystackCharge";

type PaystackChargeSuccessPayload = {
  event?: string;
  data?: PaystackChargeData;
};

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
  const provided = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
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

  const chargeData = payload?.data;
  const resolved = chargeData ? resolvePurchaseFromWebhookCharge(chargeData) : null;

  if (!resolved?.reference || !resolved.eventId || !resolved.ticketUser?.email) {
    return NextResponse.json({ error: "Missing required payment metadata" }, { status: 400 });
  }

  const expected = await computeExpectedAmountKobo(
    resolved.eventId,
    resolved.ticketSelections,
    resolved.quantity
  );

  if ("error" in expected) {
    return NextResponse.json({ error: expected.error }, { status: expected.status });
  }

  const amountCheck = assertPaystackAmountMatches(chargeData ?? {}, expected);
  if (!amountCheck.ok) {
    return NextResponse.json({ error: amountCheck.error }, { status: 400 });
  }

  const finalized = await finalizePurchaseAtomic({
    reference: resolved.reference,
    eventId: resolved.eventId,
    ticketSelections: resolved.ticketSelections,
    quantity: resolved.quantity,
    ticketUser: resolved.ticketUser,
  });

  if (!finalized.success) {
    return NextResponse.json(
      { error: finalized.error || "Failed to finalize purchase" },
      { status: finalized.status || 500 }
    );
  }

  return NextResponse.json({
    success: true,
    alreadyProcessed: finalized.alreadyProcessed || false,
    createdTickets: finalized.createdTickets || 0,
  });
}
