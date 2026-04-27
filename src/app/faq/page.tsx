export default function FaqPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5 text-gray-700">
          <div>
            <h2 className="font-semibold text-gray-900">How do I get my ticket after payment?</h2>
            <p>Your ticket appears in your dashboard with a unique QR code once payment is confirmed.</p>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Can I create different ticket tiers?</h2>
            <p>Yes. Organizers can create multiple ticket types with their own pricing and quantities.</p>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">What is the service fee?</h2>
            <p>The platform service fee is R10 per ticket.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
