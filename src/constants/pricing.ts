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
