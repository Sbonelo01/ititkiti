"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRScanner from "@/components/QRScanner";
import { SERVICE_FEE_PER_TICKET } from "@/constants/pricing";

interface AdminEvent {
  id: string;
  title: string;
  price: number;
  poster_url?: string;
}

type EventRevenueStats = {
  ticketsSold: number;
  ticketRevenue: number;
  tikitiRevenue: number;
  totalProcessed: number;
};

export default function AdminDashboard() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [eventStats, setEventStats] = useState<Record<string, EventRevenueStats>>({});
  const [platformTikitiRevenue, setPlatformTikitiRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ message: string; tone: "success" | "warning" | "error" | "info" } | null>(null);
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
        const eventPriceMap = Object.fromEntries(eventsData.map((e) => [e.id, e.price]));

        const { data: ticketsData } = await supabase
          .from("tickets")
          .select(`
            event_id,
            ticket_type_id,
            ticket_types ( price )
          `)
          .in("event_id", ids)
          .eq("payment_status", "paid");

        const stats: Record<string, EventRevenueStats> = {};
        let totalTikitiRevenue = 0;

        (ticketsData || []).forEach((row) => {
          const eventId = row.event_id as string;
          if (!stats[eventId]) {
            stats[eventId] = {
              ticketsSold: 0,
              ticketRevenue: 0,
              tikitiRevenue: 0,
              totalProcessed: 0,
            };
          }

          let ticketPrice = eventPriceMap[eventId] ?? 0;
          const tt = row.ticket_types as { price?: number } | { price?: number }[] | null;
          if (Array.isArray(tt) && tt[0]?.price != null) {
            ticketPrice = Number(tt[0].price);
          } else if (tt && !Array.isArray(tt) && tt.price != null) {
            ticketPrice = Number(tt.price);
          }

          stats[eventId].ticketsSold += 1;
          stats[eventId].ticketRevenue += ticketPrice;
          stats[eventId].tikitiRevenue += SERVICE_FEE_PER_TICKET;
        });

        for (const eventId of Object.keys(stats)) {
          const s = stats[eventId];
          s.totalProcessed = s.ticketRevenue + s.tikitiRevenue;
          totalTikitiRevenue += s.tikitiRevenue;
        }

        setEventStats(stats);
        setPlatformTikitiRevenue(totalTikitiRevenue);
      } else {
        setEventStats({});
        setPlatformTikitiRevenue(0);
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
    if (price === 0) return "R0.00";
    return `R${price.toFixed(2)}`;
  };

  async function handleScan(qrValue: string) {
    setValidating(true);
    setScanResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch("/api/validate-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ qr_code_data: qrValue }),
      });
      const data = await res.json();
      if (data.success) {
        setScanResult({
          message: `Ticket valid for: ${data.ticket.attendee_name} (${data.ticket.email})`,
          tone: "success",
        });
      } else if (data.status === "already_used") {
        const name = data.ticket?.attendee_name ?? "Unknown";
        const email = data.ticket?.email ?? "";
        setScanResult({
          message: `Already used — ${name}${email ? ` (${email})` : ""}`,
          tone: "warning",
        });
      } else if (data.status === "not_found") {
        setScanResult({ message: data.error || "Ticket not found", tone: "error" });
      } else if (data.status === "unauthorized") {
        setScanResult({ message: "You are not authorized to scan tickets", tone: "error" });
      } else {
        setScanResult({ message: data.error || "Invalid ticket", tone: "error" });
      }
    } catch {
      setScanResult({ message: "Validation error. Try again.", tone: "error" });
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
            {validating && (
              <div className="mb-4 text-blue-600 font-semibold" role="status" aria-live="polite">
                Validating ticket...
              </div>
            )}
            {scanResult && (
              <div
                className={`mb-4 text-lg font-bold text-center ${
                  scanResult.tone === "success"
                    ? "text-green-700"
                    : scanResult.tone === "warning"
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
                role="status"
                aria-live="polite"
              >
                {scanResult.message}
              </div>
            )}
          </div>
        ) : (
          // Admin view - full dashboard
          <>
            <h1 className="text-4xl font-bold mb-4">Admin Event Revenue Dashboard</h1>
            {!loading && events.length > 0 && (
              <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-5">
                  <p className="text-sm font-medium text-gray-600">Tikiti platform revenue (all events)</p>
                  <p className="text-2xl font-bold text-green-700 mt-1 tabular-nums">
                    {formatPrice(platformTikitiRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    R{SERVICE_FEE_PER_TICKET} service fee × paid tickets sold
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3 mb-8">
              <Link
                href="/dashboard/admin/invoices"
                className="bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition-colors"
              >
                Organizer invoices
              </Link>
              <button
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition-all duration-200 shadow-lg"
                onClick={() => { setShowScanner(true); setScanResult(null); }}
              >
                Open Ticket Scanner
              </button>
            </div>
            {showScanner && (
              <QRScanner
                onScan={qrValue => { setShowScanner(false); handleScan(qrValue); }}
                onClose={() => setShowScanner(false)}
              />
            )}
            {validating && (
              <div className="mb-4 text-blue-600 font-semibold" role="status" aria-live="polite">
                Validating ticket...
              </div>
            )}
            {scanResult && (
              <div
                className={`mb-4 text-lg font-bold text-center ${
                  scanResult.tone === "success"
                    ? "text-green-700"
                    : scanResult.tone === "warning"
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
                role="status"
                aria-live="polite"
              >
                {scanResult.message}
              </div>
            )}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
                <p className="text-lg text-gray-600 font-medium">Loading events...</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                  const stats = eventStats[event.id] ?? {
                    ticketsSold: 0,
                    ticketRevenue: 0,
                    tikitiRevenue: 0,
                    totalProcessed: 0,
                  };
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
                            {event.price === 0 ? "Free" : formatPrice(event.price)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Sold: {stats.ticketsSold}
                          </span>
                        </div>
                        <dl className="mt-3 space-y-2 text-sm text-gray-700">
                          <div className="flex justify-between gap-4">
                            <dt>Ticket sales (organizer)</dt>
                            <dd className="font-semibold tabular-nums">{formatPrice(stats.ticketRevenue)}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt>Tikiti revenue</dt>
                            <dd className="font-bold text-green-700 tabular-nums">
                              {formatPrice(stats.tikitiRevenue)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4 pt-2 border-t border-gray-100">
                            <dt className="font-medium">Total processed</dt>
                            <dd className="font-bold tabular-nums">{formatPrice(stats.totalProcessed)}</dd>
                          </div>
                        </dl>
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