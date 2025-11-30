"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";
import Image from "next/image";
import { 
  CalendarIcon, 
  ArrowLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ClockIcon,
  // CurrencyDollarIcon,
  // UserGroupIcon,
  DocumentTextIcon,
  MapPinIcon,
  PhotoIcon,
  CloudArrowUpIcon,
  TrashIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
}

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  poster_url?: string;
  ticket_types: TicketType[];
}

export default function CreateEvent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    ticket_types: [
      {
        id: `ticket-${Date.now()}`,
        name: "General",
        price: 0,
        quantity: 0,
        description: "",
      },
    ],
  });

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login?redirect=/dashboard/create-event");
        return;
      }

      const userRole = session.user.user_metadata?.role;
      if (userRole !== "organizer") {
        router.push("/dashboard");
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTicketTypeChange = (
    ticketId: string,
    field: keyof TicketType,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      ticket_types: prev.ticket_types.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, [field]: value }
          : ticket
      ),
    }));
  };

  const addTicketType = () => {
    setFormData((prev) => ({
      ...prev,
      ticket_types: [
        ...prev.ticket_types,
        {
          id: `ticket-${Date.now()}-${Math.random()}`,
          name: "",
          price: 0,
          quantity: 0,
          description: "",
        },
      ],
    }));
  };

  const removeTicketType = (ticketId: string) => {
    setFormData((prev) => ({
      ...prev,
      ticket_types: prev.ticket_types.filter((ticket) => ticket.id !== ticketId),
    }));
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPosterFile(file);
    if (file) {
      setPosterPreview(URL.createObjectURL(file));
    } else {
      setPosterPreview(null);
    }
  };

  const handlePosterUpload = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("event-posters")
      .upload(fileName, file);
    if (error) {
      console.error("Poster upload error:", error);
      throw error;
    }
    const { data: publicUrlData } = supabase.storage
      .from("event-posters")
      .getPublicUrl(fileName);
    if (!publicUrlData) {
      console.error("Get public URL error: No data returned");
      throw new Error("Failed to get public URL");
    }
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (
      !formData.title ||
      !formData.description ||
      !formData.date ||
      !formData.time ||
      !formData.location ||
      !posterFile
    ) {
      setError("Please fill in all required fields including the event poster");
      setSubmitting(false);
      return;
    }

    if (formData.ticket_types.length === 0) {
      setError("Please add at least one ticket type");
      setSubmitting(false);
      return;
    }

    // Validate ticket types
    for (const ticketType of formData.ticket_types) {
      if (!ticketType.name || ticketType.name.trim() === "") {
        setError("Please provide a name for all ticket types");
        setSubmitting(false);
        return;
      }
      if (ticketType.price < 0) {
        setError("Ticket prices cannot be negative");
        setSubmitting(false);
        return;
      }
      if (ticketType.quantity <= 0) {
        setError("Each ticket type must have at least 1 ticket available");
        setSubmitting(false);
        return;
      }
    }

    try {
      const eventDateTime = new Date(
        `${formData.date}T${formData.time}`
      ).toISOString();
      let posterUrl = formData.poster_url || null;
      if (posterFile) {
        try {
          posterUrl = await handlePosterUpload(posterFile);
        } catch (uploadError) {
          console.error("Poster upload failed:", uploadError);
          setError(
            "Poster upload failed: " +
              (uploadError instanceof Error
                ? uploadError.message
                : String(uploadError))
          );
          setSubmitting(false);
          return;
        }
      }
      // Calculate total tickets and base price (for backward compatibility)
      const totalTickets = formData.ticket_types.reduce(
        (sum, ticket) => sum + ticket.quantity,
        0
      );
      const basePrice = formData.ticket_types.length > 0 
        ? Math.min(...formData.ticket_types.map(t => t.price))
        : 0;

      const eventData = {
        title: formData.title,
        description: formData.description,
        date: eventDateTime,
        location: formData.location,
        price: basePrice, // Keep for backward compatibility
        total_tickets: totalTickets, // Keep for backward compatibility
        organizer_id: user?.id,
        poster_url: posterUrl,
      };

      console.log("Creating event with data:", eventData);

      const { data: eventResult, error: insertError } = await supabase
        .from("events")
        .insert([eventData])
        .select()
        .single();

      if (insertError || !eventResult) {
        console.error("Event insert error:", insertError);
        throw insertError || new Error("Failed to create event");
      }

      // Create ticket types
      const ticketTypesData = formData.ticket_types.map((ticketType) => ({
        event_id: eventResult.id,
        name: ticketType.name,
        price: ticketType.price,
        quantity: ticketType.quantity,
        available_quantity: ticketType.quantity,
        description: ticketType.description || null,
      }));

      const { error: ticketTypesError } = await supabase
        .from("ticket_types")
        .insert(ticketTypesData);

      if (ticketTypesError) {
        console.error("Ticket types insert error:", ticketTypesError);
        // Rollback event creation
        await supabase.from("events").delete().eq("id", eventResult.id);
        throw ticketTypesError;
      }

      console.log("Event created successfully!");
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      console.error("Error creating event:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Event Created Successfully!</h2>
            <p className="text-gray-600 mb-6">Your event has been created and is now live for ticket sales.</p>
            <div className="animate-pulse">
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header Section */}
      <section className="relative bg-gradient-to-br from-green-600 via-green-700 to-green-800 py-12 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full animate-bounce"></div>
          <div className="absolute top-20 right-20 w-24 h-24 bg-green-200 rounded-full animate-pulse"></div>
          <div className="absolute bottom-10 left-1/4 w-20 h-20 bg-emerald-200 rounded-full animate-spin"></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-teal-200 rounded-full animate-bounce"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl hover:bg-white/30 transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                Back to Dashboard
              </button>
            </div>
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-8 w-8 text-yellow-300" />
              <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
                Create Event
              </span>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
              Create Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                Amazing Event
              </span>
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Bring your vision to life and start selling tickets to your next big event.
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-xl flex items-center justify-center">
                  <PlusIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Event Information</h2>
                  <p className="text-white/90 text-sm">Fill in your event details below</p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Event Title */}
                <div className="space-y-3">
                  <label htmlFor="title" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <DocumentTextIcon className="h-5 w-5 text-green-500" />
                    Event Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                    placeholder="Enter your event title"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <label htmlFor="description" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <DocumentTextIcon className="h-5 w-5 text-green-500" />
                    Event Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200 resize-none"
                    placeholder="Describe your event in detail..."
                    required
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label htmlFor="date" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <CalendarIcon className="h-5 w-5 text-green-500" />
                      Event Date *
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="time" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <ClockIcon className="h-5 w-5 text-green-500" />
                      Event Time *
                    </label>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-3">
                  <label htmlFor="location" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <MapPinIcon className="h-5 w-5 text-green-500" />
                    Venue/Location *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                    placeholder="Enter venue or location"
                    required
                  />
                </div>

                {/* Ticket Types */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <TicketIcon className="h-5 w-5 text-green-500" />
                      Ticket Types (e.g. General, Early Bird, VIP)*
                    </label>
                    <button
                      type="button"
                      onClick={addTicketType}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200 text-sm font-semibold"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Ticket Type
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.ticket_types.map((ticketType, index) => (
                      <div
                        key={ticketType.id}
                        className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-green-300 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-md font-semibold text-gray-700">
                            Ticket Type {index + 1}
                          </h3>
                          {formData.ticket_types.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTicketType(ticketType.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              aria-label="Remove ticket type"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Ticket Name *
                            </label>
                            <input
                              type="text"
                              value={ticketType.name}
                              onChange={(e) =>
                                handleTicketTypeChange(ticketType.id, "name", e.target.value)
                              }
                              className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
                              placeholder="e.g., General Admission, VIP"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Price (R) *
                            </label>
                            <input
                              type="number"
                              value={ticketType.price}
                              onChange={(e) =>
                                handleTicketTypeChange(
                                  ticketType.id,
                                  "price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              min="0"
                              step="0.01"
                              className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Quantity Available *
                            </label>
                            <input
                              type="number"
                              value={ticketType.quantity}
                              onChange={(e) =>
                                handleTicketTypeChange(
                                  ticketType.id,
                                  "quantity",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              min="1"
                              className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
                              placeholder="100"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Description (Optional)
                            </label>
                            <input
                              type="text"
                              value={ticketType.description || ""}
                              onChange={(e) =>
                                handleTicketTypeChange(
                                  ticketType.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
                              placeholder="e.g., Includes refreshments"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Poster Upload */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <PhotoIcon className="h-5 w-5 text-green-500" />
                    Event Poster *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-all duration-200">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterChange}
                      required
                      className="hidden"
                      id="poster-upload"
                    />
                    <label htmlFor="poster-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-4">
                        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center">
                          <CloudArrowUpIcon className="h-8 w-8 text-green-500" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-700">Upload Event Poster</p>
                          <p className="text-gray-500 text-sm">Click to select an image file</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  {posterPreview && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                      <Image
                        src={posterPreview}
                        alt="Poster Preview"
                        width={500}
                        height={300}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <p className="text-red-700 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-center pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-12 py-4 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Creating Event...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-5 w-5" />
                        Create Event
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}