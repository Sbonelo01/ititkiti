"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

export default function EventDetailClient({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showPaystack, setShowPaystack] = useState(false);
  const [paystackReference, setPaystackReference] = useState<string>("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const router = useRouter();
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const loadEventData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (!data) return;
      setEvent(data);
    } catch {
      // Optionally handle error
    }
  }, [eventId]);

  useEffect(() => {
    const loadEventAndCheckAuth = async () => {
      try {
        await loadEventData();
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user as User | null);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    loadEventAndCheckAuth();
  }, [eventId, loadEventData]);

  const handlePurchase = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (ticketQuantity < 1) {
      setPurchaseError('Please select at least 1 ticket');
      return;
    }
    setPaystackReference(`EVT-${eventId}-${user.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    setShowPaystack(true);
    setPurchaseError(null);
  };

  const handlePaystackSuccess = async (reference: string) => {
    setVerifyingPayment(true);
    setShowPaystack(false);
    setPurchaseError(null);
    setPurchaseSuccess(false);
    try {
      const res = await fetch("/api/purchase-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          eventId,
          quantity: ticketQuantity,
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

  const SERVICE_FEE_FIXED = 10;
  const serviceFee = event ? SERVICE_FEE_FIXED * ticketQuantity : 0;
  const totalWithFee = event ? (event.price * ticketQuantity + serviceFee) : 0;

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
            <p className="text-gray-600 mb-4">You have purchased {ticketQuantity} ticket(s) for {event.title}</p>
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
                href="/login"
                className="bg-green-500 text-white px-6 py-3 rounded-[10px] font-semibold hover:bg-green-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Sign In to Purchase
              </Link>
            )}
          </div>
          {/* --- SOCIAL SHARE BUTTONS --- */}
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <span className="text-white font-semibold">Share:</span>
            {/* Native share if available */}
            {typeof window !== 'undefined' && navigator.share ? (
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md flex items-center gap-2"
                onClick={() => {
                  navigator.share({
                    title: event.title,
                    text: event.description,
                    url: shareUrl,
                  });
                }}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 8a3 3 0 11-6 0 3 3 0 016 0zm6 8a3 3 0 11-6 0 3 3 0 016 0zm-6 4a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Share
              </button>
            ) : null}
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(event.title + '\n' + shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-semibold shadow-md flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.52 3.48A12.07 12.07 0 0012 0C5.37 0 0 5.37 0 12c0 2.12.55 4.19 1.6 6.01L0 24l6.18-1.62A12.07 12.07 0 0012 24c6.63 0 12-5.37 12-12 0-3.21-1.25-6.23-3.48-8.52zM12 22c-1.85 0-3.68-.5-5.26-1.44l-.38-.22-3.67.96.98-3.58-.25-.37A9.94 9.94 0 012 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.2-7.6c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.41-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.18-.29.28-.48.09-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.62-.47-.16-.01-.36-.01-.56-.01-.19 0-.5.07-.76.34-.26.27-1 1-.97 2.43.03 1.43 1.03 2.81 1.18 3.01.15.2 2.03 3.1 4.93 4.23.69.3 1.23.48 1.65.61.69.22 1.32.19 1.81.12.55-.08 1.65-.67 1.89-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33z" /></svg>
              WhatsApp
            </a>
            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.326 24H12.82v-9.294H9.692v-3.622h3.127V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg>
              Facebook
            </a>
            {/* Twitter/X */}
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(event.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold shadow-md flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 01-2.828.775 4.932 4.932 0 002.165-2.724c-.951.564-2.005.974-3.127 1.195a4.92 4.92 0 00-8.384 4.482C7.691 8.095 4.066 6.13 1.64 3.161c-.542.929-.856 2.01-.857 3.17 0 2.188 1.115 4.117 2.823 5.254a4.904 4.904 0 01-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.936 4.936 0 01-2.224.084c.627 1.956 2.444 3.377 4.6 3.417A9.867 9.867 0 010 21.543a13.94 13.94 0 007.548 2.209c9.058 0 14.009-7.513 14.009-14.009 0-.213-.005-.425-.014-.636A10.025 10.025 0 0024 4.557z"/></svg>
              X
            </a>
            {/* Copy link */}
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl font-semibold shadow-md flex items-center gap-2"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                alert('Link copied!');
              }}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5V3a1 1 0 00-1-1h-4a1 1 0 00-1 1v9m-4 4h16" /></svg>
              Copy Link
            </button>
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
                    <label htmlFor="quantity" className="block text-sm font-semibold text-gray-700 mb-3">
                      Number of Tickets
                    </label>
                    <select
                      id="quantity"
                      value={ticketQuantity}
                      onChange={(e) => setTicketQuantity(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg transition-all duration-200"
                    >
                      {[...Array(Math.min(10, event.total_tickets))].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'ticket' : 'tickets'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Price per ticket:</span>
                      <span className="font-semibold text-gray-800">{formatPrice(event.price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-semibold text-gray-800">{ticketQuantity}</span>
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

                  {purchaseError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-600 text-sm">{purchaseError}</p>
                    </div>
                  )}

                  <button
                    onClick={handlePurchase}
                    disabled={event.total_tickets === 0}
                    className="w-full bg-green-500 text-white py-4 rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {event.total_tickets === 0 ? 'Sold Out' : 'Purchase Tickets'}
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-gray-600 mb-4">Sign in to purchase tickets for this event.</p>
                    <Link
                      href="/login"
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
            />
          </div>
        </div>
      )}
      {verifyingPayment && <p>Verifying payment...</p>}
    </div>
  );
} 