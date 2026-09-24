import { buildPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/constants/branding";
import { PRICING_TIERS } from "@/constants/pricing";

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description: `Terms for using ${BRAND.name} as an event organizer or ticket buyer in South Africa.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4 text-gray-700">
          <p>
            By using Tikiti, you agree to provide accurate account details and to use the platform lawfully.
          </p>
          <p>
            Event organizers are responsible for the accuracy of their listings, schedules, pricing, and venue rules.
          </p>
          <p>
            Tickets are issued digitally and may be rejected if tampered with, duplicated, or already marked as used.
          </p>
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Pricing &amp; payouts</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Listing events on Tikiti is free for organizers.</li>
              <li>Organizers receive 100% of ticket face value sold through the platform.</li>
              <li>Platform fees are paid by ticket buyers at checkout according to these tiers:</li>
            </ul>
            <ul className="list-disc pl-8 mt-2 space-y-1 text-gray-600">
              {PRICING_TIERS.map((tier) => (
                <li key={tier.id}>
                  {tier.label}: {tier.summary}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Settlement invoices may be generated after the event. Payouts are processed in batches per invoice.
              Payment processing costs are covered within buyer platform fees and are not deducted from organizer
              ticket revenue.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
