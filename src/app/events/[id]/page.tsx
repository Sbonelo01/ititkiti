"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import Image from "next/image";
import { CalendarIcon, MapPinIcon, TicketIcon, ShieldCheckIcon, QrCodeIcon, ArrowTopRightOnSquareIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import PaystackPaymentButton from "@/components/PaystackButton";
import { CtaLink, CtaButton } from "@/components/ui/CtaButton";
import EventShareBar from "@/components/EventShareBar";
import { buildAppleMapsSearchUrl, buildGoogleMapsSearchUrl } from "@/utils/mapsLinks";
import { SERVICE_FEE_PER_TICKET } from "@/constants/pricing";
import { buildPaystackReference } from "@/utils/paystackChargeMetadata";

interface Event {
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

interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity: number;
  available_quantity: number;
  description?: string;
}

interface TicketSelection {
  ticketTypeId: string;
  quantity: number;
}

/** Shown on the post-checkout success screen (after Paystack and API confirm). */
const PURCHASE_SUCCESS_MESSAGE =
  "Thank you for your purchase. Please view your dashboard for your ticket(s)—you'll find your QR codes and details there. We're taking you to your dashboard now.";

type PurchaseErrorState = {
  headline: string;
  text?: string;
  detail?: string;
};

function buildPurchaseFailureState(data: {
  error?: string;
  details?: string;
}): PurchaseErrorState {
  const base = (data.error || "").trim() || "Something went wrong while completing your order.";
  const detail = typeof data.details === "string" && data.details.trim() ? data.details.trim() : undefined;

  if (base.toLowerCase().includes("payment verification failed")) {
    return {
      headline: "Payment could not be confirmed",
      text: "We couldn't verify this payment with the provider. You may not have been charged. Please try again, or use a different payment method.",
    };
  }
  if (base.toLowerCase().includes("not enough tickets")) {
    return {
      headline: "Not enough tickets left",
      text: "These tickets are no longer available in the quantity you selected. If you were charged, please contact support and quote your payment reference so we can help.",
    };
  }
  if (base.toLowerCase().includes("not deployed") || (detail && detail.toLowerCase().includes("finalize_ticket_purchase"))) {
    return {
      headline: "We're finishing setup",
      text: "Your payment may have gone through, but the server could not issue tickets. Please contact support with your Paystack reference—we'll sort it out right away.",
      detail,
    };
  }
  if (base.toLowerCase().includes("atomic purchase")) {
    return {
      headline: "We couldn't add your tickets yet",
      text: "The payment may have been taken. Check your email or bank statement, then open your dashboard. If you don't see tickets, contact support with the payment reference from Paystack.",
      detail,
    };
  }

  return {
    headline: "We couldn't complete your purchase",
    text: base === "Failed to finalize purchase" || !base
      ? "We couldn't issue your tickets after payment. Check your dashboard in a few minutes, or contact support with your payment reference if tickets don't appear."
      : base,
    detail,
  };
}

export default function EventDetail() {
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>({});
  const [purchaseError, setPurchaseError] = useState<PurchaseErrorState | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showPaystack, setShowPaystack] = useState(false);
  const [paystackReference, setPaystackReference] = useState<string>("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [locationCopied, setLocationCopied] = useState(false);
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const eventId = params.id as string;

  const loadEventData = useCallback(async () => {
    try {
      console.log('Loading event details for ID:', eventId);
      
      // Load event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      console.log('Event details result:', { eventData });

      if (!eventData) {
        console.error('Error loading event: No data returned');
        return;
      }

      setEvent(eventData);

      // Load ticket types
      const { data: ticketTypesData } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', eventId)
        .order('price', { ascending: true });

      if (ticketTypesData && ticketTypesData.length > 0) {
        setTicketTypes(ticketTypesData);
        // Initialize selections with first ticket type
        const initialSelections: Record<string, number> = {};
        ticketTypesData.forEach((tt) => {
          initialSelections[tt.id] = 0;
        });
        setTicketSelections(initialSelections);
      } else {
        // Fallback: create a default ticket type from event data (for backward compatibility)
        setTicketTypes([{
          id: 'default',
          event_id: eventId,
          name: 'General',
          price: eventData.price,
          quantity: eventData.total_tickets,
          available_quantity: eventData.total_tickets,
        }]);
        setTicketSelections({ 'default': 0 });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [eventId]);

  useEffect(() => {
    const loadEventAndCheckAuth = async () => {
      try {
        await loadEventData();
        
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user as User | null);
        
        setLoading(false);
      } catch (e) {
        console.error('Error:', e);
        setLoading(false);
      }
    };

    loadEventAndCheckAuth();
  }, [eventId, loadEventData]);

  const handleTicketQuantityChange = (ticketTypeId: string, quantity: number) => {
    setTicketSelections((prev) => ({
      ...prev,
      [ticketTypeId]: Math.max(0, quantity),
    }));
  };

  const getTotalQuantity = () => {
    return Object.values(ticketSelections).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return ticketTypes.reduce((total, ticketType) => {
      const quantity = ticketSelections[ticketType.id] || 0;
      return total + (ticketType.price * quantity);
    }, 0);
  };

  const handlePurchase = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const totalQty = getTotalQuantity();
    if (totalQty < 1) {
      setPurchaseError({
        headline: "No tickets selected",
        text: "Please choose at least one ticket to continue.",
      });
      return;
    }

    // Validate quantities don't exceed available
    for (const ticketType of ticketTypes) {
      const selectedQty = ticketSelections[ticketType.id] || 0;
      if (selectedQty > ticketType.available_quantity) {
        setPurchaseError({
          headline: "Not enough tickets in stock",
          text: `For “${ticketType.name}” you can only select up to ${ticketType.available_quantity} ticket(s) right now.`,
        });
        return;
      }
    }

    // Instead of proceeding, trigger Paystack payment
    setPaystackReference(buildPaystackReference(eventId, user.id));
    setShowPaystack(true);
    setPurchaseError(null);
  };

  // Called after successful Paystack payment
  const handlePaystackSuccess = async (reference: string) => {
    setVerifyingPayment(true);
    setShowPaystack(false);
    setPurchaseError(null);
    setPurchaseSuccess(false);
    try {
      // New format uses real ticket_type UUIDs. The UI fallback "default" is not a DB row — use legacy quantity path.
      const totalForPurchase = getTotalQuantity();
      const usesSyntheticDefault =
        ticketTypes.length === 1 && ticketTypes[0].id === "default";
      const ticketSelectionsArray: TicketSelection[] = Object.entries(ticketSelections)
        .filter(([, qty]) => qty > 0)
        .map(([ticketTypeId, quantity]) => ({
          ticketTypeId,
          quantity,
        }));

      const res = await fetch("/api/purchase-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          usesSyntheticDefault
            ? {
                reference,
                eventId,
                quantity: totalForPurchase,
                user: {
                  email: user?.email,
                  name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Attendee",
                  userId: user?.id,
                },
              }
            : {
                reference,
                eventId,
                ticketSelections: ticketSelectionsArray,
                user: {
                  email: user?.email,
                  name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Attendee",
                  userId: user?.id,
                },
              }
        ),
      });
      const data = await res.json();
      if (data.success) {
        await loadEventData();
        setPurchaseSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setPurchaseError(buildPurchaseFailureState(data));
      }
    } catch {
      setPurchaseError({
        headline: "We couldn't connect to the server",
        text: "Your payment may still have gone through. Check your dashboard, or try again. If a charge appears but you have no tickets, contact support with your reference.",
      });
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handlePaystackClose = () => {
    setShowPaystack(false);
    setPurchaseError({
      headline: "Payment window closed",
      text: "If you already completed payment, your tickets will show on your dashboard shortly. If not, tap Purchase tickets to try again.",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateCompact = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyLocation = async () => {
    if (!event?.location) return;
    try {
      await navigator.clipboard.writeText(event.location);
      setLocationCopied(true);
      window.setTimeout(() => setLocationCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const mapsGoogleUrl = event ? buildGoogleMapsSearchUrl(event.location) : "";
  const mapsAppleUrl = event ? buildAppleMapsSearchUrl(event.location) : "";
  const lowestTicketPrice =
    ticketTypes.length > 0
      ? Math.min(...ticketTypes.map((t) => t.price))
      : event?.price ?? 0;

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `R${price.toFixed(2)}`;
  };

  // Calculate service fee and total
  const totalQuantity = getTotalQuantity();
  const subtotal = getTotalPrice();
  const serviceFee = SERVICE_FEE_PER_TICKET * totalQuantity;
  const totalWithFee = subtotal + serviceFee;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Event Not Found</h2>
            <p className="text-gray-600 mb-6">The event you are looking for does not exist.</p>
            <Link
              href="/events"
              className="inline-flex items-center text-green-500 hover:text-green-600 transition-colors duration-200 font-semibold"
            >
              ← Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (purchaseSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-green-500 text-5xl mb-4" aria-hidden>✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Purchase complete</h2>
            <p className="text-gray-700 leading-relaxed mb-2">{PURCHASE_SUCCESS_MESSAGE}</p>
            <p className="text-gray-500 text-sm mt-4">Event: {event.title}</p>
            <p className="text-gray-400 text-xs mt-2">Redirecting to your dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-32 lg:pb-0">
      {/* Hero */}
      <div className="relative min-h-[28vh] sm:min-h-[32vh]">
        {event.poster_url ? (
          <div className="absolute inset-0">
            <Image
              src={event.poster_url}
              alt={event.title + ' poster'}
              fill
              className="object-cover"
              priority={true}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 via-green-900/50 to-green-900/30" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-800" />
        )}
        
        <div className="relative z-10 max-w-3xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-6 sm:pb-8">
          <Link
            href="/events"
            className="inline-flex items-center text-white/90 hover:text-white text-sm font-medium mb-4 touch-target"
          >
            ← Back to events
          </Link>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            {event.title}
          </h1>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1.5 text-sm text-white">
              <CalendarIcon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="sm:hidden">{formatDateCompact(event.date)}</span>
              <span className="hidden sm:inline">{formatDate(event.date)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1.5 text-sm text-white max-w-full">
              <TicketIcon className="h-4 w-4 shrink-0" aria-hidden />
              From {formatPrice(lowestTicketPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Location — easy to find */}
      <section
        id="event-location"
        className="max-w-3xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-3 relative z-20 mb-5 sm:mb-8"
        aria-labelledby="event-location-heading"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <MapPinIcon className="h-6 w-6" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p id="event-location-heading" className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-0.5">
                Event location
              </p>
              <p className="text-base sm:text-lg font-semibold text-gray-900 leading-snug break-words">
                {event.location}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
            <a
              href={mapsGoogleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors touch-target"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
              Open in Google Maps
            </a>
            <a
              href={mapsAppleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-100 transition-colors touch-target sm:hidden"
            >
              Open in Apple Maps
            </a>
            <button
              type="button"
              onClick={copyLocation}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors touch-target"
            >
              <ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
              {locationCopied ? "Copied!" : "Copy address"}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-3xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
          {/* Event Details — below tickets on mobile */}
          <div className="lg:col-span-2 space-y-5 order-2 lg:order-1">
            {event.poster_url && (
              <div className="hidden lg:block bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                <Image
                  src={event.poster_url}
                  alt={event.title + ' poster'}
                  width={800}
                  height={400}
                  className="w-full h-64 md:h-80 object-cover"
                  priority={true}
                />
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">About this event</h2>
              <p className="text-gray-600 leading-relaxed text-base">{event.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-5 w-5 text-green-600" aria-hidden />
                  <h3 className="text-sm font-semibold text-gray-800">When</h3>
                </div>
                <p className="text-sm text-gray-600 leading-snug">{formatDateCompact(event.date)}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TicketIcon className="h-5 w-5 text-purple-600" aria-hidden />
                  <h3 className="text-sm font-semibold text-gray-800">Tickets</h3>
                </div>
                <p className="text-sm text-gray-600">
                  From <span className="font-bold text-green-600">{formatPrice(lowestTicketPrice)}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">{event.total_tickets} total</p>
              </div>
            </div>
          </div>

          {/* Purchase — first in grid on mobile (after location strip) */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 lg:sticky lg:top-24 border border-green-100">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900">Get tickets</h2>
                <p className="text-gray-500 text-sm mt-1">Instant QR codes after payment</p>
              </div>
              
              {user ? (
                <div className="space-y-5">
                  <ul className="flex flex-wrap gap-2 text-xs text-gray-600">
                    <li className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1">
                      <QrCodeIcon className="h-3.5 w-3.5 text-green-600" aria-hidden />
                      Instant QR delivery
                    </li>
                    <li className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1">
                      <ShieldCheckIcon className="h-3.5 w-3.5 text-green-600" aria-hidden />
                      Secure Paystack payment
                    </li>
                  </ul>
                  <div>
                    <p className="block text-sm font-semibold text-gray-800 mb-3">
                      Choose tickets
                    </p>
                    <div className="space-y-3">
                      {ticketTypes.map((ticketType) => (
                        <div
                          key={ticketType.id}
                          className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800">{ticketType.name}</h3>
                              <p className="text-green-600 font-bold text-lg mt-1">
                                {formatPrice(ticketType.price)}
                              </p>
                              {ticketType.description && (
                                <p className="text-sm text-gray-600 mt-1">{ticketType.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {ticketType.available_quantity} available
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleTicketQuantityChange(
                                  ticketType.id,
                                  (ticketSelections[ticketType.id] || 0) - 1
                                )
                              }
                              disabled={(ticketSelections[ticketType.id] || 0) === 0}
                              className="w-11 h-11 rounded-lg bg-white border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium touch-target"
                            >
                              −
                            </button>
                            <span className="w-12 text-center font-semibold text-gray-800 text-lg">
                              {ticketSelections[ticketType.id] || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleTicketQuantityChange(
                                  ticketType.id,
                                  (ticketSelections[ticketType.id] || 0) + 1
                                )
                              }
                              disabled={
                                (ticketSelections[ticketType.id] || 0) >= ticketType.available_quantity
                              }
                              className="w-11 h-11 rounded-lg bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium touch-target"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {totalQuantity > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold text-gray-800">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Service fee (R10/ticket):</span>
                        <span className="font-semibold text-gray-800">{formatPrice(serviceFee)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800">Total</span>
                          <span className="text-xl font-bold text-green-600">{formatPrice(totalWithFee)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {purchaseError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4" role="alert">
                      <p className="text-red-800 font-semibold text-sm">{purchaseError.headline}</p>
                      {purchaseError.text && (
                        <p className="text-red-700 text-sm mt-1 leading-relaxed">{purchaseError.text}</p>
                      )}
                      {purchaseError.detail && (
                        <p className="text-red-600/90 text-xs mt-2 font-mono break-words">
                          {purchaseError.detail}
                        </p>
                      )}
                    </div>
                  )}

                  <CtaButton
                    onClick={handlePurchase}
                    disabled={totalQuantity === 0 || ticketTypes.every(tt => tt.available_quantity === 0)}
                    variant="primary"
                    className="w-full py-4 text-lg font-bold"
                  >
                    {ticketTypes.every(tt => tt.available_quantity === 0)
                      ? "Sold out"
                      : totalQuantity === 0
                        ? "Select tickets to continue"
                        : `Pay ${formatPrice(totalWithFee)} — get QR tickets`}
                  </CtaButton>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl bg-green-50 p-4 text-left space-y-2.5 border border-green-100">
                    <p className="font-semibold text-gray-900 text-sm">Sign in to checkout</p>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li className="flex items-start gap-2">
                        <ShieldCheckIcon className="h-4 w-4 text-green-600 shrink-0 mt-0.5" aria-hidden />
                        Secure checkout with Paystack
                      </li>
                      <li className="flex items-start gap-2">
                        <QrCodeIcon className="h-4 w-4 text-green-600 shrink-0 mt-0.5" aria-hidden />
                        QR tickets in your dashboard instantly
                      </li>
                      <li className="flex items-start gap-2">
                        <TicketIcon className="h-4 w-4 text-green-600 shrink-0 mt-0.5" aria-hidden />
                        No printing — paperless entry
                      </li>
                    </ul>
                  </div>
                  <CtaLink
                    href={`/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`}
                    variant="primary"
                    className="w-full py-3.5 text-base font-bold"
                  >
                    Sign in & buy tickets
                  </CtaLink>
                  <p className="text-xs text-gray-500 text-center">
                    New here?{" "}
                    <Link href={`/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`} className="text-green-700 font-medium hover:underline">
                      Create a free account
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section
        className="max-w-3xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"
        aria-label="Share this event"
      >
        <EventShareBar
          eventId={eventId}
          title={event.title}
          dateLabel={formatDateCompact(event.date)}
          location={event.location}
          priceLabel={`From ${formatPrice(lowestTicketPrice)}`}
        />
      </section>

      {user && totalQuantity > 0 && !showPaystack && (
        <div
          className="lg:hidden fixed left-0 right-0 z-40 border-t border-green-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] mobile-sticky-cta"
          role="region"
          aria-label="Purchase summary"
        >
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{totalQuantity} ticket{totalQuantity !== 1 ? "s" : ""}</p>
              <p className="text-lg font-bold text-green-700 truncate">{formatPrice(totalWithFee)}</p>
            </div>
            <CtaButton
              onClick={handlePurchase}
              variant="primary"
              className="shrink-0 px-5 py-3 font-bold"
            >
              Pay now
            </CtaButton>
          </div>
        </div>
      )}
      {!user && !showPaystack && (
        <div
          className="lg:hidden fixed left-0 right-0 z-40 border-t border-green-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] mobile-sticky-cta"
          role="region"
          aria-label="Sign in to purchase"
        >
          <CtaLink
            href={`/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`}
            variant="primary"
            className="w-full py-3.5 text-base font-bold max-w-lg mx-auto"
          >
            Sign in & buy tickets
          </CtaLink>
        </div>
      )}
      {showPaystack && paystackReference && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative flex flex-col items-center">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={handlePaystackClose}
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-xl font-bold mb-6 text-center text-gray-800">Complete Payment</h3>
            <PaystackPaymentButton
              email={user?.email || "guest@example.com"}
              amount={Math.round(totalWithFee * 100)} // Paystack expects cents
              reference={paystackReference}
              onSuccess={handlePaystackSuccess}
              onClose={handlePaystackClose}
              metadata={{
                event_id: eventId,
                event_title: event?.title || "Event",
                ticket_selections: Object.entries(ticketSelections)
                  .filter(([, qty]) => qty > 0)
                  .map(([ticketTypeId, qty]) => ({ ticketTypeId, quantity: qty })),
                quantity: totalQuantity,
                ...(user?.id ? { buyer_id: user.id } : {}),
                buyer_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Attendee",
                ...(user?.email ? { email: user.email } : {}),
                custom_fields: [
                  {
                    display_name: "Event ID",
                    variable_name: "event_id",
                    value: eventId,
                  },
                  {
                    display_name: "Event Title",
                    variable_name: "event_title",
                    value: event?.title || "Event",
                  },
                ],
              }}
            />
          </div>
        </div>
      )}
      {verifyingPayment && (
        <div className="fixed left-0 right-0 z-40 bg-white/95 border-t border-green-200 shadow-lg py-4 px-4 text-center mobile-sticky-cta lg:bottom-0" role="status" aria-live="polite">
          <p className="text-green-800 font-medium">Confirming your payment and issuing your tickets…</p>
          <p className="text-gray-600 text-sm mt-1">This usually takes a few seconds.</p>
        </div>
      )}
    </div>
  );
}