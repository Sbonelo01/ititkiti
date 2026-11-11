"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { getProductRole } from "@/utils/roles";
import { User } from "@supabase/supabase-js";
import {
  ArrowRightOnRectangleIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { LandingLink } from "@/components/landing/LandingLink";
import { SELL_PATH } from "@/constants/landing";

function mobileNavLinkClass(active: boolean) {
  return `flex flex-col items-center justify-center gap-0.5 min-w-[4rem] px-1 py-2 rounded-xl text-center text-[11px] font-bold leading-tight touch-target ${
    active ? "text-green-800 bg-green-50" : "text-gray-700 hover:text-green-800 hover:bg-green-50"
  }`;
}

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setUserRole(getProductRole(session?.user));
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setUserRole(getProductRole(session?.user));
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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (pathname === "/scan") return null;

  const isHomeActive = pathname === "/";
  const isEventsActive = pathname === "/events" || pathname.startsWith("/events/");
  const isSellActive = pathname === SELL_PATH || pathname.startsWith("/dashboard/create-event");
  const isAccountActive =
    pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/create-event");
  const pricingHref = pathname === SELL_PATH ? "/sell#pricing" : "/#pricing";

  const linkClass = (active: boolean) =>
    `rounded-full px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-green-50 hover:text-green-900 ${
      active ? "bg-green-50 text-green-900" : ""
    }`;

  return (
    <>
      <header className="fixed top-0 left-0 z-50 w-full border-b border-green-950/10 bg-[#F7FBF8]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:h-20 md:px-6">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Tikiti home">
            <Image
              src="/tikiti-wordmark.png"
              alt="tikiti."
              width={110}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {!loading && user && ticketCount > 0 && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 touch-target"
              aria-label={`${ticketCount} tickets in dashboard`}
            >
              <TicketIcon className="h-4 w-4 text-green-700" />
              <span className="text-sm font-semibold text-green-800">{ticketCount}</span>
            </Link>
          )}

          <button
            type="button"
            className="site-menu-button ml-auto inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-green-700 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>

          <nav
            id="primary-navigation"
            aria-label="Primary"
            className={
              menuOpen
                ? "absolute left-0 right-0 top-full z-50 flex flex-col gap-1 border-b border-gray-200 bg-white p-4 shadow-lg md:static md:ml-auto md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none"
                : "hidden md:ml-auto md:flex md:flex-row md:items-center md:gap-1"
            }
          >
            <Link href="/" className={linkClass(isHomeActive)} aria-current={isHomeActive ? "page" : undefined}>
              Home
            </Link>
            <Link href="/events" className={linkClass(isEventsActive)} aria-current={isEventsActive ? "page" : undefined}>
              Events
            </Link>
            <Link href={SELL_PATH} className={linkClass(isSellActive)} aria-current={isSellActive ? "page" : undefined}>
              For organizers
            </Link>
            <Link href={pricingHref} className={linkClass(false)}>
              Pricing
            </Link>
            {!loading && user ? (
              <Link href="/dashboard" className={linkClass(isAccountActive)}>
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className={linkClass(pathname === "/login")}>
                Sign in
              </Link>
            )}
            {!loading && user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-green-50 hover:text-green-900"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden />
                Sign out
              </button>
            )}
            <LandingLink href={SELL_PATH} className="mt-2 md:mt-0 md:ml-2">
              Start selling — free to list
            </LandingLink>
          </nav>
        </div>
      </header>

      <nav
        className="mobile-bottom-nav fixed bottom-0 left-0 z-50 w-full border-t border-gray-200 bg-white md:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-4 items-center gap-1 px-2">
          <Link href="/" className={mobileNavLinkClass(isHomeActive)}>
            Home
          </Link>
          <Link href="/events" className={mobileNavLinkClass(isEventsActive)}>
            Events
          </Link>
          <Link
            href={SELL_PATH}
            className={`flex h-full items-center justify-center rounded-xl px-2 text-center text-[11px] font-bold leading-tight text-white ${
              isSellActive ? "bg-green-700" : "bg-green-600"
            }`}
            aria-current={isSellActive ? "page" : undefined}
          >
            Sell — free to list
          </Link>
          {!loading && user ? (
            <Link href="/dashboard" className={mobileNavLinkClass(isAccountActive)}>
              You
            </Link>
          ) : (
            <Link href="/login" className={mobileNavLinkClass(pathname === "/login")}>
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
