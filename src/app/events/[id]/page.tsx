"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  total_tickets: number;
  organizer_id: string;
}

export default function EventDetail() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  useEffect(() => {
    const loadEventAndCheckAuth = async () => {
      try {
        // Load event data
        await loadEventData();
        
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to load event');
        setLoading(false);
      }
    };

    loadEventAndCheckAuth();
  }, [eventId]);

  const loadEventData = async () => {
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
  };

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
      console.log('Purchasing tickets:', {
        eventId,
        userId: user.id,
        quantity: ticketQuantity,
        totalPrice: event!.price * ticketQuantity
      });

      // Create tickets in the database matching the actual schema
      const tickets = [];
      for (let i = 0; i < ticketQuantity; i++) {
        tickets.push({
          event_id: eventId,
          attendee_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Attendee',
          email: user.email,
          qr_code_data: `TICKET-${eventId}-${user.id}-${Date.now()}-${i}`, // Generate unique QR code data
          used: false,
          payment_status: 'paid', // Assuming payment is successful for now
          created_at: new Date().toISOString()
        });
      }

      console.log('Attempting to insert tickets:', tickets); // Debug log

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert(tickets)
        .select(); // Add select to see what was inserted

      console.log('Ticket insertion result:', { ticketData, ticketError }); // Debug log

      if (ticketError) {
        console.error('Error creating tickets:', ticketError);
        console.error('Error details:', {
          message: ticketError.message,
          details: ticketError.details,
          hint: ticketError.hint,
          code: ticketError.code
        });
        throw new Error(`Failed to create tickets: ${ticketError.message}`);
      }

      // Update event ticket count (reduce available tickets)
      const { error: eventError } = await supabase
        .from('events')
        .update({ total_tickets: event!.total_tickets - ticketQuantity })
        .eq('id', eventId);

      if (eventError) {
        console.error('Error updating event:', eventError);
        // Note: We don't throw here as tickets were already created
      }

      console.log('Tickets purchased successfully!', ticketData);
      setPurchaseSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Purchase error:', error);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The event you\'re looking for doesn\'t exist.'}</p>
          <Link
            href="/events"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (purchaseSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tickets Purchased Successfully!</h2>
          <p className="text-gray-600 mb-4">You have purchased {ticketQuantity} ticket(s) for {event.title}</p>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link
                href="/events"
                className="text-blue-600 hover:text-blue-700 mb-2 inline-block"
              >
                ← Back to Events
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            </div>
            {!user && (
              <Link
                href="/"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Event Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600">{event.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Date & Time</h3>
                      <p className="text-gray-600">{formatDate(event.date)}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Location</h3>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Ticket Price</h3>
                      <p className="text-gray-600">{formatPrice(event.price)}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Available Tickets</h3>
                      <p className="text-gray-600">{event.total_tickets} tickets</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchase Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Purchase Tickets</h2>
                
                {user ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Tickets
                      </label>
                      <select
                        id="quantity"
                        value={ticketQuantity}
                        onChange={(e) => setTicketQuantity(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[...Array(Math.min(10, event.total_tickets))].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} {i === 0 ? 'ticket' : 'tickets'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Price per ticket:</span>
                        <span className="font-medium">{formatPrice(event.price)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-medium">{ticketQuantity}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total:</span>
                        <span className="text-blue-600">{formatPrice(totalPrice)}</span>
                      </div>
                    </div>

                    {purchaseError && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                        {purchaseError}
                      </div>
                    )}

                    <button
                      onClick={handlePurchase}
                      disabled={purchasing}
                      className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {purchasing ? 'Processing Purchase...' : 'Purchase Tickets'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Sign in to purchase tickets for this event.</p>
                    <Link
                      href="/"
                      className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-medium inline-block"
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