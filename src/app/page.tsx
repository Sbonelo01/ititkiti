"use client";
import { useState, useEffect } from "react";
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

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPrice, setFilterPrice] = useState<string>("all");
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => 
        prev === Math.min(4, events.length - 1) ? 0 : prev + 1
      );
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [events.length]);

  const fetchEvents = async () => {
    try {
      console.log('Fetching events...'); // Debug log
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gt('total_tickets', 0) // Only events with tickets
        .order('date', { ascending: true });

      console.log('Query result:', { data, error }); // Debug log

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      console.log('Fetched events:', data); // Debug log
      setEvents(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesPrice = true;
    if (filterPrice === "free") {
      matchesPrice = event.price === 0;
    } else if (filterPrice === "paid") {
      matchesPrice = event.price > 0;
    }

    return matchesSearch && matchesPrice;
  });

  const latestEvents = events.slice(0, 5); // Get the 5 latest events
  const otherEvents = filteredEvents.filter(event => !latestEvents.find(latest => latest.id === event.id));

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
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
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Tikiti</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/events"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                All Events
              </Link>
              <Link
                href="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Latest Events Carousel */}
      {latestEvents.length > 0 && (
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">Latest Events</h2>
              <p className="text-xl text-blue-100 mb-6">Discover the newest events happening around you</p>
              <Link
                href="/events"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors"
              >
                View All Events
                <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
            
            <div className="relative">
              <div className="overflow-hidden rounded-lg">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentCarouselIndex * 100}%)` }}
                >
                  {latestEvents.map((event, index) => (
                    <div key={event.id} className="w-full flex-shrink-0">
                      <div className="bg-white rounded-lg shadow-xl p-8 mx-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                          <div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h3>
                            <p className="text-gray-600 mb-6 line-clamp-3">{event.description}</p>
                            <div className="space-y-3 mb-6">
                              <div className="flex items-center text-gray-500">
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(event.date)}
                              </div>
                              <div className="flex items-center text-gray-500">
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {event.location}
                              </div>
                              <div className="flex items-center text-gray-500">
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                {event.total_tickets} tickets available
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-blue-600">{formatPrice(event.price)}</span>
                              <Link
                                href={`/events/${event.id}`}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                              >
                                Get Tickets
                              </Link>
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8">
                            <div className="text-center">
                              <div className="text-6xl font-bold text-blue-600 mb-2">{event.total_tickets}</div>
                              <div className="text-gray-600">Tickets Available</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Carousel Navigation */}
              <div className="flex justify-center mt-6 space-x-2">
                {latestEvents.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCarouselIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentCarouselIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* All Events Section */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">All Events</h2>
          
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Prices</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {otherEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No events found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {otherEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{event.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(event.date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      {event.total_tickets} tickets available
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-blue-600">
                      {formatPrice(event.price)}
                    </span>
                    <Link
                      href={`/events/${event.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
