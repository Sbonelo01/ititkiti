import ScannerAppLink from "@/components/ScannerAppLink";
import JsonLd from "@/components/seo/JsonLd";
import PricingPolicy from "@/components/PricingPolicy";
import { ORGANIZER_APP, BRAND, SCANNER_APP_URL } from "@/constants/branding";
import { INVOICE_FAQ_ITEMS } from "@/constants/organizerCopy";
import { ORGANIZER_PAYOUT_COPY } from "@/constants/pricing";
import { buildFaqPageJsonLd } from "@/lib/seo/jsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "FAQ",
  description:
    "Answers about paperless QR tickets, tiered buyer fees, Paystack checkout, and the Tikiti Scanner web app for organizers in South Africa.",
  path: "/faq",
});

const FAQ_ITEMS = [
  {
    question: "Is Tikiti really paperless?",
    answer:
      "Yes. Tickets are digital QR codes in your dashboard — no printing required for attendees or organizers.",
  },
  {
    question: "How do I get my ticket after payment?",
    answer:
      "Your ticket appears in your dashboard with a unique QR code once payment is confirmed.",
  },
  {
    question: "What do ticket buyers pay?",
    answer:
      "Buyers pay the ticket price plus a small Tikiti platform fee at checkout: R5 per ticket under R50, R10 per ticket from R50–R200, and 5% per ticket above R200. Card processing is included — no extra payment surcharge.",
  },
  {
    question: "What do organizers pay?",
    answer: `${ORGANIZER_PAYOUT_COPY} Listing events is free. After your event, generate a settlement invoice to receive your payout.`,
  },
  {
    question: "How do organizers scan tickets at the door?",
    answer: `${ORGANIZER_APP.description} Open ${ORGANIZER_APP.name} at ${SCANNER_APP_URL.replace(/^https?:\/\//, "")} in your browser and sign in with your Tikiti account. Organizers scan their events; door team members need an invite from the organizer on the event edit page.`,
  },
  {
    question: "Can I create different ticket tiers?",
    answer: "Yes. Organizers can create multiple ticket types with their own pricing and quantities.",
  },
  {
    question: "What is the service fee?",
    answer:
      "Buyers pay a service fee on top of the ticket price: R5 under R50, R10 from R50 to R200, and 5% above R200. Organizers receive 100% of ticket face value.",
  },
  {
    question: "When do organizers get paid?",
    answer:
      "Generate a settlement invoice from your dashboard after the event date. Tikiti batches payouts per invoice — you receive 100% of ticket face value sold through the platform.",
  },
  ...INVOICE_FAQ_ITEMS,
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <JsonLd data={buildFaqPageJsonLd(FAQ_ITEMS)} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
        <p className="text-gray-600 mb-6">
          Common questions about buying tickets and selling events on {BRAND.name}.
        </p>
        <PricingPolicy className="mb-8" />
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5 text-gray-700">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
              id={item.question.startsWith("How do organizer payouts") ? "invoices" : undefined}
            >
              <h2 className="font-semibold text-gray-900">{item.question}</h2>
              <p>{item.answer}</p>
              {item.question === "How do organizers scan tickets at the door?" && (
                <ScannerAppLink className="mt-4 justify-start" />
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
