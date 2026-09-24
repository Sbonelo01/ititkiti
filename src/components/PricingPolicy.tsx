import { PRICING_TIERS, ORGANIZER_PAYOUT_COPY, BUYER_FEE_COPY } from "@/constants/pricing";

type PricingPolicyProps = {
  variant?: "buyer" | "organizer" | "full";
  className?: string;
};

export default function PricingPolicy({ variant = "full", className = "" }: PricingPolicyProps) {
  const showBuyer = variant === "buyer" || variant === "full";
  const showOrganizer = variant === "organizer" || variant === "full";

  return (
    <div className={`rounded-2xl border border-green-100 bg-green-50/60 p-4 sm:p-5 ${className}`}>
      <h3 className="text-sm font-bold text-gray-900 mb-2">How Tikiti pricing works</h3>
      {showOrganizer && (
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{ORGANIZER_PAYOUT_COPY}</p>
      )}
      {showBuyer && (
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{BUYER_FEE_COPY}</p>
      )}
      <ul className="space-y-2 text-sm text-gray-800">
        {PRICING_TIERS.map((tier) => (
          <li key={tier.id} className="flex gap-2">
            <span className="font-semibold shrink-0 min-w-[6.5rem]">{tier.label}</span>
            <span className="text-gray-600">{tier.summary}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-3 leading-relaxed">
        Listing events is free. Card processing is included in the buyer fee — no extra payment
        surcharge at checkout. Organizer payouts are batched per settlement invoice (Paystack transfer
        fees apply to Tikiti, not deducted from your ticket price).
      </p>
    </div>
  );
}
