"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { 
  CalendarIcon, 
  MapPinIcon, 
  TicketIcon, 
  MagnifyingGlassIcon,
  ArrowRightIcon,
  UserIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  total_tickets: number;
  organizer_id: string;
  // Assuming a poster_url might be present from the CreateEvent page
  poster_url?: string; 
}

export default function EventsPage() {
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
    if (events.length > 0) {
      const interval = setInterval(() => {
        setCurrentCarouselIndex((prev) =>
          prev === Math.min(4, events.length - 1) ? 0 : prev + 1
        );
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [events.length]);

  const fetchEvents = async () => {
    try {
      console.log('Fetching events...'); // Debug log
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

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

  const latestEvents = events.slice(0, Math.min(5, events.length));
  const allEvents = filteredEvents;

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
  
      {/* Latest Events Carousel Section */}
      {latestEvents.length > 0 && (
        <section className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 py-16 shadow-2xl relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-bounce"></div>
            <div className="absolute top-20 right-20 w-16 h-16 bg-green-200 rounded-full animate-pulse"></div>
            <div className="absolute bottom-10 left-1/4 w-12 h-12 bg-emerald-200 rounded-full animate-spin"></div>
            <div className="absolute bottom-20 right-1/3 w-14 h-14 bg-teal-200 rounded-full animate-bounce"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 relative z-10">
              <h2 className="text-5xl font-bold text-white mb-4">
                Latest Events
              </h2>
              <p className="text-xl text-white/90 mb-8">
                Discover the newest events happening around you
              </p>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentCarouselIndex * 100}%)` }}
                >
                  {latestEvents.map((event) => (
                    <div key={event.id} className="w-full flex-shrink-0">
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mx-4 border border-white/20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                          <div className="relative">
                            {/* Tickets Available Tag */}
                            <div className="absolute top-0 right-0 z-10">
                              <span className="bg-white text-green-600 px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                                {event.total_tickets} tickets
                              </span>
                            </div>
                            <h3 className="text-4xl font-bold text-white mb-4 leading-tight">
                              {event.title}
                            </h3>
                            <p className="text-white/90 mb-6 line-clamp-3 text-lg">
                              {event.description}
                            </p>
                            <div className="space-y-4 mb-6">
                              <div className="flex items-center text-white/90">
                                <CalendarIcon className="h-5 w-5 mr-3 text-white" />
                                {formatDate(event.date)}
                              </div>
                              <div className="flex items-center text-white/90">
                                <MapPinIcon className="h-5 w-5 mr-3 text-white" />
                                {event.location}
                              </div>
                              <div className="flex items-center text-white/90">
                                <TicketIcon className="h-5 w-5 mr-3 text-white" />
                                {event.total_tickets} tickets available
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-3xl font-bold text-white">
                                {formatPrice(event.price)}
                              </span>
                              <Link
                                href={`/events/${event.id}`}
                                className="bg-white text-green-600 px-6 py-3 rounded-xl hover:bg-green-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                              >
                                Get Tickets
                                <PlayIcon className="h-4 w-4" />
                              </Link>
                            </div>
                          </div>
                          
                          {/* Tickets Available Section */}
                          <div className="relative rounded-2xl p-8 text-center flex flex-col justify-center items-center h-full shadow-2xl overflow-hidden">
                            {event.poster_url && (
                              <div className="absolute inset-0">
                                <Image
                                  src={event.poster_url}
                                  alt={event.title + " poster"}
                                  fill
                                  className="object-cover"
                                />
                                <div className="absolute inset-0 bg-opacity-60"></div>
                              </div>
                            )}
                            <div className="relative z-10">
                              <div className="text-7xl font-bold text-white mb-2">
                                {event.total_tickets}
                              </div>
                              <div className="text-white/90 text-lg">Tickets Available</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel Navigation */}
              <div className="flex justify-center mt-8 space-x-3">
                {latestEvents.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCarouselIndex(index)}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      index === currentCarouselIndex
                        ? "bg-white shadow-lg"
                        : "bg-white/50 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* All Events Section */}
      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              All Events
            </h2>
            <p className="text-gray-600 text-lg">
              Discover amazing events happening around you
            </p>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-12 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg bg-white text-gray-800 placeholder-gray-500 shadow-lg border-0"
              />
            </div>
            <select
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
              className="px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg bg-white text-gray-800 shadow-lg border-0"
            >
              <option value="all">All Prices</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {allEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No Events Found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? "No events found matching your search criteria. Try adjusting your search terms."
                  : "No events are currently available. Check back later for new events!"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {allEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} className="block group">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  {event.poster_url && (
                    <div className="relative w-full h-48 overflow-hidden">
                      <Image
                        src={event.poster_url}
                        alt={event.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={true}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-green-600 transition-colors duration-200">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {event.description}
                    </p>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-2 text-green-500" />
                        {formatDate(event.date)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="h-4 w-4 mr-2 text-blue-500" />
                        {event.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <TicketIcon className="h-4 w-4 mr-2 text-purple-500" />
                        {formatPrice(event.price)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <UserIcon className="h-4 w-4 mr-2 text-orange-500" />
                        {event.total_tickets} tickets available
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                      <span className="text-2xl font-bold text-green-600">
                        {formatPrice(event.price)}
                      </span>
                      <div className="bg-green-500 text-white px-4 py-2 rounded-xl font-semibold shadow-md group-hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                        View Details
                        <ArrowRightIcon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}