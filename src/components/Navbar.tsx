"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";
import { 
  HomeIcon, 
  CalendarIcon, 
  UserIcon, 
  ArrowRightOnRectangleIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setUserRole(session?.user?.user_metadata?.role || "attendee");
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setUserRole(session?.user?.user_metadata?.role || "attendee");
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTicketCount = async () => {
      if (!user) {
        setTicketCount(0);
        return;
      }

      try {
        if (userRole === "organizer") {
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
      {/* Desktop Navbar */}
      <nav className="hidden md:flex fixed top-0 left-0 w-full h-20 bg-white/95 backdrop-blur-sm shadow-xl z-50 items-center justify-between px-8 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 transform group-hover:scale-105">
            <TicketIcon className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
            Tikiti
          </span>
        </Link>
        
        <div className="flex items-center gap-8">
          <Link 
            href="/" 
            className="text-gray-700 hover:text-green-600 font-medium transition-all duration-200 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-green-50"
          >
            <HomeIcon className="h-5 w-5" />
            Home
          </Link>
          <Link 
            href="/events" 
            className="text-gray-700 hover:text-green-600 font-medium transition-all duration-200 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-green-50"
          >
            <CalendarIcon className="h-5 w-5" />
            Events
          </Link>
          
          {!loading && (
            user ? (
              <div className="flex items-center gap-4">
                <Link 
                  href="/dashboard" 
                  className="text-gray-700 hover:text-green-600 font-medium transition-all duration-200 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-green-50"
                >
                  <UserIcon className="h-5 w-5" />
                  Dashboard
                </Link>
                
                {ticketCount > 0 && (
                  <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-xl">
                    <TicketIcon className="h-5 w-5 text-green-600" />
                    <span className="text-green-700 font-semibold">{ticketCount} tickets</span>
                  </div>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <UserIcon className="h-5 w-5" />
                Sign In
              </Link>
            )
          )}
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-white/95 backdrop-blur-sm shadow-2xl z-50 flex items-center justify-around border-t border-gray-100">
        <Link 
          href="/" 
          className="flex flex-col items-center text-gray-600 hover:text-green-600 transition-all duration-200 p-2 rounded-xl hover:bg-green-50"
        >
          <HomeIcon className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Home</span>
        </Link>
        
        <Link 
          href="/events" 
          className="flex flex-col items-center text-gray-600 hover:text-green-600 transition-all duration-200 p-2 rounded-xl hover:bg-green-50"
        >
          <CalendarIcon className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Events</span>
        </Link>
        
        {!loading && (
          user ? (
            <Link 
              href="/dashboard" 
              className="flex flex-col items-center text-gray-600 hover:text-green-600 transition-all duration-200 p-2 rounded-xl hover:bg-green-50 relative"
            >
              <UserIcon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Dashboard</span>
              {ticketCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center shadow-lg font-bold">
                  {ticketCount}
                </div>
              )}
            </Link>
          ) : (
            <Link 
              href="/login" 
              className="flex flex-col items-center text-gray-600 hover:text-green-600 transition-all duration-200 p-2 rounded-xl hover:bg-green-50"
            >
              <UserIcon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Sign In</span>
            </Link>
          )
        )}
      </nav>
    </>
  );
} 