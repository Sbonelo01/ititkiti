"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Image from "next/image"; // Import Image component for optimized images

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
    // Check current session
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

    // Listen for auth changes
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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <p className="mt-4 text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to home
  }

  // Render appropriate dashboard based on role
  if (userRole === "organizer") {
    return <OrganizerDashboard user={user} router={router} />;
  } else {
    return <AttendeeDashboard user={user} />;
  }
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

  const fetchOrganizerEvents = useCallback(async () => {
    try {
      console.log("Fetching organizer events for user:", user.id); // Debug log

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .order("created_at", { ascending: false });

      console.log("Organizer events result:", { data, error }); // Debug log

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
      // 1. Delete the poster from storage if it exists
      if (posterUrl) {
        // Extract the path after the bucket name
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

      // 2. Delete the event from the database
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
        .eq("organizer_id", user.id); // Extra security check

      if (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event. Please try again.");
        return;
      }

      // Remove event from local state
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
    // Navigate to edit page
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card-background shadow-md">

      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">
              Your Events
            </h2>
            <Link
              href="/dashboard/create-event"
              className="bg-green-500 text-white px-4 py-2 rounded-[5px] hover:bg-green-700 transition-colors duration-200 font-semibold"
            >
              Create New Event
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green mx-auto"></div>
              <p className="mt-2 text-foreground">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-faded mb-4">
                You haven&apos;t created any events yet.
              </p>
              <Link
                href="/dashboard/create-event"
                className="bg-green-500 text-white px-6 py-2 rounded-[5px] hover:bg-green-400 transition-colors duration-200 font-semibold"
              >
                Create Your First Event
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-card-background rounded-lg shadow overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    {event.poster_url && (
                      <div className="w-full h-40 relative mb-4 rounded-lg overflow-hidden">
                        <Image
                          src={event.poster_url}
                          alt={event.title + " poster"}
                          layout="fill"
                          objectFit="cover"
                          className="rounded-t"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-semibold text-text-light mb-2">
                      {event.title}
                    </h3>
                    <p className="text-foreground text-sm mb-4 line-clamp-3">
                      {event.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-text-faded">
                        <svg
                          className="w-4 h-4 mr-2 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {formatDate(event.date)}
                      </div>
                      <div className="flex items-center text-sm text-text-faded">
                        <svg
                          className="w-4 h-4 mr-2 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {event.location}
                      </div>
                      <div className="flex items-center text-sm text-text-faded">
                        <svg
                          className="w-4 h-4 mr-2 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                          />
                        </svg>
                        {formatPrice(event.price)}
                      </div>
                      <div className="flex items-center text-sm text-text-faded">
                        <svg
                          className="w-4 h-4 mr-2 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        {event.total_tickets} tickets
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">
                        {formatPrice(event.price)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEvent(event.id)}
                          className="bg-blue-400 text-white px-3 py-1 rounded-[5px] text-sm hover:bg-blue-500 transition-colors duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id, event.poster_url)}
                          disabled={deletingEventId === event.id}
                          className="bg-red-400 text-white px-3 py-1 rounded-[5px] text-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          {deletingEventId === event.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
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
      console.log("Fetching tickets for user:", user.id); // Debug log

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
        .eq("email", user.email) // Use email instead of user_id since that's what we have
        .order("created_at", { ascending: false });

      console.log("User tickets result:", { data, error }); // Debug log

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

  // Group tickets by event
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card-background shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-text-light">My Tickets</h1>
            <div className="flex items-center gap-4">
              <span className="text-foreground">Welcome, {user.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-text-light">
              Your Ticket Purchases
            </h2>
            <Link
              href="/events"
              className="bg-green-500 text-white px-4 py-2 rounded-[5px] hover:bg-green-700 transition-colors duration-200 font-semibold"
            >
              Browse Events
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green mx-auto"></div>
              <p className="mt-2 text-foreground">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-faded mb-4">
                You haven&apos;t purchased any tickets yet.
              </p>
              <Link
                href="/events"
                className="bg-green-500 text-white px-6 py-2 rounded-[5px] hover:bg-green-400 transition-colors duration-200 font-semibold"
              >
                Browse Available Events
              </Link>
            </div>
          ) : showEventTickets ? (
            // Show individual tickets for selected event
            <div>
              <div className="flex items-center mb-6">
                <button
                  onClick={handleBackToEvents}
                  className="text-green-500 hover:text-green-600 font-medium transition-colors duration-200 mr-4"
                >
                  ← Back to Events
                </button>
                
                <h3 className="text-xl font-semibold text-green-500">
                  {selectedEventTickets[0]?.events?.title} - Tickets
                </h3>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {selectedEventTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-card-background rounded-lg shadow overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <div className="p-6">
                      {ticket.events?.poster_url && (
                        <div className="w-full h-40 relative mb-4 rounded-lg overflow-hidden">
                          <Image
                            src={ticket.events.poster_url}
                            alt={ticket.events.title + " poster"}
                            layout="fill"
                            objectFit="cover"
                            className="rounded-t"
                          />
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-text-light">
                          Ticket #{ticket.id.slice(-6)}
                        </h3>
                        <div className="flex flex-col gap-1 items-end">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              ticket.payment_status === "paid"
                                ? "bg-spotify-green text-black"
                                : "bg-red-700 text-white"
                            }`}
                          >
                            {ticket.payment_status === "paid"
                              ? "Paid"
                              : "Unpaid"}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              ticket.used
                                ? "bg-gray-700 text-text-faded"
                                : "bg-blue-700 text-white"
                            }`}
                          >
                            {ticket.used ? "Used" : "Active"}
                          </span>
                        </div>
                      </div>

                      {ticket.events && (
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-text-faded">
                            <svg
                              className="w-4 h-4 mr-2 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {formatDate(ticket.events.date)}
                          </div>
                          <div className="flex items-center text-sm text-text-faded">
                            <svg
                              className="w-4 h-4 mr-2 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {ticket.events.location}
                          </div>
                          <div className="flex items-center text-sm text-text-faded">
                            <svg
                              className="w-4 h-4 mr-2 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            {ticket.attendee_name}
                          </div>
                          <div className="flex items-center text-sm text-text-faded">
                            <svg
                              className="w-4 h-4 mr-2 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            {ticket.email}
                          </div>
                          <div className="flex items-center text-sm text-text-faded">
                            <svg
                              className="w-4 h-4 mr-2 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Purchased: {formatDate(ticket.created_at)}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">
                          {ticket.events ? formatPrice(ticket.events.price) : "N/A"}
                        </span>
                        <div className="flex gap-2">
                                                  <button
                          className="bg-green-500 text-white px-3 py-1 rounded-[5px] text-sm hover:bg-green-700 transition-colors duration-200 font-semibold"
                          onClick={() => handleViewQR(ticket)}
                        >
                          View QR
                        </button>
                        </div>
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
                  className="bg-card-background rounded-lg shadow overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => handleEventClick(eventTickets)}
                >
                  <div className="p-6">
                    {event.poster_url && (
                      <div className="w-full h-40 relative mb-4 rounded-lg overflow-hidden">
                        <Image
                          src={event.poster_url}
                          alt={event.title + " poster"}
                          layout="fill"
                          objectFit="cover"
                          className="rounded-t"
                        />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold text-text-light">
                        {event.title}
                      </h3>
                      <div className="flex flex-col gap-1 items-end">
                        <span className="px-3 py-1 rounded-[5px] text-xs font-medium bg-purple-400 text-white">
                          {eventTickets.length} {eventTickets.length === 1 ? 'ticket' : 'tickets'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-text-faded">
                        <svg
                          className="w-4 h-4 mr-2 text-spotify-green"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {formatDate(event.date)}
                      </div>
                      <div className="flex items-center text-sm text-text-faded">
                        <svg
                          className="w-4 h-4 mr-2 text-spotify-green"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {event.location}
                      </div>
                      <div className="flex items-center text-sm text-text-faded">
                        <svg
                          className="w-4 h-4 mr-2 text-spotify-green"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                          />
                        </svg>
                        {formatPrice(event.price)}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-spotify-green">
                        {formatPrice(event.price)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          className="bg-green-500 text-white px-3 py-1 rounded-[5px] text-sm hover:bg-green-700 transition-colors duration-200 font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(eventTickets);
                          }}
                        >
                          View Tickets
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Code Modal */}
        {qrModalOpen && selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="bg-card-background rounded-lg shadow-lg p-8 max-w-sm w-full relative border border-gray-700">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
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
              <h3 className="text-xl font-bold mb-4 text-center text-text-light">
                Your Ticket QR Code
              </h3>
              <div ref={qrRef} className="flex justify-center mb-4 p-2 bg-white rounded-md"> {/* QR code background */}
                <QRCodeCanvas
                  value={selectedTicket!.qr_code_data || selectedTicket!.id}
                  size={220}
                  bgColor="#ffffff" // White background for QR code for readability
                  fgColor="#1a1a1a" // Dark foreground for QR code
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="flex justify-center">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded-[5px] hover:bg-green-700 transition-colors duration-200 font-semibold"
                  onClick={handleDownloadQR}
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}