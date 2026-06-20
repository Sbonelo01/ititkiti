import type { TicketSelection, TicketUserPayload } from "@/server/payments/finalizePurchase";
import {
  computeExpectedAmountKobo,
  extractEventIdFromReference,
  normalizePaystackTicketSelections,
} from "@/utils/paystackChargeMetadata";

export type PaystackChargeData = {
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
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

export type ResolvedPurchase = {
  reference: string;
  eventId: string;
  ticketSelections?: TicketSelection[];
  quantity?: number;
  ticketUser: TicketUserPayload;
};

export type VerifyPaystackResult =
  | { ok: true; charge: PaystackChargeData; purchase: ResolvedPurchase }
  | { ok: false; error: string; status: number };

export async function verifyPaystackReference(reference: string): Promise<
  | { ok: true; charge: PaystackChargeData }
  | { ok: false; error: string; status: number }
> {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET_KEY) {
    return { ok: false, error: "Server misconfiguration", status: 500 };
  }

  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const verifyData = await verifyRes.json();
  if (!verifyData.status || verifyData.data?.status !== "success") {
    return { ok: false, error: "Payment verification failed", status: 400 };
  }

  const charge = verifyData.data as PaystackChargeData;
  if (charge.reference && charge.reference !== reference) {
    return { ok: false, error: "Payment reference mismatch", status: 400 };
  }

  return { ok: true, charge };
}

export async function resolveAndVerifyPurchase(
  reference: string,
  clientEventId?: string,
  clientTicketSelections?: TicketSelection[],
  clientQuantity?: number,
  clientTicketUser?: TicketUserPayload
): Promise<VerifyPaystackResult> {
  const verified = await verifyPaystackReference(reference);
  if (!verified.ok) return verified;

  const charge = verified.charge;
  const metadata = charge.metadata || {};
  const eventId =
    metadata.event_id ||
    extractEventIdFromReference(reference) ||
    clientEventId ||
    "";

  if (!eventId) {
    return { ok: false, error: "Missing event id in payment metadata", status: 400 };
  }

  if (clientEventId && clientEventId !== eventId) {
    return { ok: false, error: "Event id does not match payment metadata", status: 400 };
  }

  const metadataSelections = normalizePaystackTicketSelections(metadata.ticket_selections);
  const metadataQuantity = Number(metadata.quantity || 0) || undefined;

  let ticketSelections = metadataSelections.length > 0 ? metadataSelections : clientTicketSelections;
  let quantity = metadataSelections.length > 0 ? undefined : metadataQuantity ?? clientQuantity;

  if (Array.isArray(clientTicketSelections) && clientTicketSelections.length > 0) {
    const onlyDefault = clientTicketSelections.every((s) => s.ticketTypeId === "default");
    if (onlyDefault) {
      const sum = clientTicketSelections.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
      ticketSelections = undefined;
      quantity = sum;
    } else if (metadataSelections.length === 0 && !metadataQuantity) {
      ticketSelections = clientTicketSelections;
      quantity = undefined;
    }
  }

  const customerEmail = charge.customer?.email || metadata.email || clientTicketUser?.email;
  if (!customerEmail) {
    return { ok: false, error: "Missing purchaser email", status: 400 };
  }

  const expected = await computeExpectedAmountKobo(eventId, ticketSelections, quantity);
  if ("error" in expected) {
    return { ok: false, error: expected.error, status: expected.status };
  }

  const paidAmount = Number(charge.amount);
  const paidCurrency = (charge.currency || "ZAR").toUpperCase();

  if (paidCurrency !== expected.currency) {
    return { ok: false, error: "Payment currency mismatch", status: 400 };
  }

  if (!Number.isFinite(paidAmount) || paidAmount < expected.amountKobo) {
    return { ok: false, error: "Payment amount does not match ticket total", status: 400 };
  }

  const ticketUser: TicketUserPayload = {
    email: customerEmail,
    name:
      metadata.buyer_name ||
      charge.customer?.name ||
      clientTicketUser?.name ||
      customerEmail.split("@")[0],
    userId: metadata.buyer_id || clientTicketUser?.userId,
  };

  return {
    ok: true,
    charge,
    purchase: {
      reference,
      eventId,
      ticketSelections,
      quantity,
      ticketUser,
    },
  };
}

export function resolvePurchaseFromWebhookCharge(charge: PaystackChargeData): Omit<ResolvedPurchase, "reference"> & { reference?: string } | null {
  const reference = charge.reference;
  const metadata = charge.metadata || {};
  const eventId = metadata.event_id || extractEventIdFromReference(reference || "");
  const customerEmail = charge.customer?.email || metadata.email;

  if (!reference || !eventId || !customerEmail) return null;

  const ticketSelections = normalizePaystackTicketSelections(metadata.ticket_selections);
  const quantity = Number(metadata.quantity || 0) || undefined;

  return {
    reference,
    eventId,
    ticketSelections: ticketSelections.length > 0 ? ticketSelections : undefined,
    quantity: ticketSelections.length > 0 ? undefined : quantity,
    ticketUser: {
      email: customerEmail,
      name: metadata.buyer_name || charge.customer?.name || customerEmail.split("@")[0],
      userId: metadata.buyer_id,
    },
  };
}
