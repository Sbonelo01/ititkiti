"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";
import Image from "next/image";
import OrganizerAppPromo from "@/components/OrganizerAppPromo";
import OrganizerSellGate from "@/components/OrganizerSellGate";
import { CtaButton } from "@/components/ui/CtaButton";
import { 
  CalendarIcon,
  ArrowLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MapPinIcon,
  CloudArrowUpIcon,
  TrashIcon,
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
  const [userRole, setUserRole] = useState<string | null>(null);
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

      const role = session.user.user_metadata?.role || "attendee";
      setUser(session.user);
      setUserRole(role);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleOrganizerUpgrade = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setUserRole(session.user.user_metadata?.role || "attendee");
    }
  };

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

  if (user && userRole !== "organizer") {
    return <OrganizerSellGate user={user} onUpgraded={handleOrganizerUpgrade} />;
  }

  if (!user) {
    return null;
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-32 md:pb-0">
      {/* Header Section */}
      <section className="relative bg-gradient-to-br from-green-600 via-green-700 to-green-800 py-6 sm:py-10 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full animate-bounce"></div>
          <div className="absolute top-20 right-20 w-24 h-24 bg-green-200 rounded-full animate-pulse"></div>
          <div className="absolute bottom-10 left-1/4 w-20 h-20 bg-emerald-200 rounded-full animate-spin"></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-teal-200 rounded-full animate-bounce"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="self-start bg-white/20 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl hover:bg-white/30 transition-colors duration-200 font-semibold flex items-center gap-2 touch-target"
            >
              <ArrowLeftIcon className="h-5 w-5" aria-hidden />
              Back
            </button>
            <span className="self-start sm:self-auto bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
              List your event
            </span>
          </div>
          
          <div className="text-center mt-5 sm:mt-6">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-3 leading-tight">
              List your event
            </h1>
            <p className="text-sm sm:text-lg text-white/90 max-w-xl mx-auto">
              Four quick steps — then you&apos;re live and selling paperless tickets.
            </p>
          </div>
        </div>
      </section>

      <section className="pt-6 pb-4 sm:pt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress hint */}
          <ol className="mb-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs sm:text-sm text-gray-600">
            {["Details", "When & where", "Tickets", "Poster"].map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-300 hidden sm:inline" aria-hidden>·</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 shadow-sm border border-gray-100">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  {step}
                </span>
              </li>
            ))}
          </ol>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-5 sm:px-8 py-5 sm:py-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Event details</h2>
              <p className="text-white/90 text-sm mt-1">Everything buyers need — takes about 5 minutes</p>
            </div>

            <div className="p-5 sm:p-8">
              <form id="create-event-form" onSubmit={handleSubmit} className="space-y-10">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4" role="alert">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-red-700 font-medium text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* Step 1 — Basics */}
                <section className="space-y-5" aria-labelledby="create-event-basics">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 id="create-event-basics" className="text-base font-bold text-gray-900">
                      1. Tell people what it is
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">Name and description shown on your event page</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-800">
                      Event title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 text-base bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200"
                      placeholder="e.g. Summer Jazz Night"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-semibold text-gray-800">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3.5 text-base bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200 resize-none"
                      placeholder="What's happening? Who's performing? What should guests bring?"
                      required
                    />
                  </div>
                </section>

                {/* Step 2 — When & where */}
                <section className="space-y-5" aria-labelledby="create-event-when-where">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 id="create-event-when-where" className="text-base font-bold text-gray-900">
                      2. When & where
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">Help ticket buyers plan their trip</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-2">
                      <label htmlFor="date" className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <CalendarIcon className="h-4 w-4 text-green-600" aria-hidden />
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 text-base bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="time" className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <ClockIcon className="h-4 w-4 text-green-600" aria-hidden />
                        Start time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        id="time"
                        name="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 text-base bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="location" className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <MapPinIcon className="h-4 w-4 text-green-600" aria-hidden />
                      Venue address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 text-base bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-200"
                      placeholder="Venue name, street, city — e.g. Ticketpro Dome, Johannesburg"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Use a full address so buyers can open directions in Google Maps.
                    </p>
                  </div>
                </section>

                {/* Step 3 — Tickets */}
                <section className="space-y-5" aria-labelledby="create-event-tickets">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 id="create-event-tickets" className="text-base font-bold text-gray-900">
                        3. Ticket types & pricing
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">Add General, VIP, Early bird, etc.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addTicketType}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-semibold touch-target shrink-0"
                    >
                      <PlusIcon className="h-4 w-4" aria-hidden />
                      Add type
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.ticket_types.map((ticketType, index) => (
                      <div
                        key={ticketType.id}
                        className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-gray-700">
                            Ticket {index + 1}
                          </h4>
                          {formData.ticket_types.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTicketType(ticketType.id)}
                              className="text-red-500 hover:text-red-700 p-2 -mr-2 touch-target"
                              aria-label={`Remove ticket type ${index + 1}`}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-600">Name *</label>
                            <input
                              type="text"
                              value={ticketType.name}
                              onChange={(e) =>
                                handleTicketTypeChange(ticketType.id, "name", e.target.value)
                              }
                              className="w-full px-3 py-3 text-base bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
                              placeholder="General admission"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-600">Price (R) *</label>
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
                              className="w-full px-3 py-3 text-base bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
                              placeholder="0 for free"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-600">Quantity *</label>
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
                              className="w-full px-3 py-3 text-base bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
                              placeholder="100"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-600">Note (optional)</label>
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
                              className="w-full px-3 py-3 text-base bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
                              placeholder="Includes merch, etc."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Step 4 — Poster */}
                <section className="space-y-4" aria-labelledby="create-event-poster">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 id="create-event-poster" className="text-base font-bold text-gray-900">
                      4. Event poster
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">Square or landscape image works best</p>
                  </div>

                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 sm:p-8 text-center hover:border-green-400 transition-colors bg-gray-50/50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterChange}
                      required
                      className="hidden"
                      id="poster-upload"
                    />
                    <label htmlFor="poster-upload" className="cursor-pointer block">
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-green-100 w-14 h-14 rounded-full flex items-center justify-center">
                          <CloudArrowUpIcon className="h-7 w-7 text-green-600" aria-hidden />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {posterFile ? posterFile.name : "Tap to upload poster"}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">PNG or JPG, max ~5 MB</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  {posterPreview && (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <Image
                        src={posterPreview}
                        alt="Poster preview"
                        width={500}
                        height={300}
                        className="w-full h-auto max-h-64 object-cover"
                      />
                    </div>
                  )}
                </section>

                <div className="hidden md:flex justify-center pt-2 border-t border-gray-100">
                  <CtaButton
                    type="submit"
                    disabled={submitting}
                    variant="primary"
                    className="px-10 py-4 text-lg font-bold gap-3"
                  >
                    {submitting ? (
                      <>
                        <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" aria-hidden />
                        Publishing…
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-5 w-5" aria-hidden />
                        Publish event & start selling
                      </>
                    )}
                  </CtaButton>
                </div>
              </form>
            </div>
          </div>

          <div className="mt-8 mb-4">
            <OrganizerAppPromo variant="banner" />
          </div>
        </div>
      </section>

      <div className="md:hidden fixed left-0 right-0 z-40 border-t border-green-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] mobile-sticky-cta">
        <CtaButton
          type="submit"
          form="create-event-form"
          disabled={submitting}
          variant="primary"
          className="w-full py-3.5 text-base font-bold max-w-lg mx-auto"
        >
          {submitting ? "Publishing…" : "Publish event & start selling"}
        </CtaButton>
      </div>
    </div>
  );
}