"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import Image from "next/image";

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

export default function EventDetail() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const loadEventData = useCallback(async () => {
    try {
      console.log('Loading event details for ID:', eventId); // Debug log
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      console.log('Event details result:', { data, error }); // Debug log

      if (error || !data) {
        console.error('Error loading event:', error);
        setError('Event not found');
        return;
      }

      setEvent(data);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load event');
    }
  }, [eventId]);

  useEffect(() => {
    const loadEventAndCheckAuth = async () => {
      try {
        // Load event data
        await loadEventData();
        
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user as User | null);
        
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to load event');
        setLoading(false);
      }
    };

    loadEventAndCheckAuth();
  }, [eventId, loadEventData]);

  const handlePurchase = async () => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }

    if (ticketQuantity < 1) {
      setPurchaseError('Please select at least 1 ticket');
      return;
    }

    setPurchasing(true);
    setPurchaseError(null);

    try {
      // Call the RPC function directly to decrement tickets atomically
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('decrement_tickets', { event_id_param: eventId, quantity_param: ticketQuantity });

      if (rpcError || !rpcResult) {
        setPurchaseError('Not enough tickets available. Please try a lower quantity.');
        setPurchasing(false);
        return;
      }

      // Fetch the latest event data directly
      const { data: latestEvent, error: latestEventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (latestEventError || !latestEvent) {
        setPurchaseError('Error loading event data after purchase.');
        setPurchasing(false);
        return;
      }

      // Update the event state
      setEvent(latestEvent);

      // Create tickets in the database matching the actual schema
      const tickets = [];
      for (let i = 0; i < ticketQuantity; i++) {
        tickets.push({
          event_id: eventId,
          attendee_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Attendee',
          email: user.email,
          qr_code_data: `TICKET-${eventId}-${user.id}-${Date.now()}-${i}`,
          used: false,
          payment_status: 'paid',
          created_at: new Date().toISOString()
        });
      }

      const { error: ticketError } = await supabase
        .from('tickets')
        .insert(tickets)
        .select();

      if (ticketError) {
        setPurchaseError('Failed to create tickets. Please try again.');
        setPurchasing(false);
        return;
      }

      // Reload event data to reflect new ticket count
      await loadEventData();

      setPurchaseSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : 'Failed to purchase tickets. Please try again.');
    } finally {
      setPurchasing(false);
    }
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

  const totalPrice = event ? event.price * ticketQuantity : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <p className="mt-4 text-foreground">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-light mb-2">Event Not Found</h2>
          <p className="text-foreground mb-4">{error || 'The event you&apos;re looking for doesn&apos;t exist.'}</p>
                      <Link
              href="/events"
              className="text-green-500 hover:text-green-600 transition-colors duration-200 font-semibold"
            >
              ← Back to Events
            </Link>
        </div>
      </div>
    );
  }

  if (purchaseSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-spotify-green text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-text-light mb-2">Tickets Purchased Successfully!</h2>
          <p className="text-foreground mb-4">You have purchased {ticketQuantity} ticket(s) for {event.title}</p>
          <p className="text-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card-background shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link
                href="/events"
                className="text-green-500 hover:text-green-600 transition-colors duration-200 mb-2 inline-block"
              >
                ← Back to Events
              </Link>
              <h1 className="text-3xl font-bold text-text-light">{event.title}</h1>
            </div>
            {!user && (
              <Link
                href="/login"
                className="bg-green-500 text-white px-6 py-2 rounded-[10px] font-semibold hover:bg-green-700 transition-colors duration-200"
              >
                Sign In to Purchase
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Event Details */}
            <div className="lg:col-span-2">
              <div className="bg-card-background rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-semibold text-text-light mb-4">Event Details</h2>
                
                {event.poster_url && (
                  <Image
                    src={event.poster_url}
                    alt={event.title + ' poster'}
                    width={800}
                    height={400}
                    className="w-full max-h-96 object-cover rounded mb-8 border border-gray-600"
                    priority={true}
                  />
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-text-light mb-2">Description</h3>
                    <p className="text-foreground">{event.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium text-text-light mb-2">Date & Time</h3>
                      <p className="text-foreground">{formatDate(event.date)}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-text-light mb-2">Location</h3>
                      <p className="text-foreground">{event.location}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium text-text-light mb-2">Ticket Price</h3>
                      <p className="text-spotify-green font-semibold text-xl">{formatPrice(event.price)}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-text-light mb-2">Available Tickets</h3>
                      <p className="text-foreground">{event.total_tickets} tickets</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchase Section */}
            <div className="lg:col-span-1">
              <div className="bg-card-background rounded-lg shadow-xl p-6 sticky top-6">
                <h2 className="text-xl font-semibold text-text-light mb-4">Purchase Tickets</h2>
                
                {user ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-text-light mb-2">
                        Number of Tickets
                      </label>
                      <select
                        id="quantity"
                        value={ticketQuantity}
                        onChange={(e) => setTicketQuantity(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-input-background text-foreground border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-spotify-green"
                      >
                        {[...Array(Math.min(10, event.total_tickets))].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} {i === 0 ? 'ticket' : 'tickets'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t border-gray-800 pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-text-faded">Price per ticket:</span>
                        <span className="font-medium text-foreground">{formatPrice(event.price)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-text-faded">Quantity:</span>
                        <span className="font-medium text-foreground">{ticketQuantity}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span className="text-text-light">Total:</span>
                        <span className="text-spotify-green">{formatPrice(totalPrice)}</span>
                      </div>
                    </div>

                    {purchaseError && (
                      <div className="text-red-500 text-sm bg-red-900 bg-opacity-30 p-3 rounded-md border border-red-700">
                        {purchaseError}
                      </div>
                    )}

                    <button
                      onClick={handlePurchase}
                      disabled={purchasing || event.total_tickets === 0}
                      className="w-full bg-green-500 text-white py-3 rounded-[10px] hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors duration-200"
                    >
                      {event.total_tickets === 0 ? 'Sold Out' : (purchasing ? 'Processing Purchase...' : 'Purchase Tickets')}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-text-faded mb-4">Sign in to purchase tickets for this event.</p>
                    <Link
                      href="/login"
                      className="w-full bg-green-500 text-white py-3 rounded-[10px] hover:bg-green-700 font-semibold inline-block transition-colors duration-200"
                    >
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}