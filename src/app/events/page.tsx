"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
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
  // Assuming a poster_url might be present from the CreateEvent page
  poster_url?: string; 
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPrice, setFilterPrice] = useState<string>("all");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      console.log('Fetching events...'); // Debug log
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        // .gte('date', new Date().toISOString()) // Temporarily commented out to show all events
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <p className="mt-4 text-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card-background shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold">Events</h1>
              <p className="text-green-500">Discover amazing events happening near you</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-card-background rounded-lg shadow-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-input-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow"
              />
            </div>
            
            {/* Price Filter */}
            <div className="md:w-48">
              <select
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="w-full px-3 py-2 bg-input-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow"
              >
                <option value="all">All Prices</option>
                <option value="free">Free Events</option>
                <option value="paid">Paid Events</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-faded text-lg">No events found.</p>
            {searchTerm && (
              <p className="text-gray-600 mt-2">Try adjusting your search terms.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} className="block"> {/* Make the entire card a link */}
                <div className="bg-card-background rounded-lg shadow overflow-hidden hover:shadow-xl transition-shadow">
                  {event.poster_url && (
                    <div className="relative w-full h-48 bg-gray-800 flex items-center justify-center overflow-hidden rounded-t-lg">
                      <Image
                        src={event.poster_url}
                        alt={event.title}
                        fill
                        style={{ objectFit: "cover" }}
                        className="object-cover w-full h-full"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={true}
                      />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-semibold text-text-light mb-2">{event.title}</h3>
                    <p className="text-text-faded text-sm mb-4 line-clamp-3 flex-grow">{event.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-text-faded">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(event.date)}
                      </div>
                      <div className="flex items-center text-sm text-text-faded">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event.location}
                      </div>
                      <div className="flex items-center text-sm text-text-faded">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        {formatPrice(event.price)}
                      </div>
                      <div className="flex items-center text-sm text-text-faded">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {event.total_tickets} tickets available
                      </div>
                    </div>

                    <div className="mt-auto flex justify-between items-center pt-4 border-gray-800"> {/* Added border-t */}
                      <span className="text-lg font-semibold text-spotify-green">
                        {formatPrice(event.price)}
                      </span>
                      {/* Visual button inside the link - no separate link needed since entire card is clickable */}
                      <div className="bg-green-500 text-white px-4 py-2 rounded-[10px] font-semibold">
                        View Details
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}