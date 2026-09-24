import {
  computeServiceFeePerTicket,
  estimatePaystackProcessingFee,
  roundMoney,
} from "@/constants/pricing";

export type TicketSaleRow = {
  unitPrice: number;
  paystackReference: string | null;
};

export type TicketEconomicsSummary = {
  ticketsSold: number;
  ticketRevenue: number;
  platformFees: number;
  totalProcessed: number;
  organizerPayout: number;
  estimatedPaystackFees: number;
  estimatedTikitiNet: number;
};

export function summarizeTicketEconomics(rows: TicketSaleRow[]): TicketEconomicsSummary {
  let ticketRevenue = 0;
  let platformFees = 0;
  const checkoutTotals = new Map<string, number>();

  for (const row of rows) {
    const unitPrice = Math.max(0, Number(row.unitPrice) || 0);
    const fee = computeServiceFeePerTicket(unitPrice);
    ticketRevenue += unitPrice;
    platformFees += fee;

    const refKey = row.paystackReference?.trim() || `ticket-${ticketRevenue}-${platformFees}`;
    checkoutTotals.set(refKey, (checkoutTotals.get(refKey) ?? 0) + unitPrice + fee);
  }

  let estimatedPaystackFees = 0;
  for (const checkoutTotal of checkoutTotals.values()) {
    estimatedPaystackFees += estimatePaystackProcessingFee(checkoutTotal);
  }

  ticketRevenue = roundMoney(ticketRevenue);
  platformFees = roundMoney(platformFees);
  estimatedPaystackFees = roundMoney(estimatedPaystackFees);

  return {
    ticketsSold: rows.length,
    ticketRevenue,
    platformFees,
    totalProcessed: roundMoney(ticketRevenue + platformFees),
    organizerPayout: ticketRevenue,
    estimatedPaystackFees,
    estimatedTikitiNet: roundMoney(platformFees - estimatedPaystackFees),
  };
}
