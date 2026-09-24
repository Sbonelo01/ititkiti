/** Mid-tier flat fee (R50–R200 inclusive). Prefer computeBuyerServiceFeeZar for charges. */
export const SERVICE_FEE_PER_TICKET = 10;

const FEE_LOW_ZAR = 5;
const FEE_MID_ZAR = 10;
const FEE_LOW_MAX_EXCLUSIVE = 50;
const FEE_MID_MAX_INCLUSIVE = 200;
const FEE_HIGH_RATE = 0.05;

/** Round ZAR to cents. */
export function roundZar(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function zarToKobo(amountZar: number): number {
  return Math.round(amountZar * 100);
}

/**
 * Buyer-paid platform fee for one ticket at face value `priceZar`.
 * Organizers receive 100% of ticket face value — never deduct this from payouts.
 *
 * Tiers: under R50 → R5, R50–R200 → R10, over R200 → 5%.
 */
export function computeBuyerServiceFeeZar(priceZar: number): number {
  const price = Number(priceZar);
  if (!Number.isFinite(price) || price < 0) {
    return 0;
  }
  if (price < FEE_LOW_MAX_EXCLUSIVE) {
    return FEE_LOW_ZAR;
  }
  if (price <= FEE_MID_MAX_INCLUSIVE) {
    return FEE_MID_ZAR;
  }
  return roundZar(price * FEE_HIGH_RATE);
}

export function computeBuyerServiceFeeTotalZar(unitPricesZar: number[]): number {
  return roundZar(unitPricesZar.reduce((sum, price) => sum + computeBuyerServiceFeeZar(price), 0));
}

export const PRICING_POLICY = {
  model: "buyer_paid_fee",
  organizerKeepsFaceValue: true,
  listingFee: 0,
  payoutTransferFeeZar: 3,
  paystackLocalRate: 0.029,
  paystackLocalFlatZar: 1,
  paystackVatRate: 0.15,
} as const;

export type PricingTier = {
  id: string;
  label: string;
  summary: string;
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "entry",
    label: "Under R50",
    summary: "R5 platform fee per ticket (paid by the buyer)",
  },
  {
    id: "standard",
    label: "R50 – R200",
    summary: "R10 platform fee per ticket (paid by the buyer)",
  },
  {
    id: "premium",
    label: "Above R200",
    summary: "5% platform fee per ticket (paid by the buyer)",
  },
];

export const roundMoney = roundZar;

/** Alias used by dashboard economics and checkout helpers. */
export const computeServiceFeePerTicket = computeBuyerServiceFeeZar;

export type TicketLine = { unitPrice: number; quantity: number };

export function computeServiceFeeTotal(lines: TicketLine[]): number {
  return roundZar(
    lines.reduce(
      (sum, line) => sum + computeServiceFeePerTicket(line.unitPrice) * line.quantity,
      0
    )
  );
}

export function estimatePaystackProcessingFee(checkoutTotalZar: number): number {
  const total = Math.max(0, Number(checkoutTotalZar) || 0);
  if (total <= 0) return 0;
  const feeExVat =
    total * PRICING_POLICY.paystackLocalRate + PRICING_POLICY.paystackLocalFlatZar;
  return roundZar(feeExVat * (1 + PRICING_POLICY.paystackVatRate));
}

export function estimateTikitiNetFromCheckout(
  ticketSubtotalZar: number,
  platformFeeTotalZar: number,
  checkoutTotalZar?: number
): number {
  const checkout = checkoutTotalZar ?? ticketSubtotalZar + platformFeeTotalZar;
  return roundZar(platformFeeTotalZar - estimatePaystackProcessingFee(checkout));
}

export const ORGANIZER_PAYOUT_COPY =
  "You receive 100% of ticket face value. Platform fees are paid by ticket buyers at checkout — nothing is deducted from your ticket price.";

export const BUYER_FEE_COPY =
  "A small platform fee is added at checkout to fund secure payments, QR tickets, and support. Organizers keep their full ticket price.";
