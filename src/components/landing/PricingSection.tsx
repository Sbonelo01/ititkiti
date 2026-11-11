import Link from "next/link";
import {
  BUYER_FEE_COPY,
  ORGANIZER_PAYOUT_COPY,
  buildPricingExamples,
  formatZar,
  type PricingExample,
} from "@/constants/pricing";

type ExampleMode = "fee" | "total";

function exampleDetail(example: PricingExample, mode: ExampleMode): string {
  const receive = `You receive ${formatZar(example.organizerReceivesZar)}.`;
  if (mode === "fee") {
    return `Buyer pays ${formatZar(example.feeZar)} fee. ${receive}`;
  }
  return `Buyer pays ${formatZar(example.buyerPaysZar)} total. ${receive}`;
}

type PricingSectionProps = {
  id?: string;
  eyebrow: string;
  heading: string;
  lede?: string;
  exampleMode?: ExampleMode;
};

export default function PricingSection({
  id = "pricing",
  eyebrow,
  heading,
  lede = "Listing events is free. Card processing is included in the buyer fee — no extra payment surcharge at checkout.",
  exampleMode = "fee",
}: PricingSectionProps) {
  const examples = buildPricingExamples();

  return (
    <section id={id} className="border-y border-gray-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
          {eyebrow}
        </p>
        <h2 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
          {heading}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-gray-600">{lede}</p>
        <p className="mt-3 max-w-2xl text-base text-gray-600">{ORGANIZER_PAYOUT_COPY}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {examples.map((example) => (
            <article key={example.tierId} className="rounded-2xl border border-gray-200 bg-[#F7FBF8] p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{example.label}</p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-gray-950">
                {example.tierAmountLabel}
              </p>
              <p className="mt-2 text-sm text-gray-600">Platform fee per ticket, paid by the buyer.</p>
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {examples.map((example) => (
            <div key={`${example.tierId}-example`} className="rounded-2xl bg-green-50 p-4 text-sm text-gray-800">
              <strong className="block text-base text-gray-950">
                Example: {formatZar(example.faceZar)} ticket
              </strong>
              {exampleDetail(example, exampleMode)}
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-gray-500">
          {BUYER_FEE_COPY} These examples are calculated from the same fee function used at checkout.
          After the event starts, generate a settlement invoice from your dashboard. Payouts are
          batched per invoice. Paystack transfer fees apply to Tikiti, not deducted from your ticket
          price. See the <Link href="/faq" className="font-semibold text-green-800 underline">FAQ</Link>{" "}
          and <Link href="/terms" className="font-semibold text-green-800 underline">Terms</Link>.
        </p>
      </div>
    </section>
  );
}
