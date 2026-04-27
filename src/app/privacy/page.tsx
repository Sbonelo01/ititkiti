export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4 text-gray-700">
          <p>
            Tikiti collects the minimum personal data required to deliver ticket purchases, account access, and event
            validation.
          </p>
          <p>
            Payment processing is handled by Paystack. We do not store card details directly on this platform.
          </p>
          <p>
            If you would like your account data reviewed or removed, please contact support using the Contact page.
          </p>
        </div>
      </div>
    </main>
  );
}
