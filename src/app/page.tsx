"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import Image from "next/image"; // Import Image component for optimized images

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
    // Only set interval if there are events to carousel
    if (events.length > 0) {
      const interval = setInterval(() => {
        setCurrentCarouselIndex((prev) =>
          prev === Math.min(4, events.length - 1) ? 0 : prev + 1
        );
      }, 5000); // Change every 5 seconds

      return () => clearInterval(interval);
    }
  }, [events.length]);

  const fetchEvents = async () => {
    try {
      console.log("Fetching events..."); // Debug log

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Query result:", { data, error }); // Debug log

      if (error) {
        console.error("Error fetching events:", error);
        return;
      }

      console.log("Fetched events:", data); // Debug log
      setEvents(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Ensure latestEvents always has events, even if fewer than 5
  const latestEvents = events.slice(0, Math.min(5, events.length));

  const allEvents = filteredEvents;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `R${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <p className="mt-4 text-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section with Latest Events Carousel */}
      {latestEvents.length > 0 && (
        <section className="bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 py-16 shadow-lg relative overflow-hidden">
          {/* Playful background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-bounce"></div>
            <div className="absolute top-20 right-20 w-16 h-16 bg-green-200 rounded-full animate-pulse"></div>
            <div className="absolute bottom-10 left-1/4 w-12 h-12 bg-emerald-200 rounded-full animate-spin"></div>
            <div className="absolute bottom-20 right-1/3 w-14 h-14 bg-teal-200 rounded-full animate-bounce"></div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">
                Latest Events
              </h2>
              <p className="text-xl text-white opacity-90 mb-6">
                Discover the newest events happening around you
              </p>
              <Link
                href="/events"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-[10px] text-green-500 bg-white hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                View All Events
                <svg
                  className="ml-2 -mr-1 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-lg">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentCarouselIndex * 100}%)` }}
                >
                  {latestEvents.map((event) => (
                    <div key={event.id} className="w-full flex-shrink-0">
                      <div className="bg-card-background rounded-lg shadow-xl p-8 mx-4"> {/* Card background, subtle border */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                          <div className="relative">
                            {/* Tickets Available Tag */}
                            <div className="absolute top-0 right-0 z-10">
                              <span className="bg-white text-green-500 px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                                {event.total_tickets} tickets
                              </span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-4">
                              {event.title}
                            </h3>
                            <p className="text-white opacity-90 mb-6 line-clamp-3">
                              {event.description}
                            </p>
                            <div className="space-y-3 mb-6">
                              <div className="flex items-center text-white opacity-80">
                                <svg
                                  className="w-5 h-5 mr-3 text-white" // Icon color
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                {formatDate(event.date)}
                              </div>
                              <div className="flex items-center text-white opacity-80">
                                <svg
                                  className="w-5 h-5 mr-3 text-white" // Icon color
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                {event.location}
                              </div>
                              <div className="flex items-center text-white opacity-80">
                                <svg
                                  className="w-5 h-5 mr-3 text-white" // Icon color
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                                  />
                                </svg>
                                {event.total_tickets} tickets available
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-white">
                                {formatPrice(event.price)}
                              </span>
                              <Link
                                href={`/events/${event.id}`}
                                className="bg-white text-green-500 px-6 py-3 rounded-[10px] hover:bg-gray-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                              >
                                Get Tickets
                              </Link>
                            </div>
                          </div>
                          {/* Tickets Available Section */}
                          <div className="relative rounded-lg p-8 text-center flex flex-col justify-center items-center h-full shadow overflow-hidden">
                            {/* Background Image */}
                            {event.poster_url && (
                              <div className="absolute inset-0">
                                <Image
                                  src={event.poster_url}
                                  alt={event.title + " poster"}
                                  layout="fill"
                                  objectFit="cover"
                                  className="rounded-lg"
                                />
                                {/* Overlay for better text readability */}
                                <div className="absolute inset-0 bg-opacity-50"></div>
                              </div>
                            )}
                            {/* Content */}
                            <div className="relative z-10">
                              <div className="text-6xl font-bold text-white mb-2">
                                {event.total_tickets}
                              </div>
                              <div className="text-white opacity-90">Tickets Available</div>
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
                      index === currentCarouselIndex
                        ? "bg-white" // Active dot is Spotify green
                        : "bg-gray-700 hover:bg-gray-600" // Inactive dots are dark gray
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
          <h2 className="text-3xl font-bold text-text-light text-green-500 mb-6">
            All Events
          </h2>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 right-0 flex items-center pt-0 pr-3 pointer-events-none">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-card-background text-foreground placeholder-gray-500 shadow"
              />
            </div>
            <select
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
              className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-card-background text-foreground shadow"
            >
              <option value="all">All Prices</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {allEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-faded text-lg">
              No events found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allEvents.map((event) => (
              <div
                key={event.id}
                className="bg-card-background rounded-lg shadow overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-4">
                  {event.poster_url && (
                    <div className="w-full h-48 relative mb-4 rounded-lg overflow-hidden">
                      <Image
                        src={event.poster_url}
                        alt={event.title + " poster"}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                      />
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-text-light mb-2">
                    {event.title}
                  </h3>
                  <p className="text-foreground mb-4 line-clamp-3">
                    {event.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-text-faded">
                      <svg
                        className="w-4 h-4 mr-2 text-green-500" // Icon color
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {formatDate(event.date)}
                    </div>
                    <div className="flex items-center text-sm text-text-faded">
                      <svg
                        className="w-4 h-4 mr-2 text-green-500" // Icon color
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {event.location}
                    </div>
                    <div className="flex items-center text-sm text-text-faded">
                      <svg
                        className="w-4 h-4 mr-2 text-green-500" // Icon color
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                        />
                      </svg>
                      {event.total_tickets} tickets available
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-spotify-green">
                      {formatPrice(event.price)}
                    </span>
                    <Link
                      href={`/events/${event.id}`}
                      className="bg-green-500 text-white px-4 py-2 rounded-[10px] hover:bg-green-600 transition-colors font-semibold"
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