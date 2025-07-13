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
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  MapPinIcon,
  PhotoIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  total_tickets: number;
  poster_url?: string;
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
    price: 0,
    total_tickets: 0,
  });

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
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
      [name]:
        name === "price" || name === "total_tickets"
          ? parseFloat(value) || 0
          : value,
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

    if (formData.price < 0 || formData.total_tickets <= 0) {
      setError("Please enter valid ticket price and quantity");
      setSubmitting(false);
      return;
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
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: eventDateTime,
        location: formData.location,
        price: formData.price,
        total_tickets: formData.total_tickets,
        organizer_id: user?.id,
        poster_url: posterUrl,
      };

      console.log("Creating event with data:", eventData);

      const { error: insertError } = await supabase
        .from("events")
        .insert([eventData]);

      if (insertError) {
        console.error("Event insert error:", insertError);
        throw insertError;
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

                {/* Ticket Price and Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label htmlFor="price" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
                      Ticket Price (R) *
                    </label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="total_tickets" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <UserGroupIcon className="h-5 w-5 text-green-500" />
                      Total Tickets *
                    </label>
                    <input
                      type="number"
                      id="total_tickets"
                      name="total_tickets"
                      value={formData.total_tickets}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                      placeholder="100"
                      required
                    />
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