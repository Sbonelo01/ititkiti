"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import Image from "next/image";
import { CalendarIcon, MapPinIcon, TicketIcon, ClockIcon } from '@heroicons/react/24/outline';
import PaystackPaymentButton from "@/components/PaystackButton";
import { SERVICE_FEE_PER_TICKET } from "@/constants/pricing";

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
    setPaystackReference(`EVT-${eventId}-${user.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Hero Section with Event Poster */}
      <div className="relative min-h-[20vh]">
        {event.poster_url ? (
          <div className="absolute inset-0">
            <Image
              src={event.poster_url}
              alt={event.title + ' poster'}
              fill
              className="object-cover"
              priority={true}
            />
            <div className="absolute inset-0 bg-green-500 bg-opacity-40"></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600"></div>
        )}
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/events"
              className="inline-flex items-center text-white hover:text-green-300 transition-colors duration-200 font-medium"
            >
              ← Back to Events
            </Link>
            {!user && (
              <Link
                href={`/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`}
                className="bg-green-500 text-white px-6 py-3 rounded-[10px] font-semibold hover:bg-green-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Sign In to Purchase
              </Link>
            )}
          </div>
          
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                <span className="font-medium">{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                <span className="font-medium">{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <TicketIcon className="h-5 w-5" />
                <span className="font-medium">{event.total_tickets} tickets available</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Poster Display */}
            {event.poster_url && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
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

            {/* Description Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">About This Event</h2>
              <p className="text-gray-600 leading-relaxed text-lg">{event.description}</p>
            </div>

            {/* Event Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <CalendarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Date & Time</h3>
                </div>
                <p className="text-gray-600">{formatDate(event.date)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <MapPinIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Location</h3>
                </div>
                <p className="text-gray-600">{event.location}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <TicketIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Ticket Price</h3>
                </div>
                <p className="text-green-600 font-bold text-2xl">{formatPrice(event.price)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <ClockIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Available Tickets</h3>
                </div>
                <p className="text-gray-600 text-2xl font-bold">{event.total_tickets} tickets</p>
              </div>
            </div>
          </div>

          {/* Purchase Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-2xl p-8 sticky top-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Get Your Tickets</h2>
                <p className="text-gray-600">Secure your spot at this amazing event</p>
              </div>
              
              {user ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Select Tickets
                    </label>
                    <div className="space-y-4">
                      {ticketTypes.map((ticketType) => (
                        <div
                          key={ticketType.id}
                          className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 hover:border-green-300 transition-all duration-200"
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
                              className="w-8 h-8 rounded-lg bg-white border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              −
                            </button>
                            <span className="w-12 text-center font-semibold text-gray-800">
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
                              className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {totalQuantity > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold text-gray-800">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Service fee (R10/ticket):</span>
                        <span className="font-semibold text-gray-800">{formatPrice(serviceFee)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-800">Total:</span>
                          <span className="text-2xl font-bold text-green-600">{formatPrice(totalWithFee)}</span>
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

                  <button
                    onClick={handlePurchase}
                    disabled={totalQuantity === 0 || ticketTypes.every(tt => tt.available_quantity === 0)}
                    className="w-full bg-green-500 text-white py-4 rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {ticketTypes.every(tt => tt.available_quantity === 0) ? 'Sold Out' : 'Purchase Tickets'}
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-gray-600 mb-4">Sign in to purchase tickets for this event.</p>
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`}
                      className="w-full bg-green-500 text-white py-4 rounded-xl hover:bg-green-600 font-bold text-lg inline-block transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Sign In to Purchase
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showPaystack && paystackReference && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-grey bg-opacity-30">
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
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-green-200 shadow-lg py-4 px-4 text-center">
          <p className="text-green-800 font-medium">Confirming your payment and issuing your tickets…</p>
          <p className="text-gray-600 text-sm mt-1">This usually takes a few seconds.</p>
        </div>
      )}
    </div>
  );
}