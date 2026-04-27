export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-gray-700 mb-8">
          We are here to help with platform support, event setup, and ticketing questions.
        </p>
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-3 text-gray-700">
          <p><span className="font-semibold">Email:</span> sbonelo.mkhize@funzile.com</p>
          <p><span className="font-semibold">Phone:</span> +27 61 069 2364</p>
          <p><span className="font-semibold">Location:</span> Durban, South Africa</p>
        </div>
      </div>
    </main>
  );
}
