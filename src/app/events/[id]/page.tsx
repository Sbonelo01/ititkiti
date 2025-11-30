"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import Image from "next/image";
import { CalendarIcon, MapPinIcon, TicketIcon, ClockIcon } from '@heroicons/react/24/outline';
import PaystackPaymentButton from "@/components/PaystackButton";

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

export default function EventDetail() {
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>({});
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
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
      setPurchaseError('Please select at least 1 ticket');
      return;
    }

    // Validate quantities don't exceed available
    for (const ticketType of ticketTypes) {
      const selectedQty = ticketSelections[ticketType.id] || 0;
      if (selectedQty > ticketType.available_quantity) {
        setPurchaseError(`${ticketType.name}: Only ${ticketType.available_quantity} tickets available`);
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
      // Convert selections to array format
      const ticketSelectionsArray: TicketSelection[] = Object.entries(ticketSelections)
        .filter(([, qty]) => qty > 0)
        .map(([ticketTypeId, quantity]) => ({
          ticketTypeId,
          quantity,
        }));

      const res = await fetch("/api/purchase-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          eventId,
          ticketSelections: ticketSelectionsArray,
          user: {
            email: user?.email,
            name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Attendee',
            userId: user?.id,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadEventData();
        setPurchaseSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setPurchaseError(data.error || 'Payment verification or ticket creation failed.');
      }
    } catch {
      setPurchaseError('Failed to verify payment or create tickets. Please try again.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handlePaystackClose = () => {
    setShowPaystack(false);
    setPurchaseError('Payment popup closed.');
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

  // Service fee constants
  const SERVICE_FEE_FIXED = 10;

  // Calculate service fee and total
  const totalQuantity = getTotalQuantity();
  const subtotal = getTotalPrice();
  const serviceFee = SERVICE_FEE_FIXED * totalQuantity;
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
            <p className="text-gray-600 mb-6">The event you&apos;re looking for doesn&apos;t exist.</p>
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
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-green-500 text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Tickets Purchased Successfully!</h2>
            <p className="text-gray-600 mb-4">You have purchased {totalQuantity} ticket(s) for {event.title}</p>
            <p className="text-gray-500 text-sm">Redirecting to your dashboard...</p>
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
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-600 text-sm">{purchaseError}</p>
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
      {verifyingPayment && <p>Verifying payment...</p>}
    </div>
  );
}