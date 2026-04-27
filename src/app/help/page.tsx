import Link from "next/link";

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
        <p className="text-gray-700 mb-8">
          Need a hand with buying tickets, managing events, or validating entry? Start with the resources below.
        </p>
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Popular topics</h2>
          <ul className="list-disc pl-5 text-gray-700 space-y-2">
            <li>How to buy tickets and access your QR code</li>
            <li>How organizers create and edit events</li>
            <li>How ticket validation works for staff and admins</li>
          </ul>
          <p className="text-gray-700">
            Still stuck? Visit <Link href="/contact" className="text-green-600 hover:text-green-700 font-semibold">Contact Us</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
