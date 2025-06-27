"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  total_tickets: number;
}

export default function EditEvent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [eventNotFound, setEventNotFound] = useState(false);
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    price: 0,
    total_tickets: 0,
  });

  useEffect(() => {
    const checkAuthAndLoadEvent = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Check if user is an organizer
      const userRole = session.user.user_metadata?.role;
      if (userRole !== 'organizer') {
        router.push('/dashboard');
        return;
      }

      setUser(session.user);
      
      // Load event data after user is set
      await loadEventData(session.user.id);
      setLoading(false);
    };

    checkAuthAndLoadEvent();
  }, [router, eventId]);

  const loadEventData = async (userId: string) => {
    try {
      console.log('Loading event data for event ID:', eventId, 'and user ID:', userId); // Debug log
      
      // First, let's check if the event exists at all
      const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId);

      console.log('All events with this ID:', { allEvents, allEventsError }); // Debug log
      
      if (allEventsError || !allEvents || allEvents.length === 0) {
        console.error('Event not found in database');
        setEventNotFound(true);
        return;
      }

      const event = allEvents[0];
      console.log('Found event:', event); // Debug log
      console.log('Event organizer_id:', event.organizer_id, 'User ID:', userId); // Debug log

      // Check if user owns this event
      if (event.organizer_id !== userId) {
        console.error('User does not own this event');
        setEventNotFound(true);
        return;
      }

      // Parse the date and time from the stored datetime
      const eventDate = new Date(event.date);
      const dateString = eventDate.toISOString().split('T')[0];
      const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);

      setFormData({
        title: event.title,
        description: event.description,
        date: dateString,
        time: timeString,
        location: event.location,
        price: event.price,
        total_tickets: event.total_tickets,
      });

    } catch (error) {
      console.error('Error:', error);
      setEventNotFound(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'total_tickets' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Basic validation
    if (!formData.title || !formData.description || !formData.date || !formData.time || !formData.location) {
      setError("Please fill in all required fields");
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
      const eventDateTime = new Date(`${formData.date}T${formData.time}`).toISOString();

      const eventData = {
        title: formData.title,
        description: formData.description,
        date: eventDateTime,
        location: formData.location,
        price: formData.price,
        total_tickets: formData.total_tickets,
      };

      console.log('Updating event with data:', eventData); // Debug log
      console.log('Event ID:', eventId, 'User ID:', user?.id); // Debug log

      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)
        .eq('organizer_id', user?.id) // Extra security check
        .select(); // Add select to see what was updated

      console.log('Update result:', { data, error }); // Debug log

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('No rows were updated');
        throw new Error('No rows were updated. Check if you have permission to edit this event.');
      }

      console.log('Event updated successfully!', data); // Debug log
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('Error updating event:', err); // Debug log
      setError(err.message || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (eventNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-4">The event you're looking for doesn't exist or you don't have permission to edit it.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Updated Successfully!</h2>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your event..."
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Venue/Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter venue or location"
                required
              />
            </div>

            {/* Ticket Price and Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label htmlFor="total_tickets" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Tickets *
                </label>
                <input
                  type="number"
                  id="total_tickets"
                  name="total_tickets"
                  value={formData.total_tickets}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Updating Event..." : "Update Event"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 