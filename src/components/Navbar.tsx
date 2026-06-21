"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";
import { 
  HomeIcon, 
  CalendarIcon, 
  UserIcon, 
  ArrowRightOnRectangleIcon,
  TicketIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import { CtaLink } from "@/components/ui/CtaButton";

function mobileNavLinkClass(active: boolean) {
  return `flex flex-col items-center justify-center gap-0.5 min-w-[4rem] py-2 rounded-xl transition-colors duration-200 touch-target ${
    active ? "text-green-600 bg-green-50" : "text-gray-600 hover:text-green-600 hover:bg-green-50/80"
  }`;
}

export default function Navbar() {
  const pathname = usePathname();
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

  const isHomeActive = pathname === "/";
  const isEventsActive = pathname === "/events" || pathname.startsWith("/events/");
  const isSellActive = pathname.startsWith("/dashboard/create-event");
  const isAccountActive =
    pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/create-event");

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-white/95 backdrop-blur-sm shadow-lg z-50 flex items-center justify-between px-4 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-10 w-10 flex items-center justify-center">
            <Image 
              src="/tikiti-logo.png" 
              alt="Tikiti Logo" 
              width={80} 
              height={80} 
              className="object-contain"
            />
          </div>
        </Link>
        
        <div className="flex items-center gap-2">
          {!loading && user && ticketCount > 0 && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1 bg-green-100 px-3 py-1.5 rounded-lg touch-target"
              aria-label={`${ticketCount} tickets in dashboard`}
            >
              <TicketIcon className="h-4 w-4 text-green-600" />
              <span className="text-green-700 font-semibold text-sm">{ticketCount}</span>
            </Link>
          )}
          {!loading && (
            user ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-green-700 px-3 py-2 rounded-lg hover:bg-green-50 touch-target"
              >
                Dashboard
              </Link>
            ) : (
              <CtaLink href="/login" variant="primary" className="py-2 px-4 text-sm">
                Sign in
              </CtaLink>
            )
          )}
        </div>
      </header>

      {/* Desktop Navbar */}
      <nav className="hidden md:flex fixed top-0 left-0 w-full h-20 bg-white/95 backdrop-blur-sm shadow-xl z-50 items-center justify-between px-8 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-12 w-12 flex items-center justify-center transition-all duration-200">
            <Image 
              src="/tikiti-logo.png" 
              alt="Tikiti Logo" 
              width={80} 
              height={80} 
              className="object-contain"
            />
          </div>
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
            className="text-gray-700 hover:text-green-600 font-medium transition-colors duration-200 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-green-50 cursor-pointer"
          >
            <CalendarIcon className="h-5 w-5" />
            Buy tickets
          </Link>

          <CtaLink href="/dashboard/create-event" variant="primary" className="py-2.5 px-5 text-sm">
            <PlusCircleIcon className="h-5 w-5" aria-hidden />
            Sell tickets
          </CtaLink>
          
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
                  className="text-gray-600 hover:text-green-700 font-medium px-4 py-2 rounded-xl hover:bg-green-50 transition-colors duration-200 cursor-pointer flex items-center gap-2"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <CtaLink href="/login" variant="primary" className="py-2.5 px-5 text-sm">
                <UserIcon className="h-5 w-5" />
                Sign in
              </CtaLink>
            )
          )}
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-50 border-t border-gray-100 mobile-bottom-nav"
        aria-label="Main navigation"
      >
        <div className="flex items-end justify-around h-16 px-1 max-w-lg mx-auto">
          <Link href="/" className={mobileNavLinkClass(isHomeActive)}>
            <HomeIcon className="h-6 w-6" aria-hidden />
            <span className="text-[11px] font-semibold">Home</span>
          </Link>

          <Link href="/events" className={mobileNavLinkClass(isEventsActive)}>
            <TicketIcon className="h-6 w-6" aria-hidden />
            <span className="text-[11px] font-semibold">Buy</span>
          </Link>

          <Link
            href="/dashboard/create-event"
            className={`relative -top-3 flex flex-col items-center touch-target ${isSellActive ? "text-green-700" : "text-green-600"}`}
            aria-label="Sell tickets"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg ring-4 ring-white hover:bg-green-700 transition-colors">
              <PlusCircleIcon className="h-7 w-7" aria-hidden />
            </span>
            <span className="text-[11px] font-bold mt-1">Sell</span>
          </Link>

          {!loading ? (
            user ? (
              <Link href="/dashboard" className={`${mobileNavLinkClass(isAccountActive)} relative`}>
                <UserIcon className="h-6 w-6" aria-hidden />
                <span className="text-[11px] font-semibold">You</span>
                {ticketCount > 0 && (
                  <span className="absolute top-0 right-2 bg-green-600 text-white text-[10px] rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-bold">
                    {ticketCount > 99 ? "99+" : ticketCount}
                  </span>
                )}
              </Link>
            ) : (
              <Link href="/login" className={mobileNavLinkClass(pathname === "/login")}>
                <UserIcon className="h-6 w-6" aria-hidden />
                <span className="text-[11px] font-semibold">Sign in</span>
              </Link>
            )
          ) : (
            <Link href="/login" className={mobileNavLinkClass(false)}>
              <UserIcon className="h-6 w-6" aria-hidden />
              <span className="text-[11px] font-semibold">Sign in</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
