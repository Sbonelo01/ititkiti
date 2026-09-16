import AppStoreBadges from "@/components/AppStoreBadges";
import JsonLd from "@/components/seo/JsonLd";
import { ORGANIZER_APP, BRAND } from "@/constants/branding";
import { INVOICE_FAQ_ITEMS } from "@/constants/organizerCopy";
import { buildFaqPageJsonLd } from "@/lib/seo/jsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "FAQ",
  description:
    "Answers about paperless QR tickets, Paystack checkout, organizer scanner app, ticket tiers, and Tikiti service fees in South Africa.",
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
    question: "Do organizers get a mobile app?",
    answer: `${ORGANIZER_APP.description} Download ${ORGANIZER_APP.name} from the App Store or Google Play and sign in with your Tikiti organizer or staff account.`,
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
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5 text-gray-700">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
                id={item.question.startsWith("How do organizer payouts") ? "invoices" : undefined}
            >
              <h2 className="font-semibold text-gray-900">{item.question}</h2>
              <p>{item.answer}</p>
              {item.question === "Do organizers get a mobile app?" && (
                <AppStoreBadges className="mt-4 justify-start" />
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
