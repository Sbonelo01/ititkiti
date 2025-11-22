"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Image from "next/image";
import { 
  CalendarIcon, 
  MapPinIcon, 
  TicketIcon, 
  // ClockIcon, 
  UserIcon, 
  EnvelopeIcon, 
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowLeftIcon,
  QrCodeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface DashboardEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  total_tickets: number;
  organizer_id: string;
  poster_url?: string;
}

interface DashboardTicket {
  id: string;
  event_id: string;
  attendee_name: string;
  email: string;
  qr_code_data: string;
  used: boolean;
  payment_status: string;
  created_at: string;
  events?: DashboardEvent;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      setUser(session.user);
      setUserRole(session.user.user_metadata?.role || "attendee");
      setLoading(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/");
      } else if (session) {
        setUser(session.user);
        setUserRole(session.user.user_metadata?.role || "attendee");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (userRole === "organizer") {
    return <OrganizerDashboard user={user} router={router} />;
  } else {
    return <AttendeeDashboard user={user} />;
  }
}

interface EventSalesData {
  eventId: string;
  ticketsSold: number;
  revenue: number;
  profit: number;
  ticketTypeBreakdown: Record<string, { count: number; revenue: number }>;
}

interface SalesSummary {
  totalTicketsSold: number;
  totalRevenue: number;
  totalProfit: number;
  totalServiceFees: number;
}

function OrganizerDashboard({
  user,
  router,
}: {
  user: User;
  router: AppRouterInstance;
}) {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [eventTicketCounts, setEventTicketCounts] = useState<Record<string, number>>({});
  const [eventSalesData, setEventSalesData] = useState<Record<string, EventSalesData>>({});
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    totalTicketsSold: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalServiceFees: 0,
  });
  const [loadingSales, setLoadingSales] = useState(true);

  const fetchOrganizerEvents = useCallback(async () => {
    try {
      console.log("Fetching organizer events for user:", user.id);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .order("created_at", { ascending: false });

      console.log("Organizer events result:", { data, error });

      if (error) {
        console.error("Error fetching organizer events:", error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizerEvents();
  }, [fetchOrganizerEvents]);

  const SERVICE_FEE_PER_TICKET = 10;

  useEffect(() => {
    async function fetchTicketCounts() {
      if (events.length === 0) return;
      const ids = events.map(e => e.id);
      const { data } = await supabase
        .from('tickets')
        .select('event_id')
        .in('event_id', ids)
        .eq('payment_status', 'paid');
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((row: { event_id: string }) => {
          counts[row.event_id] = (counts[row.event_id] || 0) + 1;
        });
        setEventTicketCounts(counts);
      }
    }
    fetchTicketCounts();
  }, [events]);

  useEffect(() => {
    async function fetchSalesData() {
      if (events.length === 0) {
        setLoadingSales(false);
        return;
      }

      try {
        const eventIds = events.map(e => e.id);
        
        // Fetch all paid tickets with their ticket type information
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select(`
            id,
            event_id,
            ticket_type_id,
            payment_status,
            ticket_types (
              id,
              price
            )
          `)
          .in('event_id', eventIds)
          .eq('payment_status', 'paid');

        if (ticketsError) {
          console.error('Error fetching tickets:', ticketsError);
          setLoadingSales(false);
          return;
        }

        // Also fetch event prices for backward compatibility (tickets without ticket_type_id)
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, price')
          .in('id', eventIds);

        const eventPriceMap: Record<string, number> = {};
        eventsData?.forEach(event => {
          eventPriceMap[event.id] = event.price;
        });

        // Calculate sales data per event
        const sales: Record<string, EventSalesData> = {};
        let totalTicketsSold = 0;
        let totalRevenue = 0;
        let totalServiceFees = 0;

        tickets?.forEach((ticket: any) => {
          const eventId = ticket.event_id;
          if (!sales[eventId]) {
            sales[eventId] = {
              eventId,
              ticketsSold: 0,
              revenue: 0,
              profit: 0,
              ticketTypeBreakdown: {},
            };
          }

          // Get ticket price from ticket type or fallback to event price
          let ticketPrice = 0;
          if (ticket.ticket_type_id && ticket.ticket_types) {
            ticketPrice = ticket.ticket_types.price || 0;
          } else {
            ticketPrice = eventPriceMap[eventId] || 0;
          }

          sales[eventId].ticketsSold += 1;
          sales[eventId].revenue += ticketPrice;
          
          const ticketTypeKey = ticket.ticket_type_id || 'default';
          if (!sales[eventId].ticketTypeBreakdown[ticketTypeKey]) {
            sales[eventId].ticketTypeBreakdown[ticketTypeKey] = { count: 0, revenue: 0 };
          }
          sales[eventId].ticketTypeBreakdown[ticketTypeKey].count += 1;
          sales[eventId].ticketTypeBreakdown[ticketTypeKey].revenue += ticketPrice;

          totalTicketsSold += 1;
          totalRevenue += ticketPrice;
          totalServiceFees += SERVICE_FEE_PER_TICKET;
        });

        // Calculate profit for each event (revenue - service fees)
        Object.keys(sales).forEach(eventId => {
          sales[eventId].profit = sales[eventId].revenue - (sales[eventId].ticketsSold * SERVICE_FEE_PER_TICKET);
        });

        setEventSalesData(sales);
        setSalesSummary({
          totalTicketsSold,
          totalRevenue,
          totalProfit: totalRevenue - totalServiceFees,
          totalServiceFees,
        });
      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setLoadingSales(false);
      }
    }

    fetchSalesData();
  }, [events]);

  const handleDeleteEvent = async (eventId: string, posterUrl?: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingEventId(eventId);

    try {
      if (posterUrl) {
        const path = posterUrl.split("/event-posters/")[1];
        if (path) {
          const { error: storageError } = await supabase.storage
            .from("event-posters")
            .remove([path]);
          if (storageError) {
            console.error("Error deleting poster from storage:", storageError);
          }
        }
      }

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
        .eq("organizer_id", user.id);

      if (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event. Please try again.");
        return;
      }

      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      console.log("Event deleted successfully");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to delete event. Please try again.");
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleEditEvent = (eventId: string) => {
    router.push(`/dashboard/edit-event/${eventId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `R${price.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Your Events</h1>
              <p className="text-green-100">Manage and organize your events</p>
            </div>
            <Link
              href="/dashboard/create-event"
              className="bg-white text-green-600 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Create New Event
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sales Summary Cards */}
        {!loading && !loadingSales && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tickets Sold</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{salesSummary.totalTicketsSold}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <TicketIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {formatPrice(salesSummary.totalRevenue)}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Service Fees</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {formatPrice(salesSummary.totalServiceFees)}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-xl">
                  <BanknotesIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Profit</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {formatPrice(salesSummary.totalProfit)}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-xl">
                  <ChartBarIcon className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
              <div className="text-green-500 text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No Events Yet</h2>
              <p className="text-gray-600 mb-6">
                You haven&apos;t created any events yet. Start by creating your first event!
              </p>
              <Link
                href="/dashboard/create-event"
                className="bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl inline-flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Create Your First Event
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
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
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800 line-clamp-2">
                      {event.title}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditEvent(event.id)}
                        className="bg-blue-500 text-white p-2 rounded-xl hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg"
                        title="Edit Event"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id, event.poster_url)}
                        disabled={deletingEventId === event.id}
                        className="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                        title="Delete Event"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {event.description}
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-2 text-green-500" />
                      {formatDate(event.date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2 text-blue-500" />
                      {event.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <TicketIcon className="h-4 w-4 mr-2 text-purple-500" />
                      {event.total_tickets} tickets available
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-green-600">
                        {formatPrice(event.price)}
                      </span>
                      {deletingEventId === event.id ? (
                        <span className="text-sm text-gray-500">Deleting...</span>
                      ) : eventSalesData[event.id] ? (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {eventSalesData[event.id].ticketsSold} sold
                          </p>
                          <p className="text-sm font-semibold text-green-600">
                            Profit: {formatPrice(eventSalesData[event.id].profit)}
                          </p>
                        </div>
                      ) : eventTicketCounts[event.id] !== undefined ? (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {eventTicketCounts[event.id]} sold
                          </p>
                        </div>
                      ) : null}
                    </div>
                    
                    {eventSalesData[event.id] && eventSalesData[event.id].ticketsSold > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Revenue:</span>
                          <span className="font-semibold">{formatPrice(eventSalesData[event.id].revenue)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Service Fees:</span>
                          <span className="font-semibold">
                            {formatPrice(eventSalesData[event.id].ticketsSold * SERVICE_FEE_PER_TICKET)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttendeeDashboard({ user }: { user: User }) {
  const [tickets, setTickets] = useState<DashboardTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<DashboardTicket | null>(
    null
  );
  const [selectedEventTickets, setSelectedEventTickets] = useState<DashboardTicket[]>([]);
  const [showEventTickets, setShowEventTickets] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const fetchUserTickets = useCallback(async () => {
    try {
      console.log("Fetching tickets for user:", user.id);

      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          events (
            id,
            title,
            description,
            date,
            location,
            price,
            poster_url
          )
        `
        )
        .eq("email", user.email)
        .order("created_at", { ascending: false });

      console.log("User tickets result:", { data, error });

      if (error) {
        console.error("Error fetching tickets:", error);
        return;
      }

      setTickets(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserTickets();
  }, [fetchUserTickets]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `R${price.toFixed(2)}`;
  };

  const handleViewQR = (ticket: DashboardTicket) => {
    setSelectedTicket(ticket);
    setQrModalOpen(true);
  };

  const handleDownloadQR = () => {
    if (!selectedTicket) return;
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `ticket-qr-${selectedTicket.id}.png`;
    link.click();
  };

  const groupedTickets = tickets.reduce((groups, ticket) => {
    if (!ticket.events) return groups;
    const eventId = ticket.events.id;
    if (!groups[eventId]) {
      groups[eventId] = {
        event: ticket.events,
        tickets: []
      };
    }
    groups[eventId].tickets.push(ticket);
    return groups;
  }, {} as Record<string, { event: DashboardEvent; tickets: DashboardTicket[] }>);

  const handleEventClick = (eventTickets: DashboardTicket[]) => {
    setSelectedEventTickets(eventTickets);
    setShowEventTickets(true);
  };

  const handleBackToEvents = () => {
    setShowEventTickets(false);
    setSelectedEventTickets([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Tickets</h1>
              <p className="text-green-100">Welcome back, {user.email}</p>
            </div>
            <Link
              href="/events"
              className="bg-white text-green-600 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <TicketIcon className="h-5 w-5" />
              Browse Events
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
              <div className="text-green-500 text-6xl mb-4">🎫</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No Tickets Yet</h2>
              <p className="text-gray-600 mb-6">
                You haven&apos;t purchased any tickets yet. Browse available events to get started!
              </p>
              <Link
                href="/events"
                className="bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl inline-flex items-center gap-2"
              >
                <TicketIcon className="h-5 w-5" />
                Browse Available Events
              </Link>
            </div>
          </div>
        ) : showEventTickets ? (
          // Show individual tickets for selected event
          <div>
            <div className="flex items-center mb-6">
              <button
                onClick={handleBackToEvents}
                className="text-green-600 hover:text-green-700 font-medium transition-colors duration-200 mr-4 flex items-center gap-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Events
              </button>
              
              <h3 className="text-xl font-bold text-gray-800">
                {selectedEventTickets[0]?.events?.title} - Tickets
              </h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {selectedEventTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  {ticket.events?.poster_url && (
                    <div className="w-full h-48 relative">
                      <Image
                        src={ticket.events.poster_url}
                        alt={ticket.events.title + " poster"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-800">
                        Ticket #{ticket.id.slice(-6)}
                      </h3>
                      <div className="flex flex-col gap-2 items-end">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            ticket.payment_status === "paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {ticket.payment_status === "paid" ? "Paid" : "Unpaid"}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            ticket.used
                              ? "bg-gray-100 text-gray-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {ticket.used ? "Used" : "Active"}
                        </span>
                      </div>
                    </div>

                    {ticket.events && (
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <CalendarIcon className="h-4 w-4 mr-2 text-green-500" />
                          {formatDate(ticket.events.date)}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPinIcon className="h-4 w-4 mr-2 text-blue-500" />
                          {ticket.events.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <UserIcon className="h-4 w-4 mr-2 text-purple-500" />
                          {ticket.attendee_name}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <EnvelopeIcon className="h-4 w-4 mr-2 text-orange-500" />
                          {ticket.email}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <DocumentTextIcon className="h-4 w-4 mr-2 text-indigo-500" />
                          Purchased: {formatDate(ticket.created_at)}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                      <span className="text-lg font-semibold text-green-600">
                        {ticket.events ? formatPrice(ticket.events.price) : "N/A"}
                      </span>
                      <button
                        className="bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
                        onClick={() => handleViewQR(ticket)}
                      >
                        <QrCodeIcon className="h-4 w-4" />
                        View QR
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Show grouped events
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Object.values(groupedTickets).map(({ event, tickets: eventTickets }) => (
              <div
                key={event.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                onClick={() => handleEventClick(eventTickets)}
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
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800 line-clamp-2">
                      {event.title}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {eventTickets.length} {eventTickets.length === 1 ? 'ticket' : 'tickets'}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-2 text-green-500" />
                      {formatDate(event.date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2 text-blue-500" />
                      {event.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <TicketIcon className="h-4 w-4 mr-2 text-purple-500" />
                      {formatPrice(event.price)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <span className="text-lg font-semibold text-green-600">
                      {formatPrice(event.price)}
                    </span>
                    <button
                      className="bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(eventTickets);
                      }}
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Tickets
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QR Code Modal */}
        {qrModalOpen && selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setQrModalOpen(false)}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
                Your Ticket QR Code
              </h3>
              <div ref={qrRef} className="flex justify-center mb-4 p-4 bg-white rounded-xl shadow-lg">
                <QRCodeCanvas
                  value={selectedTicket!.qr_code_data || selectedTicket!.id}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="flex justify-center">
                <button
                  className="bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                  onClick={handleDownloadQR}
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}