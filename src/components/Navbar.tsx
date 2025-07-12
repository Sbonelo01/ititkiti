"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";
import { FaHome, FaCalendarAlt, FaSignInAlt, FaSignOutAlt, FaTicketAlt } from "react-icons/fa";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setUserRole(session?.user?.user_metadata?.role || "attendee");
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setUserRole(session?.user?.user_metadata?.role || "attendee");
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch ticket count when user changes
  useEffect(() => {
    const fetchTicketCount = async () => {
      if (!user) {
        setTicketCount(0);
        return;
      }

      try {
        if (userRole === "organizer") {
          // For organizers: count total tickets sold across all their events
          const { data: events } = await supabase
            .from("events")
            .select("id")
            .eq("organizer_id", user.id);

          if (events && events.length > 0) {
            const eventIds = events.map(event => event.id);
            const { count } = await supabase
              .from("tickets")
              .select("*", { count: "exact", head: true })
              .in("event_id", eventIds);
            
            setTicketCount(count || 0);
          } else {
            setTicketCount(0);
          }
        } else {
          // For attendees: count their purchased tickets
          const { count } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("email", user.email);
          
          setTicketCount(count || 0);
        }
      } catch (error) {
        console.error("Error fetching ticket count:", error);
        setTicketCount(0);
      }
    };

    fetchTicketCount();
  }, [user, userRole]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Desktop Navbar (fixed top) */}
      <nav className="hidden md:flex fixed top-0 left-0 w-full h-20 bg-white shadow-lg z-50 items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-spotify-green flex items-center justify-center shadow-lg">
            <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-green-500">Tikiti</span>
          
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-green-500 hover:text-green-600 font-medium transition-colors duration-200">Home</Link>
          <Link href="/events" className="text-green-500 hover:text-green-600 font-medium transition-colors duration-200">Events</Link>
          {!loading && (
            user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-green-500 hover:text-green-600 font-medium transition-colors duration-200">{user?.email}&apos;s Dashboard</Link>
                {ticketCount > 0 && (
                  <div className="flex items-center gap-2">
                    <FaTicketAlt className="text-green-500" />
                    <span className="text-green-500 font-medium">{ticketCount} tickets sold</span>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="bg-green-500 text-white px-5 py-2 rounded-[10px] font-semibold shadow hover:bg-green-600 transition-colors duration-200"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/login" className="bg-green-500 text-white px-5 py-2 rounded-[10px] font-semibold shadow hover:bg-green-600 transition-colors duration-200">Sign In</Link>
            )
          )}
        </div>
      </nav>

      {/* Mobile Navbar (fixed bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-white shadow-t-lg z-50 flex items-center justify-around border-t border-gray-800">
        <Link href="/" className="flex flex-col items-center text-text-faded hover:text-text-light transition-colors duration-200">
          <FaHome className="h-6 w-6 mb-1" />
          <span className="text-xs">Home</span>
        </Link>
        <Link href="/events" className="flex flex-col items-center text-text-faded hover:text-text-light transition-colors duration-200">
          <FaCalendarAlt className="h-6 w-6 mb-1" />
          <span className="text-xs">Events</span>
        </Link>
        {!loading && (
          user ? (
            <Link href="/dashboard" className="flex flex-col items-center text-text-faded hover:text-text-light transition-colors duration-200 relative">
              <FaSignOutAlt className="h-6 w-6 mb-1" />
              <span className="text-xs">Dashboard</span>
              {ticketCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {ticketCount}
                </div>
              )}
            </Link>
          ) : (
            <Link href="/login" className="flex flex-col items-center text-text-faded hover:text-text-light transition-colors duration-200">
              <FaSignInAlt className="h-6 w-6 mb-1" />
              <span className="text-xs">Sign In</span>
            </Link>
          )
        )}
      </nav>
    </>
  );
} 