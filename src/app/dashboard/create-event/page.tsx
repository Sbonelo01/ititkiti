"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";
import Image from "next/image"; // Import Image for optimized image handling

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

      // Check if user is an organizer
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

    // Basic validation
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
      // Combine date and time
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

      console.log("Creating event with data:", eventData); // Debug log

      const { error: insertError } = await supabase
        .from("events")
        .insert([eventData]);

      if (insertError) {
        console.error("Event insert error:", insertError);
        throw insertError;
      }

      console.log("Event created successfully!"); // Debug log
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      console.error("Error creating event:", err); // Debug log
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto"></div>
          <p className="mt-4 text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="text-spotify-green text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-text-light mb-2">
            Event Created Successfully!
          </h2>
          <p className="text-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-text-light">
            Create New Event
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-green-500 hover:text-green-600 transition-colors duration-200"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Form */}
        <div className="bg-card-background rounded-lg shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-text-light mb-2"
              >
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-input-background text-foreground shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg"
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-text-light mb-2"
              >
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 bg-input-background text-foreground shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg"
                placeholder="Describe your event..."
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-text-light mb-2"
                >
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-input-background text-foreground shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg datepicker-icon"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="time"
                  className="block text-sm font-medium text-text-light mb-2"
                >
                  Time *
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-input-background text-foreground shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg"
                  required
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-text-light mb-2"
              >
                Venue/Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-input-background text-foreground shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg"
                placeholder="Enter venue or location"
                required
              />
            </div>

            {/* Ticket Price and Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-text-light mb-2"
                >
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
                  className="w-full px-3 py-2 bg-input-background text-foreground shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="total_tickets"
                  className="block text-sm font-medium text-text-light mb-2"
                >
                  Total Tickets *
                </label>
                <input
                  type="number"
                  id="total_tickets"
                  name="total_tickets"
                  value={formData.total_tickets}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 bg-input-background text-foreground shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg"
                  placeholder="100"
                  required
                />
              </div>
            </div>

            {/* Poster Upload */}
            <div>
              <label className="block text-sm font-medium text-text-light mb-2">
                Event Poster *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePosterChange}
                required
                className="block w-full text-sm text-text-faded
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:text-sm file:font-semibold
                           file:bg-green-500 file:text-white
                           hover:file:bg-green-400 cursor-pointer"
              />
              {posterPreview && (
                <div className="mt-4 rounded-lg overflow-hidden border border-gray-700">
                  <Image
                    src={posterPreview}
                    alt="Poster Preview"
                    width={500} // Adjust width as needed
                    height={300} // Adjust height as needed
                    objectFit="contain" // Ensures the image fits within the bounds
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-sm bg-red-900 bg-opacity-30 p-3 rounded-md border border-red-700">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-500 text-white px-6 py-2 rounded-[10px] font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {submitting ? "Creating Event..." : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}