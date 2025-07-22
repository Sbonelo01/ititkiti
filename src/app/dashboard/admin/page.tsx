"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRScanner from "@/components/QRScanner";

interface AdminEvent {
  id: string;
  title: string;
  price: number;
  poster_url?: string;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || (user.user_metadata?.role !== "admin" && user.user_metadata?.role !== "staff")) {
        setAuthorized(false);
        setTimeout(() => router.push("/dashboard"), 2000);
        return;
      }
      setAuthorized(true);
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (authorized !== true) return;
    async function fetchEventsAndTickets() {
      setLoading(true);
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, price, poster_url");
      setEvents(eventsData || []);
      if (eventsData && eventsData.length > 0) {
        const ids = eventsData.map((e) => e.id);
        const { data: ticketsData } = await supabase
          .from("tickets")
          .select("event_id")
          .in("event_id", ids)
          .eq("payment_status", "paid");
        const counts: Record<string, number> = {};
        (ticketsData || []).forEach((row: { event_id: string }) => {
          counts[row.event_id] = (counts[row.event_id] || 0) + 1;
        });
        setTicketCounts(counts);
      }
      setLoading(false);
    }
    fetchEventsAndTickets();
  }, [authorized]);

  // Get user role for conditional rendering
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function getUserRole() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setUserRole(user.user_metadata?.role);
      }
    }
    getUserRole();
  }, []);

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `R${price.toFixed(2)}`;
  };

  async function handleScan(qrValue: string) {
    setValidating(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/validate-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code_data: qrValue }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setScanResult(`Ticket valid for: ${data.ticket.attendee_name} (${data.ticket.email})`);
      } else {
        setScanResult(data.error || "Invalid ticket");
      }
    } catch {
      setScanResult("Validation error. Try again.");
    }
    setValidating(false);
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Unauthorized</h2>
          <p className="text-gray-600 mb-4">You do not have permission to view this page.</p>
          <p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (authorized !== true) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {userRole === "staff" ? (
          // Staff view - only scanner
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">Staff Ticket Scanner</h1>
            <button
              className="mb-8 bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              onClick={() => { setShowScanner(true); setScanResult(null); }}
            >
              Open Ticket Scanner
            </button>
            {showScanner && (
              <QRScanner
                onScan={qrValue => { setShowScanner(false); handleScan(qrValue); }}
                onClose={() => setShowScanner(false)}
              />
            )}
            {validating && <div className="mb-4 text-blue-600 font-semibold">Validating ticket...</div>}
            {scanResult && <div className="mb-4 text-lg font-bold text-center">{scanResult}</div>}
          </div>
        ) : (
          // Admin view - full dashboard
          <>
            <h1 className="text-4xl font-bold mb-8">Admin Event Revenue Dashboard</h1>
            <button
              className="mb-8 bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              onClick={() => { setShowScanner(true); setScanResult(null); }}
            >
              Open Ticket Scanner
            </button>
            {showScanner && (
              <QRScanner
                onScan={qrValue => { setShowScanner(false); handleScan(qrValue); }}
                onClose={() => setShowScanner(false)}
              />
            )}
            {validating && <div className="mb-4 text-blue-600 font-semibold">Validating ticket...</div>}
            {scanResult && <div className="mb-4 text-lg font-bold text-center">{scanResult}</div>}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
                <p className="text-lg text-gray-600 font-medium">Loading events...</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                  const sold = ticketCounts[event.id] || 0;
                  const revenue = event.price * sold + 3 * sold;
                  return (
                    <div
                      key={event.id}
                      className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                    >
                      {event.poster_url && (
                        <div className="w-full h-48 relative">
                          <Image
                            src={event.poster_url}
                            alt={event.title + " poster"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                          {event.title}
                        </h3>
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <span className="text-lg font-semibold text-green-600">
                            {formatPrice(event.price)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Sold: {sold}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          <span className="font-bold">Total Revenue: </span>
                          <span className="text-green-700 font-bold">{formatPrice(revenue)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 