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
        </div>
      </div>
    </main>
  );
}
